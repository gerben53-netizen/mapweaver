# ADR-0022 — Campaign organization above existing map documents

Accepted 2026-09-24. Supersedes the flat Projects navigation in ADR-0005 and extends ADR-0021 startup preferences. The local SQLite service remains authoritative. No remote service or account is introduced.

## Model and migration

SQLite schema **7** adds `campaigns` and `campaign_nodes`. Map documents retain project format **12**, the `projects` table, their UUIDs, asset relations and portable `.mapweaver` semantics. Campaign and node UUIDs are separate. Nodes have a campaign, parent folder, sibling position, optional unique map ID, favorite flag and retained deletion timestamp. Folder names live on nodes; a map's canonical display name lives on the existing project record and is joined into the campaign index. The map-type index is updated on map writes. Moves update only organization rows, never map JSON, IDs or map revisions.

Before migrating an existing schema-6 dataset the service makes a standalone `pre-campaigns-*.sqlite3` recovery point. One same-named campaign is created per existing flat project, with its map at root. Trashed projects become trashed campaigns with retained map nodes. Raw map documents are not parsed/reformatted/replaced by the metadata migration; unreadable maps remain available for repair. Table creation and reference population are one transaction. A failed migration rolls back and leaves sources intact. No geography is inferred from names.

New maps created/imported without a context receive their own campaign. A supplied campaign/folder context is validated inside the map-write transaction; invalid placement cannot orphan a new map. Duplicate creates a new map/node in the source folder. Cross-campaign moves are not included; existing maps can be transferred as explicit copies through map export/import into the destination campaign.

Hierarchy limits are 16 node levels and 10,000 entries per campaign. Parent references must be same-campaign folders. Duplicate node/map references, missing parents, cycles, invalid names, and excess depth are rejected. Parent/position indexes support browsing. Current implementation returns a normalized metadata index for one campaign and memoizes client indexes; browsing/search does not fetch map documents or decode images.

## Mutations, deletion and concurrency

Commands require the campaign revision. Stale organization edits fail with Refresh guidance, without optimistic partial changes. Map renames additionally require the current map revision; the client adopts the exact returned revision, preventing rename from accepting unrelated unsaved/newer map content. Moves and favorites do not enter map undo history; users can move back/unfavorite. Destructive Trash actions require confirmation and are reversible through Restore.

Trashing a folder retains its entire subtree. Nodes/maps active at that deletion share a monotonically increasing timestamp; previously trashed descendants retain their earlier timestamp. Restore restores only that deletion batch. An individually restored node whose parent remains trashed is moved to campaign root. Campaign Trash uses the same mechanism, not an independent copy of maps. All maps in a trashed subtree are also flagged in existing project Trash so old listings/loaders cannot reopen them. The last-opened map reference is cleared when affected. No automatic permanent deletion is added. Asset usage remains protected by retained project references.

The client saves completed dirty changes before opening another map or executing map management. A failed/conflicting save blocks the operation. All tree, list/gallery, search, recent and favorite openings use `openCampaignMap` → existing `loadLocalProject`; validation/asset installation precedes acknowledgment. Failed loading keeps the current document. Successfully opening updates the existing `openedAt`, the dataset startup reference and campaign context. Choosing a different empty campaign clears a startup target from the previous campaign; it reopens the campaign home next time. Invalid map startup attempts still use the existing consume-before-load fallback.

## Navigation and preferences

The tree uses stable node IDs and a single keyboard tab stop with arrow navigation, Left/Right expansion, Enter activation, F2 rename, Delete confirmation and Shift+F10/context actions. Pointer drag offers inside/before/after targets; move dialog and up/down actions cover keyboard-only operation. Selected node and open map are distinguished. Parent breadcrumbs are clickable, with bounded segment widths and horizontal scrolling for long paths. The explorer remains mounted while individual map canvases reset, preserving its focus/state.

List and compact gallery show direct folder contents. Search covers all active map/folder names, with full parent context. Recent shows the 30 most recently opened active maps; favorites stay references to original maps. Missing thumbnails use a small generic icon. No expensive full-resolution thumbnail generation is performed. Campaign `preferences` stores selected node, expanded IDs and list/gallery mode separately from documents. Writes are serialized client-side; browser preference failures report a warning. Filter/search and drawer/focus state remain temporary.

## Export, backup and compatibility boundary

A `.mapweaver` export remains one independently editable map plus its assets. UI labels say **Export map only** and explain that this does not carry campaign folders. Import as campaign makes a new same-named campaign; Import map file inside an active campaign places the copy in context. No campaign metadata is silently claimed to be present in a single-map export.

Existing **Back up all data / Restore** preserves campaigns, node IDs, hierarchy/order, favorites, preferences, recents, Trash, all maps and assets together. Dataset validation now validates campaign hierarchy and map membership before restore. It also continues to accept prior supported schemas and migrates after staging. A full backup is a whole-dataset replacement, not a merge or per-campaign exchange.

A separate versioned campaign archive/import is deliberately deferred: this would need an atomic multi-document/asset import and conflict policy beyond the current single-map pipeline. This is the sprint's explicitly allowed incremental export constraint. Cached rendered thumbnails are also deferred. Older executables do not understand schema 7 and must not be used against the upgraded dataset; the pre-migration recovery point remains available. No map-format compatibility is removed by this sprint.

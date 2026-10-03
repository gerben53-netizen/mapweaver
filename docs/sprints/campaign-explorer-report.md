# Campaign Explorer / Map Library — delivery report

Date: 2026-09-24.

## Delivered

Projects now chooses a campaign. A docked, collapsible Campaign Explorer stays available beside the editor, with nested generic folders and stable map references. Breadcrumbs open ancestor folders or the selected map. The tree supports arrows, Left/Right expand/collapse, Enter, F2 rename, Delete confirmation and Shift+F10 actions. Visible focus, selected node and currently open map are distinct. Canvas focus hides the explorer temporarily without losing expansion state.

Folders display direct contents in a dense list or compact gallery. Campaign-wide name search includes full parent context; Recent lists the last 30 opened active maps; Favorites point to original maps and survive moves/renames. New folders and maps default to the selected folder. Context actions include open, rename, duplicate, move, favorite, single-map export and retained Trash/Restore as applicable. Pointer dragging supports moving and sibling reordering; a folder destination selector and Move up/down provide keyboard alternatives. Invalid self/descendant drops are rejected.

All map-opening entry points use the existing map loader through one campaign wrapper. Dirty completed changes are saved first; a failed/conflicting save or failed load preserves the working document. Successful opens update startup and recent metadata. The last valid map opens with its campaign directly; an empty selected campaign reopens its library. Existing no-retry fallback for broken startup maps remains.

## Persistence and migration

SQLite schema 7 adds campaigns and organization nodes, with parent IDs, sibling order, favorites, map-type index and retained deletion timestamps. Campaign preferences persist expansion, selected location and list/gallery choice outside map documents. Optimistic revision checks protect organization changes; map rename additionally checks its document revision.

Project format 12, map UUIDs, asset references and the existing project save/import/export pipeline remain intact. Moving a map changes organization metadata only. Migration creates a pre-campaigns SQLite recovery point, then transactionally places each existing flat project into a same-named campaign at root. No geography is inferred, no source map JSON is rewritten, and failed migration rolls back. Existing Trash entries are retained. Folder/campaign Trash preserves descendants, separately pre-trashed children and asset references; restore reverses the matching deletion batch.

See [ADR-0022](../adr/0022-campaign-explorer.md) for the contract, limits and concurrency rules.

## Main files

- `src/campaigns/model.ts`: typed index, paths, visible tree, validation and move/reorder rules.
- `src/campaigns/session.ts`: campaign state/preferences, contextual creation, guarded central opening and commands.
- `src/campaigns/CampaignWorkspace.tsx` and CSS module: explorer, breadcrumbs, content views, search, recents, favorites, drag/drop and accessible action dialogs.
- `src/campaigns/CampaignPicker.tsx`: top-level campaign choice/create/restore and maintenance access.
- `src/app/App.tsx`, `App.module.css`, `ProjectControls.tsx`: shell integration and retained new-map/storage/recovery flows.
- `src/projects/localSession.ts`: context-aware create/import/copy and successful-open campaign synchronization.
- `service/campaignSchema.ts`, `campaigns.ts`: additive migration, metadata API logic and validation.
- `service/storage.ts`, `app.ts`, `startupProject.ts`, `archives.ts`: storage integration, API, startup/Trash synchronization and full-backup validation.
- Focused campaign model/session/service tests and `tests/persistence/campaign-explorer.mjs`.
- AGENTS terminology, README, storage/backup documentation and ADR-0022.

## Checks

- `npm run test -- src/campaigns/model.test.ts src/campaigns/session.test.ts src/projects/startup.test.ts src/projects/recentSession.test.ts`: **28 passed**.
- `npm run test:service -- service/campaigns.test.ts service/startupProject.test.ts`: **10 passed**.
- Model/service coverage includes nested creation, stable IDs, move/reorder, cycle/self-drop/depth rejection, rename, favorites/recents, navigation preferences, stale commands/map renames, invalid placement rollback, preserving original map bytes in migration, failed-migration rollback, subtree Trash/restore, startup invalidation and full-backup round trip.
- Client session coverage includes context selection, shared loader, failed switch preservation, unsavable-change protection and conflicts without optimistic mutation.
- Scoped ESLint over changed source files and the browser acceptance script: **passed**.
- `npm run typecheck`: **passed**; final `npm run build` also includes client/service TypeScript checks and both production builds, **passed**.
- `node tests/persistence/campaign-explorer.mjs`: **passed** in Chrome using the production build and an isolated local service/data directory. Checks campaign/folder creation, maps in context, tree/breadcrumb/list/gallery/search/recent/favorite opening, rename, native drag, keyboard move, collapse/expand, focus mode, Trash/restore, direct reload and import of the existing house `.mapweaver` with embedded assets. No browser page errors.
- Browser test with **305 nodes**: measured search interaction **35 ms**, with **zero map-document requests** during metadata refresh/search. A separate pure-model test indexes/searches 1,500 nodes. These are focused checks, not a guarantee for every machine or the maximum limit.
- Screenshots inspected at **1280 × 720**; explorer, tool rail, canvas and inspector remain usable without overlapping controls. Evidence: `.campaign.local/acceptance-1790267970682/`.

No unrelated full suite was run. No Windows/native-package validation was run because this sprint explicitly excludes packaging. Existing distributables were left intact. The repository's existing untracked working tree was retained; no reset, commit, branch replacement or external Git action was performed.

## Explicit limits and follow-ups

- **Single-map export is not campaign export.** UI now says Export map only and explains the distinction. Storage → Back up all data/Restore preserves the complete campaign structure, maps, favorites, ordering and assets; this whole-dataset path was round-trip tested. A dedicated per-campaign archive with atomic multi-map import/merge remains a follow-up, as allowed by the sprint's incremental export clause. No hierarchy is silently claimed to be in `.mapweaver` files.
- Gallery uses compact fallback icons; rendered/cached map thumbnails are not generated. Navigation never waits for thumbnail rendering.
- Hierarchies are bounded to 16 levels and 10,000 nodes. Hundreds are exercised; large virtualized trees, tag/description search and cross-campaign moves are future options. Existing maps can be copied to another campaign through explicit map export/import.
- Older executables cannot read SQLite schema 7. Map document format remains unchanged and the pre-migration recovery point is retained.

**No Windows package was built. No pushes, merges, publications, uploads, deployments or other external actions were performed.**

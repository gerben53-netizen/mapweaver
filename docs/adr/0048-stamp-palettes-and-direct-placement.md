# ADR-0048 — Campaign stamp palettes and direct placement

Accepted 2026-09-28. Extends ADR-0022 campaign organization and ADR-0005 local storage. Map document format 12, SQLite schema 9 and the asset-pack format are unchanged.

## Workflow and state boundaries

Normal **Place asset** opens the existing Asset Library beside the map. One mounted LibraryWorkspace provides both management and compact browsing; there is no second search implementation or asset database. Search, category, favorites, collection, sort, page and the results scroll container survive placements. Compact browsing adds an explicit map-type compatibility filter. Switching workspace/layout may change the query and available scroll extent; reloading the application resets temporary library filters.

The bottom Stamp Palette is a working set, separate from Favorites. Names, stable library asset IDs, ordering and active palette live in one versioned `settings` record per campaign: `stampPalettes:<campaign-id>`. The local service validates GET/PUT requests, campaign existence, bounded identifiers, names, duplicate references and limits (32 palettes, 64 entries per palette). Writes use independent revision comparisons through the existing serialized mutation queue. Concurrent edits fail visibly and require Reload palettes; failed writes do not replace the last saved client state. No image bytes or copies of asset metadata enter the record.

Missing references are intentionally valid: removal from a palette never removes an asset, and a palette does not prevent unused source assets from being deleted. Missing entries remain visible and removable; replacement is explicit removal followed by adding another library asset. Palette deletion and reference removal ask confirmation. Palette administration is separate from map undo history.

Palettes follow all maps in the campaign across browsers using the same local service. Full dataset backup/restore carries the settings record and shared assets. A single-map `.mapweaver` export still contains only the map and its used assets, not campaign palettes. There is no new per-campaign archive format or cloud synchronization. Only collapse preference uses localStorage; transient drag/ghost state stays in memory.

## Placement

Clicking a library or palette stamp activates continuous placement. Async preparation fetches authoritative metadata, adopts bytes through the existing project asset pipeline and verifies decoding. A latest-request token prevents a slow previous choice from overwriting a newer one. Project generation guards and tool checks prevent stale async activation. Tool switching and Escape cancel the gesture/ghost; Escape also exits while the mouse is held.

Library and palette cards publish the existing `application/x-mapweaver-stamp` MIME payload containing an ID. In-process transient drag state supplies that ID during HTML dragover (where browsers protect getData); arbitrary external payloads are not accepted. The target converts screen coordinates through the current viewport, captures snapping at drop, and checks project generation and active layer again after preparation. One drop invokes the same `project.place` action as one click. Dragging does not activate continuous placement or change its chosen asset; a pre-existing continuous choice remains active.

The Konva ghost displays the actual image at `placementSize`, centered on `snapPoint`, with a green/red boundary. Existing world dimensions, map scale, aspect ratio and Alt bypass apply identically to preview and placement. Stamp coordinates remain native editable objects. The existing placement convention accepts a center inside the map; artwork extending beyond an edge is clipped by the normal renderer/export. Ghosts and palette UI are never part of export.

All creation uses the explicit active layer, including Room Generator layers. Hidden, locked or unavailable effective layers reject placement, including inherited group lock/visibility. Map-type incompatibility is checked both before preparation and by the authoritative project action. No layer fallback or pointer-based room inference is introduced. Each successful creation remains one native history entry.

## Layout, accessibility and cost

Compact browsing uses a 330-pixel dock, three thumbnail columns, existing lazy thumbnails and 60-result pages. Campaign Explorer temporarily yields space; its existing visibility preference is retained. Palettes use small thumbnails in a horizontal overflow strip and can collapse. Buttons/selects support keyboard operation, including add, choose, rename, delete, reorder and remove. Map deletion/nudge shortcuts ignore non-modifier keys originating in stamp UI. Existing stamp transform controls remain unchanged after placement.

No number shortcuts, new pre-placement rotation system or separate Recent row are added. These are optional follow-ups, not prerequisites for the two placement workflows.

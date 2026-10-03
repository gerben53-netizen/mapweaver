# ADR 0024 — Smart map markers and curated vector icons

Accepted 24 September 2026.

Markers extend the existing Place object, not stamps or a parallel document. `place` joins the Cartographic Elements registry and insertion palette; the existing rail shortcut opens the same wizard. The central marker registry owns 22 semantic types, 19 vector icons, compatible icon/type associations, five style families, four prominence levels and map-type priorities. Artwork uses application-owned Path2D vectors shared by the canvas, wizard preview and PNG painter. No assets, fonts, libraries, network connections or theme-dependent map colors are added.

## Persistent model and compatibility

Project format 12 gains optional `Place.marker: {version:1, iconId, style, prominence, ink, outline}`. Type remains `placeType`; name, note, tags, importance, asset ID, size mode, captured pixelsPerKm, anchor and transforms remain canonical existing fields. A configured built-in marker cannot also hold an asset ID. Registry values, colors and extra fields are validated at the shared admission boundary. No SQLite or archive-container schema changes.

Missing marker metadata means the exact old renderer, including custom type names, numeric importance, non-square bounds and arbitrary stamp assets. No migration applies current defaults to old content. Conversion to a built-in icon is an explicit Properties action and preserves geometry. The new wizard never requests a general Asset Library stamp. Existing custom artwork can still be replaced through Advanced.

Labels reuse existing Label objects in the same layer with `ownerId`. Optional boolean `markerName` opts into owner-name synchronization; absence/false retains previous independent text. A direct label-text edit or detachment disables name following. Label creation, visibility, position and marker edits are one undo transaction; owner movement/copy/delete use existing linked-label assembly handling. Explicit label overrides and old label offsets remain intact unless deliberately repositioned. Multiple independently linked labels remain supported; the marker panel edits the first linked label, while others are independently editable.

Prominence maps Minor/Normal/Major/Primary to importance 0/1/3/5 and size factors .75/1/1.3/1.65. New cartographic symbol bases are 24/36/44 map pixels for battle/regional/world maps, independent of zoom. Labels use the existing boxless, haloed map-type text preset with the same prominence factor. Changing prominence explicitly scales the current symbol and label; it does not modify layer order. Exact captured world scale, width, coordinates and anchor stay available in Advanced. Map-scale changes do not resize existing artwork.

## Workflow

One compact, keyboard-accessible Configure → Place dialog provides type, style, compatible visual icons, name, optional label position, prominence and live preview. Cancel/Escape makes no document change. Finish enters placement mode; a click adds the marker/label atomically, selects the marker and opens Properties. Placement then returns to Select, matching other Map Elements. Reopening remembers choices within the session for the same map type; a different map type gets appropriate defaults. Duplicate supports rapid repeated placement.

Properties starts with identity and semantic styling, then linked label and appearance. Metadata and exact technical fields are disclosure sections. Full font/halo editing stays in the existing label inspector. There is no separate label renderer, automatic collision avoidance, clustering, zoom-dependent visibility, custom SVG import or user theme pack support in this change.

## Toolbar follow-up (28 September 2026)

Place Marker is now the sole marker insertion action. The duplicate Marker choice in Map Elements is removed; the Place registry, wizard, inspector and persistent objects remain unchanged. Rail groups and action tooltips distinguish drawing, surface painting and semantic locations. Map Elements uses centralized capability filtering. See [technical comparison and validation](../sprints/toolbar-semantic-cleanup.md).

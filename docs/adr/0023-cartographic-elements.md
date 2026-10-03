# ADR 0023 — Cartographic elements and built-in vector presets

Accepted 24 September 2026.

## Decision

Map Elements groups Compass, Scale bar, Title / Cartouche, Legend, Label and List / Note in one insertion palette. It extends the existing Annotation / MapObject union, ordinary layer membership, selection, transforms, grouping, history, asset references and project admission. There is no second document, store or decorative asset database. New text elements are placed directly and edited in the existing Properties draft/Apply workflow. Place markers retain their separate existing tool.

`cartographicPresets.ts` centrally owns kinds, display names, applicability, creation defaults, ink/paper colors, frame variants and compass sizes. All six types are useful on all map types. Battlemap defaults are Technical compass and Minimal panels/bar, with Simple title. Regional defaults are Classic compass/panels/bar and Cartouche title. World defaults are Ornate compass/title/legend/bar and Parchment information panel. Defaults apply at creation only. Choosing a preset explicitly applies its colors/frame; existing content and transforms are retained. Future style packs would extend this contract, not today's user asset taxonomy.

`drawCartography.ts` owns internal vector roses and panel ornaments. `drawAnnotation.ts` remains the shared painter invoked by Konva editor nodes and the independent PNG scene. Text uses the pinned Liberation Sans metrics/fonts and glyph/halo pipeline from ADR 0017. No bitmap text, external font, theme-derived color or generated asset is used. Built-in ornaments are versioned application code, never library entries. Hit rectangles/transformers are editor-only.

## Persistence and compatibility

This is an additive extension of project format 12, following the existing optional-field extension policy. New `scaleBar`, `title` and `infoPanel` objects require `elementVersion: 1`, `elementPreset`, explicit ink/paper colors and ordinary object transforms. Text panels store title (120 characters), body (2,048 characters), note/list mode, TextStyle and frame visibility. Scale bars store units (km/mi/m/ft) and label visibility. No editor selection, insertion choice, DOM state or derived physical distance is persisted. JSON and object budgets remain shared. Labels, titles and information panels share the existing 2,000 text-element budget.

Compass gains optional `elementPreset`, `northLabel`, `cardinalLabels` and `ring`. Missing preset maps to the exact previous Technical renderer; missing visibility flags retain old behavior. Existing arrow/rose/cross and custom stamp references remain supported. Legend gains optional `elementPreset` and `spacing` (0–80). Missing preset or explicit Legacy uses the exact previous background, outline, layout and entry colors. No migration adds current map defaults to old objects. Existing labels have no new fields and are not restyled. Semantic styles are explicit concrete TextStyle edits.

Unknown preset strings fall back deterministically: compass to Technical, legend to Legacy, title to Simple, scale bar/info panel to Minimal. They never use the current map type to infer saved appearance. Unknown element versions, invalid geometry/content/colors/fonts and extra fields are rejected. Older application binaries may refuse this extension; new application versions continue to read existing maps. SQLite schema, assets, archives and backup containers are unchanged; their common admission path uses the extended annotation validator.

## Physical scale

A placed Scale bar is independent of the old optional geographic corner guide. It uses explicit regional/world `geography.widthKm / map.width`, or battlemap `grid.physicalScale / cellSize`. Missing/invalid scale is unavailable, never replaced by an assumed distance. Feet use exactly 0.3048 m; miles use exactly 1,609.344 m. Creation chooses a readable 1/2/5 interval around 240 map pixels.

The complete horizontal bar spans the object's width in map pixels. Labels derive that real distance on every render. Resizing changes the displayed distance. Editing Displayed distance calculates a new width from the current map scale. Changing units preserves width. Changing map physical scale or canvas width preserves placement/geometry and updates the distance labels. Rotation rotates the complete bar; mirroring mirrors the complete artwork. There is no separate manual scale override capable of lying about distance. Labels show five significant digits. Editor and export receive the same map context; only Scale bar nodes subscribe to scale changes.

An unavailable bar shows Configure map scale on the canvas and an actionable Properties state. Export refuses a visible unavailable bar and explains how to configure or hide it. Hidden bars do not block export. The existing corner-guide export checkbox is explicitly named Include corner scale bar; it does not control placed Scale bar objects.

## Layout and bounds

Title and information panels reflow using shared deterministic text layout and internal ornament margins. User resizing changes their saved map-coordinate width/height; typography remains editable, and content edits retain current uniform layout scale. Simple/Minimal presets are transparent unless a frame is intentionally selected. List mode numbers one plain-text item per line. There is no rich text.

New legend content/padding/spacing edits recalculate height at the chosen width so text is not squeezed into old bounds. Legacy legends retain the previous sizing behavior. All elements remain in the active editable layer, with normal hide/lock/order/undo behavior. Map resizing leaves their coordinates untouched; clipping at map edges is intentional. No anchoring or responsive page layout was added.

## Decorative title follow-up — 24 September 2026

The existing `title` object now also accepts `ribbon`, `scroll`, `fantasy`, and `plaque` preset IDs. These are new IDs rather than changes to `banner`, `parchment`, `ornate`, or `cartouche`, whose saved rendering and layout remain unchanged. No new persistent fields or assets are added: `title`, `body` (subtitle), `style`, `elementPreset`, frame colors/visibility and transforms retain their existing format-12 representation. Unknown preset IDs still fall back to Simple. New Regional titles default to Ribbon, new World titles to Fantasy, and new Battlemap titles remain Simple; saved objects never inherit these defaults.

The central preset registry contains each new carrier's aspect ratio, safe text insets and minimum title size. Built-in canvas vector paths are bundled with the application and share the editor/export painter. They require no external SVG/bitmap/font or Asset Library entry. A preview dialog uses the same painter and bundled font, with native buttons, pressed state and arrow-key focus navigation.

New carriers use one title line and one optional subtitle line. Subtitle newlines are displayed as spaces without changing stored content. Text shrinks to fit the safe area, down to a 12-map-pixel title size (or an explicitly smaller requested size); subtitle uses 55% of that size. At the minimum, remaining overflow produces a Properties warning, and no text is truncated or clipped by the element. Wrap width changes the logical text capacity, while Element width and canvas corner handles proportionally scale the complete carrier. No nine-slice stretch or separate arbitrary height control is added. Existing nonproportional saved transforms remain renderable.

Title-specific Properties put content and preset first; frame ink/paper, identity and exact placement are under Frame and placement. Font styling, halo and alignment remain separate from artwork. Choosing a new preset preserves text and applies that preset's ink/paper defaults. Users can then override text and frame appearance independently. Existing single-Apply/undo semantics remain.

## Deferred

Map-bound borders, inset frames/maps and new numbered marker types are optional follow-ups. Curved labels, shadows, complex-script shaping, additional font families and custom style packs require separate work. This sprint adds no dependencies, Windows package, cloud service or external action.

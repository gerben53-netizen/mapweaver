# Cartographic Elements — sprint report

## Acceptance and implementation

One Map Elements insertion palette, map-native editable Compass/Scale bar/Title/Legend/List–Note objects, preserved existing labels and legacy artwork, explicit map-type defaults, deterministic save/load and shared canvas/PNG rendering. Normal selection, movement, proportional transform, layer order, hide/lock, grouping, copy/paste and undo remain the existing editor operations.

The central registry is `src/domain/cartographicPresets.ts`; model, physical scale, deterministic panel layout and validation are in `src/domain/decorations.ts` and the extended `annotations.ts`. Built-in vector artwork is in `src/canvas/drawCartography.ts`, called by the existing `drawAnnotation.ts`. Scale-bar editor nodes receive live map context, matching `export/render.ts`. No asset-library records or dependencies are added.

Implemented presets:

- Compass: Technical, Minimal, Cartographic Classic, Ornate Fantasy, Parchment Explorer. Size, rotation, opacity, color, north visibility and built-in ring controls; E/S/W labels on nontechnical artwork. Existing custom compass images remain available.
- Scale bar: Minimal, Cartographic, Ornate, Parchment. km/mi/m/ft, editable displayed distance, map-pixel width/height, labels, color and transforms. Current physical scale is authoritative; changing distance adjusts width, resizing updates displayed distance. Unconfigured scale is explicitly unavailable and visible unavailable bars block export with a configuration/hide message.
- Title: Simple, Banner, Cartouche, Ornate Fantasy, Parchment. Title/subtitle, pinned font styling, text/halo colors, alignment, wrapping, size, opacity, rotation and optional intended decorative frame/background.
- Legend: Legacy, Minimal, Cartographic, Ornate, Parchment. Existing title, editable ordered symbol entries, columns, padding, refreshed entries and symbol picker remain; entry spacing added. New legends reflow height when content changes.
- List / Note: Minimal, Cartographic, Ornate, Parchment; title and plain body or numbered items, typography/alignment, optional frame, paper/ink, size and transform. One item per line; no rich text.
- Label: unchanged native text model and map-type defaults, plus explicit Place, Region, Landmark, Water, Annotation and Title-like style actions. No box is introduced by these styles. Existing halos, colors, links and fonts remain authoritative.

Defaults: Battlemap uses Technical compass, Simple title, Minimal bar/legend/note. Regional uses Classic compass/bar/legend/note and Cartouche title. World uses Ornate compass/title/legend/bar and Parchment note. Defaults are creation-only; changing map type never restyles saved artwork.

## Compatibility and interface

Project format 12 receives an additive extension; new object kinds carry `elementVersion: 1`. Missing compass/legend preset retains the exact legacy rendering path. Unknown preset strings fall back centrally to Technical/Legacy/Simple/Minimal, never to active map defaults. Old labels have no added fields. Unknown fields/versions, invalid fonts/content/geometry are rejected. Text elements share a 2,000-item budget. SQLite schema, library formats and backups are unchanged.

The rail now has one **Map Elements** button instead of separate Label/Compass/Legend buttons. Its keyboard-accessible palette offers six choices. A compact placement strip selects the preset; placing new smart elements returns to Select and opens Properties without a creation modal. Existing Place and Label naming workflows remain. Escape closes the palette and returns focus to its trigger. Properties reuses one draft/Apply form with type-specific fields and the shared TextStyle controls. Object list filtering includes all new kinds.

The export checkbox for the pre-existing geographic guide now explicitly says **Include corner scale bar**; placed bars are ordinary visible objects. The shared painter renders text, halos, ornaments and image references without DOM or selection dependencies. Map resize preserves object coordinates; the physical label on a bar updates when distance per pixel changes. No responsive anchors were introduced.

Main changed integrations: `AnnotationTools.tsx`, `MapElementsMenu.tsx` and CSS, `ToolRail.tsx`, `AnnotationProperties.tsx`, `ObjectsPanel.tsx`, `PatternTools.tsx`, `ExportControls.tsx`, `mapCapabilities.ts`, `objectList.ts`, `editorStore.ts`, clipboard handling in `projectStore.ts`, `AnnotationPaint.tsx`, `drawAnnotation.ts`, and export scene/render. README, AGENTS and ADR 0023 document the contract.

## Validation

- Focused Vitest: 48 passed across seven files: `decorations.test.ts`, `MapElements.test.tsx`, `map-context.test.tsx`, `annotations.test.ts`, `cartographic-labels.test.tsx`, `annotationInteraction.test.tsx`, `objectList.test.ts`.
- Coverage includes legacy admission/rendering, every preset, map defaults and fallback, all unit conversions, unavailable scale, resize/type changes, deterministic serialization, content edit, palette/focus, applicable Properties, transforms, locks, copy/paste, history, text budgets, halo and transparent rendering, and export scene exclusion of editor state.
- Scoped ESLint on changed TypeScript/TSX plus the new acceptance script passed.
- `npm run build` passed: client TypeScript, Vite production client, service TypeScript and service bundle. No separate duplicate typecheck was needed.
- Focused service Vitest: 2 passed (`service/cartographic-elements.test.ts`, `service/annotations.test.ts`), covering every new preset through SQLite close/reopen and portable `.mapweaver` export/import, atomic invalid-version rejection, and existing symbol references, conflicts and verified backup.
- Production Chrome acceptance: `node tests/persistence/cartographic-elements.mjs` passed all seven checks with zero page errors. Isolated local service/data, real UI placement/Properties edits, palette keyboard focus, all five compasses, title/subtitle, scale distance, legend and numbered notes, drag, undo/redo, save/reload, and all 17 title/legend/note/bar variants.
- Actual transparent PNGs at 1× and 2× were exported. Selected/unselected exports have identical decoded pixels; corner alpha is zero and 2× output is 2,400 pixels wide. Editor screenshots at 1,280×720 and 1,600×1,000 and exported artwork were visually inspected. No clipped text or overlapping editor controls in the ordinary editor workflow. The additional gallery fixture deliberately supplies independent width/height to test nonuniform saved bounds.
- Evidence: [results](evidence/cartographic-elements/results.json), [menu at 1280](evidence/cartographic-elements/menu-1280.png), [editor at 1280](evidence/cartographic-elements/editor-1280.png), [editor at 1600](evidence/cartographic-elements/editor-1600.png), [transparent export](evidence/cartographic-elements/unselected.png). The full isolated run, including 2× export and preset gallery, is retained under `.cartography.local/1790270577104/` (ignored local test data). The test service was stopped.
- No full suite or separate broad e2e suite was run. Earlier acceptance-script runs stopped on test locator/empty-body mistakes; those were corrected and the complete script then passed.

## Limits and follow-ups

- Border/frame objects, embedded inset maps and new POI/number marker types were optional and are deferred. Decorative frames of titles/panels are implemented.
- Existing Liberation Sans normal/bold/italic variants and glyph fallback remain. No complex-script shaping, curved labels, rich text, new font packs, shadows or user-authored themes.
- Scale-bar distance is always derived, rounded to five significant digits; no manual false scale. Independent compass art does not change geographic north.
- Existing maps load unchanged in this application. Older binaries may refuse new fields/kinds, as with the prior format-12 optional-field extensions.
- The requested develop branch does not exist: this checkout is on unborn master with all repository files untracked. Work stayed in the existing directory without checkout/reset/commit.
- No broad unrelated suite, Windows/native-launcher validation or Windows package build. No push, merge, release, publish, deploy, upload or cloud change. Existing data and packages were preserved.

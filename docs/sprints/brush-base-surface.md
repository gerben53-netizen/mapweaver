# Brush base surface fix

Date: 2026-09-28

## Result

Battlemap Texture Brush paints without an Area, on a sparse implicit surface bounded by the actual map. New base masks render above the unchanged background and below Areas and other artwork. Paint inside visible filled Areas retains the existing overlay. No Area is created. Erase reveals the original background; Blend changes mask coverage. Both surfaces commit as one undoable gesture.

`map.texturePaint.baseTiles` is optional version-3 data sharing the existing materials and layer controls. Loading does not rewrite legacy `tiles` or reveal previously clipped paint. Limits aggregate both surfaces. Map-edge clipping and path breaks prevent captured pointer movement outside the map from connecting distant re-entry points.

## Main files

- `src/domain/textureStroke.ts`: surface routing and a single gesture result.
- `src/domain/terrainBrush.ts`: explicit path break and shared touched-tile budget reporting.
- `src/domain/terrainPaint.ts`: optional base masks, strict combined validation and ZIP ID remapping.
- `src/canvas/TerrainBrushController.tsx`, `TexturePaintNode.tsx`, `MapContent.tsx`, `drawTexturePaint.ts`: input, preview and base render pass.
- `src/export/scene.ts`, `render.ts`: matching PNG pass.
- `src/app/TextureBrushTools.tsx`: corrected explanatory caption.
- ADR 0047 and README: persisted field and surface policy.

## Validation

- Targeted Vitest: 39 passed in textureStroke, textureBrush, terrainPaint, texturePaintActions and terrainPaintActions tests.
- Service tests: 3 passed. Legacy/base masks survive actual SQLite reopen, ZIP remapping and verified backup restore; original image bytes remain exact.
- TypeScript check: passed.
- ESLint for all changed source/test files: passed.
- Production client/service build and font-resource check: passed. Existing large-chunk advisory remains.
- Isolated Chrome browser at 1280×720, real pointer strokes and material picker: empty-map Paint, Erase, Blend, boundary painting, keyboard undo/redo, autosave/reopen, explicit save/reopen and editable archive roundtrip passed.
- Empty-map and background-map PNG exports are byte-identical before/after reload. Background Erase yields the exact original unpainted export and source hash. Mixed base/Area strokes leave all Area data unchanged. No browser errors.

Evidence: `deliverables.local/Brush-Base-Surface/`, including PNG exports, editor screenshots and `browser-results.json`. Reproduction script: `.qa.local/brush-base-browser.mjs`, using an isolated temporary service dataset, never the user's production data.

No full test suite, Windows packaging or external actions performed. Existing mask resolution and bounded storage limits are unchanged; this is not an unlimited raster surface.

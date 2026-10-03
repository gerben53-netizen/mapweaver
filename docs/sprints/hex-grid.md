# Hex Grid & Snapping — delivery report

26 September 2026. Existing develop workspace retained; no branch reset or unrelated refactor.

## Delivered behavior

Square remains the default for old maps. Map settings now expose Hex — Flat top and Hex — Pointy top, diameter, center-origin offsets, visibility, snapping, color, opacity and draw order. Diameter means opposite corners, not edge-to-edge distance; World/Regional maps also show the derived existing world scale. Changes are live and undoable. Hex battlemaps show map dimensions in pixels instead of misleading square counts.

The central axial q,r module (cube rounding internally) supplies both orientations, center conversion, corners, neighbors and unique grid edges. Integer lattice corners make adjacent exact cells share identical vertices. One bounded cached edge list is drawn as one clipped canvas path, including PNG export. No per-cell UI nodes or persistent cell database.

Stamp placement and smart markers use the nearest cell center. Movement follows existing selection-center and object-guide conventions; Snap off and Alt retain free placement. World square geographic guides preserve their existing behavior. Hex mode uses the same grid layer as battlemaps.

Land / Water → Hexagon adds Snap to hex grid and Match one hex cell. Match sets the grid orientation and diameter, locks rotation, and produces the exact six shared corners. Adjacent Exact cells merge into an editable Landmass; removing one subtracts its footprint. Soft/Rough remain available. Brush options are temporary; grid config and resulting native land geometry persist. One completed stroke is one undo step.

## Main files

- `src/domain/hexGrid.ts`, `landHexGrid.ts`: shared geometry and brush adapter.
- `models.ts`, `mapSettings.ts`, `projects/format.ts`: optional grid type, admission and shared snapping.
- `canvas/drawGrid.ts`, `MapContent.tsx`, `MapCanvas.tsx`, `export/render.ts`, `export/scene.ts`: render, ordering, density handling and export.
- `app/MapSettingsPanel.tsx`, `editorUx.ts`, `ExportControls.tsx`: contextual settings and export information.
- `domain/hexLandShape.ts`, `landBrush.ts`, `canvas/LandBrushController.tsx`, `LandBrushFootprint.tsx`, `app/LandBrushTools.tsx`: shared exact corners and gesture integration.
- `domain/hexGrid.test.ts`, `canvas/hexGridRendering.test.ts`, `app/HexGridSettings.test.tsx`: regression coverage.
- `scripts/validate-hex-grid.mjs`: isolated real-browser workflow, local-service save/reopen, screenshots and pixel comparison.
- [ADR-0040](../adr/0040-hex-grid.md), [usage](../hex-land.md), README and AGENTS glossary.

## Validation

Targeted Vitest run: 77 tests passed in 10 files (hex geometry, old square grid, land geometry, brush UI, rendering, store/history and editor map context). Then two additional tests for actual stamp placement passed with the geometry suite: 11/11. Total current targeted cases: 79. No full suite was run.

`npm run typecheck` passed. Scoped ESLint passed for every touched TS/TSX implementation/test and the browser script. Final `npm run build` passed, including client/service TypeScript compilation, Vite builds and font-resource check. Existing >500 kB bundle warnings remain; no build error.

Both real-browser orientations passed marker center placement, matching land, adjacent union, one-cell removal and undo/redo. Local-service save/reopen preserved the complete snapshot. All four editor/export comparisons (flat/pointy × 1×/2×) had **zero different pixels**, with the editor at logical zoom 1. No browser page errors occurred.

Uncached geometry measurement at diameter 50 px: 1200² map, 2,728 visible edges in 2.4 ms; 4000² map, 29,639 edges in 8.1 ms. These are local single-run measurements, not a general FPS guarantee.

Browser evidence and measured performance: see `deliverables.local/Hex-Grid/validation.json` and the screenshots/PNGs in that folder. Browser checks use installed Chrome at 1280 × 720 against fresh isolated local service storage. No personal project data is used.

## Boundaries and follow-up

The map-wide candidate limit is 40,000 padded axial cells. Denser grids show a notice and do not draw; zoomed-out cells below six screen pixels are also hidden without inventing a coarser grid. Snap geometry remains unchanged. Grid-inclusive export rejects over-budget density and diameters below six logical pixels; export without grid remains available. Edge enumeration is cached; it is not yet viewport-culling based.

Object guides retain existing precedence over center snapping. Free geometric tools inherit the shared point snap where they already used grid snapping. There is no new center/edge/corner snap-mode selector. Decorative coast effects can extend around the exact native polygon boundary. Flat and pointy grid changes do not rotate or resize existing objects.

Recommend a later explicit Paint hex cells workflow using the shared axial coordinates, with a separate decision on whether semantic cell records are needed. No movement costs, ownership, encounters, fog, pathfinding or hexcrawl systems were introduced.

No external actions were performed. No new Windows package was created for this sprint.

## Screenshots

![Flat-top grid at 1280 × 720](../../deliverables.local/Hex-Grid/flat-editor.png)

![Pointy-top grid at 1280 × 720](../../deliverables.local/Hex-Grid/pointy-editor.png)

![Matched hex controls](../../deliverables.local/Hex-Grid/pointy-controls.png)

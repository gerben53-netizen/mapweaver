# Coastal Contours & Water Cartography — delivery

## Acceptance and scope

Add optional independent map-space coastal lines, 0–3 counts, stable theme presets, deterministic variation, small-island limits, sensible close shores/lakes, open river mouths, saved/undoable settings, shared editor/PNG output, bounded caching and copied before/after evidence. Preserve existing Water Depth and maps with no contour configuration. Work stays on the existing `develop`; no package or external action.

Implemented **Water Depth → Coastal contours** with preset, lines, spacing, opacity and variation, plus advanced width, spacing, falloff, color and lake inclusion. Four presets: Painterly Atlas (3 light lines), Engraved (3 ink lines), Minimal (1 subtle line, lakes off), Dark Fantasy (2 pale gray-blue lines). Preset size scales with map dimensions. Theme application follows existing ownership/override behavior. Off and disable preserve settings; changes use undo/redo.

## Implementation

`src/domain/coastalContours.ts` owns validation, presets, bounded component/distance analysis, marching-squares contour segments, mouth suppression and the two-entry cache. `src/canvas/drawCoastalContours.ts` supplies the shared renderer. `MapContent.tsx`, `export/scene.ts` and `export/render.ts` place it above semantic water/depth and below foreground artwork. `CoastalContourControls.tsx` supplies the controls; `WaterDepthTools.tsx` hosts them. Model, project parser, map settings and theme application carry the optional format-12 configuration. [ADR-0042](../adr/0042-coastal-contours.md) defines the exact contract.

One combined nearest-land distance field means opposing shores merge instead of accumulating overlapping bright buffers. Ambiguous narrow saddle cells are suppressed. Island component area caps outer levels at 0.65 equivalent radius; very small islands get no lines. Lakes use the same field and therefore naturally fit fewer levels. A directional gap derived from the existing downstream river endpoint/tangent keeps mouths open. Actual water geometry clips the final vector strokes. No glow, raster blur or new shoreline halo is introduced. Existing bathymetry, shoreline and estuary rendering are untouched and remain independently editable.

## Visual evidence

Local files are in `deliverables.local/Coastal-Contours/`. `before.mapweaver` and `after.mapweaver` copy the prior Bathymetry Study and add identical narrow-strait/tiny-island geometry; only after enables contours. The source hash is recorded and checked unchanged. Velanth copies preserve its 537 objects, including 421 stamps. No original project was modified.

Each comparison has **before on the left, after on the right**, matching exact map coordinates:

- `comparison-coast.png`
- `comparison-islands.png` (includes the tiny island with no rings)
- `comparison-bay.png`
- `comparison-strait.png`
- `comparison-mouth.png`
- `comparison-lake.png`

Full study PNGs are `baseline-1x.png`, `baseline-2x.png`, `after-1x.png`, `after-2x.png`; editor screenshots and `controls-1280.png` accompany them. `velanth-before-1x.png` / `velanth-after-1x.png` show the realistic world map. Coast, island, strait, mouth and lake comparisons and the full Velanth result were visually inspected. The controls fit the 1280×720 viewport in a bounded scrolling panel.

## Checks and measurements

- 46 targeted Vitest tests passed across coastal domain/storage, Water Depth domain/UI/storage, bathymetry and world themes. New checks cover flat offsets/counts, islands, narrow opposing shores, lakes, irregular determinism, mouth gaps, preset validation, cache reuse, legacy absence, archive round trip, history and independent UI/export scene behavior.
- TypeScript application and service checks passed.
- Scoped ESLint passed for modified TypeScript and benchmark scripts.
- Production build passed, including service and 8 font-family/license checks. Existing >500 kB chunk warnings remain.
- Isolated local service + Chrome harness: exact complete snapshots after save/reload, undo restoration through real controls, no browser errors, no changes to source files.
- Study editor vs exported PNG: **zero different pixels at 1× and 2×**, before and after. Velanth: **zero different pixels at 1×**, before and after.

| Measurement | Before | After |
| --- | ---: | ---: |
| Study pan median / p95 | 35.9 / 36.1 ms | 35.9 / 36.2 ms |
| Velanth pan median / p95 | 76.8 / 85.1 ms | 77.1 / 82.4 ms |
| Study export 1× / 2× | 110 / 260 ms | 90 / 266 ms |
| Velanth export 1× | 1430 ms | 1398 ms |

Pan measures two animation frames per viewport update, 5 warmups then 40 samples, not raw single-frame FPS. Neither run allocated new canvases during pan. Timings vary; these show no material contour-related pan regression, not an overall smoothness guarantee for heavy maps. Study geometry cold build was 273 ms; 100 cached requests with unrelated stamp changes cost 2 ms and caused zero rebuilds. Three levels contained 2085 / 2075 / 2113 small segments. Settings/geography changes rebuild synchronously, not per pan or unrelated stamp/label edit. Machine-readable results are `validation.json` and `validation-velanth.json`.

Reproduce with `node scripts/build-coastal-benchmark.mjs`, `node scripts/validate-coastal-contours.mjs`, `HEAVY_ONLY=1 node scripts/validate-coastal-contours.mjs` (set the environment variable using the local shell), then `node scripts/coastal-contour-comparisons.mjs`. The validator requires a built local service and the saved source benchmarks.

## Limits

The 768-interval grid approximates tiny coast details and chamfer distances have directional error. Deliberately suppressed strait/island/mouth segments can end abruptly; the system does not promise a closed ring at every level. Boundary-connected lakes count as ocean. Very dense custom spacing can exceed the effective grid detail. First calculation can briefly pause interaction; only cached pan was measured on Velanth. Heavy-map 2×, all browser engines, every advanced-style combination and the full unrelated suite were not tested. No new physical bathymetry, automatic geometry repair or hydrology simulation is implied.

No push, merge, publishing, deployment, upload or cloud changes were performed. No Windows package was built.

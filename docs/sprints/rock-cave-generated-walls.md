# Rock/Cave Generated Walls — engineering sprint

Acceptance: open/closed native cave walls without Areas; independent two-wall corridor; broad/tight/S curves, corner, free ends, passage, T/crossing; four physical widths; bounded irregular opaque coverage; Roughness/Variation/seed; exact history/storage/PNG roundtrips; existing wall families and Campfire unchanged; standalone production commission. No installer, push or Premium art.

Implemented the data-driven `rock` strategy (ADR-0057) and nine diagnostic PNGs: three variants each of large 1-ft, medium 0.75-ft and small 0.5-ft square masses. Square untrimmed canvases retain centered anchors and uniform scaling. Default width 1 ft, Roughness 55%, Variation 70%; existing width presets 0.5/1/2/3 ft and Randomize use stored native recipes. No Density control or specialized sprites. The renderer, final/preview cache, openings, layers, selection, history and service/archive format remain shared.

Opaque core overlap guarantees continuity, edge masses bound silhouette roughness, scattered surface masses break parallel coverage patterns. Ordinary masses round practical corners/closed seams without oversized corner blobs. Free ends are naturally rounded; openings split intervals and retain the shared wide exclusion clip. Independent junctions overlap using existing object order; no scene stamps, floor Areas or graph fusion.

## Local outputs

- `deliverables.local/Rock-Cave-Generated-Walls/rock-cave-benchmark.mapweaver`: native editable 400 × 300-pixel / 40 × 30-ft scene, 50 px = 5 ft. Fifteen Walls and two passage Openings, no Areas or decorative stamps. Includes all required geometries, widths and closed cave/corridor.
- Same directory: fit editor, 100%/75%/50% screenshots, `benchmark-1x.png`, `benchmark-2x.png`, geometry contact sheet and individual curve/tight-curve/corner/endpoint/passage/Heavy-Massive/corridor/repetition crops of actual PNG export. `browser-results.json`, `pixel-coverage.json` and performance measurements are local evidence.
- `deliverables.local/Rock-Cave-Wall-Production-Spec/` and matching ZIP: standalone WORK handoff with complete Markdown, JSON for nine exact IDs/filenames/canvases/physical footprints/safe bounds/anchor/rotation/scaling/weights/opaque disks, reference PNGs and relative-scale layout. Recommended first commission: **Natural Cave Rock**. No application/code/database knowledge required.

All artwork references/contact sheets say DEVELOPMENT ONLY / DO NOT COPY VISUAL STYLE. The diagnostic colors deliberately distinguish roles; their simple cracks/flat surfaces are not production quality. Final premium fidelity and repetition review require production artwork integration. The geometry engine is accepted using current fixtures, not advertised as Premium cave art.

## Validation

Focused tests cover admission/defaults/invalid cross-strategy recipes, width/aspect/bounds, seed and controls, straight/broad/tight/S/corner/closed opaque core coverage, endpoints/passage mutation, bounded admission, native undo/redo and SQLite/archive exact recipe persistence. Existing Living Root, masonry, pale stone, Marble, continuous/legacy walls, openings, canonical Campfire and window-light tests are retained. Explicit rock Campfire regression proves rendering controls do not alter semantic walls, doors, windows or authored lighting.

Isolated browser acceptance uses nonstandard local ports 48282/48283 and a new `.qa.local/rock` dataset. Real clicks/Enter, double-click and click-start create open/open/closed native walls. Properties Randomize and Ctrl+Z/Y restore exact objects. Native node/curve/width/Roughness/Variation edits and opening add/remove undo/redo exactly. Autosave/reload produces byte-identical PNG; native ZIP transfer is exact. Actual transparent final exports on 1×/2× sample opaque center/inner band and clear passage centers for every benchmark wall. No user database was opened or changed by this validation.

Typecheck, targeted ESLint, client build, service build and full build are required. Full build includes canonical Campfire provenance check and bundled font/license resource check. Existing large-chunk/dynamic-import build warnings are outside this scope. Initial cold Vite navigation timed out in the test harness; waiting for the UI instead of DOMContentLoaded and disabling file-watch reloads during acceptance allowed complete verification, without application changes.

## Limits

Retain shared 12,000 transient placements, 4 Mi-pixel surfaces, 16 Mi-pixel source/cache and 4096-pixel surface edge budgets. Local seed indexing stabilizes earlier spans; opening edits and changes in physical width can repack their affected interval. Independent intersections are ordinary overlaps, not globally fused rock geology. Very tight/self-crossing routes relative to wall width naturally become merged rock masses; author practical curves. Future artwork must preserve opaque disk/safe radial bounds or coverage guarantees no longer hold. No development resources or production artwork are silently replaced in user maps.

## Recorded results (3 October 2026)

89 focused client tests and 12 service tests passed (101 distinct tests; related reruns are not added to this count). TypeScript and targeted ESLint pass. Separate client/service and full builds pass; canonical Campfire provenance and all eight bundled font families/licenses pass. Browser acceptance completed all ten check groups without page exceptions, including thirty isolated final-PNG coverage cases (15 Walls × 1×/2×).

On this machine, 15 final wall surfaces rebuilt from already decoded PNGs in 47.3 ms. Cached benchmark redraw averaged 0.186 ms. Fifteen changing-curve previews measured 5.8–16.5 ms (median 8.2 ms). PNG 1× took 60.8 ms and 2× 58.7 ms with assets loaded. These are representative local measurements, not portable frame-rate guarantees. Surface ratio was 0.5 during editing previews; PNGs use final quality.

The producer ZIP was inspected: nine byte-identical DEV reference PNGs, JSON, two Markdown instructions and a readable component/assembly layout. Raster alpha checks validate opaque cores, safe gutters, bounded one-pixel antialias fringes and zero-RGB transparent pixels. Proof crops/contact sheet were visually inspected; clearly DEV geometry with coherent curves/corners/endpoints/passages and an unobstructed corridor. Optional Dressed Rock and specialized sprites were unnecessary.

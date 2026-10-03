# Generated Wall System — sprint report

2026-09-28

## Delivered

Living Root is an additive native Wall rendering mode. One editable Wall owns nodes/handles, nominal width, physical reference and a small `{id, revision, seed, organic, growth, overgrowth}` recipe. Transparent PNG components form transient root runs; no scene stamps or persistent component placements are created.

The validated data registry accepts immutable definitions with weighted component roles and physical dimensions. The material/generator chooser lists registered definitions. The included `living-root@dev-1` pack contains 28 transparent development PNGs; production artwork is deliberately not claimed. [Authoring instructions](../wall-sets/CREATE-GENERATED-WALL-PACK.md) describe replacement packs and revision retention.

Width presets use 2/3/5/7 primary runs for Thin/Standard/Heavy/Massive. Organic applies coherent offsets and restrained variation; Growth adds smaller roots/knots; Overgrowth adds moss/leaves. Clean remains root-only. Tangent sampling and overlap follow curves; sharp corners get a small knot. T-junctions/crossings retain ordinary z-order/overlap without a graph. Opening intervals interrupt generation and a wide opening-only cutout prevents protruding roots crossing doors. Free ends use tapered components. Nominal geometry continues to control selection/snapping; separate rotated graphic bounds allocate the surface without nominal-envelope clipping.

## Caching and persistence

A cache key includes only geometry, width/physical reference, alignment, generator revision/parameters/seed, openings and preview quality. Unrelated scene changes and zoom do not regenerate it. Final surfaces use up to 2 samples per map pixel; edit previews use 0.5. Allocation is bounded to 4M pixels per surface, 4096 px per axis, 128 retained surfaces / 16M retained pixels. Components load sequentially under a separate 16M decoded-pixel budget. Validated component count is bounded to 12,000 per Wall.

Existing history, autosave, SQLite and `.mapweaver` transport persist the native recipe. The benchmark project is about 7 KB and contains eight Walls and two attached openings, no stamps/assets. Reload/export is byte-identical. Existing simple, texture, strip/segment and continuous walls are not converted or changed; no user data was reset.

## Important files

- `src/domain/generatedWalls.ts`, `livingRootPack.json`: definition admission, immutable registry, presets and physical scale.
- `src/domain/generatedWallGeometry.ts`: deterministic placement and separate visual bounds.
- `src/canvas/drawGeneratedWall.ts`, `useGeneratedWallImages.ts`: bounded image loading and shared cached compositor.
- `models.ts`, `walls.ts`, `wallStylePatch.ts`: additive model, validation and atomic mode changes.
- `drawWall.ts`, `PathPaint.tsx`, `PathPoints.tsx`, `export/render.ts`: native editor, draft/edit preview and PNG integration.
- `GeneratedWallFields.tsx`, `WallFields.tsx`, `InspectorQuickProperties.tsx`: existing toolbar/inspector integration.
- `public/generated-walls/living-root-dev-1/`, `scripts/build-generated-wall-fixtures.mjs`: reproducible development PNGs.
- Generated domain/UI/service tests, AGENTS, README and [ADR-0051](../adr/0051-generated-walls.md).

## Validation

- 46 targeted domain/UI tests passed: metadata admission, determinism/reseed, primary run widths, parameters, curves, closed loops, openings, visual/nominal bounds, cache inputs, native transformations and exact undo/redo. Existing walls, wall materials, continuous materials and openings tests remain green.
- 2 service tests passed: real SQLite reopen and ZIP transfer preserve recipes/placements with zero scene assets; all component resources decode as transparent PNGs under image budgets.
- Typecheck, scoped ESLint, production client/service build and font-resource check passed. Existing Vite chunk-size advisory remains.
- Isolated Chrome workflow used the actual Wall Tool selector, pointer creation, Randomize and keyboard undo/redo. Autosave/reload and editable project roundtrip passed; PNG before/after reload is byte-identical. No page errors.
- PNG dimensions are 1400×1050 and 2800×2100 for the same 40×30-ft map. Door pixel checks cover 6,720 clear pixels; 112 painted pixels prove visible protrusions beyond the nominal width. Mean 1× versus downsampled 2× channel difference: 0.276/255.

A measured browser run generated the eight finished walls in about 26 ms after component loading. Cached drawing averaged about 0.1 ms of canvas calls per full benchmark redraw; this is CPU submission time, not a GPU frame-rate claim. Curve-edit previews measured roughly 7–28 ms (median 10.8 ms). PNG creation measured about 52 ms at 1× and 140 ms at 2×. Exact latest observations are in `deliverables.local/Generated-Walls/browser-results.json`.

## Visual evidence

The benchmark contains a long straight wall, broad curve, sharp outside/inside corners, free ends, two openings, T-junction, Heavy and Massive sections, exclusively native Walls and their attached openings.

![40×30-ft generated wall benchmark](../../deliverables.local/Generated-Walls/benchmark-1x.png)

![Normal play zoom](../../deliverables.local/Generated-Walls/normal-play-zoom.png)

![Separate Clean reference, no texture-filled strip or vegetation](../../deliverables.local/Generated-Walls/clean-root-reference.png)

Additional evidence: `benchmark-2x.png`, `benchmark-editor.png`, `before-reload.png`, `after-reload.png`, `pixel-results.json`, and the editable `living-root-benchmark.mapweaver` in the same directory. Reproduction scripts: `.qa.local/generated-walls-browser.mjs` and `.qa.local/generated-walls-pixels.mjs`. Browser checks use a fresh isolated service dataset.

## Limits / not performed

Production-quality root artwork remains a separate authoring task. Generated pack registration is bundled data/code integration; there is no new generated-pack ZIP-management UI. Very large walls reduce raster detail under fixed surface budgets. Tight self-overlaps and translucent junctions use ordinary compositing, not a topology solver. No full unrelated test suite, Windows package, push, deployment or external action was performed.

# Sprint 9 — PNG export and v1 release preparation

## Acceptance scope

Full-map, viewport-independent 1×/2× PNG; visible paint order including locked layers; shared stamp/pattern transforms; clipped background and grid; transparent map color independent of background image; bounded decoding/memory, failure isolation and temporary-resource cleanup. Export settings describe exact/partial grid cells for manual Roll20 alignment. Native modal focus/Escape and disabled/busy states support the main actions. No project format change, server, VTT integration or new export format.

## Implementation

`export/scene.ts` constructs explicit immutable paint items and output/coverage information from map/layers/objects only. `export/render.ts` uses a detached Konva Group, shared `objectNodeProps`, `patternPaintProps` and `drawGrid`, and `toCanvas` at the requested pixel ratio. No live Stage, selection, tool preview or editor state is accessed. Grid lines occupy one map pixel (two output pixels at 2×). Grid inclusion starts from editor visibility but is independently selectable.

Limits: 32 million output pixels, 16,384 per edge, estimated 512 MiB working image budget (8 bytes/output pixel for Konva drawing buffers plus 4 bytes/decoded source pixel). This is a bounded estimate, not a browser memory guarantee; existing editor allocations and PNG encoding overhead are additional. Headers and aggregate allocation are checked before bitmap decoding; actual decoded sizes are checked again. Only visible source references are required. Bitmaps close in finally, nodes are destroyed, output canvases cleared and download URLs revoked after 30 seconds. Export never marks the project clean or records history.

Native dialogs now provide focus containment/restoration and Escape dismissal when idle. Global editor shortcuts ignore modal descendants. The package version is the source of the displayed application version. The existing v1 project format is unchanged.

The former 695.66 kB / 219.07 kB gzip monolithic bundle is split into independently cacheable React, canvas and storage dependencies and application code; export rendering loads on demand. Largest resulting chunk: React 347.69 kB / 106.94 kB gzip; canvas 146.38 kB, storage 111.86 kB, app approximately 95 kB, export approximately 2.5 kB. Total code size is similar; no functionality was removed or warning threshold raised. The 500 kB warning is absent.

## Targeted validation

Seven cases in `src/export/export.test.ts` cover dimensions, order/excluded UI, grid placement, transparent color, real Konva node transform attributes, missing assets/limits without state mutation, and exact/partial cell information. jsdom only mocks Konva's pixel-privacy probe; these tests make no claim about actual PNG pixels. TypeScript, changed-scope ESLint and the production build are the technical checks. No old sprint suite or broad automated regression suite is part of this sprint.

## Manual release checklist

Prepared ignored local fixture `.qa.local/release-check.mapweaver`: 1200×800 background, 100 stamps (one on a hidden layer), four repeat/stretch patterns, three layers including a locked visible layer, alpha, mirrors/rotations/offsets, edge clipping and visible grid. Generator and source PNGs are also local and ignored; no binary fixture is added to version control.

Pending browser checks: one complete new/background/stamp/layer/transform/grid/pattern/undo/redo/save/open/export workflow; PNG inspection at 1× with grid and 2× without grid; 1280×720 layout/focus; representative-map interaction/export; unsaved confirmation and startup recovery from Sprint 8. Earlier unresolved pointer checks (real stamp placement/pattern drawing, modifier panning/snap) remain relevant. Automated adapter tests do not replace these checks. Record observed results below; do not infer success from generated fixtures.

# Premium Refined Timber production integration

Accepted 4 October 2026. Status: **PASS WITH NOTE**. `refined-timber@production-1`, displayed as **Verfijnd hout**, is production content in the existing generic `linear` strategy. Defaults: width 1 ft, Regularity 95%, Variation 20%. No geometry, renderer, project-format or Campfire contract changes were required.

## Source and admission

Input: `Premium-Refined-Timber-Generated-Wall-Component-Pack.zip`. Only the six final `artwork/` C2 files were admitted. The supplier reports six C1 rejections after their one permitted correction, six C2 KEEP and no outstanding FIX. Rejected C1 artwork is not registered. All admitted files are byte-identical to the supplied PNGs; no repaint, recolor, mirroring, rescaling or alpha correction was performed during integration.

| Component IDs / filenames | Role | Pixels | Physical footprint | Anchor | Weight |
| --- | --- | --- | --- | --- | --- |
| beam-long-1.png, beam-long-2.png | beam-long | 1024 × 128 | 4 × 0.5 ft | 512, 64 | 1 each |
| beam-medium-1.png, beam-medium-2.png | beam-medium | 512 × 128 | 2 × 0.5 ft | 256, 64 | 1 each |
| beam-short-1.png, beam-short-2.png | beam-short | 128 × 128 | 0.5 × 0.5 ft | 64, 64 | 1 each |

IDs omit `.png`. All six are RGBA8/sRGB at 256 source px/ft. Each has a fully opaque rectangular core, a two-pixel transparent-black gutter, no holes or stray gutter pixels, and full-canvas-center anchor. Independent preflight found zero violations. Bounds and source hashes are recorded in [production provenance](refined-timber-production-provenance.json). Hashes match the supplier's C2 report. The supplier grants Mapweaver use/edit/distribution under applicable generated-output terms, with no additional restriction; it does not guarantee exclusive copyright or independently audited rights.

Artwork depicts overhead sawn timber, with longitudinal grain, without floor surroundings, front-wall faces or baked cast shadows. Existing local-heading placement remains: long/medium grain follows construction direction; short join stock follows tangent/fan. There is no arbitrary quarter-turn variation or mirroring. Existing X-crop handles length remainders; row-depth scaling is uniform. Longer stock is not bent to follow curves, and Heavy/Massive widths use multiple rows.

## Actual Mapweaver review

Reused the existing editable Linear/Timber benchmark: 12 native walls, two passages, preserved IDs, geometry, handles, widths and initial seeds; only material ID/revision changed. Later Randomize was tested explicitly. Straight, broad/tighter curves, S-curves, 90-degree corner, endpoints, passages, independent T/cross objects and Thin/Standard/Heavy/Massive all passed. Inner-band coverage sampled 2,397 opaque positions and six clear passage positions at each of PNG 1× and 2×. Map-edge output matched a crop of the full native export at raw-pixel level.

Grain tracks local construction heading. Short stock at turns gives bounded ordinary construction joins, without holes or oversized overlaps; small outer square steps can remain at sharp joins. Long-wall and multi-row review found consistent C2 tone without the rejected C1 light/dark parquet blocks or dominant knot/join pattern. Two variants per role still mean finite recognizable grain repetition at close inspection.

Actual room/corridor contexts use independent open native walls, an attached door/passage and accepted Natural Wood, Pale Wood, Paleisparket and Pale Stone floors. No decorative stamps hide joins. Alignment, bounded silhouette and warm tone distinguish structural timber from floors. Comparable native geometry on the same background distinguishes refined, manufactured timber from organic Living Root.

Editor proofs at 100%, 75%, 50% and fit, plus final-quality PNG 1×/2×, retain wall silhouette, corners and openings. **Non-blocking note:** fine grain and individual row joints disappear at low zoom, especially Thin at 50%; similarly toned wood floors reduce contrast. No artificial outline, shadow or artwork contrast modification was added. This is not a premium-grain-detail guarantee at canonical 10 map px/ft.

## History, storage and performance

Real Wall Tool clicks with Enter, double-click and clicking the start node created respectively independent open and closed native walls. Native node/curve/width/Regularity/Variation edits, Randomize and opening add/remove each passed undo/redo; real keyboard undo/redo was also exercised. Autosave, SQLite project reopen and editable archive roundtrip retained native geometry, material and deterministic seed. Before/after reload PNGs were byte-identical.

Measured on the local 12-wall fixture: initial cached surfaces 15 ms, cached redraw 0.14 ms, changing curve preview 2.0–3.5 ms, final PNG 1× 24.3 ms and 2× 37.4 ms. These are fixture measurements, not general performance guarantees. QA used disposable local data on isolated loopback ports 48290/48291; existing instances and user data were untouched. A cold-start splash timeout was retried; the completed run reported no page errors.

## Validation

- `npm run test -- src/domain/linearWalls.test.ts src/app/GeneratedWallFields.test.tsx src/campfire/contract.test.ts`: 41 passed.
- `npm run test -- src/domain/generatedWalls.test.ts src/domain/masonryWalls.test.ts src/domain/rockWalls.test.ts src/domain/continuousWallMaterial.test.ts src/domain/walls.test.ts src/domain/openings.test.ts src/campfire/windowLights.test.ts`: 68 passed.
- `npm run test:service -- service/generatedWalls.test.ts`: 24 passed.
- Total: **133 focused tests passed**. Coverage includes production admission/defaults, component hashes/dimensions/core, deterministic placement/local heading/crop, widths/curves/openings, persistence, default inventory and current Campfire semantics.
- `npm run typecheck`, targeted ESLint for the six modified TypeScript/TSX files, `npm run build:client`, `npm run build:service` and full `npm run build`: passed. Full build also verified canonical contract provenance and bundled font licenses. Existing chunk-size/dynamic-import warnings remain.
- Local actual-browser QA: 15 checks, zero errors. No full unrelated suite or installer build was run.

Living Root, masonry including Pale Stone/Marble/Rough Stone, Rock/Cave including Natural Cave Rock, linear DEV, legacy/continuous walls, openings and Campfire door/window/light semantics remain green. Canonical Campfire files were not changed.

## Distribution and future artwork

The canonical default-content inventory includes Verfijnd hout and provenance; public production PNGs are part of normal application builds and future installer content. Unselected DEV materials are hidden from normal choices in both development and installer builds. Exact saved DEV selections still resolve; no DEV definitions or user maps were removed. No Windows package was built.

Future Rustic/Heavy Timber can use the same six-role contract and generic engine without pack-specific geometry. Keep all roles in one coherent palette, shorts at the same physical grain density, opaque core/gutter unchanged and longitudinal heading intact. Avoid signature repeating knots, strong alternating tones, end-grain blocks, floor-like broad assemblies or baked lighting. No Rustic/Heavy or palisade implementation was added.

## Local evidence and changed files

Ignored evidence: `deliverables.local/Refined-Timber-Integration/`, including `integration-report.md`, `preflight.json`, `browser-results.json`, editable `refined-timber-benchmark.mapweaver` and `context.mapweaver`; benchmark/editor 100/75/50%, grain-direction, long-wall repetition, curve/S-curve, corner, endpoint/opening, Heavy/Massive, wood/stone context, Living Root comparison, coverage and clipping proofs, plus PNG 1×/2×. Named detail proofs are crops of actual final exports, not altered source artwork.

Tracked changes: new pack metadata and six production PNGs; registry and Wall choices; focused domain/UI/service/Campfire regression tests; default-content inventory, provenance, this report and ADR-0058 follow-up. Local proofs and QA data are excluded from Git. One local sprint commit on `develop`; no push, user-data reset, contract edit or external action.

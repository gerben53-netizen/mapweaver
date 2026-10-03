# Masonry Generated Walls — implementation and validation

3 October 2026, develop. Feature implementation and local validation delivered. Full build remains blocked by the pre-existing canonical Campfire fingerprint mismatch; the contract and fingerprint guard are intentionally untouched.

## Implementation

One `masonry` strategy in the existing Generated Wall registry/renderer. No new object subsystem, graph, Area dependency, scene-stone stamps or production-art changes. Two data definitions, **Masonry Rough — DEV** and **Masonry Dressed — DEV**, share six diagnostic PNGs: two large, two medium, two small/filler. Small stones also supply corner/end/jamb reflow; no additional component role was necessary in the benchmark.

Existing Wall Tool/Properties expose Width, Regularity, Variation and Randomize variation. Thin/Standard/Heavy/Massive remain 0.5/1/2/3 ft. Rough defaults are 25% Regularity / 70% Variation; Dressed 90% / 20%. Width selects staggered courses; Regularity restrains rotation and lateral disorder; Variation controls weighted choices and bounded size/offset/rotation variation. Definitions choose defaults and artwork; material names do not choose geometry.

Only native path geometry, physical width/reference, generator ID/revision, seed and parameters are persisted. Opening objects retain existing independent attachments. Blocks, source cropping and raster surfaces are temporary. Living Root's algorithm, component IDs, metadata and production artwork remain unchanged. Installer builds hide DEV choices except the exact saved generator ID/revision; no installer was built.

## Benchmark and proofs

All output paths below are repository-relative ignored local deliverables under `deliverables.local/Masonry-Generated-Walls/`:

- `masonry-benchmark.mapweaver`: editable 40 × 30 ft map, 400 × 300 map pixels, canonical 50 px = 5 ft. Eleven native walls, two attached passages, zero Areas and zero stamps.
- `benchmark-editor.png`: actual editor fit view; `closed-wall-editor.png`: real click-start closed-wall interaction.
- `editor-100-percent.png`, `editor-50-percent.png`, `normal-play-zoom.png` (200%, 100 screen px per 5-ft square).
- `benchmark-1x.png`, `benchmark-2x.png`, `rough-benchmark-2x.png`: actual shared Mapweaver export renderer.
- `curve-closeup.png`, `corner-closeup.png`, `opening-end-closeup.png`, `t-cross-closeup.png`: crops of actual native 2× export, not substitute artwork.
- `before-reload.png`, `after-reload.png`: byte-identical exports after native autosave/reload.
- `browser-results.json`: interaction results and timings; `performance-partial.json`: captured rendering timings.

Geometry covers long straight, broad curve, S curve, 90° corner, independent free endpoints, two passages, T, crossing and all four widths. Real pointer interactions verify Enter/double-click finish open and clicking the start closes. Properties Randomize and keyboard undo/redo preserve exact native objects. The portable `.mapweaver` archive roundtrip retains the same objects/recipes. The benchmark itself was saved/reloaded through an isolated local service, not through the user's data directory.

T/crossing walls remain independent and use ordinary z-order overlap, as Living Root already does. There is no cross-object masonry coursing/repacking or global wall graph. End residuals can crop filler artwork rather than squash it. Corner filler and opening-only clipping keep passages open without clipping all stones to a rectangular wall envelope. Extreme tight curves, acute/reversing corners and enormous widths are outside the demonstrated practical benchmark and may need smaller widths or separate walls.

## Measured performance

Headless installed Chrome, warmed component images, isolated service 48270 / editor 48271; existing application processes inspected and untouched. Measurements are local observations, not a throughput guarantee:

| Operation | Time |
| --- | ---: |
| Cold surface generation for all 11 finished benchmark walls | 10.7 ms |
| Cached redraw, average over 50 repetitions | 0.10 ms |
| 15 changed curved-path draft previews | 2.7–4.6 ms each |
| Actual PNG 1× export | 15.4 ms |
| Actual PNG 2× export | 18.6 ms |

These generation measurements exclude first image download/decode. Existing shared limits remain: 12,000 transient components per wall, 4,194,304 surface pixels, 4096 maximum surface edge, 16,777,216 retained pixels. Admission now accounts for masonry courses and conservative opening/corner allowance. Large walls may receive lower raster sampling or require splitting. No speculative worker/graph subsystem was added.

## External artwork handoff

`deliverables.local/Masonry-Wall-Production-Spec.zip` and its same-name folder contain:

- `masonry-component-spec.md`
- `masonry-components.json`
- `README-WORK.md`
- `reference-components/` (six PNGs)
- `proof-layout.png`

All references prominently say **DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY**. Instructions specify exact filenames, role IDs, canvas pixels, physical feet, alpha footprint/safe bounds, overhead direction, arbitrary rotation, nominal dimensions, weights, source SHA-256, delivery and artistic quality. No code/application/database knowledge is required. Exact canvas dimensions and filenames must be retained; exact development alpha patterns need not be copied. Production integration uses a new immutable revision. First recommended production commission is **Pale / Palace Stone** for Koningsboom; Marble and Rough Stone share the same six-component footprints and strategy.

Re-export with `node scripts/export-masonry-wall-spec.mjs`. Sharp may print non-writable system font-cache warnings while creating the montage; the output was produced and visually checked successfully.

## Validation

- 56 tests across masonryWalls, generatedWalls, walls, openings, continuousWallMaterial, wallMaterials and GeneratedWallFields: pass.
- 12 existing Campfire contract/export tests: pass; no contract/exporter changes.
- `npm run typecheck`: pass.
- ESLint on all changed TypeScript/TSX files and the specification exporter: pass.
- `npm run build:client`: pass (existing bundle size/dynamic-import warnings).
- `npm run build:service`: pass.
- `node scripts/check-font-resources.mjs`: pass, eight families and licenses.
- `npm run build`: blocked at `check:campfire-contract`, canonical drift `generate-schema.mjs`. This same owner-review requirement predates this sprint. No bypass or fingerprint refresh was made.
- Isolated browser acceptance: pass, no page errors; save/reload PNG byte equality and archive equality verified.
- Diff whitespace review: pass. No full unrelated suite or Windows packaging run.

Principal tracked changes: shared generated registry/types/dispatch, masonry geometry and two definitions, masonry/field regression tests, existing selector's exact saved-DEV filter, transient partial-component draw support, six development PNGs and provenance, ADR-0055 and reproducible specification exporter. User maps/library/production artwork and Campfire contract are untouched. No remote push, publish, deployment or installer/package generation.

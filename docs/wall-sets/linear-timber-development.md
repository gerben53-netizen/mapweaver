# Linear / Timber Generated Walls — engineering result

**ENGINEERING PASS — DEVELOPMENT ONLY.** A fourth Generated Wall strategy (`linear`) reuses native Wall authoring, openings, selection/layers/history, local storage and the shared render/export cache. No Premium timber artwork or installer is delivered.

## Construction and controls

Longitudinal timber members follow the path. Width presets add physical rows rather than stretching one board to fill a wall. Broad, tighter and S curves shorten stock; outside rows shorten their travel rather than stretching grain. Ordinary short stock bridges member joins, sharp corners and the closed seam. No dedicated post, corner, jamb or global graph is needed. Independent T/crossing/room walls retain separate IDs and editable paths.

| Role | Variants | Canvas | Physical footprint |
| --- | --- | --- | --- |
| beam-long | beam-long-1 / beam-long-2 | 1024 × 128 px | 4 × 0.5 ft |
| beam-medium | beam-medium-1 / beam-medium-2 | 512 × 128 px | 2 × 0.5 ft |
| beam-short | beam-short-1 / beam-short-2 | 128 × 128 px | 0.5 × 0.5 ft |

Every weight is 1. Grain authors along +X and rotates to the local member axis, with at most ~0.43° rustic skew. Short square join stock can follow local corner fans; arbitrary free rotation/mirroring of long grain is not used. The mandatory opaque source core and two-pixel gutter are documented in the Work JSON. Depth overlap is 12%; longitudinal overlap is at most 0.04 row depths (10% for short join stock). Source-cropping fits remainders, without artwork deformation. Custom widths uniformly adapt base stock to row depth before these bounded overlaps.

`timber-refined@dev-1`: width 1 ft, Regularity 95%, Variation 20%. `timber-rustic@dev-1`: width 1 ft, Regularity 65%, Variation 55%. Width/Regularity/Variation and explicit Randomize are the only controls. No Density/Spacing parameter. Both share the six diagnostic PNGs and one geometry strategy. DEV choices appear in local non-installer builds, remain hidden for new installer selections, and exact saved DEV walls still resolve.

Longitudinal and repeated-post construction were considered separately. The local repeated-post experiment shows that repeating the square longitudinal member does not establish the correct log/post cross-section orientation or spacing contract. Palisade mode is deferred, not claimed as implemented. See `repeated-post-construction-experiment.png`; it is an experiment diagram, not a supported Mapweaver wall or production proof.

## Benchmark and actual proofs

Local output: `deliverables.local/Linear-Timber-Generated-Walls/`.

- `linear-benchmark.mapweaver`: native 40 × 30 ft map, 50 px = 5 ft, 12 walls plus existing openings. Reuses the masonry benchmark geometry and adds a tighter timber curve. Long straight, broad/tighter/S curves, 90° corner, free ends, passage, T/cross and Thin/Standard/Heavy/Massive.
- `benchmark-editor.png`, `editor-100-percent.png`, `editor-75-percent.png`, `editor-50-percent.png`: actual editor fit and play-zoom checks.
- `benchmark-1x.png`, `benchmark-2x.png`, role-specific detail crops and `long-wall-repetition.png`: shared final-quality Mapweaver exports, not hand-assembled source montages.
- `coverage-1x.png` / `coverage-2x.png`: 2397 inner-band samples meet alpha >= 220 and six opening samples remain transparent at each scale. Closed seams/corners/outside alignment also have targeted geometry coverage tests. Opening-only clipping prevents timber obstructing passage; no nominal rectangular band mask.
- `context.mapweaver`, `context-1x/2x.png`, `context-editor.png`: four independent open timber walls plus a native door on an existing Premium wood floor, with no scene stamps hiding generator defects. Pale stone and other existing floor contrasts are also exported.
- `refined-versus-rustic-1x/2x.png`: same geometry and physical scale, Refined top, Rustic bottom.

Long-member choice/lengths/joints remain varied along the wall rather than cycling a short tile sequence. Diagnostic arrows, simple grain lines and two wood tints deliberately expose individual components and repeat at source scale; they are not production texture fidelity. The Work pack explicitly prohibits carrying those marks into production artwork. At 100/75/50% the constructed silhouette remains readable. Top-down orientation is preserved; no front faces, floor pixels, baked shadows or Living Root branches. Broader/tighter curves form constructed short-stock joins, not bent/stretching image strips.

## Persistence, behavior and regressions

Actual Wall Tool material selection and click/Enter, double-click open completion, and start-node closed completion passed on a new map without an Area. Properties Randomize plus real keyboard undo/redo passed. Native node/handle/width/Regularity/Variation edits and opening add/remove undo/redo exactly. Autosave/local reload preserves recipes/seed/IDs and gives byte-identical before/after PNGs; native .mapweaver roundtrip is exact. SQLite reopen tests cover both materials, open/closed geometry, doors/windows and project ZIP transfer. Generated stock never becomes document stamps/assets.

101 distinct focused client tests and 19 focused service tests passed (combined regression run plus the final targeted remainder test). Includes definition/footprint admission, deterministic seed/controls, curves, continuity, allowed orientation, corners/closed seams/outside alignment, fractional ends, openings, width presets, history, persistence and source alpha/hash validation. Living Root, all production masonry, Rock/Cave, continuous/legacy walls and current canonical Campfire wall/door/window/lighting semantics remain green. No production PNG, masonry/root/rock geometry file or linked Campfire contract was changed.

Typecheck, targeted ESLint, separate client/service builds and full `npm run build` passed. The full unrelated suite and installer build were not run. Existing chunk-size and ineffective dynamic-import build warnings remain; no new build failure. The spec layout rendered successfully despite a local Fontconfig cache warning.

## Performance and limits

Measured 12-wall benchmark: initial final surface construction 19 ms, cached redraw 0.228 ms, curve previews 2.9–4.3 ms, PNG 1× 49.7 ms / 2× 38.4 ms. The linear-only arc lookup reduced earlier 34–63 ms previews; canonical lengths and shared bounded sampling remain unchanged. Measurements are local fixture results, not general guarantees.

Limits remain 12000 placements, 8192 path samples, 4 Mi-pixel generated surface and 16 Mi-pixel source/cache budgets; admission rejects excessive layouts. Extremely tight self-overlapping turns or large custom widths are not a substitute for a physically plausible wall layout. Very large surfaces use existing bounded resolution. Palette/knots/premium repetition still need a separate production-art review. No palisade mode or automatic global junction fusion.

## Work handoff

`deliverables.local/Linear-Timber-Wall-Production-Spec.zip` contains 10 verified entries: the standalone spec, component JSON, README-WORK, proof-layout and six byte-identical technical references. The unpacked directory has the same name without `.zip`. Work needs no code, database, manifests or Mapweaver access. Recommended first commission **Premium Refined Timber**, then **Premium Rustic / Heavy Timber**. No premium art has been generated.

Reproduce technical assets with `node scripts/create-timber-wall-development-components.mjs`; export the handoff with `node scripts/export-linear-timber-wall-spec.mjs`. Production replacement requires exact IDs/filenames/canvases, core coverage and orientation, then an immutable production revision and its own integration review.

Tracked scope: two DEV definitions, six diagnostic PNGs/provenance, linear geometry/tests, registry/admission/dispatch, existing controls/DEV selection, targeted service/Campfire tests, two tooling scripts, ADR-0058 and updated Generated Wall terminology in AGENTS.md. Proofs/user data/builds stay ignored. Normal development remains on develop; exactly one dedicated local sprint commit is required. No push, installer, production artwork modification, database reset or external action. QA uses isolated data and nonstandard loopback ports 48286/48287 after checking listeners; own instances are stopped.

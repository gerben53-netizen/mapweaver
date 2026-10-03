# Painterly World â€” Velanth asset-quality benchmark

26 September 2026.

## Scope and artwork

The new **Painterly World** family contains 42 transparent raster stamps in eight
collections: Mountains 9, Snow & Alpine 4, Broadleaf Forest 8, Conifer Forest 5,
Swamp 5, Hills & Rocks 6, Volcanic 4, and Landmarks 1. Mountains include three
standard ridges, two peaks, two connectors and two foothills. Forests have dense,
edge and sparse silhouettes; conifers have separate needle-tree artwork.

Art direction is elevated oblique atlas illustration, northwest light and cool
southeast shadow, with muted limestone/slate, olive/moss, dry ochres and restrained
lava orange. Individual assets were generated with the **built-in imagegen tool**,
without third-party reference images. This is AI-assisted artwork, not a claim of
human-painted authorship. Prompts, original source hashes and usage terms are in
`public/world-assets-painterly/provenance.json` and `LICENSE.txt`; the first ridge
retains an art-direction synopsis rather than its exact initial prompt.

Sources were inspected individually and in a composited catalog. Distributed
images use 512 Ã— 384 RGBA with genuine transparency, aspect-preserving resampling
and transparent padding. No code-generated illustration replaces the artwork.
Larger generation originals remain under `.qa.local/world-asset-quality/sources/`.
The delivered count is below the optional numerical targets; it supplies distinct
roles without padding the library with recolors or nominal duplicate variants.

## Package and integration

- `public/world-assets-painterly/mapweaver-world-painterly.zip`: standard manifest-3 pack, 13,502,561 bytes.
- `public/world-assets-painterly/catalog.png`: labeled family overview.
- `public/world-assets-painterly/README.md`: import, art direction, sizing and limitations.
- Import through **Asset library â†’ Import assets**, then choose **Painterly Fantasy**.
- Categories: `World Map / Painterly World / <family>`; eight `Painterly World â€” <family>` collections.

All 41 terrain assets have validated version-1 semantic type, roles, biomes,
`painterlyFantasy` family, World/Regional applicability, positive weight, bounded
scale, disabled rotation and spacing. The stable product theme is
`world.painterlyFantasy`. Peaks, landmarks and active volcanoes are weighted lower;
an ordinary oak prevents the landmark tree becoming the sole temperate-tree candidate.
The optional tower is manual artwork, not an invented building semantic type or a
replacement for Smart Markers. Default sizes describe symbolic atlas footprints.

No scatter rewrite, schema migration or user-library installation was required.
The normal semantic query and theme filters select the imported family. The old
Engraved pack and its IDs remain intact. `GeneratorReadiness.tsx` now links both
families and explains which visual theme matches the new one.

## Controlled Velanth copy

`deliverables.local/Velanth-AssetQuality/Velanth-AssetQuality.mapweaver` contains
**537 objects, including 421 remapped stamps sharing 30 embedded source images**.
It has no flattened full-map background. Every stamp retains its ID, position,
dimensions, orientation, effects, name and ordering. Map data, terrain paint,
geography, labels, rivers, markers, cartographic objects, effects, frame, layers,
groups and historical generation provenance remain structurally identical.
Only the copy's document identity/name and image resources/references change.

`scripts/remap-painterly-benchmark.mjs` matches old sources by SHA-256, then reuses
the product's semantic/weighted `compatibleThemeAsset` selector with content-hash
candidate IDs. Candidate order reversal yields identical selections. Explicit
active-volcano and cliff identity are retained. Assertions reject unknown sources
or any non-asset object edit. No optional scatter tuning pass was used.

The original `deliverables.local/Velanth/Velanth.mapweaver` was not overwritten.
Its SHA-256 remains `36900eaa6b90f5b8fc619712bd6dd720b4d9838a4115aecbcc2ecdb19e51b4fd`.
The remap audit is in the copy's `asset-remap.json`. Isolated browser/service data
live in `.qa.local/world-asset-quality/data`, separate from user projects.

## Before/after evidence

The delivery directory contains baseline/after 1Ã— and 2Ã— exports and editor
screenshots. The full maps are `baseline-1x.png` and `after-1x.png` (2400 Ã— 1600);
2Ã— images are 4800 Ã— 3200. Identical unscaled crops are recorded in
`crop-coordinates.json`:

| Crop | x, y | width Ã— height |
| --- | --- | --- |
| Mountains | 680, 560 | 620 Ã— 440 |
| Forest | 1410, 435 | 500 Ã— 320 |
| Snow | 1620, 900 | 430 Ã— 300 |
| Swamp | 1340, 1110 | 350 Ã— 215 |
| Volcano | 1930, 1100 | 235 Ã— 240 |

Each has `-baseline.png`, `-after.png` and a labeled `-comparison.png` pair.

## Structured visual comparison

These ratings compare the unchanged Velanth geography, not just the asset catalog.

| Aspect | Rating | Observation and remaining limit |
| --- | --- | --- |
| Mountain quality | Major improvement | Sculpted crags, shadows, varied ridges, peaks and foothills replace repeated triangles. Original spacing still leaves separate ridge islands. |
| Forest quality | Major improvement | Dense canopy, shadow mass and edge variation replace simple tree icons. Crescent clusters remain recognizably repeated in some regions. |
| Snow/alpine | Major improvement | Dark exposed rock and snow-filled gullies give alpine forms depth. Only three mountain variants plus one foothill are supplied. |
| Hills/rocks | Major improvement | Rounded relief, dry mesas and textured cliffs add readable terrain transitions. Some symbol/ground junctions remain visible. |
| Swamp | Noticeable improvement | Gnarled trees and reeds are richer and fit the muted wetland palette. The benchmark has few wetland placements. |
| Volcanic | Noticeable improvement | A dark sculpted cone and restrained lava replace the flat volcano icon. Only one active volcano is present in the benchmark. |
| Landmark integration | No improvement | Existing settlement Smart Markers intentionally remain unchanged. The new optional tower is available but is not inserted into this controlled comparison. |
| Overall cohesion | Noticeable improvement | Symbols now share painterly lighting and material detail. Soft terrain, angular rivers, vector badges and the simple frame still limit a finished-atlas appearance. |

The same geography is materially closer to a painterly fantasy atlas, especially
in the mountain and forest crops. This does **not** mean it matches the original
reference atlas's overall finish. A full landmark family, tropical forest artwork,
greater silhouette variety, continuous ridge/forest placement, terrain blending,
river geometry and cartographic finishing remain follow-up work.

## Technical validation

Browser/export and performance results are recorded in
`deliverables.local/Velanth-AssetQuality/validation.json` and the separate
`validation-software.json`; see the final validation notes below. Broad unrelated suites and Windows packaging are outside this sprint.

Targeted checks cover image/hash/metadata completeness, exact semantic queries,
weighted determinism, theme filtering, old-library preservation, ZIP export and
reimport without duplicate records. Cache regression tests cover a 421-stamp
working set, changed styles/sources and backing-canvas disposal under both limits.

Profiling found 3,627 temporary shadow canvases over nine viewport updates. The
128-entry shadow cache was thrashing despite unused pixel capacity. Its entry
limit is now 512; the existing **16-million-pixel budget** remains enforced. This
is the only rendering change, directly motivated by this benchmark.

No pushes, merges, publishing, deployment, user-data replacement or Windows
package creation were performed. Asset creation used the requested built-in
image-generation capability. The repository had no committed develop branch;
the existing checkout was retained.

Recommended next sprint: improve ridge/forest placement continuity and terrain
blending on another controlled copy, followed by illustrated settlement/marker
integration. Preserve this pure asset-swap result as the benchmark baseline.

## Final validation results and acceptance status

**The asset deliverables and controlled comparison are complete. Strict default-Chrome
2× pixel parity remains open, so this report does not mark every sprint acceptance
criterion as passed.** The benchmark question has a clear visual yes: unchanged
Velanth geography is materially closer to a painterly atlas through the asset swap.

| Check | Result |
| --- | --- |
| `npm test -- src/canvas/drawStampEffects.test.ts src/domain/mapEffects.test.ts` | 11 passed |
| `npm run test:service -- service/painterlyAssets.test.ts` | 3 passed |
| Scoped ESLint: GeneratorReadiness, drawStampEffects, its test, painterlyAssets test | Passed |
| `npm run build` | Passed; includes client/service TypeScript checks and font-resource checks. Existing large-chunk warning remains. |
| Remap invariant assertions and original SHA-256 | Passed; original unchanged |
| Baseline and new map: save, stored document comparison, reload and explicit reopen | Identical snapshots, no browser errors |
| Baseline editor/export 1× and 2× | Exact pixel equality |
| New editor/export 1×, default Chrome | Exact pixel equality |
| New editor/export 2×, default Chrome | Strict tolerance failed; details below |
| New editor/export 1× and 2×, software canvas control | Exact pixel equality |

`node scripts/validate-painterly-benchmark.mjs` reproduces the isolated service/browser
check, completes persistence validation and exits nonzero when parity exceeds the
existing tolerance. It requires a current `npm run build`, installed Playwright
Chrome, and the two benchmark archives. The service uses ports 48042/5190 and its
own data directory; both child processes are stopped at the end. No full unrelated
suite or Windows package build was run.

### Performance

Final matched run: Chrome headless, 1600 × 1100 viewport, 45 programmatic viewport
updates, first five excluded; each measurement waits for two animation frames.
These are viewport-update timings, not claims of 60-fps interactive rendering.

| Map | Objects / stamps | Source images | Median / p95 viewport update | 1× export | 2× export |
| --- | --- | --- | --- | --- | --- |
| Original Velanth | 537 / 421 | 15 × 640 × 480 | 79.0 / 102.4 ms | 1.323 s | 1.964 s |
| Velanth-AssetQuality | 537 / 421 | 30 × 512 × 384 | 73.9 / 77.5 ms | 1.167 s | 1.805 s |

Neither map allocated a shadow canvas during the measured updates after warming.
The earlier 128-entry cache repeatedly allocated 403 canvases per frame; increasing
its entry limit to 512 while retaining the pixel budget removes that measured
thrashing. Timing varies by machine and browser; this remains a heavy map.

### Remaining 2× raster discrepancy

Default Chrome's new-map comparison differs at 140,022 of 15,360,000 pixels (0.912%).
Mean absolute RGBA channel difference is 0.0554 on a 0–255 scale; maximum is 85.
There are 279,226 channels differing by more than three. Differences are confined
to stamp bounds. The full map is visually consistent, but the existing strict
pixel threshold is not met. `after-2x-editor.png` preserves the comparison render.

Diagnostics recorded identical source HTMLImage identities, all 421 image draw
arguments/transforms, alpha, smoothing, filter, composite and shadow state for
editor and export. Running the same map with Chrome's accelerated 2D canvas
disabled gives zero differences at both scales. This isolates a dependence on the
browser raster backend; the precise internal cause is not proven. The normal
product renderer has not been forced into software rendering: the control was
slower (170.9 ms median viewport update), and that would be a broad regression.
No speculative export workaround was retained. In particular, no tolerance was
silently widened to convert the failed default-browser check into a pass.

Software-control reproduction in PowerShell (separate validation only):

```powershell
$env:ONLY_AFTER = '1'
$env:SOFTWARE_CANVAS = '1'
node scripts/validate-painterly-benchmark.mjs
Remove-Item Env:ONLY_AFTER, Env:SOFTWARE_CANVAS
```

This writes `validation-software.json`. Both modes write PNG evidence, so run the
normal check last to retain the ordinary Chrome exports. The final delivered PNGs
are from the normal renderer.

### Changed files and review links

- `public/world-assets-painterly/`: artwork, standard asset ZIP, manifest, catalog,
  provenance, usage terms and import guide.
- `scripts/package-painterly-assets.mjs`: reproducible packaging from retained originals.
- `scripts/remap-painterly-benchmark.mjs`: deterministic copy and invariant assertions.
- `scripts/validate-painterly-benchmark.mjs`: isolated browser/persistence/export benchmark.
- `src/world/GeneratorReadiness.tsx`: new-family download and theme guidance.
- `src/canvas/drawStampEffects.ts` and its focused test: bounded cache capacity fix.
- `service/painterlyAssets.test.ts`: actual package round trips, integrity and semantic queries.
- `README.md`, `docs/generator-assets.md`, and this report: usage and evidence.

[Baseline full map](../../deliverables.local/Velanth-AssetQuality/baseline-1x.png) ·
[New full map](../../deliverables.local/Velanth-AssetQuality/after-1x.png) ·
[Mountain comparison](../../deliverables.local/Velanth-AssetQuality/mountains-comparison.png) ·
[Forest comparison](../../deliverables.local/Velanth-AssetQuality/forest-comparison.png) ·
[Editable benchmark](../../deliverables.local/Velanth-AssetQuality/Velanth-AssetQuality.mapweaver).

Before marking the sprint unconditionally complete, resolve or explicitly accept
the demonstrated default-Chrome 2× raster difference. Artistic follow-up priorities
remain placement continuity, additional silhouettes and illustrated settlements;
they are separate from this pure asset-swap benchmark.

# World Asset Hierarchy & Variation — delivery

## Goal and acceptance

Compose painterly worlds using rare heroes, main primary silhouettes, supporting transitions and inexpensive detail. Acceptance covers explicit authorable metadata, deterministic weighted placement, bounded scales/orientation, forest interior-to-edge distribution, density growth biased toward support/detail, preserved old assets/maps, copied benchmarks, save/reload, ZIP compatibility and 1×/2× export/performance checks. Existing `develop` was retained; no CODEX.md exists in this checkout. AGENTS.md and relevant metadata/scatter decisions were read.

Functional hierarchy/content work is implemented. **Strict pixel equality on Chrome's accelerated canvas remains a known renderer limitation**, also reproduced on the unchanged baseline. It is not reported as a passing check. Native data, save/reload and software-renderer parity are tested separately below; no raster tolerance was relaxed and no renderer rewrite was introduced.

## Assets and authoring

The opt-in Painterly World package now has **46 unique transparent images**, with **7 hero, 13 primary, 16 support, 9 detail and 1 manual landmark**. All original 42 image bytes and paths are retained. Four new built-in-imagegen assets supply a frost detail spruce, open broadleaf fringe, low diagonal ridge connector and alpine scree. New support images are 384×256; detail images are 171×256 and 256×171. Each was reviewed for northwest light, cool southeast shadow, readable silhouette and actual alpha; no programmatic illustration or recolored duplicate substitutes for new artwork.

| Family | Hero | Primary | Support | Detail | Manual |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mountains | 2 | 3 | 5 | 0 | 0 |
| Snow & Alpine | 1 | 2 | 1 | 1 | 0 |
| Broadleaf Forest | 1 | 3 | 4 | 1 | 0 |
| Conifer Forest | 0 | 3 | 1 | 2 | 0 |
| Swamp | 1 | 1 | 1 | 2 | 0 |
| Hills & Rocks | 0 | 0 | 4 | 2 | 0 |
| Volcanic | 2 | 1 | 0 | 1 | 0 |
| Landmarks | 0 | 0 | 0 | 0 | 1 |

Rock detail from compatible Hills & Rocks / Alpine families supplies mountain-chain detail rather than duplicating images into every collection. The ancient grove remains the broadleaf hero. Conifer/snow has dense, edge, sparse and new frost detail sources, without inventing a second ancient-forest hero. Swamp uses twisted hero, interior, edge, dead-wood and reed tiers.

Files: `public/world-assets-painterly/mapweaver-world-painterly.zip`, updated manifest, `hierarchy.json`, `hierarchy-catalog.png`, `hierarchy-provenance.json`, `hierarchy-prompts.json`, and four new PNGs under `assets/`. Full prompts, source hashes and the built-in imagegen provenance are saved in that directory. Generation originals remain in `.qa.local/asset-hierarchy/sources/`; every consumed image is in the repository. Existing licensing terms remain applicable.

Import through Asset Library → Import assets. Existing users choose **Overwrite** to update generator metadata while retaining image identity; Keep deliberately preserves prior metadata. Service tests verify unchanged IDs/hashes during this upgrade. No user library was automatically modified.

## Generator and controls

Optional generator fields `hierarchy`, `ridgeAxis`, `lighting` extend the existing manifest-3/version-1 metadata; see [authoring spec](../asset-authoring/generator-metadata.md) and [ADR-0043](../adr/0043-world-asset-hierarchy.md). They are editable through the library's existing Generator metadata section. Missing metadata is not guessed from filenames. Saved stamps remain ordinary editable objects.

Hierarchy-aware engine 2 records the chosen tier in historical provenance; engine 1 remains available for families without tier metadata. Tier choice precedes density, using deterministic logical-cell random channels. Heroes run first, at most two mountain/volcanic heroes, one forest and one swamp hero per map; each source is used at most once. Nonzero density does not multiply hero probability. Source weighting, strict biome/theme constraints, full-image land containment, river/marker exclusions and existing count/source budgets remain in force.

Low/Medium/High density acceptance is .55/.65/.75 for primary, .25/.6/.95 for support and .1/.5/1 for detail, combined with terrain and patch strength. Primary can use at most 45% and support 40% of a category budget. This reservation fixes an observed cap failure where 239 primary clusters plus one hero consumed all 240 forest slots. The final full forest study contains 1 hero, 108 primary, 96 support and 35 detail.

Forest distance from its biome boundary chooses sparse trees, support edge clusters, medium clusters, then dense interior. Cold forest requests compatible snow art. Ridge direction favors the nearest authored silhouette axes, then uses weighted variation; upright illustration stays upright. Allowed procedural rotation is limited to the intersection with ±8 degrees, with heroes fixed upright. Tier scale ranges are Hero .96–1.06, Primary .90–1.12, Support .82–1.08, Detail .75–1.05, intersected with author bounds. Declared conflicting light is excluded with a warning; this is not automatic lighting recognition.

## Benchmark and visual comparison

`deliverables.local/World-Hierarchy/` contains copied editable archives and image evidence. The source is the previous Coastal Contours Velanth after-map, SHA-256 `db4b76d1dcb0316cb9c98dfdd6871fb68ad0f03acf06fad31fe084f159608af0`. The original is checked unchanged. Only 403 historically generated stamps and their generated layers are replaced in the copy; all manual objects, map geometry/style, labels, terrain, rivers, framing and coastal contours are asserted unchanged.

The final copy has **418 generated stamps: 2 hero, 107 primary, 162 support, 147 detail**. Including retained manual objects it has 552 objects / 436 stamps, versus 537 / 421 before. Category counts: 111 mountain stamps, 187 forest stamps and 120 hills/rocks. Generation took about 187 ms in the local benchmark. These figures describe the copy, not a retrofit of user projects.

Matching crops put **before left, after right**:

- `mountains-comparison.png`: x680 y560, 620×440 per side; more lower supporting ridges and scree around rare dominant peaks.
- `forest-comparison.png`: x1410 y435, 500×320; mixed canopy shapes and a sparse fringe, with fewer repeated large crescent masses.
- `snow-comparison.png`: x1620 y900, 430×300; alpine mountain/foothill composition. This is not claimed to be a snow-forest crop.
- `foothills-comparison.png`: x600 y830, 530×300; varied transitions into open terrain.
- `conifer-comparison.png`: x1230 y200, 970×370; an additional copied fixed-field forest study, because Velanth has no generated conifer biome. This explicitly exercises dense conifers, edge clusters and frost detail trees.

Full PNGs and editor screenshots are alongside `before.mapweaver`, `after.mapweaver`, `conifer-before.mapweaver` and `conifer-after.mapweaver`. Source geography remains stylized and low-resolution; the result improves composition rather than claiming photoreal geography or exact reference-atlas reproduction.

## Validation

- 27 targeted client/domain tests across asset hierarchy, existing world scatter, generator metadata, library metadata editing and image-cache behavior passed on the final code, including the category-cap regression.
- 9 service tests across painterly package and generator assets passed on the final package, including hashes/alpha, legacy pack compatibility, repeated ZIP import/export, semantic queries and ID-preserving hierarchy upgrade.
- Asset-pack CLI: valid, 46 assets, no warnings/errors.
- Application/service TypeScript checks, scoped ESLint and production build passed; existing >500 kB chunk warnings remain. Font checks passed for all eight bundled families.
- Local isolated service/Chrome harness: exact save/reload snapshots and no browser errors. No original project or installed user library is changed.
- Native editor/export code is shared and unchanged. Chrome accelerated strict pixel comparison is **not a pass** on Velanth; software control is described below. The full unrelated suite was not run.

## Performance and raster limitation

Measured in local headless Chrome at 1600×1100; pan is two animation frames per viewport update, five warmups then 40 samples, not a claim of single-frame FPS.

| Default Chrome / Velanth | Before | After |
| --- | ---: | ---: |
| Objects / stamps | 537 / 421 | 552 / 436 |
| Decoded image cache entries / leases | 30 / 421 | 32 / 436 |
| Pan median / p95 | 77.8 / 82.8 ms | 76.6 / 91.8 ms |
| Open / reload | 8.61 / 9.29 s | 7.01 / 9.93 s |
| PNG 1× / 2× | 1.49 / 2.01 s | 1.63 / 2.40 s |

No new canvases were allocated during warmed pan; many stamps share each decoded image. The p95/export timings show modest extra cost, not an unqualified performance improvement. No cache budget or rendering behavior was changed; only read-only profiling counters were added. The full map remains a heavy workload.

The unchanged baseline matches at 1×, but has 139,976 different pixels at 2× (mean absolute RGBA delta .0553 on 0–255). The new composition has 15,171 different pixels at 1× (mean .0365) and 57,677 at 2× (mean .0230). This repeats the existing accelerated-image sampling issue recorded in the World Asset Quality sprint. The harness intentionally exits nonzero for these differences after completing persistence checks. Editor comparison PNGs and `validation.json` preserve the evidence. No tolerance was widened.

Software-canvas control disables accelerated 2D canvas only in the test browser; production is not forced into that slower mode. Results and PNGs are kept separately in `software/`. Both final Velanth copies match their editor render exactly at 1× and 2× in this software control (zero differing pixels), with exact save/reload and no browser errors. Software pan is slower: 199.5 ms median before and 188.4 ms after. This isolates the discrepancy to renderer/backend behavior rather than changed native transforms; it is not a production-performance fix.

The final conifer study passes exact 1×/2× editor/export parity even in ordinary Chrome, before and after. Both have 240 stamps. Cache entries rise from 9 to 15 distinct sources; pan medians are 36.0/35.9 ms, p95 36.1/36.1 ms, with zero canvas allocations. After export is 107 ms at 1× and 349 ms at 2×; open/reload are 3.62/2.99 seconds. Exact save/reload and zero browser errors are recorded in `validation-conifer.json`. All five matching comparison crops were visually inspected.

## Reproduction and remaining limits

Build with `npm run build`. Reproduce copies with `node scripts/build-hierarchy-benchmark.mjs`; use `node scripts/validate-hierarchy-benchmark.mjs` for Velanth, environment `SNOW_ONLY=1` for the forest study, or `SOFTWARE_CANVAS=1` for the separate renderer control. Then `node scripts/hierarchy-comparisons.mjs`. These scripts use isolated data and stop their local helper processes.

No tropical painterly family is supplied; generation reports and skips it. Ridge directions are selected from finite artwork, not synthesized into arbitrary curves. Lighting flags rely on author honesty and visual review. Global budgets can leave some tiers absent in tiny biomes; density does not guarantee exact object counts. The standard generator remains an explicit new-map operation, not a live recompose command for arbitrary manually edited maps. Chrome accelerated pixel parity remains open; the implementation is not presented as having passed every possible export-quality check.

No push, merge, publication, deployment, cloud-resource change or Windows package build. New artwork used the built-in imagegen capability; no third-party imagery or external source downloads were used.

## Important implementation files

- `src/domain/generatorAssets.ts`: optional authoring fields and strict validation.
- `src/world/assetHierarchy.ts`, `scatterWorld.ts`, `scatterModel.ts`: tier decisions, bounded transforms, reserved budgets and engine-2 provenance.
- `src/library/GeneratorMetadataDetails.tsx`, `src/world/GeneratorReadiness.tsx`: editable metadata and upgrade guidance.
- `src/images/imageCache.ts`: read-only profiling counters only.
- `public/world-assets-painterly/`: augmented manifest/package, four new PNGs, catalog and provenance/prompts.
- Focused tests, three benchmark/packaging scripts, ADR-0043 and authoring documentation accompany the change.

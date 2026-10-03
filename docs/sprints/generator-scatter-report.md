# Sprint C — Generator-aware scatter

Status: complete.

## Acceptance checkpoints

- Opt-in deterministic semantic mountain chains, biome forests and sparse hills/rocks/wetland detail; disabled generation retains world-v1 terrain output.
- Existing semantic query/weighted RNG; metadata scale, rotation, footprint and theme respected. Missing compatible assets are reported, never filename-inferred.
- Ridge-guided mountains with peaks/foothills; forest interior/edge density; land/lake/river/marker exclusions and bounded spatial collision checks.
- Disposable preview; native editable output with explicit ownership and frozen provenance; save/reload, undo/redo and PNG work.
- Targeted logic/UI/persistence tests, typecheck, scoped lint, build, representative browser screenshots and performance evidence.
- No later river styling, effects, borders, labels, external actions or Windows package.

No develop branch exists in this checkout; existing files are untracked on an unborn master. Work remains in place without branch reset or unrelated changes.


## Delivered architecture and placement

`src/world/scatterWorld.ts` is a pure shared placement engine for mountain, forest and detail families. `scatterModel.ts` owns bounded settings and provenance; `scatterResources.ts` reads a revision-consistent semantic library snapshot and stages only used images without installing anything in the current project. The existing cancellable world worker runs the geography and optional scatter passes.

Ridges use local nonmaximum suppression across opposing height neighbours inside highland/mountain masks. The strongest normal gives a local tangent. Peaks are processed ahead of secondary details; seed-based ordering/jitter avoids grid rows. Peaks use the upper part of declared scale ranges, ordinary ridges use the full range and nearby foothills use the lower part. Snow/cold highlands request snowMountain assets. Volcanoes require explicit volcanic terrain, a 4% candidate gate, weighted selection and a maximum of two.

Forest candidates use semantic biome cells, not terrain colors. A two-pass distance transform gives edge distance. Acceptance rises from 0.34 at the first interior cell to 1 at distance four, multiplied by density and a seeded spatial patch factor. Small tree assets are preferred at edges, forestCluster assets inside. Conifer/temperate/tropical requests follow climate data. Wetlands select marshCluster/swampVegetation. Hill and rock detail stays in transitions, uplands and suitable arid/volcanic cells.

The engine reuses Sprint B query fallback and compiled weighted selection. Compatible biome or generic biome, theme, exact semantic type and map type remain mandatory. Missing families are skipped and explained. Counter-based RNG channels separate priority, acceptance, jitter, choice, scale and rotation. Upright metadata is honored; optional tangent alignment is clamped within rotation bounds. Existing physical default sizing is reused.

A spatial hash checks centre distances using the spacing hint and source dimensions. Full rotated source rectangles must fit an actual emitted Landmass Area. Raster footprint checks protect ocean/lakes, emitted river cells and existing Place-marker neighbourhoods. Small border margins keep artwork inside the map. Checks are conservative; narrow islands/ridges can remain undecorated.

## Settings, output and persistence

Three Off/Low/Medium/High controls: Mountain chains, Forest clusters, Hills/rocks/wetlands. A limited asset-family selector uses Sprint B theme vocabulary. Off is the default and preserves the old terrain result. Selecting an absent family produces a visible note rather than substituted artwork.

Up to five nonempty layers join Generated World: Volcanic, Mountain stamps, Forest stamps, Swamp / Wetland, Hills & Rocks. Terrain layers remain intact. All added objects are native individually editable stamps. IDs, semantic group/role, source IDs, terrain cells, chosen scale, fallback and library fingerprint are saved in optional version-1 `map.generation.scatter`. Names are not ownership keys. Actual transforms and embedded images remain authoritative; no rendering-time generation occurs.

Preview/Cancel never create a project or modify the active asset registry. Create persists the new map and stages the initial stamp addition as one undoable edit. Ordinary edit/delete/layer/history workflows then apply. Exact future regeneration needs the original asset metadata; the saved fingerprint identifies the source snapshot but does not reconstruct a missing library. See [ADR 0029](../adr/0029-generator-aware-world-scatter.md).

## Counts and measured performance

Caps: 180 mountain/volcanic stamps, 240 forest clusters, 120 other details; at most 128 used image sources, 10,000 candidate assets and existing 96-million-pixel / file budgets. Density operates on a fixed 145 × 97 logical terrain grid. Changing pixel resolution at the same physical extent preserved placement records in the regression test. Used image loads are sequential and bounded; the worker/library preparation deadline is 15 seconds. Spatial collision lookup avoids all-pairs placement comparisons.

Latest browser run: ordinary 1600 × 1000 Amber coast world, 40,000 km extent, all densities High: **349 stamps** (84 mountains, 145 forest, 120 detail), using 10 embedded assets. Preview preparation completed in **1,387 ms**; an earlier run took 876 ms. Detail cap was visibly reported. Diagnostic 2400 × 1500 terrain provider: **389 stamps** (28 mountain, 1 volcanic, 240 forest, 98 other detail, 22 swamp), pure scatter **65.9 ms**. These are local measurements, not cross-hardware guarantees.

## Validation results

- Targeted Vitest: `src/world/scatterWorld.test.ts`, `src/world/WorldWizard.test.tsx`, `src/world/generate.test.ts`, `src/domain/generatorAssets.test.ts` — **32 tests passed across the targeted runs**. Includes deterministic output and input-order independence; disabled identity; ridges, snow, volcanic constraint, forest masks/interior density, scale/rotation; spacing and land/ocean/river/marker exclusion; compatible generic fallback; manifest/provenance round trip; preview cancellation, late-response rejection and Apply behavior. Existing weighted-selector tests check weight influence.
- `npm run typecheck` passed; the final `npm run build` also reran client and service TypeScript checks.
- Scoped ESLint passed on ten changed TypeScript/TSX production/test files (including the shared diagnostic fixture).
- Final production build passed: client, local service and eight bundled-font license/resource checks. Vite reported an advisory chunk-size warning for a roughly 501 kB chunk; no runtime/build failure.
- `node tests/persistence/world-scatter.mjs` passed with isolated local data and headless Chrome at 1440 × 1000. Same-seed preview pixels matched exactly; Cancel created no campaign map. Create added native stamps; initial-pass undo/redo and a normal stamp move/undo/redo worked. Local save/reload and a portable ZIP encode/decode preserved geometry and generation metadata. No browser page errors.
- 1× and 2× PNG exports succeeded. A native editor stamp and isolated PNG rendering differed by at most **one channel unit**, with mean absolute difference **0.0000003125** over the full transparent canvas; consistent with alpha rounding. No debug masks/overlays are persisted or exported.
- Visual inspection of the ordinary exported world and diagnostic editor showed ridge chains, varied forest clusters, thinner edges, snow/biome-appropriate symbols and readable coasts/rivers. The diagnostic map explicitly supplies volcanic and wetland masks; it is not a claim that world-v1 creates volcanic geography.

Evidence from the final browser run (ignored local artifacts):

- [Wizard preview](../../.qa.local/world-scatter-1790365231391/preview.png)
- [Ordinary world editor](../../.qa.local/world-scatter-1790365231391/world-editor.png)
- [Diagnostic snow/forest/swamp/volcanic terrain](../../.qa.local/world-scatter-1790365231391/diagnostic-editor.png)
- [1× PNG](../../.qa.local/world-scatter-1790365231391/world-1.png) and [2× PNG](../../.qa.local/world-scatter-1790365231391/world-2.png)
- [Machine-readable results](../../.qa.local/world-scatter-1790365231391/results.json)

## Changed files and limits

New scatter model/engine/resource modules, shared diagnostic fixture and browser test; updated world model, worker and wizard, plus generated-project creation in localSession. Added targeted engine/UI tests, ADR 0029, the usage guide, README and program/provenance documentation. Existing source packs, ordinary Scatter brush, geography algorithm, renderer and database schema are unchanged.

Known limits: the existing terrain generator has no volcanic biome, so ordinary worlds intentionally get no random volcanoes. It may produce little wetland for some seeds; the provider fixture validates that path separately. The supplied pack is a compact illustrative style, not painterly art, and has no full tropical family. Absent compatible families are visibly skipped. Conservative full-image masks can omit large symbols on narrow terrain. Initial creation undo history is session-local; reopening retains the saved stamps, not historical undo entries. Selective regeneration is not implemented; historical ownership prepares that future work without overwriting manual edits.

## Sprint D handoff

River/Path Styling should inspect existing route taper, banks/halos and generated river geometry. Scatter already excludes emitted river cells; preserve this contract when paths are styled or smoothed. Keep native rendering/export shared, retain frozen stamp transforms and do not reinterpret historical ownership as permission to replace manual content. No river styling, effects, borders, full theme system or automatic labels were started here.

No push, merge, release, upload, deployment or cloud action was performed. No Windows package was created. All validation used isolated disposable local data; personal libraries/projects were not modified. No unrelated full test suite ran.

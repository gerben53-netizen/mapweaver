# Premium Terrain Brush texture library — 26 September 2026

Implemented on develop. The content, presets, UI, compatibility and benchmark are delivered. **Unconditional acceptance remains open:** the full Velanth map still fails the strict default-Chrome 2× editor/export comparison at stamp pixels. This also occurs in the unchanged baseline and was recorded in the previous World Asset Quality sprint. New terrain materials pass all eighteen isolated 1×/2× comparisons against the actual editor scene. No tolerance was widened and no global software-rendering workaround was shipped.

## Scope and acceptance

Acceptance was ten materially distinct painterly families, useful variants, named presets, metadata/search, fractional scale, repeat-safe painting, unchanged old maps and brush behavior, five controlled benchmark crops, save/reopen, 1×/2× parity and measured performance. No new brush tool, arbitrary brush-pack importer, map redesign or Windows package was included.

Fourteen separately generated bitmap artworks now ship locally. They provide distinct material structure rather than recolored copies. [Usage, exact preset names and family counts](../premium-terrain.md):

| Family | Count | Materials |
| --- | --- | --- |
| Grassland | 2 | Lush grass; dry grass |
| Rocky upland | 2 | Light rock; dark rock |
| Foothills | 1 | Grass/scree transition |
| Alpine & snow | 1 | Patchy snow and exposed rock |
| Forest floor | 2 | Temperate understory; mossy floor |
| Swamp & marsh | 2 | Wet marsh; dark bog |
| Arid & dry | 1 | Dry broken earth |
| Coast & shore | 1 | Coastal silt and shallows |
| Volcanic | 1 | Ashen terrain |
| Neutral blends | 1 | Soft painterly earth |

Each has an immutable `painterly.v1.*` ID, human-readable title, family, Painterly Fantasy theme, World/Regional applicability, tags, category path, collection, usage notes and a named preset combining scale, softness and strength. Categories are `Painterly Terrain / <family>`. Search and family filters expose the entire set; choosing a preset affects the next stroke only and retains brush size. Paint/Erase/Blend and classic procedural styles keep their behavior.

The built-in image-generation tool produced the art using separate material-specific prompts. The larger originals are retained locally under `.qa.local/premium-terrain/originals`. Shipped sources are optimized 512×512 opaque sRGB PNGs, 8,720,840 bytes in total. Shared cosine overlap sampling produces a 384px periodic canvas without mirrored rock formations. Editor, scale swatch and export use the same sampler. [Exact prompts, original and final hashes](../../public/terrain-textures-painterly/provenance.json) and [usage notice](../../public/terrain-textures-painterly/LICENSE.txt) accompany the pack. No third-party attribution or public-domain status is invented.

The optional fill-pattern ZIP installs separate ordinary Area materials; it does not register brush IDs or install presets. Fixed bundled IDs keep projects independent of mutable user-library items. New premium paint uses terrain-paint version 2. Version 1 validation, IDs and procedural rendering remain unchanged; old maps are not repainted or automatically migrated. See [ADR 0037](../adr/0037-premium-terrain-materials.md).

## Controlled Velanth benchmark

[Editable benchmark](../../deliverables.local/Velanth-BrushTextureQuality/Velanth-BrushTextureQuality.mapweaver) and its [before copy](../../deliverables.local/Velanth-BrushTextureQuality/Velanth-BrushTextureQuality-before.mapweaver) preserve all 537 objects, their geometry, assets, labels, effects and map settings. Only document identity and terrain paint change. Eight deterministic strokes cover the five requested zones; the resulting paint JSON is 524,189 bytes. The [recipe and invariant checks](../../deliverables.local/Velanth-BrushTextureQuality/recipe.json) are reproducible with `node scripts/build-terrain-texture-benchmark.mjs`.

Both sides use the previously created **Velanth-AssetQuality** copy so the premium mountain/forest art is identical and only the new painted ground differs. They do not compare old stamps against new stamps. Original `deliverables.local/Velanth/Velanth.mapweaver` remains untouched, SHA-256 `36900eaa6b90f5b8fc619712bd6dd720b4d9838a4115aecbcc2ecdb19e51b4fd`.

[Full before](../../deliverables.local/Velanth-BrushTextureQuality/baseline-1x.png) · [Full after](../../deliverables.local/Velanth-BrushTextureQuality/after-1x.png)

Identical crops:

- [Mountain foothills](../../deliverables.local/Velanth-BrushTextureQuality/mountain-foothills-comparison.png): broken ground visually extends the mountain bases.
- [Forest terrain](../../deliverables.local/Velanth-BrushTextureQuality/forest-terrain-comparison.png): darker textured understory connects canopy patches.
- [Coastal transition](../../deliverables.local/Velanth-BrushTextureQuality/coast-transition-comparison.png): restrained silt/shore tone; this is the least pronounced improvement and does not replace the coast geometry/falloff system.
- [Rocky/alpine](../../deliverables.local/Velanth-BrushTextureQuality/rocky-alpine-comparison.png): visible snow/rock breakup integrates snowy mountains.
- [Swamp/wet ground](../../deliverables.local/Velanth-BrushTextureQuality/swamp-wet-ground-comparison.png): muted damp ground gives marsh stamps a shared base.

Visual assessment: foothills, woodland and alpine materials clearly belong with the premium stamps and provide a useful improvement over flat ground. No new labels, objects or effects hide the comparison. Coast refinement remains deliberately subtle. These are cartographic ground materials, not illustrated geology or automatic terrain classification. [All fourteen at three scales](../../deliverables.local/Velanth-BrushTextureQuality/materials-scale-contact.png).

## Validation and performance

Passed targeted tests: **35** total.

```text
npm test -- src/domain/premiumTerrain.test.ts src/domain/terrainPaint.test.ts src/store/terrainPaintActions.test.ts
31 passed
npm test -- src/app/PremiumTerrainLibrary.test.tsx
2 passed
npm run test:service -- service/premiumTerrain.test.ts service/terrainPaint.test.ts
2 passed
```

Coverage includes metadata, collections/search, valid presets, legacy nonmutation, mixed version-2 materials, rejected unknown references, fractional scales .25/.5/1/2 through real project ZIPs, Erase/Blend, undo actions, actual image dimensions/hash integrity, public catalog parity and real optional pack import validation.

`npm run typecheck` passed. Scoped ESLint over changed product/test/authoring/benchmark files passed. Final `npm run build` passed client, service and bundled font/license verification; the existing large-chunk warning remains. No unrelated full suite was run.

`node scripts/validate-premium-terrain-ui.mjs` passed in headless installed Chrome at 1280×720, using isolated local service data:

- Actual preset selection, search and family controls, visible panel bounds and scale preview.
- Deliberately failed image request, clear Retry control and successful recovery.
- Real mouse stroke: one undo entry, undo restores the complete original snapshot.
- Fourteen materials at half/default/double scales, 42 stroke samples.
- Eighteen pixel-exact actual editor versus PNG comparisons: grass, foothill and marsh × three scales × 1×/2×. No differing channels and no browser errors.

[UI evidence](../../deliverables.local/Velanth-BrushTextureQuality/material-library-1280.png) · [Brush controls](../../deliverables.local/Velanth-BrushTextureQuality/brush-controls-1280.png) · [Measured results](../../deliverables.local/Velanth-BrushTextureQuality/material-validation.json).

Cold loading all fourteen materials took 599 ms. Ready canvases use 8,257,536 bytes (7.875 MiB), bounded by the fixed registry; this excludes temporary decode buffers and the separately bounded paint-tile cache. Repeated loads share promises/canvases. Stroke calculation p95 was 25.1 ms, maximum 29.7 ms. The real 30-step drag took 1.66 s including browser-driven pointer pacing; its 55 observed frames had p95 54 ms and a 324 ms maximum cold frame. These are not claims of 60 fps on the heavy benchmark.

`node scripts/validate-terrain-texture-benchmark.mjs` saves/reopens both maps and compares real editor/exports. Both snapshots were identical after save/reopen, with no browser errors. [Raw results](../../deliverables.local/Velanth-BrushTextureQuality/validation.json):

| Measurement | Same-art before | Premium paint after |
| --- | --- | --- |
| Open / reopen | 8.55 / 7.51 s | 6.21 / 7.74 s |
| Viewport update median / p95 | 74.3 / 84.5 ms | 80.7 / 93.3 ms |
| 1× export | 1.190 s | 1.562 s |
| 2× export | 1.962 s | 1.936 s |
| New canvases during warmed viewport measurements | 0 | 0 |
| 1× differing pixels | 0 | 0 |
| 2× differing pixels | 140,022 | 139,976 |

Open timings include scripted settling and are single-run observations, not a controlled speedup claim. Viewport measurements wait two animation frames, five warmups plus forty samples. Paint adds work, especially to 1× export; the measured difference is explicit rather than hidden.

**The full-map harness correctly exits nonzero for 2× parity.** The before image already has the failure: approximately 0.912% of 15,360,000 pixels differ at stamp bounds, maximum channel delta 85. After painting, mean absolute RGBA delta is 0.05529 on 0–255. The earlier [World Asset Quality report](world-asset-quality.md) documents the accelerated-canvas dependence. A further local diagnostic normalizing decoded image sources to CPU canvases did not fix it; no speculative renderer change was retained. The delivered 2× exports are normal-renderer results, not software-only substitutes. Thus acceptance criterion 17 is not fully met even though the new paint rendering is pixel-exact in its isolated tests.

## Changed areas and remaining work

- `public/terrain-textures-painterly/`: fourteen artwork sources, catalog, provenance, notices and optional fill pack.
- `src/domain/premiumTerrain.ts`, `terrainPaint.ts`, `terrainBrush.ts`: metadata/presets, safe versioned references and explicit premium strokes.
- `src/canvas/premiumTerrainTextures.ts`, `usePremiumTextures.ts`, paint node/controller/drawer and `src/export/render.ts`: shared repeat-safe resources, asynchronous readiness and export loading.
- `src/app/PremiumTerrainLibrary.tsx`, Terrain Brush controls/CSS: presets, actual sampler swatch, categorized browsing and error recovery.
- Focused domain/UI/service tests; packaging, benchmark, comparison and browser scripts; ADR, user guide, README and authoring-kit capability notes.

Limitations: only Painterly Fantasy is art-directed; other themes are not automatically recolored. Arbitrary user brush packs remain unsupported. Broader paint can cover coast ink underneath and should be applied selectively. The two-pixel mask resolution is unchanged. Very large or deliberately high-contrast strokes can still expose repeated motifs; no claim of infinite nonrepeating terrain is made. The heavy Velanth scene is usable but not uniformly smooth at 60 fps.

Recommended next work is a focused default-Chrome 2× stamp raster investigation with a minimal reproducer, before another content expansion. After that, prioritize stronger coastal material transitions and additional scree/woodland silhouettes rather than more near-duplicate hues.

No push, merge, release, deployment, cloud-resource change or Windows package was performed. Artwork generation used the built-in image-generation tool as requested; application/runtime resources stay local. The original Velanth map and the prior premium-asset benchmark were not overwritten.

# Additional Terrain Brush Texture Pack

26 September 2026. Compact extension of the existing painterly terrain library on develop.

## Scope and acceptance

Add four Desert, four damp Underground, four rough Underground and six complementary materials; retain existing IDs/pixels, the shared sampler and paint semantics. New entries must be searchable, selectable and paintable; project roundtrip, editor/export parity and visual tiling checks must pass. No changes to biome geometry, gameplay, arbitrary brush imports or Windows packaging.

## New materials

| Material | Family | Suggested use |
| --- | --- | --- |
| Soft Sand Desert | Arid & dry | Quiet fine sand for broad desert washes. |
| Wind-Swept Dunes | Arid & dry | Broken crescent dunes with quiet sandy intervals. |
| Stony Desert | Arid & dry | Low desert pavement and gravel for rugged dry transitions. |
| Cracked Dry Basin | Arid & dry | Pale clay fissures for dried lakes and arid basins. |
| Damp Cavern Floor | Underground & cavern | Dark mineral earth for humid caves and dungeon underlayers. |
| Mossy Cave Ground | Underground & cavern | Low olive moss on humid limestone soil, without canopy. |
| Wet Stone Floor | Underground & cavern | Cool damp stone with restrained mineral seams and no gloss. |
| Moist Cavern Earth | Underground & cavern | Soft damp umber mud for natural subterranean chambers. |
| Broken Cave Floor | Underground & cavern | Fractured limestone plates embedded in fine cave dust. |
| Rubble-Strewn Cavern | Underground & cavern | Scattered small angular debris for collapsed passages. |
| Jagged Stone Ground | Underground & cavern | Fine slate splinters and shallow fractures, without giant rocks. |
| Uneven Rocky Underground | Underground & cavern | Weathered mineral humps and dusty hollows for rough ground. |
| Salt-Worn Flats | Arid & dry | Chalky salt crust and faint mineral islands for dry flats. |
| Leaf-Litter Forest Floor | Forest floor | Subdued fallen leaves over dark humus beneath woodland. |
| Rooty Woodland Floor | Forest floor | Fine weathered root threads in muted woodland earth. |
| Soft Clay Earth | Neutral blends | Quiet terracotta earth for gentle soil transitions. |
| Gravel Path Ground | Rocky upland | Small worn gravel in warm grey dust for paths and margins. |
| Cavern Lichen Ground | Underground & cavern | Pale sage lichen flecks across cool cave stone. |

The collection now contains **32 materials in 11 families**. Only Underground & cavern is a new family. Tags cover cave/cavern/underground/tunnel, damp/wet/mud, rubble/uneven/rocky and desert/dune/sand/arid. The picker derives its displayed count from the registry.

No extra UI behavior presets were needed: Soft wash, Fine detail and Broad coverage already cover these uses. New entries retain the existing per-material recommended scale/softness/strength metadata for authoring and programmatic fixtures. Selecting Material in the UI still preserves current brush behavior.

## Assets and compatibility

18 separately generated opaque raster illustrations, using the built-in image_gen tool via the imagegen skill. All final sources are stored under `public/terrain-textures-painterly/materials/`. Technical processing reduces them to 512×512 opaque sRGB PNG; the unchanged shared sampler creates a repeat-safe 384px period with cosine overlap-add. No mirrored geological shapes or procedural substitutes for artwork.

Exact prompts, original/final SHA-256 and processing notes: [provenance](../../public/terrain-textures-painterly/provenance.json). [Catalog](../../public/terrain-textures-painterly/terrain-library.json). The optional [Area fill-pattern ZIP](../../public/terrain-textures-painterly/mapweaver-terrain-painterly-fills.zip) now includes all 32 ordinary fill copies. No import is required for Terrain Brush.

The original 14 registry entries and provenance are frozen in `tests/fixtures/premiumTerrainOriginal.json` and tested unchanged. Existing PNG hashes match exactly. Package generation now validates and reuses existing images instead of silently overwriting immutable resources. Paint v1/v2 and project format 12 are unchanged; new IDs require this application revision or later. Unknown IDs still fail safely.

## Evidence and benchmark copies

Files in `deliverables.local/Additional-Terrain/`:

- `Velanth-AdditionalTerrain-before.mapweaver`: untouched source copy.
- `Velanth-AdditionalTerrain.mapweaver`: 13 new material passes over four study zones; all 537 objects and embedded assets remain unchanged. Source and original benchmark hashes are checked before/after creation.
- `Additional-Terrain-Showcase.mapweaver`: independent editable board with all 18 new materials, labels and soft native brush coverage.
- `recipe.json`: exact source hashes, stroke positions/settings and comparison crops.
- `materials-scale-contact.png` / `scales-0.png` through `scales-2.png`: all materials at 0.5×/1×/2× recommended texture scale, painted with softness .7 and strength .7.
- `material-library-1280.png`, `brush-controls-1280.png`: actual browser UI.
- `desert-comparison.png`, `damp-cavern-study-comparison.png`, `rough-cavern-study-comparison.png`, `complements-comparison.png`: identical-coordinate before/after crops.

The cave materials on Velanth are deliberately surface-material study zones, not new underground map semantics or altered forest/mountain objects. The independent showcase is the clean comparison for their actual ground appearance.

## Validation

- **56 targeted Vitest tests in five files passed:** premiumTerrain, terrainBrush, PremiumTerrainLibrary, TerrainBrushTools and terrainPaintActions. Covers original registry, new families/aliases, selection/thumbnail source, actual paint masks, all 18 new IDs through project ZIP, legacy paint and undo behavior.
- **One service resource/package test passed:** all 32 unique images, dimensions, opacity, SHA-256, provenance, complete catalog and valid fill-pattern ZIP.
- `npm run typecheck`, scoped ESLint and `npm run build` passed; the build includes client/service TypeScript and font-resource checks. No full unrelated suite. Existing large-bundle warnings remain.
- Real Chrome at 1280×720: family/search selection, decoded thumbnails, visible scale swatch, missing-resource retry, real mouse paint and exact undo restoration passed. No page errors.
- **36 exact material parity checks passed:** every new material at 1× and 2× PNG against the live Konva editor rendering. Zero differing channels.
- 54 soft paint samples at three scales were visually inspected. Wrapped-edge mean RGB differences range 0.85–1.25× the comparable interior differences; no boundary discontinuity spike. Shared sampler is unchanged.

Large-map checks are recorded separately in `validation.json` (default Chrome canvas) and `validation-software.json` (software canvas), plus `validation-showcase.json` for the final unclipped showcase. Default Chrome shows existing 2× whole-map raster differences in both baseline and after (mean channel delta approximately .055/255). At 1× both are exact. All new materials themselves pass exact default-Chrome 1×/2× checks. Software canvas passed all six whole-scene comparisons: baseline, expanded map and 18-material showcase at both 1× and 2×, with zero different pixels. All three scenes saved/reopened as identical snapshots. This pre-existing mixed-scene raster sensitivity is reported rather than hidden by widening the acceptance tolerance.

## Performance and limits

All 32 decoded periodic surfaces consume at most **18 MiB** RGBA, compared with 7.875 MiB for the previous 14. Loading remains lazy and each fixed resource is decoded once. Local cold load of all 32 was 585 ms. 54 synthetic strokes measured p95 25.2 ms / max 36.4 ms. The real pointer gesture on the 537-object benchmark had p95 frame interval 66.8 ms and one 366.9 ms maximum; it is not a 60-fps guarantee.

Default-Chrome two-frame pan measurement: baseline median/p95 77.1/93.2 ms, expanded map 76.3/84.9 ms, with zero allocated canvases during both measurements. Software canvas was slower: baseline median/p95 178.7/202.7 ms, expanded map 193.8/249.5 ms; showcase 32.9/41.2 ms in the initial run and 50.6/61.1 ms after the final canvas-height correction. Both map comparisons allocated no new canvases during panning. These are local observations, not universal performance claims. Source PNG collection totals 18,854,245 bytes. The 64 MiB paint-tile cache and per-map 32-material-combination/4096-tile/2-MiB budgets are unchanged.

Fine texture appearance depends on zoom and scale. Large repeated fields can still reveal periodic motifs; dunes are intended for localized detail over Soft Sand Desert washes. Strength/softness should keep ground detail subordinate to labels. Materials remain World/Regional Terrain Brush resources; other map workflows may use the optional ordinary Area fills. New custom brush-pack installation remains outside scope.

## Implementation locations

`src/domain/premiumTerrain.ts`; `src/app/PremiumTerrainLibrary.tsx`; their targeted tests; `service/premiumTerrain.test.ts`; `scripts/package-terrain-textures.mjs`; additional-terrain build/browser/comparison scripts; `tests/fixtures/additionalTerrainStudy.ts`; bundled images/catalog/provenance; material guide, authoring guide, README and ADR-0037 addendum. No renderer or persistent schema change.

No push, merge, publish, deployment or upload was performed. No Windows package was created. Built-in image generation was used for the requested artwork.

## Visual evidence

![Desert comparison](../../deliverables.local/Additional-Terrain/desert-comparison.png)

![Cave material scales](../../deliverables.local/Additional-Terrain/scales-1.png)

![Complementary material scales](../../deliverables.local/Additional-Terrain/scales-2.png)

![Editable 18-material showcase](../../deliverables.local/Additional-Terrain/showcase-1x.png)

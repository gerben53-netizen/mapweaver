# Cartography polish — P0 Terrain rendering

Completed as the first scoped delivery on 25 September 2026. The full multi-sprint program remains open; see [program checkpoints](cartography-polish-program.md).

## Delivered

Eleven centralized terrain styles; fractional texture scaling and opacity; controllable inward feather and blend strength; five land-derived coastline presets; five map-bound water presets with subtle waves and edge darkening. Area Properties and Map settings provide explicit Apply/disable actions with ordinary undo/redo. The world wizard previews and creates optional decorated output while retaining the original deterministic geography generator. Existing unstyled documents keep their appearance.

Main files: `src/domain/terrainStyles.ts`, `src/canvas/drawArea.ts`, `terrainTexture.ts`, `drawWater.ts`, `src/app/TerrainAppearanceProperties.tsx`, `WaterAppearanceSettings.tsx`, `src/world/styleWorld.ts` and `WorldWizard.tsx`. Integration touches land/map validation, project parsing, MapCanvas, MapSettingsPanel, LandAreaProperties and PNG rendering. Architecture and persistence are documented in [ADR 0027](../adr/0027-terrain-appearance.md); operation in [World terrain](../world-terrain.md).

Rendering order is water/background, existing layer order, then the existing overlays. Each styled Area draws derived coast bands, ground/texture/custom Fill Pattern, inward alpha feather, then linework. The same painters serve editor, preview and export. Geometry, holes, stable pattern frames, semantic roles and editable river nodes are retained; no whole-map raster asset is saved.

## Validation

- `npx vitest run src/app/terrainAppearance.test.tsx src/domain/terrainStyles.test.ts src/domain/geography.test.ts src/world/WorldWizard.test.tsx src/world/generate.test.ts src/app/scaleUx.test.tsx`: **53 tests passed**. Covers schema bounds/unknown keys and versions, fractional scale, old-document absence, portable ZIP round-trip, generator determinism, geometry preservation, explicit preview application, accessible controls, invalid drafts, removal and undo/redo.
- Scoped ESLint over all 19 changed/new TypeScript files: passed.
- `npm run build`: passed, including client/service TypeScript, client and local service bundles and all eight font resource/license checks. Initial standalone typecheck found one optional-cache narrowing error, corrected before final validation.
- `node tests/persistence/terrain-rendering.mjs`: passed in real Chromium at 1280×720, with an isolated temporary service/library and Vite instance. Tests wizard creation, actual terrain/coast/water controls, undo/redo, service save/reload, generated 1×/2× PNGs, unchanged geometry, hole transparency, inward alpha falloff and coast preset pixels. Direct Area/editor painter and transparent export pixels match exactly at 1×; 2× output is also generated and inspected. No browser page errors.
- Existing baseline and final world/preview/editor/feather images were visually inspected. The first browser attempts exposed a cold-start timeout and ambiguous select labels; the final run passes after adequate startup time and explicit accessible labels.
- No unrelated full suite, broad browser matrix, packaging or external action was run.

Evidence: `.qa.local/terrain-rendering-1790356520987/` contains `results.json`, `performance.json`, editor/preview screenshots, world 1×/2× PNGs and feather comparison images. These temporary outputs are not project data or versioned builds.

## Performance and limits

On the measured 1600×1000 world with 71 native objects, five repeated draws took **7.5–18.5 ms**. Complete PNG work took **324 ms at 1×** and **588 ms at 2×** in this Chromium run. The renderer reported 15,972,675 cached pixels, below its 16-million-pixel (approximately 64 MB) cap. These are local measurements, not a cross-hardware guarantee or a maximum-size stress test.

Individual Area scratch surfaces cap detail at roughly two million pixels / 2048 per axis, so extreme zoom and very large terrain regions can soften texture detail. Original vector geometry and linework remain editable. Inward feathering can reveal the underlying land color along adjacent biome edges; defaults are narrow and controls allow tuning. This is not a full adjacent-biome blend solver. Built-in textures are procedural, not hand-painted art. Changing water alone preserves manually styled rivers/lakes; the generator initially coordinates their calm palette.

## Next deliveries

Semantic curated asset packs, ridge/forest scatter, additional river presets and smoothing, non-destructive effects and borders, themes, and automatic labels remain pending. The map now supports textured editable styling, but still shows the generator's angular geography and lacks relief stamps and automatic cartographic labels. This is a stable first checkpoint, not a claim that the full polished-cartography target has been achieved.

No user data was removed, no Windows package was built, and nothing was pushed, merged, uploaded, published or deployed.

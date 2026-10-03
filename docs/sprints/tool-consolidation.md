# Tool Consolidation & Semantic Intent — delivery

Completed 26 September 2026 on the existing unborn `develop` branch. Existing untracked project files retained. No commit, push, merge, publishing, deployment or Windows packaging performed.

## Acceptance and audit

The acceptance baseline was the five requested intent workflows, explicit separation of semantics/appearance, removal of duplicate primary tools, unchanged object formats and rendering, map-aware creation, accurate shortcuts, targeted tests and browser validation at 1280 × 720.

Route is a semantic Path specialization, not an independent travel tool. It does provide physical length/width, river direction/taper, advisory junction IDs, endpoint snapping/continuation, split/reverse and specialized appearance. These are preserved inside Path. It has no travel-time, waypoint itinerary, marker/place linkage or routefinding system that justifies a separate primary tool. Existing conditional editors already separate River style, road class/surface/outline and border dash/halo, so their rendering/edit logic was retained and regression-tested.

Landmass creates Area geometry with a geographic role. Land / Water already provides physical land addition/removal, islands/peninsulas, lakes, smoothing and roughening. The primary Landmass button was redundant. Existing Landmass point editing, contour tools, appearance, clipping and explicit role conversion remain intact.

Terrain Region and Area share geometry but have distinct intent. New Terrain Regions ask for a supported biome and copy a matching initial appearance. Generic Areas receive no biome metadata, including after switching from Terrain Region. Region Properties puts semantic classification above transforms and identifies the visual preset. Later biome changes preserve appearance and are undoable. Terrain Brush only changes independent paint masks.

## Before / after inventory

| Before | After |
| --- | --- |
| Selection: Select | Selection: Select |
| Assets: Place asset, Scatter, Pattern fill | Assets: retained unchanged |
| Drawing: Land / Water, Terrain Brush, Water Depth, Path, Route, Area, Landmass, Terrain region, Measure | Geography: Land / Water, Terrain Region, Terrain Brush, Water Depth, Measure; Drawing: Path, Area |
| Structures: Wall, Opening | Structures: retained on battlemaps |
| Annotations: Place marker, Map Elements | Cartography: Place marker, Map Elements |
| Route primary button | Path type: Generic / River / Road / Border; Trail under Road class |
| Landmass primary button | New physical geography via Land / Water; existing objects remain editable |
| Material preset + Classic style, presets also resetting behavior | One Material selector + Browse materials; separate behavior-only Brush Preset |

Tool descriptions explain the intended task. Active identity distinguishes Terrain Region/Area and Path · River/Road/Border. The same Path button remains active in the retained internal route drawing mode. Geographic creation remains behind the central capability matrix; existing object editors remain usable on converted maps.

## Material versus behavior

Material selects the actual image or procedural material. Premium fallback style is derived automatically, with family/theme shown as metadata. Browse selects the same authoritative Material value. It preserves size, softness, strength and scale.

Brush Preset offers Soft wash, Fine detail and Broad coverage and changes only size, softness, strength and scale. Material and operation mode remain untouched. Manual changes show Custom behavior when no preset matches. Procedural materials retain their exact old rendering through the same selector; the competing Classic style field was removed. No new texture IDs or paint schema were introduced.

## Compatibility and shortcuts

| Existing data | Current behavior |
| --- | --- |
| Generic Path | Same object; new creation via Path > Generic |
| River / Road / Border with route settings | Same object; new creation via corresponding Path type |
| Landmass Area | Same object and contour; primary new creation via Land / Water |
| Terrain-region Area | Same geometry, biome and appearance; explicit biome editor |
| Generic Area | Same generic zone, including optional explicit visual appearance |
| Procedural / premium terrain paint | Same mask, material IDs, scale and renderer |

No migration, version bump, service/SQLite change or mass conversion. Internal `route` is retained solely to reuse snapping, continuation, previews and gesture handling. V/F/Shift+F, Escape/Enter and existing history/object shortcuts remain. There were no Route/Landmass activation shortcuts to remove. Keyboard help now explains Path types and geography intent; tests verify R/L do not activate hidden duplicate tools and existing input guards remain tested.

## Changed files

- Tool presentation: `src/app/ToolRail.tsx`, `toolIntent.ts`, `PathTypeChoice.tsx`, `PathTools.tsx`, `RouteTools.tsx`, `SelectionToolbar.tsx`, `editorUx.ts`; help in `src/canvas/MapCanvas.tsx`.
- Area semantics: `src/domain/terrainIntent.ts`, transient `src/store/editorStore.ts`, `src/canvas/useAreaDrawing.ts`, `src/app/AreaTools.tsx`, `AreaIntentProperties.tsx`, `ObjectProperties.tsx`, `LandAreaProperties.tsx`, `TerrainAppearanceProperties.tsx`.
- Paint choices: `src/domain/terrainBrushPresets.ts`, `src/app/PremiumTerrainLibrary.tsx`, `TerrainBrushTools.tsx`, `TerrainBrushTools.module.css`.
- Regression tests: `src/app/toolIntent.test.tsx`, `PremiumTerrainLibrary.test.tsx`, `TerrainBrushTools.test.tsx`, `ux-improvement.test.tsx`, `map-context.test.tsx`, `src/projects/toolIntentCompatibility.test.ts`.
- Compatibility fixture: `tests/fixtures/toolIntent.ts`; browser validation: `scripts/validate-tool-intent.mjs`.
- Documentation: README, AGENTS glossary, `docs/tool-intent.md`, `docs/premium-terrain.md`, `docs/terrain-paint.md`, ADR 0039 and this report.

No model, serialization, rendering, storage-service or dependency implementation was changed.

## Validation

100 tests passed in 13 targeted Vitest files:

```text
src/app/toolIntent.test.tsx
src/app/PremiumTerrainLibrary.test.tsx
src/app/TerrainBrushTools.test.tsx
src/app/ux-improvement.test.tsx
src/app/map-context.test.tsx
src/app/RiverProperties.test.tsx
src/domain/routes.test.ts
src/projects/toolIntentCompatibility.test.ts
src/domain/landBrush.test.ts
src/domain/terrainPaint.test.ts
src/store/terrainPaintActions.test.ts
src/store/landBrushActions.test.ts
src/app/SelectionInspector.test.tsx
```

Coverage includes conditional properties, capability filtering, active state, authoritative material choice, Browse, behavior preset isolation, semantic creation/undo, generic-zone isolation, route geometry/serialization, island/peninsula/lake editing, paint independence and history. ZIP round-trip preserves all seven representative existing object variants exactly.

Scoped ESLint passed for every changed TS/TSX and validation script. `npm run typecheck` passed during implementation; final `npm run build` passed client `tsc -b`, service `tsc`, Vite client/service builds and the eight-family font resource/license check. Build reports chunks over 500 kB; no unrelated bundling refactor was made. Initial test fixture/selector/type errors were fixed before the final successful runs.

`node scripts/validate-tool-intent.mjs` passed against an isolated fresh local service and headless installed Chrome at 1280 × 720. Actual pointer/UI workflows:

1. Land / Water → Island adds physical land; one undo restores original objects.
2. Terrain Region → Swamp → rectangle creates semantic swamp with a matching initial visual preset.
3. Browse → Mossy Woodland Floor, then Fine detail, paints actual visual coverage without modifying any semantic object.
4. Area after Terrain Region draws a generic zone without leaked biome metadata.
5. Path → Road → Trail creates a native road and keeps Path visibly active.

The original seven-object fixture survived local service save, page reload and reopening with an identical snapshot and byte-identical PNG. Existing Landmass, Terrain Region and Area retain point editing. No browser page errors or horizontal page overflow. Screenshots were inspected for context-bar/sidebar layout; this caught the need to move the biome editor above transforms.

Evidence in ignored `deliverables.local/Tool-Intent/`: `Existing-objects.mapweaver`, `validation.json`, `overview-1280.png`, `terrain-region-1280.png`, `terrain-brush-1280.png`, `path-road-1280.png`. The test creates its own isolated data directory; user projects are untouched.

## Limits

Semantic terrain retains the existing Forest/Mountains/Desert/Swamp/Snow/Custom vocabulary. Visual tundra/volcanic/grassland presets are not silently promoted to new biome values. No travel-route features, new semantic taxonomy or arbitrary brush-pack import was added. Compatibility evidence covers representative existing object formats, not every historical user file. Browser checks are automated plus screenshot inspection, not a human usability study. No full unrelated suite or package smoke test was run; no new Windows package was requested or produced.

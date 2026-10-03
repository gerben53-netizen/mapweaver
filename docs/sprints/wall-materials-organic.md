# Wall Materials & Organic Wall Rendering — sprint report

2026-09-28, `develop`. The continuous material system is implemented and validated with development fixtures. **Final visual acceptance of production Living Root and Pale/Neutral Stone artwork remains open until those separately authored packs are supplied.** The fixtures reuse existing Timber/Masonry artwork and are not presented as production-quality replacements.

## Acceptance and delivered behavior

The implementation target was one editable native Wall per path, data-driven material registration through the existing asset system, physical width/texture scale, coherent organic edges, deterministic controls, corners/endcaps/junctions/openings, native editing/history and persistence/export without destructive changes.

Wall sets now accept `renderingMode: continuous` and versioned metadata for fill/mask/edge/variation/growth/overgrowth/corner/endcap/T/crossing/opening channels. Source channels reference the existing immutable atlas component table. The same specialized ZIP preview/import and library registry are used. No alternate asset manager, scene stamps, new renderer-specific material names or cloud dependency were added.

The Wall Tool and Properties → **Style details** expose metadata-defined controls. Thin/Standard/Heavy/Massive presets use the material's physical units; numeric width remains available. Only declared parameters appear. Presets change stored concrete values; **Randomize variation** changes the saved seed explicitly. Properties uses **Apply path properties**, grouping the draft changes into one native undo step.

Canonical nodes/handles, nominal width, selection, openings, layers and object identity remain native. Raster surfaces are transient render caches. The renderer supports native curves, closed forms, cap/join choices and outward room bands, with coherent low-frequency mask displacement. Physical texture coordinates do not depend on viewport zoom. Material channels provide surface treatment rather than manually positioned pieces. Existing opening clipping removes the full organic surface; optional opening channels treat the remaining jamb edges.

Matching visible materials provide transient join context; no wall graph or automatic object merging is saved. Existing solid/texture/strip/segment walls retain their original branches. See [ADR-0050](../adr/0050-continuous-wall-materials.md) for rendering, compatibility and memory boundaries.

## Instruction for the separate artwork task

- [Complete Dutch production instruction](../wall-sets/CREATE-WALL-MATERIAL-PACK.md)
- [Editable manifest template](../wall-sets/continuous-template/wall-set.json)
- [Updated JSON Schema](../wall-sets/wall-set-v1.schema.json)

The instruction covers image roles, source orientation, physical dimensions, safe paths, supported controls, presets, attribution, immutable versions, ZIP layout and visual acceptance. No new graphical source assets were generated. `scripts/wall-material-fixtures.mjs` repackages existing source bytes unchanged into two explicitly named development fixtures.

## Benchmark and evidence

The isolated browser fixture is **400 × 300 map pixels = 40 × 30 ft**, using 50 px per 5 ft. It contains four native walls and two passage openings, with a long curved perimeter, inward/outward corners, an internal divider, T connection, crossing and Heavy section. It contains **zero stamp objects**. The user's primary service/data was not touched.

- [Editable benchmark with embedded material atlas](../../deliverables.local/Wall-Materials/wall-material-benchmark.mapweaver)
- [Root fixture PNG 1×](../../deliverables.local/Wall-Materials/root1.png)
- [Root fixture PNG 2×](../../deliverables.local/Wall-Materials/root2.png)
- [Stone fixture PNG 2×](../../deliverables.local/Wall-Materials/stone2.png)
- [Normal fit-to-map editor view](../../deliverables.local/Wall-Materials/root-editor-fit.png)
- [100% editor zoom](../../deliverables.local/Wall-Materials/root-editor-1.png)
- [50% editor zoom](../../deliverables.local/Wall-Materials/root-editor-0.5.png)
- [75% simulated play zoom](../../deliverables.local/Wall-Materials/root-editor-0.75.png)
- [Browser checks and measured timings](../../deliverables.local/Wall-Materials/browser-results.json)

The browser harness runs a separate local service/database and verifies successful registration, native benchmark creation, PNG 1×/2×, byte-identical PNG 1× after local save/reload, portable benchmark export, actual Properties parameter apply and autosave in the service, and keyboard undo/redo invocation. Domain tests assert exact undo/redo state restoration. The second material uses the same rendering pipeline. No browser page errors were recorded.

Visual inspection caught warped ring patterns in the initial join blending; blending colors rather than interpolated UVs removed those artifacts. Remaining regular features/strip character in these fixtures originate from reusing the old illustrative Timber/Masonry strips as surface sources. Production approval must use purpose-authored surface textures and all checks in the production instruction; the sprint does not claim that these provisional images meet the premium-art acceptance bar.

## Performance and limits

Final local development-browser sample: root-scene PNG 1× about **812 ms**, 2× about **834 ms**, reloaded 1× about **845 ms**. A single cold wall surface measured **412 ms**, a live-edit preview **29 ms**, and repeated cached drawing **0.01 ms/frame**. These are local observations, including JavaScript/browser scheduling, not performance guarantees.

Final surfaces use at most two samples per map pixel, 4,194,304 pixels per wall and 4096 pixels per axis. The cache retains at most 16,777,216 surface pixels; source pixels have a separate budget. Source working tiles are capped at 512 per axis. Larger walls display a detail-budget warning. Draft/path editing uses lower-resolution previews; ending editing and every PNG export use final quality. Unrelated editor changes reuse the cached surface. Changed walls rebuild their own surface; source preparation and unrelated wall surfaces are reused. A changed neighbor may invalidate join context.

Known boundaries: final production graphics are pending; highly translucent intersections use ordinary source-over compositing; different material revisions are not fused; extreme self-intersections and very large individual walls are not an unbounded topology/detail guarantee. Texture quality and seamlessness still depend on authored source material. These limits are documented rather than hidden with decorative wall stamps.

## Validation

- `npx vitest run src/domain/continuousWallMaterial.test.ts src/app/ContinuousWallFields.test.tsx src/domain/wallMaterials.test.ts src/domain/walls.test.ts src/domain/roomWallControls.test.ts src/domain/openings.test.ts`: **56 passed**, six files.
- `npm run test:service -- service/wallSets.test.ts`: **4 passed**, covering legacy packs and continuous registration, immutable revision behavior and portable persistence with unchanged atlas bytes.
- `npm run typecheck`: passed; final build also reran client/service TypeScript checks.
- Scoped ESLint on all new/touched domain, renderer, UI, importer/test and fixture-script files: passed.
- `npm run build`: passed, including service build and eight font-family/license checks. Existing Vite large-chunk advisory remains.
- Targeted Chrome harness `.qa.local/wall-material-browser.mjs`: passed. No unrelated broad suite was run.

Tests cover definition admission and bad inputs, defaults/legacy walls, seed determinism, local-segment stability, world scaling, width/parameters, curves and openings, junction neighbor context, UI metadata controls, native undo/redo, local/portable roundtrips and shared PNG stability.

## Main files

- New domain contract/field: `src/domain/continuousWallMaterial.ts`, `continuousWallGeometry.ts`, fixtures/tests.
- New shared painter: `src/canvas/drawContinuousWall.ts`; dispatch/preview changes in `drawWall.ts`, `drawWallMaterial.ts`, `drawPath.ts`, `PathPaint.tsx`, `PathPoints.tsx`.
- UI: `ContinuousWallFields.tsx` and test; existing `WallFields.tsx`, `WallTools.tsx`, `WallSetPicker.tsx`.
- Existing admission/bounds: `wallSets.ts`, `walls.ts`, `wallMaterialGeometry.ts`, `paths.ts`; export memory admission in `src/export/render.ts`.
- Import/registration: `service/wallSets.ts` and its tests; existing SQLite/asset references retained.
- Authoring instruction, schema/template, ADR-0050, README and AGENTS terminology; `scripts/wall-material-fixtures.mjs`.

There was no user-data reset, removal of old root/wall assets, destructive migration, new graphical source generation, Windows package, push, deployment or other external action. A README encoding failure during documentation was repaired from a local snapshot; its complete original 78,161-byte content was preserved before appending the new section.

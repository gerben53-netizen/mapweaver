# Area & Material Interaction Cleanup

Completed 28 September 2026 on the existing `develop` checkout.

## Delivered interaction

Previously the permanent **Pattern fill** rail button chose a pattern and entered Area drawing. It is removed. **Area** remains the geometry tool, with its existing shape, initial fill/color/pattern and stroke controls.

**Apply Material** is a contextual Select action. With no compatible selection it is disabled with “Select an Area or Floor first”. Primary Properties → Appearance exposes **Browse materials**, the current material and **Pattern scale**. Appearance details uses the same operation. No new geometry, copy, layer or drawing mode is created by Apply.

Eligible targets are visible, unlocked native Areas, including generated room Floors and semantic Landmass/Terrain Region Areas whose renderer already supports imported pattern fills. Only the fill changes; semantic role, biome, terrain appearance, identity, frame/transform, geometry, dimensions, opacity, stroke and layer membership remain intact. Layer/group locks, hidden state and Solo are respected. Mixed selections apply to compatible objects only, with target/skipped counts shown before confirmation.

## Preview, scale and history

The existing AssetPicker provides the library/project sources, search, category filter, thumbnails, names, map compatibility and recent assets. Search/category/source persist in memory per asset kind. The application variant sits at the right, leaves the canvas visible and keeps Apply/Cancel visible at 1280 × 720. Incompatible library materials remain disabled even with “all map types” enabled.

Selecting a material decodes it and previews it through AreaPaint. The preview lives in a separate transient store: it never changes the document, autosave, exported artwork or undo history. Cancel/Escape discards it, including pending image requests. Closing/reopening works under React StrictMode. Stale project/selection changes prevent applying outdated targets. An interrupted or failed image load does not change the original fill.

Existing pattern scale, repeat/stretch, rotation and offsets are retained. A solid/empty fill starts with Repeat, scale **1**, zero rotation/offsets. This deliberately follows existing Area creation semantics; it does not adopt the Texture Brush's recommended-scale rule. Pattern scale remains directly editable afterward. Recommended defaults can still be set manually through that control.

One Apply is one history entry, including multiple Areas. Undo/redo restores the corresponding fills and scales. Texture Brush remains a separate local painting workflow: `map.texturePaint` is untouched. No schema, migration or asset-format changes were made. Unused decoded candidates may remain in the existing session asset cache; project gathering includes referenced assets only.

## Focused terminology audit

| Entry | Responsibility |
| --- | --- |
| Area | Creates generic geometry with initial appearance. Tooltip clarified. |
| Terrain Region | Creates an Area with semantic biome intent; existing tooltip is explicit. |
| Land / Water | Modifies physical land/water contours; existing tooltip is explicit. |
| Apply Material | Replaces the complete base fill of existing selected Areas. No permanent rail tool. |
| Texture Brush | Paints local material variation; tooltip now explicitly distinguishes base fill/geometry. |
| Terrain Brush | Paints visual terrain detail without changing biome data. |

Area and Terrain Region share a geometry engine but retain distinct semantic intentions. No broader consolidation, boolean changes or terrain redesign was performed. Legacy `patternFill` schema/helper names remain for existing data handling; it is no longer a creation capability.

## Validation

- **29 tests passed** across `src/store/materialApplication.test.ts`, `src/library/materialPicker.test.tsx`, `src/domain/textureBrush.test.ts`, `src/domain/areas.test.ts`.
- Tests cover eligibility/locks, no selection, invalid stamp selection, default/preserved scale, preview cancellation and late decode, stale selection/project, exact multi-object undo/redo, native geometry preservation, independent painted masks, StrictMode reopening, Inspector/shared-picker integration and creation-time material selection.
- TypeScript check and scoped ESLint passed. Production client/service build passed; existing Vite >500 kB chunk advisory remains.
- Real headless Chrome at **1280 × 720**, isolated local service/database, existing wood/stone images: all seven requested scenarios passed, plus search retention. Actual keyboard undo/redo, pointer Area drawing and Texture Brush painting were exercised. Local-service save/reopen preserved serialized Area fields, layers and painted masks exactly (JSON naturally omits undefined optional properties).
- No broad unrelated suite, Windows package, external actions or destructive migration. The user's normal service/data were not used.

Browser harness: `.qa.local/material-application-browser.mjs`.
Evidence: `deliverables.local/Area-Material/browser-results.json`.

## Screenshots

- [Existing Floor with live material preview](../../deliverables.local/Area-Material/01-existing-floor-preview.png)
- [Applied material and primary Inspector](../../deliverables.local/Area-Material/02-applied-inspector.png)
- [Area creation with an initial pattern](../../deliverables.local/Area-Material/03-area-creation.png)
- [Reopened map](../../deliverables.local/Area-Material/04-reloaded.png)

## Important files

- `src/store/materialApplication.ts`: guarded application session, eligibility, scale rule and atomic history.
- `src/library/AssetPicker.tsx`: shared browsing, preview/Apply and remembered filters.
- `src/canvas/AreaPaint.tsx`: transient preview on existing geometry, without re-rendering unrelated Areas for every candidate.
- `src/app/SelectionToolbar.tsx`, `InspectorQuickProperties.tsx`, `AreaProperties.tsx`, `ToolRail.tsx`: contextual access and removal of duplicate drawing entry.
- `src/app/Modal.tsx` and its CSS: canvas-visible material dialog with fixed actions.

The benchmark answer is **yes**: an existing Floor changes material without drawing new geometry or losing local Texture Brush work.

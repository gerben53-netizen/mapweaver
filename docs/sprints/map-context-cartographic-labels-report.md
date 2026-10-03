# Map context and cartographic labels — sprint report

## Acceptance and outcome

Centralize creation capabilities; contextualize the rail/global actions; prevent invalid activation; retain all existing artwork/editing; use asset applicability without a library redesign. Create explicit boxless, readable label styles by map type, retain legacy boxes and share canvas/PNG rendering. Preserve format 12 and schema 6. All scoped implementation and targeted acceptance checks completed.

## Final tool matrix

| Creation tool/action | Battlemap | Regional | World |
|---|---|---|---|
| Select / Place asset / Pattern fill | Yes | Yes | Yes |
| Generic Path / Area / Scatter | Yes | Yes | Yes |
| Place marker / Label / Legend / Compass | Yes | Yes | Yes |
| Wall / Opening / Detect rooms / boundary walls | Yes | Hidden | Hidden |
| Route: River / Road / Border | Hidden | Yes | Yes |
| Landmass / Terrain region / Measure | Hidden | Yes | Yes |
| Create Border from Area / path-type conversion | Hidden | Yes | Yes |
| Edit existing objects and geometry | Yes | Yes | Yes |

Road is a Route subtype, not a separate rail registration. Pattern fill creates ordinary Areas. Scatter intentionally remains universal because existing source sizing and recipes support terrain/forest symbols at map scale. Regional/world share applicable tools; new label defaults differ. Empty Structure groups disappear. There are no unsupported creation shortcuts: only V is registered for tool selection, and a central watcher guards all activation paths, including future shortcuts. Continuation of an existing wall/route has an explicit object-reference exception. Map-type changes still leave an invalid active creation tool in Select. Existing room-floor regeneration remains object editing; new room detection is contextual.

## Labels and compatibility

| Preset | Size | Text | Halo | Tracking | Weight |
|---|---|---|---|---|---|
| Battlemap | 18 | #242922 | #ffffff / 1.5 | 0 | regular |
| Regional | 24 | #f7f2e6 | #28342f / 2 | 0.5 | bold |
| World | 30 | #f7f2e6 | #28342f / 2.5 | 1.5 | bold |

Dimensions are map pixels before uniform object scaling. All presets use existing Liberation Sans, zero background opacity and explicit serializable values. Defaults apply to standalone labels, labels created with Places and Add linked label. Existing label styles do not change with map type. Existing boxed labels retain their positive background opacity, colors, padding and bounds. No new fields means no new-field migration is needed; the existing strict validator still admits existing format-12 labels. Invalid or incomplete formerly required fields are not silently invented.

The renderer skips an absent background and paints the entire glyph halo before text fills. Canvas and export share this function. Outline scales with text under existing layoutScale and rotates with the object. Bounds/hit targets and handles are editor-only. Properties starts with text and typography; halo and text colors are independent, with explicit None/Box annotation backgrounds and position/rotation afterward. Apply/Reset draft behavior, opacity, bold/italic and tracking are retained. No external fonts, shadow support or semantic label taxonomy was added. Curved/path-following labels remain a documented follow-up because they require a new layout contract.

## Files and architecture

- `src/domain/mapCapabilities.ts`: centralized tool union/matrix and asset applicability.
- `src/store/mapToolContext.ts`, `editorStore.ts`, `src/app/App.tsx`: guarded activation and map-type fallback without document filtering.
- `src/app/ToolRail.tsx`, `RoomTools.tsx`, `AreaProperties.tsx`, `LandAreaProperties.tsx`, `RouteConversion.tsx`, `src/canvas/MapCanvas.tsx`: contextual rail and creation actions.
- `src/library/AssetPicker.tsx`, `useLibrary.ts`, `service/library.ts`: opt-out editor asset filter with service-side counts/pagination. Global and specialized library browsers stay unchanged.
- `src/domain/annotations.ts`, `src/app/AnnotationTools.tsx`, `AnnotationProperties.tsx`, `src/canvas/drawAnnotation.ts`: label defaults, Properties and shared painter. Export remains on the existing rendering path.
- New `src/app/map-context.test.tsx`, `cartographic-labels.test.tsx`; adapted `SelectionInspector.test.tsx`; focused service regression in `service/library.test.ts`; new `tests/persistence/map-context-labels.mjs`.
- README, asset guide, format notes and ADR 0020 updated/added. No dependencies or font files added.

## Validation

- **58 client tests passed**: `npm test -- src/app/map-context.test.tsx src/app/cartographic-labels.test.tsx src/domain/annotations.test.ts src/app/annotationInteraction.test.tsx src/domain/geography.test.ts src/app/SelectionInspector.test.tsx` (41), plus `npm test -- src/app/ux-improvement.test.tsx src/export/export.test.ts` (17).
- **1 focused service test passed**, 12 unrelated cases skipped: `npm run test:service -- service/library.test.ts -t "filters map applicability"`. Covers applicability before pagination, universal assets, deliberate unfiltered browsing and rejection of unknown map types.
- **7 browser checks passed**, no page errors: `node tests/persistence/map-context-labels.mjs`, actual Chrome on Windows, headless, isolated data/service port 48010. Includes all three tool contexts, existing-wall editing on a regional map, default labels, rotation, saving/reloading, type changes and picker scope.
- Real transparent PNG downloads with and without selection were compared as raw RGBA: **pixel-identical**. Pixel checks found light glyph fills, dark halo and transparent surrounding pixels. Existing boxed annotation remains visible. Screenshots and PNG were visually inspected at 1280×720; evidence in `evidence/map-context-labels/`.
- `npm run build` passed: client and service TypeScript checks plus both production builds. Targeted ESLint passed for all changed source/test files and the new acceptance script.
- No full suite, unrelated broad lint, native launcher tests or Windows packaging run. The five older unrelated lint errors documented in the previous UX report were not changed.

## Decisions and limits

The explicit compatibility requirement in this task takes precedence over the older general permission to remove old formats. No data removal or format/schema changes were needed. The repository still has an unborn master and no develop branch; existing files were retained in place, without checkout/reset/commit. The shared generic Path/Scatter/pattern tools are intentionally retained on world maps. Existing grid/new-map defaults already distinguish battlemap and geographic contexts and were preserved without automatic mutations.

Asset applicability integration is deliberately limited to the ordinary editor picker; global library and specialized pickers retain broad browsing. There are no new shortcuts, path labels, shadows or font families. No external actions (push, merge, publish, release, deploy or cloud changes) were performed. No Windows package was created or replaced.

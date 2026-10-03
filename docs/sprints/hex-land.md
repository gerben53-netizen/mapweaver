# Hexagon Landmass Shape — delivery

Completed on existing `develop`, 26 September 2026. No unrelated changes, external actions or Windows package.

## Delivered behavior

Hexagon is a first-class shape in the existing Land / Water selector. Flat top is the documented default because no hex grid exists. Pointy top adds 30°, and explicit rotation adds 0–360° relative to orientation. Size is opposite-corner (circumscribed) diameter in logical map space, displayed using the existing km/mi conversion. Viewport zoom and pointer heading do not rotate or resize the footprint.

Exact is a six-vertex polygon with equal straight sides. Its coverage bypasses approximate simplification and ignores noise/softness/smoothing. Soft/Rough retain all six corner anchors, with 16 samples per edge and deterministic bounded inward irregularity; roughness, softness and smoothing have defined effects on that detail. The natural-hex simplification tolerance is smaller so subtle Soft Coast detail survives. Native topology and node budgets still apply; over-budget strokes fail safely rather than altering Exact geometry.

Add and Remove reuse the same worker/boolean pipeline, including island creation, lakes/holes, bays and joins. Exact click creates one hex; a drag produces unioned coverage, not independent hex cells. Existing terrain/coast styles, Water Depth and clipping use the same canonical Landmass Areas and renderers.

UI hides roughness, smoothing and softness for Exact Add/Remove. Natural modes expose them. Hex orientation/edge controls are hidden for Smooth/Roughen actions, which retain the existing circular falloff and explain it in context. No new toolbar tool or disabled grid feature was added.

## Compatibility and scope decisions

Mapweaver has square grids and geographic coordinate guides but no hex-grid geometry. Therefore hex-grid snapping and Match one hex cell are not applicable, and no second grid system was invented. A later Paint hex cells feature should introduce a central hex grid and reuse these polygons.

No project format or service/schema changes. Geometry and normal landEditing provenance persist; brush options remain transient just like other Land / Water settings. Existing shapes retain their exact original code path and behavior. New land receives the same semantic defaults and theme/coast treatment as other Add Land operations.

## Files

- `src/domain/hexLandShape.ts`: bounded hex geometry, settings, validation and help text.
- `src/domain/landBrush.ts`: registry/dispatch, transient settings, exact and natural contour policies.
- `src/app/LandBrushTools.tsx`: orientation, rotation, edge style and contextual controls.
- `src/domain/hexLandShape.test.ts`, `src/domain/landBrush.test.ts`, `src/app/LandBrushTools.test.tsx`, `src/store/landBrushActions.test.ts`: new or adapted focused tests.
- `tests/fixtures/hexLandStudy.ts`, `scripts/validate-hex-land.mjs`: six-variant browser/export study.
- README, `docs/hex-land.md`, ADR 0034 addendum, this report.

## Validation

43 tests passed across five files: hexLandShape, landBrush, LandBrushTools, landBrushActions and landBrushClient. Tests cover both orientations, dimensions, six exact vertices/equal sides, rotation, preserved corner anchors after natural contour extraction, bounded detail, all three modes of Add/Remove, lake/bay/whole-island removal, zoom 50%/100%/400%, regular drag, old shapes, contextual controls, world sizing, worker behavior, undo/redo and portable save/reload. Undo restores the entire snapshot, including clipping metadata; redo is exact.

Relevant typecheck passed. Scoped ESLint passed on all changed code/tests and the validation script. Production build passed client/service TypeScript, Vite builds and font resource/license checks; the existing >500 kB chunk warning remains. No unrelated full suite or Windows-package smoke test was run.

Browser validation ran in installed headless Chrome at 1280 × 720 against a fresh isolated local service. Actual UI clicks added a six-corner island and removed a pointy six-corner lake; undo/redo restored complete state. Exact hid irrelevant controls; Soft/Rough exposed them. The fixture contains flat/pointy × exact/soft/rough, normal fantasy coastline, automatic Water Depth and an oversized forest region clipped to land. Local service save and page reload preserve the full snapshot. No browser errors.

PNG export versus the actual Konva map/water scene:

| Scale | Different pixels |
| --- | ---: |
| 1× | 0 |
| 2× | 0 |

Evidence is in ignored `deliverables.local/Hex-Land/`: `Hex-Land.mapweaver`, `hex-1x.png`, `hex-2x.png`, `hex-controls-1280.png`, `hex-editor-1280.png`, `validation.json`. The map archive is the six-variant baseline; the PNGs include the additional UI-cut lake. Screenshots and native PNG were visually inspected. User maps were not modified.

## Limits

No hex snapping/cell painting until a real central hex-grid model exists. Exact refers to a single unclipped footprint; merges, strokes and map-edge clipping naturally create other polygons. Normal coast decoration can extend around its exact boundary. Brush settings do not persist across application restart. Natural edges are subtle bounded coastline variation, not unconstrained organic islands. These choices are documented in the user guide.

No push, merge, release, deployment, upload, cloud change, dependency installation or new Windows package was performed.

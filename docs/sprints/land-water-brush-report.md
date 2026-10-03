# Land / Water Brush sprint

## Acceptance criteria

- Dedicated World/Regional brush with Add, Remove, Smooth and Roughen; six shapes and practical presets, logical/world diameter, softness, roughness and smoothing.
- Continuous zoom-independent strokes, Alt inversion, live contour preview and safe cancellation/navigation.
- Valid canonical islands, peninsulas and inland holes; bounded simplification/cleanup; protected geometry remains intact.
- Existing coast/water rendering updates; semantic terrain and visual paint clip non-destructively to edited land.
- One undo step per stroke, manual-override metadata, safe autosave/reopen/ZIP/backup persistence; unchanged unedited maps.
- Targeted tests, TypeScript, scoped lint, production build, generated-world browser workflow, 1×/2× PNG parity, screenshots and measured performance.
- No Windows package or external actions.

## Delivered

The dedicated World/Regional Land / Water tool creates and reshapes native Landmass Areas. Add Land, Remove Land, Smooth Coast and Roughen Coast share deterministic map-space sampling and a bounded worker. Round, Organic (default), Jagged, Island, Peninsula and Coastline Detail use one polar-noise framework. Continental Mass, Regional Coast, Island, Archipelago Detail, Smooth Shore and Rocky Coast presets change brush settings without changing map themes.

Primary drag edits geography; Alt held at stroke start inverts Add/Remove. The footprint shows action, size and shape. Contour previews are transient and throttled; release validates and commits exactly once. Escape, blur, tool changes and document replacement cancel. World-size numeric input supports fractional km/mi; the slider adjusts logical map diameter, independent of zoom.

The existing polygon-clipping engine unions/subtracts brush coverage and extracts ordinary polygons/holes. RDP simplification, tiny artifact filtering and native topology budgets prevent pathological results. Styled new islands use current theme defaults. Changed land retains its ID and appearance; connected land joins under the first touched Area's identity/style. Linked labels retain world positions, deleted owner links detach, group membership is cleaned. Existing terrain/paint data is retained and clipped to visible land after the first geography edit. Coast and water painters are shared with export. Stamps, labels, roads and rivers are not automatically relocated or deleted.

Format 12 gains optional `map.landEditing` version-1 manual-override metadata; no database schema, dependency or destructive migration is added. Native Areas are the sole geography authority. Historical generator provenance remains intact; future in-place regeneration must explicitly handle overrides. Current generation creates a new map. See ADR-0034 for the full representation and thresholds.

An autosave race exposed by continuous brushing was also fixed: autosave waits for transient gestures, and a save already in flight cannot mark a newer active gesture clean or display a spurious save error.

## Changed components

- Domain: `landBrush`, `landEditing`, map model/settings/capabilities and project parser.
- Interaction: `LandBrushController`, worker/client, footprint and transient brush store.
- UI: `LandBrushTools`, ToolRail and contextual help.
- History/model updates: `landBrushActions`; local autosave gesture guards.
- Rendering: shared `landClip`, MapContent and PNG scene/render ordering/clipping.
- Tests: geometry, history/labels/protection/ZIP, worker cancellation/timeout, controls, save races, service backup/restore and isolated browser acceptance.
- Documentation: ADR-0034, README, AGENTS glossary, changelog and this report.

## Validation

54 distinct targeted client tests passed across `landBrush.test.ts` (20), `landBrushActions.test.ts` (4), `landBrushClient.test.ts` (3), `LandBrushTools.test.tsx` (1), `localSession.test.ts` (15), and existing export/recovery tests (11). The dedicated service test also passed: SQLite write/update/reopen, ZIP transfer, backup extraction, dataset validation and restored document equality. Invalid manual metadata is rejected.

`npm run typecheck` passed; the subsequent `npm run build` rechecked client/service TypeScript and built both bundles. Scoped ESLint passed. The build retains the existing advisory for chunks above 500 kB. No full unrelated test suite, format sweep, Windows package or external operation was run.

`node tests/persistence/land-brush.mjs` passed against isolated local service data. The browser generated a themed world with ordinary stamps, extended its continent, cut a bay, created two islands, extended a peninsula, cut an inland lake, roughened and smoothed coasts, inverted Add with Alt, cancelled a transient stroke with Escape, and checked one undo entry per completed stroke. Undo/redo restored the exact lake geometry. Autosave, explicit Save and reload preserved the document. Native biome and visual paint source data stayed unchanged; a 16×16 lake-interior pixel comparison with those sources removed proved that neither leaked into water. No browser errors occurred. Layout was visually inspected at 1280×720: controls wrap cleanly and Done remains visible.

Both 1× (1200×800) and 2× (2400×1600) PNG exports matched the cloned editor artwork exactly: maximum RGBA difference 0, mean difference 0, no differing channels. Brush chrome lives in a separate layer and is excluded.

## Performance

On a 4096×2800 generated world, five contour calculations per brush size measured 2.1–6 ms for diameters 24, 180 and 1200 map pixels. Resulting edited contours had 73–90 vertices. A separate 180-island fixture had 9,092 source vertices, including one 500-vertex irregular coast; a real worker edit completed in approximately 150 ms including worker startup/module loading, with 114 vertices in the replacement. These are local measurements, not a guarantee for every imported topology. Computation remains off the UI thread and time/point budgets reject overly complex strokes atomically.

## Screenshots and machine evidence

Evidence directory: `.qa.local/land-brush-1790396100697/` (ignored local QA data, not committed).

- [Extended continent](../../.qa.local/land-brush-1790396100697/extended-continent.png)
- [Bay](../../.qa.local/land-brush-1790396100697/bay.png)
- [Two islands](../../.qa.local/land-brush-1790396100697/two-islands.png)
- [Peninsula](../../.qa.local/land-brush-1790396100697/peninsula.png)
- [Lake and clipped terrain](../../.qa.local/land-brush-1790396100697/lake-and-clipping.png)
- [Roughened coast](../../.qa.local/land-brush-1790396100697/roughened-coast.png)
- [Smoothed shore](../../.qa.local/land-brush-1790396100697/smoothed-shore.png)
- [1280×720 layout](../../.qa.local/land-brush-1790396100697/layout-1280x720.png)
- [1× export](../../.qa.local/land-brush-1790396100697/land-1x.png), [2× export](../../.qa.local/land-brush-1790396100697/land-2x.png), [machine results](../../.qa.local/land-brush-1790396100697/results.json)

## Limits and follow-up

- Native limits remain: 512 points per ring, 2,048 per Area, 256 land Areas and 10,000 total land points. Stroke limits are 2,048 samples/256 footprints and five seconds. An excessive or invalid result is refused with a message; shorten the stroke or use a smoother shape.
- Simplification touches all rings of affected Areas within a bounded tolerance; it can slightly simplify distant coast vertices. Tiny holes/fragments under 1–25 square map pixels are cleaned automatically. Smooth Coast rejects changes exceeding 3% of the Area's total land area.
- Smooth/Roughen use a circular falloff along the stroke; shape silhouettes directly govern Add/Remove. Softness affects the binary coverage threshold, not a persistent fractional land mask.
- New islands use the first visible editable land-containing layer, falling back to the active editable layer. Merged land keeps the first Area's style. Hidden land is not edited; touching locked visible land refuses the stroke.
- Edited maps render land before terrain and clip biome/paint to visible land. Existing unedited maps retain their old rendering. An opaque imported background can conceal the water underneath.
- Optional flood fill, a mask-resolution UI, asset relocation and in-place generator regeneration are not included. Follow-up could improve shape-aware smoothing and local-only simplification if editing experience warrants it.

No push, merge, publication, upload, deployment or Windows packaging was performed.

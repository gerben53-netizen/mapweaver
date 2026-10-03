# Sprint 21 — Rivers, roads and borders

24 September 2026. Completed within the explicit boundaries below. No Windows package or external action was performed.

## Acceptance and architecture

Acceptance follows the supplied Sprint 21 brief: three specialized route kinds on the existing editable Path engine; concrete presets and physical scale; variable river widths/direction; road styles, caps and connections; border patterns and previewed Area-edge following; shared snapping/transactions/object management; durable storage and equivalent PNG; bounded geometry and 400-route measurements. Preparation inspected AGENTS, foundational/storage/path/geography architecture, roadmap, Sprint 15–20 requests/reports, and the actual engine, stores, layers, asset and export pipelines. Existing untracked work, personal data and distributions were preserved.

The model is documented in [ADR 0016](../adr/0016-geographic-route-paths.md) and [format 11](../architecture/mapweaver-format-v11.md). Centerline nodes remain canonical. Type-specific settings use a strict discriminated union; no second node editor, route network or asset registry exists. SQLite schema 4 and backup container are unchanged.

## Delivered

- Route tool with River/Road/Border choice, road presets, width, Straight/Curved, full-width preview, repeated placement and Done/Select. Existing Enter/double-click, Backspace/Escape, Shift angles, Alt bypass and wheel/middle/Space navigation work with drafts.
- Shared eight-screen-pixel endpoint/node/T/Area-edge/grid snapping. Exact straight projection fixes lookup-table residuals at straight T junctions. Only same-type exact endpoints or explicit surviving T annotations receive cap patches; road–river crossings follow z-order.
- Rivers have source/mouth widths, taper/widening factors, water/pattern, bank and opacity. Arc-length interpolation derives a bounded cached contour. Reverse swaps both endpoint profiles and handles. Warnings cover upstream-wider and bounded self-crossing checks.
- Roads have trail/road/major concrete styles, solid/dashed/pattern surface, outline, optional dashed center marking, caps/joins and compatible Continue/Extend. Borders have solid/dashed/dotted/double strokes and a bounded soft halo; they can be open or closed.
- Properties show type/name, node count, active-unit length and current physical/pixel width. Unit references freeze when chosen; changing map scale does not resize objects. Uniform/nonuniform transforms follow the documented shared width policy.
- Existing node/handle editing, exact segment insertion and deletion, reverse, endpoint extension, and atomic splitting at an interior node. Splitting preserves group order and interpolated river width. Type conversion previews appearance/property loss before one undo command. Area edge following previews a copied canonical ring and leaves its source unchanged.
- Full-width hits plus minimum screen-space centerline tolerance, conservative full-effect bounds, ordinary layers/groups/search/type filters/visibility/locks/clipboard/transforms/history. Texture IDs reuse existing retention, typed import, missing-asset and export validation.
- Shared canvas/PNG renderer and deterministic map-coordinate styles. Opacity is composed once over the whole object, including banks/markings, using a scratch canvas bounded by visible device-space extent. No giant contour-sized bitmap is allocated.

## Validation

**80 client tests in 11 focused files passed**, covering typed validation/defaults/format, curves/reverse/split/profile bounds, physical conversions, three-kind drawing/cancel/navigation/extension, targeted snapping, grouping/order/clipboard, transforms/arrangement, history, local revision/conflict/recovery/archive and export behavior.

**3 native service tests passed**: typed routes and geographic settings through SQLite reopen, invalid-write retention, revision conflict, portable transfer, asset reference rows and exact texture bytes, verified full backup extraction and reopened restored data.

Client/service TypeScript, production builds and scoped ESLint passed. Reproduction:

```powershell
npm test -- src/domain/routes.test.ts src/domain/paths.test.ts src/canvas/routeDrawing.test.tsx src/canvas/pathDrawing.test.tsx src/domain/objectSnapping.test.ts src/domain/selectionTransform.test.ts src/domain/arrange.test.ts src/projects/localSession.test.ts src/projects/recovery.test.ts src/projects/archive.test.ts src/export/export.test.ts
npm run test:service -- service/routes.test.ts service/routeAssets.test.ts service/geography.test.ts
npm run build
node tests/persistence/sprint21.mjs
node tests/persistence/routes-render.mjs
```

Scoped ESLint covered the changed domain, canvas, app, store, format/session/archive/export files and new client/service/browser tests. No broad unrelated suite, global format check, dependency installation, installer or Windows packaging audit was run.

Development checks found and corrected: an outdated canonical-format expectation in a directly affected path test; an unsafe test-fixture cast; ambiguous browser test selectors for the two Road-class controls; group-member ordering on split; the active Route toolbar label; straight T-projection residuals; and compounded opacity underneath banks. Failed attempts are not counted as passing evidence.

## Browser and pixel evidence

The isolated Chromium runner passed **13 checks at 1280 × 720**: river/tributary; major road/trail connection; closed dashed border; real node editing; reverse and undo/redo; generic conversion preview and undo/redo; physical width; identity-preserving extension; Area-edge preview/copy; double border; autosave/service restart; real node drags at three zooms; and 400-route export. No uncaught browser errors or horizontal overflow.

Final evidence: `.sprint21.local/1790251111106/results.json`, `01-routes.png`, `02-400-routes.png`, `routes.png`, `routes-reopened.png` and `400-routes.png`. PNG before/after service restart is **byte-identical**. These synthetic fixtures remain local and ignored.

The dedicated rendered fixture compares River/Road/Border and tiled water using the editor painter and actual PNG scene. Maximum channel difference is **0**; reversed river difference is **0**. Source-outside alpha is 0; mouth and connected T centers are 255; texture does not spill outside its contour. A 50% river has alpha **128**, including the bank overlap, and matches its exported scene with difference **0**. Two-times export is 1200 × 1000. Results/screenshots: `.sprint21.local/render/`. Screenshots and render comparisons were opened and visually inspected.

Additional agent-operated interactive in-app browser check at 1280 × 720: created an isolated Regional project, selected the Routes layer, drew a three-node curved river with dragged handles, entered the shared node editor, moved a handle and observed length change (639.3 → 655.9 px), cancelled and confirmed exact displayed restoration, reversed/undid, saved, downloaded PNG, reloaded and reopened the same artwork. Browser error log was empty. Temporary tab/viewport override and owned services were closed. This is direct agent interaction plus scripted acceptance, not a claim of an independent human tester repeating the entire matrix. The interactive test service's pending tab shutdown was ended through its owned terminal after saving; no user service was stopped.

## Measured performance

Windows, AMD Ryzen 5 2600, Node 24.17.0, Chrome 153.0.8010.53. Synthetic scene: 100 rivers, 200 roads and 100 borders, each eight nodes. These are elapsed local timings including automation where stated, not FPS guarantees.

| Check | Elapsed |
| --- | ---: |
| Validate/save 400 routes | 154.9 ms |
| Cached geometry access and connection index | 2.9 ms |
| 30 snap queries at 25 / 100 / 400% | 13.4 / 47.8 / 87.5 ms total |
| Real node drag at 25 / 100 / 400%, including automation | 335.9 / 274.3 / 235.4 ms |
| PNG export, including dialog/download | 361.6 ms |

Every measured node drag changes the displayed geometry and cancellation restores the saved objects. Limits: Path 256 nodes/8192 samples per object, 20000 nodes/250000 samples per document; 20000 referenced target segments for endpoint junction checks; 512 samples for crossing warnings; effective width 1024 px; outlines/halos 128 px. Textures reuse shared image budgets and one pattern rather than stored tile objects.

## Boundaries and handoff

Bridge segment overrides are explicitly deferred; no routefinding, hydrology, automatic political regions, path text, Places/Labels, VTT or general filter engine. There are no optional intermediate width controlpoints or persistent custom preset library. Extending a river redistributes its linear profile over the new total length. Exact connections are advisory geometry, not live network constraints; moving a target does not drag tributaries. Different styles and translucent overlapping route objects retain normal z-order/alpha semantics. Sharp/self-crossing contours and sampled double borders are visual paths, not GIS topology or perfect offset polygons. Above 512 samples, self-crossing diagnostics explicitly report that the check was skipped.

**Niet getest:** separate human acceptance, other browser/OS matrices, real power failure, arbitrary adversarial maximum-size textures, installer/default-browser integration and new Windows packages. No known Critical/High defect in geometry, corruption or PNG remains in the exercised scope.

Main files: `domain/routes.ts`, `paths.ts`, `models.ts`, snapping/selection/arrangement/list; `canvas/drawRoute.ts`, drawing/editing/hit/preview components and navigation; `app/RouteTools`, `RouteFields`, `RoutePreview`, `RouteConversion`, `BorderFromArea` and shared Properties; editor/project stores, project format/session/archive and export dispatch; targeted tests and documentation.

No push, merge, publication, deployment, upload, cloud change, system-service installation or Windows package creation.

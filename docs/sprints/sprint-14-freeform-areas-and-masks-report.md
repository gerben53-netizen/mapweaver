# Sprint 14 — Freeform areas and masks

23 September 2026. **Area functionality and targeted acceptance completed.** This status concerns Sprint 14; it does not close the earlier Sprint 13 installer/default-browser limitations.

## Inspection and acceptance basis

Read AGENTS, foundational ADR, persistent-storage ADR, Sprint 6/7/10/12/13 reports, v1/v2 format documentation and the actual model/rendering/history/autosave/export paths before editing. The requested storage ADR is actually `docs/adr/0005-persistent-storage-architecture.md`. The advanced roadmap was absent; a bounded status document was added without inventing later sprint scope. Existing untracked repository content was preserved; nothing staged, committed or reset.

Acceptance: one discoverable Area tool for four shapes; canonical map geometry with multipolygons/holes; deterministic rectangle migration; point sessions and bounded boolean operations; existing object/layer/history integration; SQLite and portable/full-backup roundtrips; shared PNG rendering; verified Chromium workflow at 1280×720. No extra terrain systems or visual effects.

## Model and implementation

See [ADR-0007](../adr/0007-canonical-areas.md), [format v3](../architecture/mapweaver-format-v3.md) and [object model](../architecture/object-model.md).

- `kind: area`, map-coordinate outer rings/holes, derived checked bounds, fill union and stroke. Existing layer membership and `opacity` naming are retained. No blobs, nodes, URLs, viewport or edit handles in the stored object.
- Six-digit CSS hex colors are the supported color subset. Solid/none/pattern fills share one painter. Stroke includes holes, visibly stated in Properties. Missing pattern shows a colored placeholder/error; PNG refuses unreadable sources.
- Rectangle, adaptive polygonal Ellipse, click Polygon and sampled/simplified Freehand. Shift constrains shapes/angles, Alt bypasses snap, Escape cancels, polygon Enter/Backspace/close-start/double-click complete the workflow. New contours outside the map or with self-crossing edges are refused with feedback.
- Point sessions have an explicit ring selector, draggable nodes, nearest-edge insertion and removal. Done/Enter commits once; Escape restores the entire session. Ordinary movement/proportional scaling bakes geometry and its texture frame. Whole-area rotation/mirroring remain unavailable; stamps are unchanged.
- `polygon-clipping 0.15.7` is the only boolean library, chosen for established multipolygon/hole handling and bounded integration. It runs in a disposable worker with 1.5 s timeout, selection/input/result budgets and revalidation. Union/Subtract replace sources atomically using the first-selected primary's style/frame/layer/ID. A concurrently changed model or invalid/complex output preserves sources; empty output requires confirmation.
- Freehand uses iterative RDP, avoiding recursive stack growth or another overlapping library. Fixed map-unit sampling/tolerance produce zoom-independent geometry. Explicit complexity limits are below.
- Pattern frame is stable during point edits and follows whole-object transforms. Repeat tile scale stays in map pixels on resize; Stretch uses frame dimensions and preserves inactive repeat parameters. Existing rectangular Repeat/Stretch semantics survive migration.
- New portable/API writes use format **3**. v1/v2 input remains readable and is normalized centrally. SQLite schema and full-backup ZIP container do not change. Service project-row formatVersion is updated on save; asset-reference checking/remapping includes nested pattern fill IDs. Legacy drawing/paint/Properties components were removed.

## Central limits and performance

512 points/ring, 16 holes/polygon, 32 polygons/area, 2,048 total points/area and boolean result; 2–16 boolean sources with 4,096 total input points; 1,500 ms worker deadline. Freehand: 4,096 raw samples, 512 simplified points, 2-map-pixel sampling distance and 1.5-map-pixel RDP tolerance. Duplicate-edge epsilon 0.000001; minimum new shape bounds 8×8. Ellipse 32–512 points targets 0.25-map-pixel chord error subject to cap. Existing document-wide limits remain active.

These are conservative editor/serialization budgets, not GIS-scale guarantees. In isolated Chrome, normalization of 100 representative 512-point rings took **355.2 ms total** (~3.55 ms/ring) in the recorded render probe. Boolean work cannot monopolize the UI thread because it is isolated and terminated at its deadline. The freehand acceptance contour reduced 90 pointer samples to a visibly faithful bounded outline. No claim of a full 10,000-object/max-detail benchmark.

## Targeted validation

| Check | Result |
|---|---|
| Client Vitest, 10 directly affected files | **59 passed** |
| Service Vitest, areas/storage/migration/data safety | **35 passed, 1 skipped** |
| Client + service TypeScript | Passed |
| ESLint, changed TS/TSX/service/browser-script scope | Passed |
| Client + service production builds | Passed |
| Chromium 1280×720 end-to-end interaction and restart | Passed |
| Legacy/canonical pattern pixel comparison | Passed, maximum 1/255 channel difference |
| Full backup staged restore with area/hole/pattern references | Passed |
| Separate portable Windows package + launcher checks | Passed |

Client selection: `domain/areas.test.ts`, `canvas/areaBooleanClient.test.ts`, `projects/localSession.test.ts`, `projects/archive.test.ts`, `projects/sprint10-assets.test.ts`, `projects/recovery.test.ts`, `export/export.test.ts`, `store/objectManagement.test.ts`, `canvas/patternDrawing.test.tsx`, `app/sprint10-workspaces.test.tsx`.

Coverage includes geometry normalization/topology/limits, incomplete nested fields, four shape constructors, fixed RDP fixture, grid/Alt and Shift rules, migration repeat/stretch/frame/IDs and idempotence, union overlap/disjoint/holes/empty/limits, worker timeout/termination, complete edit-session history/cancel, clipboard/layers, portable embedded-byte roundtrip, missing references, export scene boundaries and existing save/conflict/recovery guards. The real UI workflow verifies completed area autosave into SQLite, not just mocked fetches.

Service tests use only synthetic isolated data. The new case preserves area geometry/style/pattern references through SQLite, reopen, portable transfer, verified full backup/extraction and restored database read; invalid geometry leaves revision/content intact. Existing restore staging, rollback, generation and archive rejection tests were rerun because the project document format changed. The skipped case is the opt-in ~540 MiB streaming benchmark already measured in Sprint 13; it is unrelated to polygon metadata and was not repeated. No broad unrelated editor suite, installer install/uninstall or OS data changes.

Initial tests genuinely failed where they expected canonical v2/patternFill objects or the old Konva Rect renderer. Fixtures/harnesses were migrated to the Area path while preserving compatibility and asset-retention checks. An export test initially selected Konva's Image base-class Shape instead of the area Shape; its selector was corrected. Invalid missing-pattern-ID/frame input was found during review and now has regression coverage. Earlier failed runs are not counted as successful evidence.

## Browser and visual acceptance

Executed DOM/mouse/keyboard workflows in an isolated installed **Chrome 153.0.8010.53**, 1280×720. Screenshots and PNG were opened and visually inspected. This is automated browser operation plus actual visual inspection, not a claim that a human manually operated every control.

Passed: solid rectangle, stroked ellipse, five-point polygon with Backspace/Enter, freehand simplification, nonrectangular pattern, Pattern fill picker shortcut retaining shape, point insertion/move/removal, Escape during drawing and point editing, grid/Alt, Union, Subtract with a visible hole, undo/redo, whole-area move/proportional scale, wheel zoom during a gesture, both pan methods without accidental areas, PNG download, service stop/restart/reopen, scrollable Properties and no horizontal overlap at 1280×720. No browser runtime errors.

Evidence script: `tests/persistence/sprint14.mjs`. Successful extended-run evidence is retained locally in `.sprint14.local/1790180402724/`:

- `01-shapes-and-fills.png` — all four shapes and nonrectangular pattern.
- `02-point-editing.png` — selected node, guide, ring selector and edit-session controls.
- `03-boolean-hole.png` — subtraction result with transparent interior.
- `areas.png` — final exported map, matching the canvas contents without handles/guide/toolbar.
- `04-reopened.png`, `acceptance.json` — persisted result after process restart.

The render fixture (`tests/persistence/area-render.html`, driven by `area-render.mjs`) compares actual legacy Konva Rect pixels with the shared area painter for Repeat/Stretch at 0°/37°, nonzero offsets/scale and 0.6 opacity. Three cases are identical. Rotated Repeat differs in only four color channels by 1/255, an invisible floating-point rasterization difference. Hole-center alpha is exactly zero. Evidence: `.sprint14.local/render-comparison.json`.

## Limits and handoff

Conservative topology rejects touching components/rings, as well as crossing geometry. A result exceeding the contract is rejected atomically. No automatic repair of self-crossing freehand contours. No whole-area rotation/mirror, multiselect scaling, arbitrary named CSS colors, effects, open paths, wall/road/river tools or masks that clip other objects. Stroke width and repeat tile size do not scale with object geometry; this deliberate map-pixel behavior is documented.

No known open Critical/High finding for the tested area workflows. Large maximum-complexity whole-project performance, other browser/OS matrices and real power-loss behavior were not newly certified. Existing Sprint 13 installer/default-browser limitations remain separate. New v3 projects require the updated application; retained older portable builds cannot open them.

Main changed parts: model/geometry/worker; drawing/points/shared painter; toolrail/context/Properties; transform/clipboard/history integration; central format and resource references; SQLite import/write/restore integration; tests, README, format/model/roadmap documentation and ADR-0007.

Portable output: **`distribution.local/Mapweaver-Sprint14/Mapweaver.exe`**, with `distribution.local/Mapweaver-Sprint14-SHA256SUMS.txt`. The previous `distribution.local/Mapweaver` directory was locked by another process; the attempted retention move failed without moving it, and the default package builder correctly refused to overwrite it. No existing process was stopped. The packaging script now accepts a restricted, path-free alternate package name, and checksum output is separate. A new package was built alongside the original. Save and stop a running older Mapweaver before launching this package, otherwise the launcher may reuse the already-running older service.

`node tests/persistence/launcher.mjs distribution.local/Mapweaver-Sprint14` passed on an isolated copied package: occupied port, missing native module, double launch, stop, portable upgrade and program-only uninstall preserve the separate test dataset. The expected negative-case launcher messages are not startup failures of the final package. Installer/default-browser tests were not repeated; their Sprint 13 limitations remain.

**No push, merge, release, publication, deployment, upload of project data, cloud change or system-service installation.** Public tooling/dependencies were downloaded for local development. Personal Mapweaver data was not opened or modified by tests. Owned test services are stopped; evidence remains local.

# Northreach Precision Authoring Acceptance

17 October 2026. **Technical acceptance PASS; local visual improvement modest; professional world-map quality NOT accepted.** This test improves three existing coast sections without claiming a new Elyra reproduction.

## Integration and scope

The requested integration already exists: local develop and codex/land-precision-authoring both contain e7e25e0d32bf39c7039671ea5efb5cf58efd1734. This audit starts from that commit on codex/northreach-precision-acceptance. No second merge, parallel worktree or remote action. The user's latest no-push instruction remains in force.

Only this new audit directory is changed. Existing Northreach/Elyra projects, earlier audits, Campfire and Primary Development remain untouched. The pre-existing untracked map-types audit ZIP is excluded from the audit commit.

## Deliverables

- [Visual comparisons](index.html), with reference context, matching native before/after crops and real editor screenshots.
- [Editable map](northreach-precision.mapweaver), new QA identity **e19dc804-720f-476e-a85c-06ffe38bd442**.
- [Full native PNG](northreach-native-export.png), 1625×1425, 1×, ARL OFF, no grid/scale bar/reference.
- [Quality assessment and seven conclusions](quality-assessment.md).
- [Measured workflow](workflow-metrics.json), [event log](operation-log.json), [geometry validation](geometry-validation.json), [roundtrip](roundtrip.json), [checks](test-results.md).
- comparison/: complete per-step native exports and snapshots, exact crops, side-by-side images (before left, after right), history results and summary.png (bay, cape, south coast from top to bottom).
- screenshots/: before/preview/after per section, reference panel and roundtrip confirmation. Pink landmarks are visible in bay-preview.png and cape-preview.png.

## How this was authored

A new QA copy was imported through normal importLocalProject, which creates new map/object identities while preserving initial geometry. The real App was mounted. Audit buttons select the copied landmass and set the same deterministic viewport per section. Range inputs, protected point selection, Preview, Apply and Cancel were operated through the **actual Local contour precision inspector UI**. No audit script generates or changes contour coordinates. The existing precisionSmooth → commitLandStroke implementation performs edits.

| Area | Original ring indices | Protected landmark | Strength | Accepted |
|---|---|---|---:|---:|
| Westmere/Golden Marches bay | 198–224 | 215, deepest eastern tip | 50 | 1 |
| North cape | 31–61 | 46, cape tip | 50 | 1 |
| Angular south coast | 163–180 | none; endpoint tangents retained | 50 | 1 |

Snapshots are sequential: cape-before already includes the bay edit; straight-before includes bay and cape edits. The three ranges do not overlap. Crop coordinates and zoom remain identical within each before/after pair. Screenshots show editor chrome; previews use the editor's focused segment view. Native crops are independent of the viewport and come from the full native export at exactly the same map coordinates. Their 2× comparison enlargement uses nearest-neighbour for honest pixel inspection, not artwork improvement.

Elyra was visually inspected at its original resolution and loaded using the real editor-only Reference View, then zoomed. It was hidden for consistent full-width screenshots. No calibrated link or automatic contour tracing was used. Native PNGs are produced by the existing exportPng/currentRenderRequest pipeline through explicit audit capture buttons, **not** screenshots, an external renderer or simulated download. This distinction applies equally to per-step and final PNGs.

The save proof verifies normal QA database save/reload and the normal portable archive codec; it then renders after loading each result. All three PNG hashes match. Archive loading in the harness is transient; browser reload afterward reopens the saved QA database map. Reference files never become project assets.

## Reproduce without Primary

Use an explicit QA service/data root; this run reused the existing verified QA service on 49571, root .qa.local/land-precision/data. A separate audit frontend on 49582 avoids modifying prior proof receivers. Existing listeners were checked first. The proxy forwards to QA only and retains its configured development Origin 49572. Never substitute Primary or npm run dev for this audit harness.

Run `npx vite --config docs/audits/2026-10-northreach-precision-acceptance/reproduction/vite.config.mjs` and open the adjacent reproduction/index.html route. New QA copy → choose region → Focus region → Capture native before → Properties/Terrain/Geographic role & contour/Local contour precision. Apply the values above using the UI, capture after, and verify Undo/Redo. For the south coast, first Preview/Cancel and capture unchanged before, then Preview/Apply. Finish after normal autosave reports Saved. Verify stage archives additionally reloads each accepted stage through the normal archive codec and native exporter without writing intermediate stages to the database. Restart only this frontend after editing its harness because file watching is disabled. The output receiver can write only into this audit directory.

`node docs/audits/2026-10-northreach-precision-acceptance/reproduction/verify.mjs` rechecks stored native geometry/archives/hashes and recreates comparison crops using existing Mapweaver validation. It does not modify product code or old audits. Exact authoring event counts/time windows are in workflow-metrics.json. No human authoring-time benchmark was performed.

# Test results

2026-10-18. **102 passed, 0 failed, 0 unloaded suites; 14 suites passed.** Final confirmation run: 07:04:05 local, duration 14.95 seconds. Isolated TEMP/TMP: `.qa.local/organic-brush/test-temp`. No Primary Development database is used by tests.

Command: `npx vitest run src/canvas/LandBrushController.test.tsx src/domain/organicLandFootprint.test.ts src/domain/landBrush.test.ts src/store/landBrushActions.test.ts src/app/LandBrushTools.test.tsx src/domain/hexLandShape.test.ts src/domain/hexGrid.test.ts src/app/HexGridSettings.test.tsx src/canvas/landBrushClient.test.ts src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/projects/archive.test.ts src/store/history.test.ts`

Coverage includes deterministic/evolving seeds, valid bounded footprints at diameters 12/120/1200, Add/Remove, repeat overlaps, clipping, narrow land bridge, equal sparse/dense sampling along the same polyline, world-position continuity and direction invariance. Controller tests cover preview/commit seed consistency, subsequent gesture variation, Escape/blur cancellation and Round seed compatibility. UI tests cover simple organic defaults and retained Round controls. Store tests cover all three profiles, undo/redo and editable archive roundtrips. Existing hex, precision, landmarks, worker and history regressions pass.

Six Round footprint and complete Add/Remove geometry SHA-256 expectations were captured before implementation from audit baseline `645fb9a`. All remain exact. An initial new controller test fixture omitted required `background: null`; this test-only TypeScript error was corrected before the final successful checks. No production behavior or test expectation was weakened.

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass: contract, TypeScript, client, service, font resources |
| `npm run check:campfire-contract` | Pass, also executed by full build |
| Native UI PNG / archive / database PNG parity | 5/5 exact SHA-256 matches |
| Editable object archive/database parity | 5/5 exact |
| Controlled geometry validation | 16 operations, 0 rejected, 0 invalid |

Browser: actual App in isolated QA at 49612, service 49571. All five native UI download dialogs use 1×, ARL OFF, no grid, no corner scale bar and opaque map background. The full native PNGs are 1625×1425. Screenshots show the surrounding editor and QA identity. The shape controls are additionally shown in `screenshots/organic-fine-controls.png`.

Separate actual pointer drag with Organic Soft produced `Undo: Add land`; undo exposed `Redo: Add land`; redo restored the gesture. The final undo and Save restored the controlled Combined map; repeated export/archive/database parity remains identical to its original UI download. `screenshots/ui-stroke.png` captures that separate gesture. This action is not counted among the controlled comparison strokes.

No full unrelated test suite, Playwright suite, Windows packaging or Primary Development restart was performed. Timing is recorded in `performance-results.json`; no pointer latency instrument was added. Existing client chunk-size and mixed static/dynamic import build warnings remain nonfatal.

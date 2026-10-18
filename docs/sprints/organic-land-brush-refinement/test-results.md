# Refinement validation

2026-10-18. **106 passed, 0 failed, 0 unloaded suites; 14 suites passed.** Duration 19.53 seconds. Tests use isolated `.qa.local/organic-brush/test-temp` TEMP/TMP.

`npx vitest run src/domain/organicLandFootprint.test.ts src/domain/landBrush.test.ts src/canvas/LandBrushController.test.tsx src/store/landBrushActions.test.ts src/app/LandBrushTools.test.tsx src/domain/hexLandShape.test.ts src/domain/hexGrid.test.ts src/app/HexGridSettings.test.tsx src/canvas/landBrushClient.test.ts src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/projects/archive.test.ts src/store/history.test.ts`

Four added cases cover Fine's meaningful noncircular shoulders at diameter 24 and continuous multi-turn native geometry for all three profiles across seven seeds. Existing tests cover sizes 12/120/1200, deterministic and varied seeds, clipped Add/Remove, sparse/dense event subdivision, repeats, narrow connections, validation, cancellation, history, archive and precise editing. Preimplementation Round footprint and complete Add/Remove geometry hashes remain unchanged.

| Check | Result |
|---|---|
| Typecheck | Pass |
| Lint | Pass |
| Full build (client, service, fonts) | Pass |
| Campfire provenance check, executed by build | Pass |
| Controlled native geometry | 16 operations; 0 rejected; 0 invalid |
| Five actual native UI downloads | Pass |
| PNG equality before / after archive / after QA database load | 5/5 exact |
| Editable object equality on both reload paths | 5/5 exact |
| Repeated Round UI export versus old baseline | Exact SHA-256 equality |

The native output does not incorporate externally rendered maps or generated artwork. Contact sheets only crop and label real PNGs. The initial comparison script had an incorrect relative path to previous proof, fixed before successful verification; no source evidence was altered. Ordinary existing chunk-size and mixed import build warnings remain nonfatal.

No unrelated full test suite, Playwright suite, Windows package or Primary restart. Geometry timings are one cold ordered SSR run; native render timings are browser render/encode calls. Human UI delay and pointer-to-pixel latency are not reported as measured rendering cost.

Additional real UI check: select Organic Fine and Remove Land; drag on the coast at the current 60-pixel diameter. The worker completes and exposes `Undo: Remove land`; undo exposes redo, redo restores the operation. After a final undo and Save, repeated archive/database/native rendering matches the already downloaded Combined PNG exactly. The temporary gesture is excluded from the controlled comparison. See `screenshots/fine-remove-ui.png`.

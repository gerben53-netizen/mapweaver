# Test results

**115 passed, 0 failed, 0 unloaded suites; 15 suites passed**, duration 16.22 seconds. Isolated TEMP/TMP `.qa.local/organic-brush/test-temp`.

```text
npx vitest run src/domain/organicStrokeCaps.test.ts src/domain/organicLandFootprint.test.ts src/domain/landBrush.test.ts src/canvas/LandBrushController.test.tsx src/store/landBrushActions.test.ts src/app/LandBrushTools.test.tsx src/domain/hexLandShape.test.ts src/domain/hexGrid.test.ts src/app/HexGridSettings.test.tsx src/canvas/landBrushClient.test.ts src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/projects/archive.test.ts src/store/history.test.ts
```

Nine new tests cover directionless dab/tiny gesture, symmetric distance-based ends and neighbors, exact body pass-through, tangent axes at four angles, and Soft/Rugged/Fine Add/Remove over short/long/curved/sharp/reversed paths. Existing tests retain multi-seed repeated strokes, clipping, narrow connections, sparse/dense event equality, Round pre-prototype footprint/boolean hashes, cancellation, precision/landmarks, archive and history.

The existing three-profile store test was additionally strengthened to use a two-point **Remove cap** gesture as well as Add; it verifies separate history entries, exact undo/redo and archive roundtrip. Its entire suite was rerun: **8/8 passed**. This is a rerun subset, not eight additional unique tests. Typecheck/lint were repeated after this test-only strengthening.

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass: contract, TypeScript, client, service, font resources |
| Campfire contract check (full build) | Pass |
| Five actual UI downloads / archive / database PNG equality | 5/5 exact |
| Saved object parity through archive and database reload | 5/5 exact |
| Round native SHA-256 vs previous refinement | Exact: `57d99d383144c3d1b15675d7161d08fdddaef8c6e012f3a6fcfa7c286d34ac6c` |
| Controlled geometry admission | 0 rejected / 0 invalid; 1 explicit no-op |
| Long-fixture body outside cap zones | 48/59 sample footprints unchanged exactly |
| Visual production acceptance | **FAIL — REJECT** |

A separate actual Rugged Add pointer drag in the QA editor exposes Undo, then Redo, then restores after final Undo and Save. `combined-restored.png` is a second true UI download and equals the original Combined UI PNG exactly. The separate gesture is excluded from the comparison actions. `screenshots/ui-stroke.png` records it.

Known high-density mask-difference failure remains unresolved. Its standalone existing reproducer was run and confirms both failures still occur; no geometry precision repair or hidden zero value was used. Any unavailable boolean-difference/memory metric stays null with reason. This known diagnostic failure is distinct from the 115 passing regression tests.

No unrelated broad test suite, Playwright suite, Primary restart or Windows packaging. Existing client chunk-size and mixed static/dynamic import warnings are unchanged and nonfatal. Functional and safety checks pass, but they do not override the failed visual judgment.

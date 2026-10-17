# Validation results

Integrated base: local develop e7e25e0. Final relevant Vitest run: **108 passed, 0 failed, 0 non-loaded suites, 14 files, 13.17 s**. Process-local TEMP/TMP points to ignored .qa.local/calibrated-reference/test-temp; default file parallelism and test isolation retained. No repeat of the prior sandbox ENOENT failure.

```text
npx vitest run src/canvas/referenceCalibration.test.ts src/store/referenceNavigation.test.ts src/app/ReferenceView.test.tsx src/app/LandPrecision.test.tsx src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/projects/archive.test.ts src/store/history.test.ts src/canvas/viewport.test.ts src/imports/readImage.test.ts src/app/LandBrushTools.test.tsx src/domain/landBrush.test.ts src/store/landBrushActions.test.ts src/domain/areas.test.ts
```

Coverage: exact two-pair scale/translation/rotation, inverse at numerical tolerance, three-pair residuals, incomplete/duplicate/near-coincident/out-of-bounds/non-finite/unsafe input, direction changes, centre and zoom matching, pointer zoom, different sizes/scales, clamping, loop guard, Independent, Hide/Show, correction/removal/reset and component-level image/map picking at a nontrivial viewport. Existing suites cover contour drawing, protected landmarks, local smoothing, history and archive persistence.

The new invalid-input table was initially shaped incorrectly for it.each; it now passes complete fixtures through named input objects. Exact floating-point equality was replaced by tolerance. An ambiguous status-role query was corrected. These initial new-test problems are disclosed; no product expectations, isolation settings or existing contract checks were relaxed.

Typecheck, lint, full build and contract check pass. The build retains existing chunk-size and ineffective dynamic-import warnings. Final verification after all product edits passed, including the Preview calibration guard. No broad full test suite, Playwright suite, Windows package, remote push or merge.

Real QA UI proof: three pairs, deliberate duplicate-pair rejection and correction, both navigation modes, Align Views, existing bay smoothing, actual UI Undo/Redo and actual Export PNG download. The proof receiver captures unmodified native export output, not screenshots as PNG exports. Native image/reference/marker isolation compares byte-for-byte. Normal QA database reopening and portable archive codec are verified separately, including native render after both. See evidence/validation.json.

The initial save proof checked an intermediate dirty status immediately following history operations. Normal autosave subsequently reported Saved. Only the QA harness was adjusted to wait for stable Saved; storage product code was not modified. The native history evidence comes from explicit UI Undo/Redo exports. The QA frontend watcher was disabled after excessive local scanning; only that frontend was restarted, never Primary or the shared QA service.

Layout was inspected in the real App inside a 1280×720 CSS-pixel iframe, displayed at 85% to fit the browser. Screenshot 13 identifies that presentation explicitly. Calibration controls scroll within the existing pane; no map editing occurred in that layout-only session.

Final typed-query correction was followed by another ReferenceView component run: 5/5 passed (7.74 s). Final typecheck, lint, full build and canonical contract verification passed after all product changes. The complete 14-file run remains 108/108; no assertions were weakened to suppress a product failure.

# Test results

17 October 2026. Validation used only .qa.local/land-precision/data with explicit QA profile, service 49571 / frontend 49572. Existing instances/ports were checked first; no Primary Development writes/imports or reference library imports.

| Check | Final result |
|---|---|
| P1 isolated initial check | 28 tests / 4 files passed before implementing Reference View |
| Final affected suites | 58 tests / 9 files passed, 11.38 s |
| Reused viewport/import/history suites | 30 tests / 3 files passed, 5.88 s |
| Total final targeted checks | **88/88 passed, 12 files** |
| npm run typecheck | Passed |
| npm run lint | Passed; historical frozen audit recipes explicitly scoped out, new sprint recipes checked |
| npm run build:client | Passed; usual chunk-size/dynamic-import warnings |
| npm run build | Passed after accepted package fingerprint refresh; client, service and font verification |
| Artifact verifier | Passed: native PNG hashes, archive contents, exact unaffected geometry, protected coordinates, reference exclusion |
| Native UI undo/redo | Apply creates Smooth coast; Undo and Redo both usable and exercised |
| QA database save/reload + portable archive | Exact geometry and identical native PNG for Northreach and bridge |

Affected suite command:

```text
npx vitest run src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/app/ReferenceView.test.tsx src/app/LandBrushTools.test.tsx src/domain/landBrush.test.ts src/store/landBrushActions.test.ts src/domain/areas.test.ts src/projects/archive.test.ts
```

Additional reused-code command:

```text
npx vitest run src/canvas/viewport.test.ts src/imports/readImage.test.ts src/store/history.test.ts
```

Tests cover exact locality/tangents, protected cape, wraparound, invalid ranges/strengths, stale indices, topology validation, narrow bridge and unrelated polygons, newly introduced overlap, one transaction, undo/redo, ZIP persistence, UI preview/cancel purity, protection selection, independent reference pan/zoom, invalid image reporting, disposal and unchanged project data. Existing Area tests exercise drawing/freehand, point editing, booleans and archive/render-scene separation; Land brush tests cover Add/Remove/Smooth/Roughen. Existing topology limits remain unchanged.

Initial failures were not hidden: excessive paired-step weighting was found visually and fixed; a bending-reduction test now prevents that regression. Related existing Land history tests compared the monotonic Campfire revision and reused a stale pre-undo snapshot; fixture expectations now follow existing history semantics. Area tests reset their canonical layer tree with their layer IDs. No product history or contract validation was relaxed.

Full lint initially found 54 errors in old audit .mjs snapshots; these historical authoring recipes are not maintained application source and are excluded explicitly. Existing audit content was preserved. Application and new sprint reproduction scripts remain linted.

The original full-build blocker was a tooling-only change in canonical package.json: addition of --import ../../scripts/test-isolation-preload.mjs to the test script. The user accepted it. Only that provenance fingerprint was refreshed; all 21 other fingerprints match and the existing guard passes. No canonical contract, schema, generated type or validation rule was modified.

No broad test suite, Playwright suite, Windows package, push, merge or publication was run. Real interface checks used the in-app browser and ordinary editor controls. Native PNGs came from Export PNG → Download PNG, with an audit-only copy of the emitted Blob URL; they are not screenshots or external renders. See evidence/validation.json for exact hashes and archives.

## Closure verification — 17 October 2026

The prior sandbox run loaded only two suites (16 tests passed); ten suites failed during module loading with ENOENT under C:\Users\gerbe\AppData\Local\Packages\sandbox.{adf7243a-eb4d-4176-915f-5da7775b6305}\AC\Temp\Y142nLisEpdkEoD4n207G\client or ssr. These were module-loading errors, not failed assertions.

Installed Vitest 5.0.1 creates a random project directory below os.tmpdir(), writes transformed module files into environment subdirectories for fork workers, and removes its directory through clearTmpDir. The repository uses ordinary jsdom, setupFiles and restoreMocks, with default file parallelism and isolation. Test setup contains no temp cleanup. Separate invocations receive sandbox-specific TEMP/TMP roots. Process inventory through CIM was unavailable in the sandbox; no specific competing deleter or cleanup race was proven. The prior checks also ran build and tests concurrently; that alone does not establish causality.

Recovery (no product/config/test changes): set process-local TEMP and TMP to an absolute writable repository-local ignored QA directory, confirm Node os.tmpdir() and a write probe, then rerun the exact 12 relevant files.

| Run | Passed tests | Failed tests | Non-loaded suites | Passed suites | Duration |
|---|---:|---:|---:|---:|---|
| .qa.local/precision-vitest-temp, --maxWorkers=1 --no-file-parallelism | 88 | 0 | 0 | 12 | 45.33 s |
| .qa.local/precision-vitest-temp-parallel, default concurrency | 88 | 0 | 0 | 12 | 13.45 s |

The serial run visibly created transformed temp files (818 files observed afterward); directories were retained by this installed run, so no manual deletion was performed. No ENOENT recurred with either concurrency setting. This supports an environment/temp-path problem rather than a test or product defect; the exact original removal mechanism remains unproven. Use separate writable process-local temp roots for sandbox recovery; no permanent configuration change is needed.

Contract verification, full build, typecheck and lint were rerun successfully. Existing build warnings concern chunk size and ineffective dynamic import only. The evidence verifier was rerun successfully; native PNG hashes, unaffected geometry and archive/database roundtrip remain valid. All eleven screenshots and PNG exports are retained unchanged; preview and 1280×720 Reference View were visually re-inspected. No new interactive acceptance session was required for a fingerprint-only change. No Primary Development or Campfire files were written.

Branch remains codex/land-precision-authoring. Local closure commit only; no merge or push is authorized by the repository workflow.

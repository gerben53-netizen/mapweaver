# Diagnostic execution and recovery

2026-10-18. The initial attempt stopped with exit 1 on the comparison failure. The user then authorized identifying/preserving that case and resuming independent diagnosis. The completed collection retains the unresolved failure rather than calling every operation successful.

## Current checks

**74 tests passed, 0 failed, 0 unloaded suites; 8 suites passed.** Duration 12.82 seconds, isolated TEMP/TMP `.qa.local/organic-brush/test-temp`.

```text
npx vitest run src/domain/organicLandFootprint.test.ts src/domain/landBrush.test.ts src/domain/landPrecision.test.ts src/canvas/landBrushClient.test.ts src/store/landBrushActions.test.ts src/store/landPrecision.test.ts src/projects/archive.test.ts src/store/history.test.ts
```

These existing targeted tests cover Round pre-prototype hashes, deterministic/valid organic geometry, clipping, multi-turn continuity, density/event subdivision, narrow connections, precision/landmark semantics, worker behavior, history and archive roundtrips. No test expectation or product file was modified.

- `node .../analyze.mjs`: collection completed with **22 captures**; all footprints and stored Areas pass native validation. Ordinary-sampling observed output equals the unmodified function; low/high-density override results are separately identified. Repeated calls are deterministic. Exact native Rugged project replay passes.
- **Known geometry measurement failure:** high-density reference-minus-candidate AND candidate-minus-reference still fail. The area result is `null`, never zero or substituted. Both exact masks, hashes, input/samples, error text and stacks are retained. Other sensitivity and endpoint-ablation difference measurements succeed.
- `node .../replay-failure.mjs`: fresh-process failure reproducer passes its assertions **because both failures recur exactly**, not because the operations succeed. Four independent raw land operations (Union/Subtract with each mask) succeed on the retained diagnostic rectangle.
- `npx eslint docs/audits/2026-10-organic-stroke-geometry-diagnostic/analyze.mjs docs/audits/2026-10-organic-stroke-geometry-diagnostic/replay-failure.mjs`: pass. Initial script-only Node-global lint diagnostics were corrected by explicit Node imports/globalThis; no rule was disabled.
- Typecheck/full build/full lint/broad tests: not rerun; this task changes only audit scripts and evidence. The research requests relevant checks, not a new product build.
- Native PNGs: copied existing true UI downloads, SHA-256 checked against original validation records. No new native export or running app is claimed. Native Round hash remains the unchanged baseline.

Raw B/C checks find no strict proper same-ring crossings, non-finite coordinates or ≤1e-9 edges. Their scope excludes collinear touches and inter-ring relations; final Areas receive full native validation. One high-complexity raw C exceeds the native 512-point ring budget and is only admissible after the ordinary simplifier; no budget was increased.

All production source, previous audits/prototype/refinement files, assets and Campfire artifacts remain unchanged relative to `e502a93`. No Primary Development or QA database connection was made. Existing unrelated untracked map-types ZIP remains outside the audit commit. No merge/push/package.

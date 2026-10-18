# Organic Stroke Geometry Diagnostic

2026-10-18 · `codex/elyra-v3-geographic-accuracy` · product baseline `e502a937f283be4c6e503b3603e28dc1fcae7c71`.

**Recommendation: TARGETED FIX**, limited to a cap-treatment prototype inside the existing footprint pipeline. No production GO. No product code, Round behavior, assets, Campfire or Primary Development was changed. No merge, push or Windows package.

The principal residual short-stroke lobe comes from full-radius terminal footprints, already visible in stage B before land booleans or simplification. Intermediate footprints can also form shoulders at corners. At the current spacing the tested long stroke is continuous; deliberately coarser sampling introduces an obvious chain. Increasing density smooths body detail but does not remove terminal caps.

## Known comparison failure — preserved, not repaired

The previously blocking variant is **high-density**: same Rugged path, diameter 120, seed 713, 4.8-pixel spacing (174 samples), versus current 14.4-pixel spacing (59 samples). `polygon-clipping@0.15.7` fails in both directions when subtracting these two raw masks from one another. The exact doubles were written **before** measurement to [high-density.json](mask-comparisons/high-density.json), with hashes, original inputs and override samples. [Original errors and stacks](mask-comparisons/high-density-result.json) and [fresh-process replay](failure-replay.json) are retained.

The symmetric-difference area remains explicitly `null`/`failed`. No coordinates were snapped, rounded, repaired or sent to an alternative clipping engine. Both masks independently succeed in the raw land Union and Subtract operations against the same rectangle; their stored results validate. This confines the observed failure to this mask-versus-mask comparison, without proving all possible production operations safe. Near-coincident intersections are a plausible numerical cause; the exact internal library defect is not established. See [root cause](root-cause-assessment.md).

The user explicitly authorized resumption after preservation of the failing case. The harness now records failed optional measurements and continues independent observations. A successful harness exit means evidence collection completed, **not that the two geometry operations passed**. The original HMR port warning was eliminated by disabling unnecessary HMR/WebSocket listeners in the diagnostic-only SSR configuration.

## Evidence and reports

- [Pipeline A/B/C/D](pipeline-analysis.md), [cause assessment and nine answers](root-cause-assessment.md), [three options and bounded next sprint](options-and-recommendation.md).
- [Exact inputs](reproduction-parameters.json), [measurements including failures](geometry-measurements.json), [complete captured stages](diagnostic-stages.json), [tests](test-results.md).
- [Four stages, identical crop and scale](visuals/rugged-stages-a-b-c-d.png).
- [Round / Rugged](visuals/round-vs-rugged.png), [Add cap](visuals/add-endcap.png), [Remove cap](visuals/remove-endcap.png), [density](visuals/low-vs-high-sampling.png), [before / after RDP](visuals/pre-vs-post-simplification.png), [endpoint-removal ablation](visuals/endpoint-removal-ablation.png).
- Separate stage sheets cover native Add/Remove, sharp turn and repeated/overlapping strokes. All files under `visuals/` are explicitly labelled **diagnostic**, never native UI exports.
- [Existing genuine native evidence and provenance](native-evidence/README.md). No new native export is necessary: replay of the three exact Rugged Northreach operations reproduces the previous exported project's geometry exactly.

## Reproduce

From repository root:

```text
node docs/audits/2026-10-organic-stroke-geometry-diagnostic/analyze.mjs
node docs/audits/2026-10-organic-stroke-geometry-diagnostic/replay-failure.mjs
```

The second command **asserts that the retained failure recurs** and that each mask independently passes the two raw land operations. It is not a passing geometry fix. Scripts only write inside this audit folder. They load source through Vite SSR in middleware mode, without a listening frontend, backend or dataset connection. Existing evidence is read-only input. Timings include observation overhead and are not production-latency benchmarks.

Acceptance: retain exact failure masks; expose A/B/C/D or state limits; reproduce short Add/Remove, long, sharp and repeat cases; validate determinism, topology and Round; distinguish diagnosis from hypotheses; compare three options; complete a separate local audit commit. Known failure remains visible and unresolved.

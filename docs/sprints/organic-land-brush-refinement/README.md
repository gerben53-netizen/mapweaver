# Organic Land Brush — ADJUST refinement

2026-10-18, existing `codex/elyra-v3-geographic-accuracy` branch, starting at `afcc380`. No merge.

Acceptance: reduce circular terminal caps; make Fine visibly useful; retain deterministic valid geometry and exact Round behavior; repeat all five native exports with the same Northreach starting geometry and controlled strokes; preserve previous evidence, Primary Development and Campfire.

## Result

The organic end caps are visibly less circular. Fine now produces visible shoulders and small inlets rather than almost reproducing Round. **Focused improvement accepted as prototype evidence; premium production status remains ADJUST.** Narrow straits, exact reference alignment and terminal lobes still require authoring judgment. No automatic geographic-accuracy claim or merge.

See [implementation and visual assessment](implementation-report.md), [test results](test-results.md), [measurements](performance-results.json), and [browser overview](index.html).

- [Five new native crops](comparison/contact-sheet.png).
- [Before/after native comparison](comparison/before-after.png): previous prototype above, refinement below. All crops are 400×430 map pixels at the same origin (550,800), with no scaling or artwork processing.
- Five full native UI PNGs in `comparison/`: Round, Organic Soft, Rugged, Fine and Combined. Each is 1625×1425, 1×, ARL OFF, opaque background, grid/scale-bar off.
- Corresponding editable archives in `projects/`; real editor captures in `screenshots/`.

| Variant | Actions | Final Areas | Final nodes (net) | Geometry ms | Native export ms |
|---|---:|---:|---:|---:|---:|
| Round | 3 | 36 | 713 (+39) | 79.28 | 85.3 |
| Soft | 3 | 36 | 703 (+29) | 35.92 | 82.8 |
| Rugged | 3 | 36 | 720 (+46) | 47.95 | 48.7 |
| Fine | 3 | 36 | 719 (+45) | 49.28 | 57.6 |
| Combined | 4 | 36 | 725 (+51) | 48.81 | See final validation JSON |

These are single ordered measurements, not a statistically valid speed ranking. Geometry runs in Node/Vite SSR; export timing is the actual native renderer in the browser, not human dialog latency. No pointer-to-pixel latency instrument was added. No rejected/invalid operation in the 16 controlled operations.

## Reproduction

The existing V3 archive is copied without modification. `reproduction/build.mjs` replays the same original domain inputs; the first four use the same three remove/add/remove paths at diameter 60, irregularity .65, softness 0, smoothing off and seeds 713–715. Combined uses Soft 85/Rugged 45/Fine 24 plus one extra Fine 24 stroke (seed 716). These are controlled domain replays imported into the real App, not five independently hand-drawn trials. Final PNGs are actual Export PNG → Download PNG downloads. Separate UI interaction checks are described in the tests.

Existing isolated QA service: 49571, profile QA, `.qa.local/land-precision/data`, dataKey `1a47f496f096b09fd18a16c1e28cba66347bebd6ec41242cd0d5bce7c9e0ed4f`. New frontend: 49614 via the existing accepted QA proxy origin 49572. Primary Development was not started, imported into or modified.

Start only with that QA service: `npx vite --config docs/sprints/organic-land-brush-refinement/reproduction/vite.config.mjs`. Build fixtures before UI proof; the build script overwrites this new folder's fixtures/metrics. After saving five actual UI downloads, `node docs/sprints/organic-land-brush-refinement/reproduction/compare.mjs` verifies parity and creates crop-only sheets. The previous prototype folder is read-only input and remains unchanged.

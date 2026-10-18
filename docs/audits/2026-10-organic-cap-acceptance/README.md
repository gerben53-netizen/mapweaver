# Organic Stroke Cap Acceptance — NOT ACCEPTED

Audit of the existing one-iteration prototype, not a new correction round. The supplied specification is preserved verbatim in `acceptance-specification.md`; its thresholds remain provisional. No product code, contracts, Primary Development data or previous proof artifacts were changed.

**No GO.** The previous cap policy remains rejected for production. This audit adds measurements and broader native evidence; it does not retrospectively accept that policy. CBR does not capture the longitudinal end-lobe problem adequately, the visual bar is not met, and Rugged T05 is rejected by the existing geometry safety checks in both baseline and prototype. This is a failed acceptance case, not a successful safe-operation test. Its raw masks are retained under `masks/organic-rugged-T05.json`.

## Evidence

- `cap-acceptance-results.json`: 30 records, independent start/end values and explicit null/reasons.
- `measurement-method.md`: zones, sampling, tolerance, raster method and calibration limits.
- `results-table.md`: all cases and both CBR/CTC caps.
- `native-provenance.json`: actual UI download hashes, map IDs, archive/database render parity.
- `native-exports/`: eight newly downloaded native 1080×1080 atlases plus six historical native Northreach originals. Reused originals are explicitly identified, not presented as fresh exports.
- `comparison/`: 1:1 crops and fixed before/after sheets. Native images were only cropped/composed; no artwork was redrawn.
- `projects/`: eight editable UI-imported `.mapweaver` archives and canonical/native JSON witnesses.
- `screenshots/`: eight actual editor screenshots at 60% overview zoom. Native PNGs at 100% are the normal-scale inspection evidence; enlarged contours are not substituted for native exports.
- `reproduction/`: isolated QA harness, measurement and finalization recipes. **Do not rerun measurement over finalized archives**: it recreates project inputs. Use a fresh output folder for replication. Import remaps IDs; native snapshots and validation files describe the actual imported documents.

The atlas is row-major: T01–T03 on the first row, T04–T06 on the second, T07–T09 on the third. Each cell is 360×360 map pixels. The blank middle cell in both Rugged atlases is the rejected T05; no synthetic shape fills that gap. T10 uses the historical, fully replayed Northreach chain. The same trajectories, seeds, diameters, softness, roughness, smoothing, map geometry and render options are used before/after. Baseline source: `95db985`; cap source: `e6d4d91` (unchanged at audit start `33a5b8e`).

## Visual assessment

Reviewer: **Codex, provisional internal assessment only**. No independent artist has accepted these images. Higher scores are better, including the absence of recognizable separate dabs.

| Criterion | Soft | Rugged | Fine |
|---|---:|---:|---:|
| No recognizable separate brush impressions | 3 | 2 | 3 |
| Natural start/end caps | 2 | 2 | 2 |
| Cap/body connection | 3 | 2 | 3 |
| Preservation of characteristic body forms | 4 | 4 | 4 |
| No new sharp/flat cap artifacts | 2 | 2 | 2 |

At native 1×, long straight examples keep a nearly uniform body but end in short, fairly flat shoulders. The Rugged S-curve retains the broad body and gains a flattened endpoint. Short strokes compact into dabs; the very short stroke remains close to the single dab. The overlap example remains one connected object. In Northreach, the upper-bay edge and small cape show repeated small teeth after contraction. These are visible at native scale, not merely in enlarged masks. The body is preserved, but natural endpoint quality is below the proposed 4/5 bar. The numerical body-mask result is not a claim that the entire coastline has become premium.

There is local reduction in longitudinal extent, but the new transition artifacts preclude acceptance. Under the new specification, there is also an M5 failure (Rugged T05). No extra correction iteration, threshold adjustment, merge, push or Windows package was performed.

## Validation and isolation

QA backend 127.0.0.1:49571 was already running: profile `qa`, data key `1a47f496f096b09fd18a16c1e28cba66347bebd6ec41242cd0d5bce7c9e0ed4f`, instance `15834fa1-a861-47f4-b873-f87316511a28`. The new proof frontend uses free loopback port 49618 and proxies to that backend with its existing allowed QA origin 49572. Neither runtime selects Primary Development.

All eight atlas downloads match their native-render, archive-roundtrip and isolated-database reload hashes; object data also matches. Round geometry is exactly equal in all nine synthetic cases. Round atlas PNG is byte-identical before/after; the previous native Northreach Round witness remains untouched. See machine-readable provenance for hashes. Failed T05 has no valid native Area export; its atlas is valid but deliberately empty in that cell.

The relevant regression suite passed **115 tests in 15 suites**, with 0 failures and 0 unloaded suites (24.96 s). This covers cap geometry, footprints, Land Add/Remove, controllers, store, precision authoring, hex controls, archive and history. These passing regressions do not cancel the new T05 acceptance failure. No new browser drawing/undo gesture was performed in this audit; existing cap sprint UI-history proof is retained, and history/archive tests were rerun. No broad unrelated test suite was run.

Additional check outcomes are recorded in `checks.md`. Independent artistic acceptance and empirical threshold calibration remain outstanding. The immediate follow-up is to investigate the retained T05 rejection and define a visual-correlated endpoint/transition metric before authorizing a further correction sprint.

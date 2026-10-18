# Implementation report — one iteration, REJECT

Baseline `95db985`, branch `codex/elyra-v3-geographic-accuracy`. The explicit sprint protocol requires separately recognizable code, test and evidence commits. No previous commit or evidence file was replaced.

## What changed

`organicStrokeCaps.ts` provides two pure functions: an O(sample-count) arc-distance influence array and a positive affine contraction along the local tangent. `applyLandStroke` applies them only to Organic Soft/Rugged/Fine Add/Remove coverage. For every sample:

```text
d = min(arc distance from start, arc distance from end)
strength = smoothstep(clamp(total length / (0.12 × diameter)))
longitudinal scale = 1 − 0.55 × strength × (1 − smoothstep(clamp(d / (0.6 × diameter))))
```

The local tangent is the same previous-to-next sample direction already calculated in Land Brush. Sample centers do not move. Only displacement along that axis contracts; transverse displacement stays unchanged. Scale is .45–1, so a single affine footprint cannot collapse or self-intersect from this transform. The existing engine still validates the combined result and can reject it. This is not a silent repair or guarantee for arbitrary inputs.

Near neighbors receive a smooth scale transition rather than leaving the next sample full-width. The nearest-end distance avoids multiplying two contractions on short strokes. Strength tends continuously to zero as gesture length tends to zero; a single dab is unchanged and assumes no direction. Outside .6 diameter from either end, scale is exactly 1 and the original ring object is passed through. In the long diagnostic fixture, 48 of 59 footprints remain exact. Very short strokes have no unaffected middle region; nearly all coverage is part of the overlapping cap zones.

The existing positive radial shape, seeded variation, sample spacing, 72-point count, worker, clipping, component filtering, RDP, validation limits, history, format and renderer remain unchanged. Smooth/Roughen, Round and legacy shapes bypass the correction. There are no UI settings or new presets. Already saved geometry is not regenerated on reload.

## Comparison and performance

All five trials reuse the V3 starting archive and exact previous trajectories, seeds and settings. First four: three actions, diameter 60, softness 0, irregularity .65, smoothing off. Combined retains Soft 85 / Rugged 45 / Fine 24 plus one extra Fine 24 action. Controlled domain replay is imported into the real App; it is not claimed to be five independently hand-drawn trajectories. All final main PNGs are actual native UI downloads.

| Variant | Stored nodes before → after | Native changed pixels | Native render ms |
|---|---:|---:|---:|
| Round | 713 → 713 | 0 | 73.7 |
| Soft | 703 → 712 | 1,524 | 66.0 |
| Rugged | 720 → 725 | 1,730 | 59.8 |
| Fine | 719 → 729 | 1,893 | 53.0 |
| Combined | 725 → 743 | 1,392 | 66.4 |

All finish with 36 Areas/polygons. No geometry was rejected in the 16 controlled operations. Combined action index 2 (third action) becomes a **no-op** because the compacted mask no longer intersects the same coastal sliver. The metadata records this explicitly; it is not counted as successful visual editing or rejection. Its faster processing must not be advertised as an optimization.

Geometry timings use two warmups plus seven measured runs per engine in alternating order, on identical preceding **baseline** geometry. Per-stroke medians and every measured value are in `performance-results.json`. Most values are approximately 9–12 ms before/after, with observation overhead. This is a controlled local benchmark, not a browser pointer-latency result or statistical claim of speedup. Native timing is a browser renderer/encoder call; human dialog time is excluded. Memory attribution is unreliable in the shared JIT/GC process and remains explicitly null.

## What failed visually

The caps are shorter, and some former semicircular extents recede. However, tangent contraction shortens overlapping footprint coverage without contracting its width. Adjacent transverse shoulders become exposed as a row of small teeth. The large long-stroke middle looks retained, but short native Remove/Add transitions exhibit this new pattern. It is visible in the 100% native crop and the real editor at 95%, not just in enlarged diagnostic details.

This policy therefore fails the natural-transition requirement. No second parameter/algorithm iteration was performed. The code and evidence remain reviewable on this local branch, not merged as a production fix. A continuous envelope could separate cap shape from discrete coverage transitions; that is a future prototype hypothesis, not an implementation or demonstrated necessity for every possible targeted approach.

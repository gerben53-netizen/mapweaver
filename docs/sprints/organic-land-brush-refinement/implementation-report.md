# Refinement implementation and visual assessment

## Scope and mechanism

Only organic profile coefficients change in production code. Existing seed evolution, spatial drift, 72 radial samples, maximum-diameter normalization, distance-based sampling, worker, polygon-clipping, validation, complexity budgets, history, archive and export remain intact. No second engine, resampling change, automatic smoothing, persistent format or landmark semantics was introduced. Round and legacy branches are untouched.

The initial profiles stayed too close to a circle. Increasing tiny high-frequency noise would mainly create chatter or be discarded by simplification. Instead Soft gets broad asymmetric bands; Rugged gets stronger intermediate shoulders; Fine gets meaningful 3/5/8-frequency structure while retaining bounded local scale. The lower-amplitude Fine profile had not produced a useful distinction at equal diameter. New tests require a visible radial span and both convex/concave turns at the 24-pixel correction size, alongside geometry validation.

| Shape | Previous frequency:amplitude | Refined frequency:amplitude |
|---|---|---|
| Soft | 2:.13, 3:.09, 5:.018 | 1:.10, 2:.24, 3:.16, 5:.035 |
| Rugged | 2:.09, 3:.08, 5:.055, 8:.032, 13:.018 | 1:.08, 2:.17, 3:.15, 5:.095, 8:.045, 13:.018 |
| Fine | 2:.025, 5:.025, 9:.012 | 2:.055, 3:.10, 5:.075, 8:.035 |

These coefficients are multiplied by irregularity .65 by default. Positive radial envelopes still prevent self-crossing footprints, and radius normalization retains diameter bounds. Seeded orientation and slow world-position drift stay unchanged. Equal known polylines retain sampling-speed independence; unknown turns between pointer events cannot be recovered.

Existing saved Areas retain exactly their stored geometry: no regeneration or migration occurs on reload. Future strokes use the refined profiles. Protected landmarks retain their existing Local Contour Precision semantics; boolean Add/Remove still does not promise preservation of transient protected-point indices.

## Native comparison

The frozen Northreach V3 source, three first-four trajectories, actions, sizes and seeds are identical to the previous comparison. Previous proof files are preserved. Round's new UI PNG has exactly the previous SHA-256 `57d99d383144c3d1b15675d7161d08fdddaef8c6e012f3a6fcfa7c286d34ac6c`. The four organic results differ, and all five match archive/database reloads exactly.

The before/after sheet's upper row is the original prototype and lower row is the refinement. Observe the lower bay: Soft becomes elongated/asymmetric rather than circular; Rugged adds distinct shoulders; Fine changes from a round cutout to a flatter, locally indented contour. The central Add cap is also less semicircular. Combined preserves the smaller corrections and shows a broader upper bay; its pinched junction remains. Nothing in the old angular islands or unrelated coastline is cosmetically redrawn.

Scores are comparative judgments (1–5), not a user study:

| Criterion | Round | Soft | Rugged | Fine | Combined |
|---|---:|---:|---:|---:|---:|
| Natural coastline | 2 | 3 | 3 | 3 | 3 |
| Absence of circular end lobes | 1 | 3 | 3 | 3 | 3 |
| Multiscale structure | 1 | 3 | 4 | 3 | 4 |
| Continuity | 4 | 4 | 4 | 4 | 4 |
| Geographic control | 2 | 2 | 2 | 2 | 3 |
| Avoidance of identical repetition | 2 | 4 | 4 | 4 | 4 |
| Native editability | 5 | 5 | 5 | 5 | 5 |
| Processing performance | 4 | 4 | 4 | 4 | 4 |
| Geometric safety in tested cases | 5 | 5 | 5 | 5 | 5 |

## Decision and practical limits

1. Organic shapes are more clearly distinct from Round, especially Fine's formerly circular lower bay.
2. Rugged remains strongest for rocky shape; Soft is better suited to broad asymmetric arcs. No universal winner across geographic styles is established.
3. Circular end lobes are reduced, not mathematically eliminated. A footprint swept over a path necessarily leaves a terminal footprint.
4. Mixed sizes improve local control, but Combined has one extra action and is not an equal-effort superiority claim.
5. Narrow channels, deliberately separate islands and exact capes still need smaller brushes or contour precision. The shared Add joins a nearby island in all five trials (37 → 36 Areas); this unchanged topology is not hidden.
6. Geometry remains valid, bounded and editable in tested cases. New net node counts are 29/46/45/51, compared with 22/43/23/36 before. Fine's stronger structure has a real, modest complexity cost.
7. The interface is unchanged: shape, size, action; no new technical settings.
8. Defaults remain softness 0, irregularity .65, smoothing off; Soft/Rugged presets 180, Fine 60 logical pixels. Use smaller local diameters where appropriate. Legacy default selection remains unchanged.
9. No definitive premium promotion is claimed from one coastline. Fine is now a useful prototype candidate rather than a near-Round variant.
10. Further production review should examine longer natural authoring sessions and deliberate strait/island cases. Extra noise or silently protecting topology would not solve these automatically.

**ADJUST remains the production status**, with the requested focused improvements implemented and evidenced. No merge. Existing audit `645fb9a`, prototype commits, previous exports, Primary Development, Campfire and unrelated untracked ZIP remain intact. No push or Windows package.

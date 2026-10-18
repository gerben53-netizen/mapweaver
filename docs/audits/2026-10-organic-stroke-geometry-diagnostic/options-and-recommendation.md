# Options and recommendation — TARGETED FIX

This is a follow-up design recommendation, not an implementation or production GO. The observed current-density body is continuous; short cases are dominated by terminal footprints. There is not yet sufficient evidence to justify replacing the full stroke body generator.

| Criterion | 1 — targeted cap treatment | 2 — footprint transitions | 3 — continuous envelope |
|---|---|---|---|
| Expected lobe reduction | Directly addresses terminal extent if taper includes neighboring footprints; unproven | Extra density alone leaves the cap; global orientation may introduce jumps | Explicit cap design can control extent; envelope alone does not ensure natural caps |
| Rugged body quality | Existing body can remain exact outside cap zones | Density can flatten detail or create scallops; all body geometry changes | Can modulate sides along arc length, but needs a new visual model |
| Short Add/Remove predictability | Needs explicit overlap/click-only policy; tapering both ends indiscriminately can erase stroke | Short strokes still mostly one/few kernels | Needs a separate short/click behavior; offsets may be ill-defined |
| Sharp joins / narrow bridges | Local subset may avoid adding land, but removal topology still needs testing | Rotation/interpolation changes all corners and overlap coverage | Offset joins/self-overlap/width control require robust handling before boolean admission |
| Point growth / cost | Bounded local work; target is same or fewer footprint samples | Higher density: 59→174 samples and 527→743 raw vertices here | Could reduce union input, but curve sampling and self-union costs are unmeasured |
| Complexity / regression risk | Lowest expected if body and existing caps fallback are preserved | Moderate, with broad coverage and direction changes | Highest; introduces new path-to-coverage behavior |
| Existing projects / history / export | Stored Areas unchanged; same commit/history/archive/export path | Same data-model compatibility, but new strokes differ broadly | No migration required if output remains Area; most geometry behavior needs new regression coverage |

## Smallest next implementation sprint

**One experimental cap policy for Organic Rugged, retaining current body and Round exactly.** No new boolean engine, UI redesign, default promotion or library precision workaround.

1. Define cap influence by **arc distance**, not sample count or mouse speed. Explicitly specify when start/end influence overlaps on short strokes and what a single-click stroke does. Preserve existing behavior as a controlled fallback for too-short strokes until a better policy is demonstrated.
2. Prototype a smooth terminal contraction affecting enough neighboring footprints to prevent the next full-width footprint becoming the new cap. Treat this as a hypothesis to test, not an accepted taper formula. Avoid increasing footprint detail or global sampling to mask the problem.
3. Keep body coverage outside the stated cap zones exactly unchanged. Compare short Add/Remove, long, reversed, sharp return, repeats and narrow bridges across seeds. Require valid geometry, deterministic samples, no terminal degeneracy and unchanged map-bounds clipping/history/archive/export.
4. Reuse the exact Northreach inputs and genuine UI exports. Accept only a clearly less bulbous cap without uncontrolled shortening, loss of useful Rugged shoulders or topology regressions. Keep the retained high-density pair as an unresolved library-comparison reproducer; do not silently repair it in this sprint.

**Escalation gate:** if cap zones must consume most of a normal stroke, produce unstable short results, or cannot remove broad caps without degrading the body, stop coefficient tweaking and propose **CONTINUOUS ENVELOPE PROTOTYPE** as a separate measured experiment. That prototype should feed one coverage polygon to the same Land Add/Remove boundary, explicitly compare cap semantics and validate self-overlapping joins. No production GO follows from selecting either direction.

## Not demonstrated

No cap taper or continuous envelope was implemented here. The removal ablation is diagnostic subtraction of input footprints, not a shippable feature. Therefore expected quality/cost in this table are reasoned design estimates. The measured findings are confined to current footprints, sampling, booleans and simplification.

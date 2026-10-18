# Visual assessment — REJECT

One cap policy, one correction iteration. Evidence: five actual native UI PNGs, equal-scale before/after crops, full-map renders, editor screenshots at 95%, and five explicitly labelled diagnostic cap/body plots. No repainting or external renderer substitutes for a native PNG.

| Acceptance criterion | Soft | Rugged | Fine | Combined |
|---|---|---|---|---|
| Broad rounded cap extent reduced | Partial | Partial | Partial | Partial |
| Natural cap/body transition | Fail: small repeated teeth | Fail: visible scalloped shoulder | Fail: repetitive edge detail | Fail: upper bay shows tooth row |
| Mid-stroke variation retained | Exact raw body outside zones | Exact raw body outside zones | Exact raw body outside zones | Applicable per stroke |
| Short gestures usable/predictable | Geometrically valid, shape shorter | Valid, teeth visible | Valid, fine detail too repetitive | Third action becomes no-op |
| Curved/sharp paths | Valid tested geometry | Long middle retained; tips changed | Valid tested geometry | No premium acceptance claim |
| Round/native/regression safety | Pass | Pass | Pass | Pass |

The Round control is byte-identical. In the lower bay, the large cap becomes shorter/steeper, but adjacent narrow shoulders appear as repeated bumps along its edge. In the upper bay, especially Combined, a series of similar small peaks replaces the previous broad smooth arc. The central Add connection has a short serrated edge. These are visible in the native 1× crop, and the real editor screenshot shows the same upper-bay pattern at 95%. This is not a gain confined to 400% zoom; it is a new defect visible at normal zoom.

The longitudinal transform preserves each footprint's transverse variation. That helps keep width, but it also exposes neighboring cross-sections. A smooth variation of scale is not sufficient to guarantee a visually smooth **union boundary**. The former broad lobe is partially traded for discrete overlap structure. The start/end diagnostic plots show the changed cap shape; the body plot and 48 unchanged sample footprints show that a wholesale body rewrite was avoided.

## Final decision

**REJECT this targeted cap policy for production.** There is local shortening of lobes and preserved technical safety, but the transition quality does not satisfy the sprint's central goal. The implementation is an inspectable local experiment and must not be merged as an accepted fix. No second correction round was started.

A continuous stroke envelope could offer independently controlled sides, joins and caps and avoid this particular discrete overlap mechanism. This is a plausible next experiment, **not proof that all targeted cap methods must fail**. It must explicitly handle click/short strokes, sharp turns, reversals, self-overlap and narrow land connections while feeding the same existing Land Add/Remove engine. Do not implement it within this sprint.

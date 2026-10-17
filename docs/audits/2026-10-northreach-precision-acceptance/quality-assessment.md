# Visual acceptance — Northreach precision

**Local authoring accepted technically. Local visual benefit is real but small; premium/professional world-map quality is not established.** Compare matching native crops in comparison/, not just the cyan preview. Scores are this agent's visual judgement, not a user panel or measured reference-fit percentage. Scale: 1 poor, 3 usable with clear limitations, 5 production quality for this criterion.

| Criterion | Bay before → after | Cape before → after | Angular south before → after |
|---|---|---|---|
| Natural form | 2 → 3 | 2 → 3 | 2 → 3 |
| Match to Elyra reference | 2 → 2 | 3 → 3 | 2 → 2 |
| Geographic feature retention | 4 → 4 | 4 → 4 | 4 → 4 |
| Reduction of angularity | 2 → 3 | 2 → 3 | 1 → 2 |
| Absence of artificial brush patterns | 4 → 4 | 4 → 4 | 5 → 5 |
| Segment transition quality | 3 → 3 | 3 → 3 | 3 → 3 |
| Editability | PASS → PASS | PASS → PASS | PASS → PASS |
| Export reliability | PASS → PASS | PASS → PASS | PASS → PASS |

## Evidence behind the scores

**Bay, 198–224:** the shallow shoulders and long lower approach lose several small angular changes; the deepest eastern point 215 stays exact with both neighbours. The export still shows a short blunt end and long straight spans. The broad inlet retains its depth and asymmetry; no circular brush cutout was introduced. Maximum vertex motion 7.225 map pixels (2.890 original-reference pixels under the earlier 2.5× scale), mean 1.657 map pixels. The native crop shows a cleaner lower diagonal and upper shoulder, not added micro-geography. This is enough for a one-point naturalness/angularity improvement, not a closer reference-fit claim.

**Cape, 31–61:** the northwestern shoulder has less small-scale zigzag; point 46 and immediate neighbours remain exactly fixed, as does the narrow inlet outside/at the selected eastern end. Maximum vertex motion 2.711 map pixels, mean 1.353. The visible change is subtle at normal map scale and clearer in the exact native crop/preview. The original cape silhouette and sparse faceting remain. The existing small rounded inlet lip is not fixed by this operation.

**South coast, 163–180:** abrupt little steps on the central inlet become gentler, most visibly at the small concave bottom and short central hump. Maximum motion 6.309 map pixels, mean 2.548. Straight edges between stored nodes remain straight; this does not create a smooth spline or reference-specific coves. The regional native crop improves modestly but still reads as polygonal. No random wave, coast stroke or roughness was added. The first preview was canceled to verify non-destructive review; it was not a failed/worsening artistic candidate. A second identical preview was accepted after review. No worsening preview was knowingly committed.

All segment endpoints and their tangent neighbours are unchanged, preventing newly moved joins. This is not a claim that pre-existing boundary corners disappeared; their visual score stays 3. Likewise exact landmark retention preserves an interpretation already present in the source, not ground-truth geographical correctness.

## Seven required conclusions

1. **Are all three visibly improved?** Yes, locally and modestly: shoulder zigzags and several short kinks are softened. At whole-map scale the differences are small. Long facets, missing recesses and original geographical interpretation remain.
2. **Largest contribution?** Local smoothing with original/proposed preview changes just the intended coast. Protected landmarks make this safe at the bay depth and cape tip. The reference panel helps inspection, but independent navigation did not demonstrate a measurable accuracy increase.
3. **Landmarks protected?** Yes. Bay 215 and cape 46, their neighbours, segment endpoints/tangents and all points outside each range are numerically exact. All other 35 Areas remain exact. Geometry validation and history proof are recorded separately.
4. **Less correction work?** Three accepted local actions required zero manual point edits or distant-shore repairs in this sample. Cancel produced an identical PNG. This demonstrates locality and low repair demand here; it does not quantify reduction versus a matched old-tool task or human time saving. The earlier audit's many corrections addressed a larger construction task and cannot be used as a controlled baseline.
5. **Unsolved?** Missing reference detail, sparse large edges, the rounded inlet lip, interpretive east boundary, session-only landmarks and uncalibrated reference/map navigation. Smoothing moves existing vertices; it does not reconstruct absent geography or add smooth curve segments.
6. **Enough for professional world-map production?** A useful, safer local refinement workflow, but **not sufficient evidence of efficient professional reference reproduction**. This map's silhouette remains too coarse on detailed inspection; no full-colour terrain/asset quality is being accepted in this outline-only test. A skilled user can still edit points manually; this test neither disproves that possibility nor measures its cost.
7. **Next priority?** First investigate explicit two-point reference/map calibration with linked navigation, then measure accuracy and effort in a matched task. It addresses repeated visual correspondence work without guessing geometry. If long facets remain the dominant obstacle, separately evaluate bounded curve/resampling authoring with protected endpoints. These are proposals, not implemented or proven necessary by this audit.

## Findings outside artistic quality

One initial audit focus assumed source object IDs; normal import deliberately assigns new identities. Only the new audit harness was corrected to find the copied main object by name. No product defect.

The first save-proof request immediately after Undo/Redo observed a not-yet-saved status and stopped. The real UI then reported Saved; a second proof request passed database/archive/PNG parity. Timing/ordering was not isolated into a product defect, and no save implementation was altered. A future storage investigation can use this observation if it recurs. It did not leave a failed acceptance check after completed save.

The reference file chooser incurred 525.434 seconds of tool wait, recorded separately. No human drawing time or engine performance inference is drawn from it. One inspector-locator timeout was recovered using fresh accessibility state. No geometry recovery round was required.

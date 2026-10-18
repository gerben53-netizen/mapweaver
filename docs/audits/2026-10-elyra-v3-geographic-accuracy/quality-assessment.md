# Elyra V3 — final visual assessment

**Premium quality is rejected.** Native output is sharper and easier to compare than earlier V2, but still contains simplified coast geometry. Calibration does not solve geographical interpretation. This is a land/sea silhouette assessment, not acceptance of full-colour illustrated terrain or assets. The real Freehand step was completed by the user; its approximate island does not alter the premium rejection.

Use comparison/study-window.png and the three detail sheets. All are north-up, identical geographic windows, uniform scale. Comparison sheets crop/resample original reference/native PNGs with Sharp; they are labelled comparisons, never replacement Mapweaver exports. Rounding fractional crop positions is at most 0.2 reference pixel at the 2.5× intermediate scale. The original image is illustrated; the upper cliff edge and obscured vegetation introduce approximately 1–3 source-pixel interpretation uncertainty. No binary reference mask is treated as ground truth.

Scores are agent visual judgement, 1 poor to 5 production quality; no human panel or reference-overlap percentage. Historical versions are judged on the same study window, not copied from their differently scoped reports.

| Criterion | Weight | V2 | Northreach proof | Precision acceptance | V3 candidate |
|---|---:|---:|---:|---:|---:|
| Macro geography | 25% | 2 | 3 | 3 | 3 |
| Meso geography | 25% | 1 | 2 | 2 | 2 |
| Natural continuity | 20% | 1 | 2 | 3 | 3 |
| Microdetail / variation | 15% | 1 | 1 | 1 | 2 |
| No artificial patterns | 10% | 3 | 4 | 4 | 3 |
| Silhouette clarity | 5% | 4 | 5 | 5 | 5 |
| Weighted score / 5 | | 1.60 | 2.45 | 2.65 | 2.70 |

The tiny difference between Precision Acceptance and V3 is not a statistically meaningful quality increase. V3 adds a more articulated northern shore but also introduces a small rounded brush bulge. The image sheets are the basis for the judgement, not the aggregate number.

## Concrete visual findings

- **Macro:** bay depth, western opening, bounding peninsulas and island cluster are recognizable, unlike V2's broad simplified recess. This was sufficient for a macro silhouette pass before meso. A recognizable silhouette is not exact reproduction.
- **Meso:** the reference's two northern cliff fingers are deeper and differently spaced. V3's upper bay remains too simplified; the transition into its eastern head is too smooth and wedge-shaped. The southern shore lacks several small notches. These errors remain visible after smoothing.
- **Continuity:** 74 deliberately observed replacement samples in the preserved preparation improve some long shoulders. Local smoothing moves 22 vertices by at most 2.4045 map px (0.9618 source px) and protects the head. Long stored spans are still straight segments, particularly outside the selected range.
- **Micro:** Land Add/Remove contributes a local recess and protrusion, but the little protrusion reads as a rounded dab and is not a premium detail. No random noise or Roughness was added. A user-drawn nine-point island is now present near the bay head. It is too large and shifted relative to the illustrated reference, and has the brighter user-chosen fill. This is a successful editable Freehand result, not accurate premium geography. Its geometry was preserved rather than silently corrected after the user-assisted step.
- **Context:** previous islands remain coarse polygon silhouettes. They were not silently changed to improve the selected shore's score. No texture, shadow or halo camouflages these limitations.

## Eight required conclusions

1. **More geographically accurate?** Clearly more recognizable than V2 in this window. Relative to Northreach/Precision Acceptance the gain is local and mixed; no independent quantitative accuracy gain is established. Some northern fingers still have appreciable position/shape error.
2. **Gain from calibrated navigation?** It supplies reproducible centres and scale while editing, making missing coastal shapes easier to detect. The known crop construction yields zero fit residual; that is not independent coastline evidence. Do not attribute the manually prepared macro shape to this session's navigation.
3. **Gain from Precision Authoring?** A small, controlled softening, with exact landmark/neighbour/range preservation and reversible preview. It does not create missing coves or reconstruct geographic detail.
4. **Largest errors gone?** V2's missing broad bay is gone. Important meso discrepancies and simplified peninsulas remain. No claim of reference-exact reconstruction.
5. **Remaining deficiencies?** AUTHORING: incorrectly interpreted/underdeveloped northern fingers and oversized, displaced islet. GEOMETRY: visible long linear spans. UX: narrow Reference View, scrolling calibration, repeated point-range setup. RENDERING: flat land/sea is deliberate for diagnosis, not a demonstrated renderer defect. ASSET: no assets used or evaluated. MISSING FEATURE: no new feature is proven necessary by this sample.
6. **Premium achieved?** No. The coast is usable as an editable outline study, not accepted professional reproduction.
7. **Efficient for a whole world?** Not established. A small section required manual contour preparation, editor refinement, verification and significant tooling/report work. No human-time saving or production-throughput claim.
8. **Need product improvements?** More careful native point work is still realistic and has not been exhausted. First run a controlled human authoring task. Only if that isolates point density/curve editing as the limiting factor should a bounded curve/resampling feature be considered. This audit does not justify replacing the renderer or generating cosmetic noise.

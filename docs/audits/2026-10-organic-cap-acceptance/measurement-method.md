# Measurement method and limits

No thresholds were adjusted. CBR ≤0.10 is PASS, >0.10 to ≤0.15 REVIEW, >0.15 FAIL. CTC ≤0.08 is PASS, >0.08 to ≤0.12 REVIEW, >0.12 FAIL. BP ≥0.98 is the proposed body threshold. CI uses the supplied formula; baseline CBR ≤1e-6 makes CI null/N/A. Values retain full floating-point precision in JSON; table values are rounded for display.

## Geometry and fixtures

Synthetic T01–T09 use diameter D=40 map pixels, seed 713, roughness 0.65, softness zero, smoothing off, 360×360 bounds. T09 adds a second, parallel stroke translated 12 pixels with seed 714 and unions into the original native landmass. All input points are in the JSON/mask witnesses. S-curve points describe one fixed sinusoidal input polyline; both engines receive exactly those points. Stroke event sampling is not modified.

T10 replays all three historical Northreach gestures separately for each brush variant, D=60, seeds 713/714/715, on the original V3 geometry. Resulting geometry is compared exactly to each previous proof document before copying its native image. These gestures are each too short for an independent adjacent stable body. They are therefore judged by native coastal appearance, not forced into long-stroke metrics.

The observer captures the engine's clipped stroke union **in memory**, before native simplification. Product files are never instrumented on disk. T01–T08 CBR/CTC/BP describe that raw union; they are not measurements of a hypothetical rendered replacement for the rejected T05. Final native Areas and actual PNGs are separately checked. T09 stores final union contours but has no unique centerline/body reference; cap metrics and BP are null rather than misleading zeros.

## Cap sections

Use cumulative arc length on the original input polyline. Reverse this coordinate at the end cap. Extend the endpoint tangent outside the stroke. At 1-map-pixel steps, intersect the contour with an infinite line normal to the local tangent. Full width is the span between the extreme intersections; no intersections means zero width. This includes off-center cap sections and is independent of the engine's dab spacing (4.8 pixels for D=40). Half width is full width/2.

The cap diagnostic window is [-0.5D, +0.8D] from each endpoint. The adjacent body reference is the median half width over [0.8D,1.6D], sampled at the same 1-pixel step on the baseline. CBR is max(0, maximum cap half width minus that median)/D. Both versions use the identical baseline reference. CTC is the largest absolute change in full width between consecutive sections in that cap diagnostic window, divided by D. Start/end measured independently.

A stroke needs length ≥3.2D to provide non-overlapping reference windows. T06, T07 and T08 therefore have null cap/body metrics; T08 has no directed cap at all. Their final Areas, footprints and native shapes remain part of the acceptance matrix.

**Calibration caveats:** the cap window includes the outer silhouette tip. CTC can be dominated by first intersection at the tip, rather than cap/body joining quality. A normal section can hit another branch in sharp-turn T05; its full span is then not a local cap-width measure. Those numerical values remain disclosed as diagnostic measurements, not trustworthy calibrated failure magnitudes. No narrower post-hoc window was chosen to obtain green scores. Selecting a better transition window requires a documented visual comparison before using it for acceptance.

CBR measures lateral width, while the original complaint also concerns longitudinal protrusion and repetitive shoulders. The Rugged horizontal baseline scores CBR far below 0.10 despite its rounded terminal shape; CBR alone is insufficient. Short Northreach gestures lack a stable body and cannot calibrate it by this method. Neither those nulls nor technically green CBR results imply success. A longitudinal extent/shoulder measure may be useful in future, but none is substituted here and no threshold change is proposed as approved.

## Body raster

Rasterize each raw mask at **2 samples per map pixel** (0.5×0.5 pixel cells), SVG even-odd fill through sharp, alpha ≥128 means occupied. This is a reproducible mask measurement, **not a native Mapweaver export**. Assign each sample's nearest projection to the original trajectory. Exclude projections within 0.6D of either endpoint. Count original occupied cells and cells differing between before/after in the remaining zone. BP = 1 − differing/original; cell area cancels. Store both integer counts and resolution. T06–T09/T10 are not assigned misleading body measurements.

This consistently uses the permitted raster method rather than the known unstable polygon-difference metric. Previous high-density failure inputs remain in the prior geometry diagnostic audit; they are not repaired or overwritten. Raster BP does not demonstrate exact set equality, detect all subpixel changes, or prove native final-contour body equality. No tolerance-snapping or clipping-engine change is made. The minimum measured BP is 0.9999446021743646, above 0.98, but this cannot override other failures.

## Validity and rendering

Each actual sampled footprint passes existing normalizeGeometry checks. Resulting Areas pass validateArea; isolated Add must yield one polygon with no holes. Remove is exercised against one covering native land rectangle, with the intentionally cut hole permitted and native topology validation intact. Unexpected errors count as failures. Rugged T05 rejects both before and after during Add; its missing Area is never replaced with the diagnostic mask. Thus 29 cases complete, one fails acceptance.

Atlases are ordinary native Areas arranged in fixed cells, imported into the real App and exported with the real Export PNG dialog: 1×, ARL OFF, no grid, no scale bar, opaque. Changing layout offsets is presentation only and identical before/after. All output images are 1080×1080, except historical full Northreach images (1625×1425). Before/after crops are 1:1, without rescaling or sharpening. The contactsheet retains those pixels at their native scale; use its original dimensions, not a browser's automatic fit, for normal-scale judgement.

Each atlas additionally undergoes native exportPng → archive encode/decode → applyPrepared → native export → isolated database reload → native export. Equality to the separately downloaded UI PNG is asserted. Round exact geometry and byte equality are separately asserted. These tests provide no independent artistic review; Codex scores remain provisional.

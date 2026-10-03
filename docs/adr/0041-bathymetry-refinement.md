# ADR 0041 — Versioned bathymetric refinement

Accepted 26 September 2026. Refines ADR-0038; the sprint's explicit old-map preservation requirement takes precedence over the general permission to discard old formats.

## Stored contract

Format 12 / `map.waterDepth.version: 1` gains optional `model: 'bathymetry'` and optional boolean `coastEdge` (only valid with that model). Missing model keeps the previous exponential field, color interpolation, paint blending and radial river-end transition exactly. No automatic rewrite occurs at load. New presets enable bathymetry and disable the separate shoreline edge. **Apply current water style** explicitly upgrades existing maps, retaining their exact manual masks; it is undoable. Theme application remains explicit and preserves paint. Invalid model/edge values are rejected by the shared client/service parser. No database migration or asset change is required.

## Derived field

Depth 0 is shallow, 1 is deep. Visible semantic water geometry, including holes/lakes, is authoritative. A bounded raster and exact vector water clip are shared by editor/export. Four-connected land components estimate an island radius from area. Their shelf cap is `min(configured shelf, max(2 raster cells, .65 * equivalent radius))`. Logarithmic shelf classes bound the number of chamfer distance transforms. Their normalized distances combine by minimum before color lookup, avoiding the visible seam caused by switching shelf caps at a nearest-island boundary. Two low-frequency deterministic noise octaves vary shelf width continuously in map coordinates. Lakes use the same shore field; small lakes remain shallow and larger lakes deepen inward.

Directional, compact-support estuary contributions shallow this field before manual overrides. Width derives from the existing river width, and the fan follows its downstream tangent. Manual masks remain `shallow_1` and `ocean_1` weights, with unused weight retaining automatic depth. Reset removes these weights. Repeated strokes accumulate; interpolated dabs share maximum coverage per logical stroke. New soft brush edges contract with stable world-space noise within the circular cursor. They never paint color or glow.

Blend samples the *final scalar depth* at nine water-only neighbors of the immutable pre-stroke field, including automatic coasts and mouths. It expresses the average as target override weights relative to the local automatic depth. Existing brush strength/falloff interpolate toward those weights. No full-map blur or rendered-pixel blur occurs. A brush spans at most 256 tiles as before. Legacy maps retain weight-only Blend until explicit upgrade.

## Color, edges, river endpoints

Theme-specific muted shallow/mid/deep RGB ramps use piecewise linear interpolation, avoiding the old smoothstep ramp's bright near-shore plateau. A small deterministic texture term is weaker in shallow water. The final water raster is fully opaque; an exact water clip covers the old water-side Area halos and underlying Geography Finish ocean. Optional `coastEdge` draws only a narrow 1.5-map-pixel, 25%-opacity edge, separate from depth.

The existing river-end patch still transitions the river/bank into the *same final depth surface*. Bathymetry replaces its circular radial alpha mask with an along-flow linear transition. The patch introduces no independent shallow color. It is bounded and clipped to receiving water; native river geometry remains editable. This is stylized estuary shading, not flow simulation.

## Caching and limits

Automatic components/distances/mouths/noise remain cached for the current geography/settings; unrelated labels and stamps do not rebuild them. Manual changes repaint dirty tile bounds only. Cache size and raster/mouth budgets from ADR-0038 remain unchanged. Export 2× samples the same logical raster as the editor, not a different simulated field. Extremely small coast features on large maps and very wide rivers remain bounded-resolution approximations. Changes of island area across shelf classes can change the shelf after geography edits; smoothing between classes is a possible follow-up, not saved state.

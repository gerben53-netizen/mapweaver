# ADR 0042 — Optional coastal contours

Accepted 26 September 2026.

## Contract

Format 12 gains optional `map.coastalContours` version 1. It stores enabled, preset (existing stable world theme ID), count 0–3, spacing in logical map pixels, opacity, variation, width, falloff, color and lakes. The shared project parser and map-settings validator reject unknown keys and invalid values. Absent means no contours; load does not inject defaults. Settings participate in normal history and portable/local storage. No assets or database migration are required.

Presets use `world.painterlyFantasy` (Painterly Atlas), `world.classicParchment` (Engraved), `world.minimalPolitical` (Minimal) and `world.darkFantasy` (Dark Fantasy). Explicit theme application participates in existing per-field ownership; manual overrides remain protected. Other theme IDs use Painterly Atlas as their contour starting point. Preset spacing/width scale with the map's longest side when applied; saved direct values remain authoritative afterward.

## Geometry and rendering

Use the same visible semantic water union/difference as Water Depth, including transformed landmass geometry, holes and explicit Ocean/Shallow Areas. On a bounded grid (longest side 768 intervals, minimum step one map pixel), compute a single nearest-land chamfer distance field. Marching squares interpolates isoline segments at increasing multiples of spacing. A low-frequency, deterministic map-space field varies these offsets. Saddles are suppressed instead of joined across narrow straits. A single field merges opposing fronts; independently stroked per-island buffers cannot double the intensity.

Four-connected components estimate island radii. Offshore levels beyond 0.65 equivalent radius are suppressed for components not touching the map edge. This reduces line count rather than compressing spacing. Water components touching the boundary are ocean; other components are lakes and may be disabled. Small lakes naturally cannot reach more distant levels. Rivers use the existing downstream mouth detector and tangent/width; segments within an outward widening mouth corridor are omitted, independent of depth settings. Existing estuary blending stays unchanged.

Shared Canvas2D drawing in editor/export clips to exact vector water, strokes each level once with opacity falloff and no blur/glow, above depth and below foreground objects. Logical coordinates and width do not depend on viewport zoom or export pixel ratio. Shoreline styling remains the separate existing Area/Water Depth option.

## Cache and limits

Two derived geometries are cached, keyed by dimensions/settings and relevant semantic Area/river data. Weak object fingerprints avoid repeated serialization; unrelated stamps/labels and manual depth paint do not rebuild contours. Geometry is never serialized. Export uses the same logical segments at both resolutions.

The bounded grid approximates very small features and chamfer distances have directional approximation. Very tiny islands may receive zero lines. Narrow straits and island-cap transitions can intentionally interrupt a line. Lakes are defined topologically; a lake reaching the map border counts as open water. This is cartographic styling, not physical depth or hydrology. Settings recompute synchronously; panning only reuses cached geometry. See sprint report for measured limits.

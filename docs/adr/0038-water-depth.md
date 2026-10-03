# ADR 0038 — Optional water depth and downstream mouth blending

Accepted 26 September 2026 for the Water Depth sprint. The explicit requirement to preserve older maps overrides the general permission to discard old formats.

Format 12 accepts optional `map.waterDepth`, version 1. It stores enabled, shallow/mid/deep RGB colors, coastal shelf width in map pixels (8–2000), blend softness (0–1), texture visibility (0–0.3), mouth strength (0–1) and optional manual paint. Absent or disabled metadata selects the unchanged legacy water renderer. Enabling the tool or explicitly applying a world theme opts in. Theme application supplies direct water-style-derived values through existing per-field ownership; it never deletes manual paint.

Automatic water is derived from visible semantic landmass polygons, including holes and islands. Explicit terrain-region Areas with ocean/shallow appearance subtract from land to represent inland water. The polygon union/difference uses the existing clipping library; no second authoritative land geometry is saved. Water geometry and depth caches are disposable. Hidden/solo geometry affects the visible rendering equally in editor and export.

A two-pass chamfer field estimates shore distance on an at-most-768-pixel-longest-edge raster. A continuous exponential depth curve with low-frequency deterministic variation feeds smooth shallow/mid/deep color interpolation. No hard contour bands or physical bathymetry are claimed. Geometry remains in map coordinates. An exact vector clip prevents the interpolated raster from painting land. Opted-in maps render this surface after semantic Areas and before stamps/paths/annotations; old maps retain their existing ordering.

Manual paint reuses the existing 128-map-pixel tiles, two-pixel mask sampling and RLE/base64 codec as a private two-material layer: `shallow_1` targets depth 0; `ocean_1` targets depth 1. Weighted masks modify automatic depth; remaining weight preserves the automatic field. The existing 4096-tile, 8192-mask and 2-MiB encoded budget applies. Only these two version-1 material references are admitted. This is not the map's terrain paint layer and introduces no library assets, arbitrary resource references or SQL migration.

The existing interpolated stroke engine accepts an optional admissibility predicate. Water brush writes only sample centers in visible water; rendering additionally clips to exact current water geometry. Adding land later covers retained paint non-destructively. Erase removes authored weights locally; Blend diffuses pre-stroke weights; global reset removes the private paint layer. One completed drag is one undo transaction. Escape, blur, lost capture, tool/map/geometry changes cancel transient work. Preview, cursor and brush preferences are not project data.

Downstream river endpoints with an upstream land sample and nearby receiving water generate bounded elongated shallow influences. Radius follows actual end width (10–160 map pixels). A shared feathered receiving-water patch fades the water-side end and bank into that surface. Neither river geometry nor centerline editing changes. Inland-ended paths and paths entirely in water do not acquire inferred estuaries. Reversed paths must have the correct downstream direction. Broad river centerlines do not themselves become water polygons.

Both caches retain at most two base rasters. Raster color updates touch only changed paint tile bounds; geometry/automatic-field/noise are reused. A same-pass identity shortcut avoids recomputing fingerprints for each river. At most 256 eligible mouths contribute per map, in visible object order. Each fade patch is at most 256×256 pixels, with at most 64 retained patches per base surface (16 MiB); additional patches are recomputed as needed. Mouth patches are disposed with their owning surface. Canvas buffers are never serialized. Rendering is shared by React-Konva and PNG at logical map resolution; 2× export upsamples the same surface, rather than changing geography or paint coverage.

This is stylized depth intent, not measured depth, erosion, flow simulation or generated delta geometry. Very narrow features and fine strokes on extremely large maps are limited by the bounded raster. Imported flat background pictures have no semantic coastline; users must supply semantic land/water geometry for automatic shores.

## Refinement

[ADR-0041](0041-bathymetry-refinement.md) adds the optional bathymetry model while preserving this legacy rendering when the model is absent.

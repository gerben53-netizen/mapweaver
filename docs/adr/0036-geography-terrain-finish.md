# ADR 0036 — Optional geography finish and world generator version 2

Accepted 26 September 2026 for the Geography & Terrain Finish sprint.

Format 12 gains optional `map.geographyFinish`, version 1: bounded relief controls
(enabled, strength, clockwise-from-north light direction, softness, contrast),
material-transition, coast-falloff and ocean-depth presets. Missing settings leave
legacy drawing unchanged. Explicit theme application or new-world styling can
supply direct values; existing theme ownership protects subsequent manual edits.
No settings are silently added when opening an older map.

Shared editor/export functions derive bounded disposable rasters from visible
semantic land/terrain geometry and, when available, original generation elevation.
Manual land edits clip/fill that historical field through current semantic masks.
Relief is paint, never baked into terrain assets; paint masks remain independent.
Directional shading follows terrain and altitude, while multi-stage shelf/depth
uses coast distance, deterministic low-frequency variation and high/low coast
semantics. Material edge masks are map-anchored and style-aware; canonical polygon
boundaries remain unchanged. No render buffers are serialized. Static finish
caches retain at most two maps, at a maximum 768-pixel longest edge per raster.
Existing Area textures retain their 16-million-pixel cache budget.

Generator family `world-v1` now accepts algorithm version 1 or 2. The version-1
algorithm remains explicitly callable and unchanged; the new-world worker requests
version 2. Version 2 adds multiscale coast asymmetry, connects highland maxima into
principal/secondary ridge paths and splits downhill drainage at confluences.
Native river reach endpoints share junction coordinates; stream order and incoming
tributary discharge determine start/end widths through the existing river model.
Widths do not require an additional live path constraint or new stroke format.
Gentle explicit handles keep bends inside the local drainage corridor.

Optional `map.generation.geography` version 1 records the 145×97 field dimensions,
bounded ridge paths with hierarchy/foothill width and at most 120 directed drainage
reaches. Reach data include source/mouth grid cells, downstream ID, tributaries,
stream order, sampled cells and initial widths. Admission checks budgets, values,
references and cycles. Like existing generated IDs/scatter, this is historical
provenance, not a live coupling: subsequent manual river edits never silently
regenerate their neighbours. Rivers are ordinary editable Paths.

Version 2 scatter reuses the existing semantic selector, forest-distance field and
placement policies, with ridge tangents filled from the connected ridge network.
Asset rotation policy remains authoritative. No in-place regeneration/refinement
command overwrites hand-authored geometry. New landform refinement is limited to
new version-2 generator output. Lakes remain drainage sinks; automatic lake outlets
are deferred. This is bounded fantasy-map hydrology, not an erosion simulator.

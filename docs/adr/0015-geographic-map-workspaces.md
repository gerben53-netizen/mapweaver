# ADR 0015 — Planar geographic workspaces and Area roles

Accepted 24 September 2026 for Sprint 20.

One project still has one map and one canvas engine. Canonical format 10 adds `map.mapType` (`battlemap`, `regional-map`, `world-map`) and `map.geography`. Legacy formats normalize to battlemap with unchanged geometry, artwork, grid, layer order and viewport-independent coordinates. Geography is inert on battlemaps. New geographic maps start with seven ordinary, editable layers, not reserved semantic slots.

`widthKm` is the single physical-scale authority; height follows canvas aspect ratio. Display units are km or international miles (exactly 1.609344 km). Pixels per km are derived from width/widthKm. New asset defaults in metres/feet share these conversions, with aspect ratio preserved and sizing scope respected; existing object sizes never change. Changing canvas pixels preserves physical width, so distance-per-pixel changes. Type/physical-scale changes use an explicit consequences preview and one history step. Grid defaults remain stored for returning to battlemap; geographic drawing does not apply the battlemap snap grid.

North degrees and projection none/abstract are annotations, never a hidden rotation/projection of content. Optional local origin in km defines the top-left; right/down extents derive from width and aspect. This is a flat fictional coordinate space. There is no GIS accuracy, longitude/latitude, wrapping at poles or routefinding.

Ruler points are transient map-coordinate UI state, bounded to 256 points. The scale bar chooses a 1/2/5 distance to remain readable in screen pixels. Its exported counterpart renders at a stable position in the full-resolution map; it is independent of viewport pan/zoom. An optional bounded local coordinate grid is decorative, not magnetic or a longitude graticule.

Landmass/terrain-region are optional `Area.land` roles, not new object geometry or rendering engines. Terrain type is semantic metadata. Fill/pattern/stroke, opacity, holes, multipolygons, transforms, layering and asset references reuse Area. Coastline parameters are seed, map-pixel roughness and sampling step; only the stroke receives deterministic displacement. Canonical fill, selection and clipping remain unchanged. Smooth/simplify use bounded existing ring geometry and explicit previews; invalid topology is rejected atomically. Intersection uses the existing polygon-clipping worker. Clipping copies its result, keeps the landmass, and creates no live dependency.

Limits: existing Area 512 nodes/ring, 2,048/object and 4,096 boolean-input nodes; at most 256 geographic Areas/10,000 geographic nodes per document, 4,096 coastline samples/object, bounded worker timeout and existing document/image budgets. Contour smoothing retains point count; simplification cannot introduce unbounded subdivision. The entire scene can still contain ordinary Areas under the existing limits.

Format 10 uses existing SQLite schema 4, revision writes, portable ZIP, recovery and full backup validation. New format files are rejected by older binaries. No second storage schema, GIS dependency, external service, template registry or terrain asset library is introduced. Rivers/roads/borders and places/labels remain Sprint 21–22.

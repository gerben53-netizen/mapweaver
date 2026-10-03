# Mapweaver project format 10

Extends format 9. Current writes require this application; older Mapweaver binaries reject format 10. SQLite schema stays 4, retaining atomic JSON documents and asset relations.

## Map

`mapType`: `battlemap | regional-map | world-map`.

`geography`:

```json
{
  "widthKm": 1000,
  "unit": "km",
  "northDegrees": 0,
  "projection": "none",
  "origin": null,
  "ruler": true,
  "scaleBar": true,
  "exportScaleBar": false,
  "graticule": false
}
```

Width is finite, 0.000001–1,000,000,000 km. Unit is km/mi; north is [0,360), projection none/abstract. Origin is null or `{xKm,yKm}` with finite absolute values ≤1 billion. All four preferences are booleans. Unknown nested properties are refused. Extent, pixels per distance and vertical distance are derived, never conflicting stored scale authorities. Canvas coordinates remain pixels; local fictional extent follows right/down axes. This is not an Earth projection. Geography is retained but unused on battlemaps.

## Area specialization

An Area may include:

```json
{
  "land": {
    "role": "landmass",
    "terrain": "custom",
    "coastline": { "seed": 1, "roughness": 0, "step": 12 }
  }
}
```

Role: area/landmass/terrain-region. Terrain: forest/mountains/desert/swamp/snow/custom. Coastline seed is uint32, roughness finite 0–40 map pixels, step finite 2–200 pixels. Displacement affects only a landmass stroke; fill and canonical topology remain unchanged. Color/width/style use the normal Area stroke fields. Ordinary Area name is also the geographic object's editable name. No duplicated raster, region polygons, live landmass references or decorative asset bytes are stored.

Clipping replaces only the terrain geometry with a validated intersection (including holes/multipolygons). Source land remains independent. Decoration uses the existing explicit Scatter-inside-Area workflow and remains an independent editable object. No permanent scatter-preset dependency is needed.

## Migration and integrity

The central parser accepts retained older formats and adds battlemap/geographic defaults without changing existing rendering fields. Missing optional `land` retains ordinary Area behavior. Format 10 requires mapType/geography. Older formats cannot smuggle new Area-role/map fields under their old version number. New content passes the same parser in service, portable import, recovery and backup restore.

All prior limits and asset-reference rules apply, plus 256 geographic Areas, 10,000 combined geographic nodes and 4,096 render coastline samples per Area. The stored document contains no ruler pointer samples or derived coast samples.

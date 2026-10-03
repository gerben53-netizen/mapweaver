# Mapweaver format v6

Current writer: `formatVersion: 6`. See [ADR 0011](../adr/0011-wall-path-specialization.md). All v5 map, asset, layer tree and object group fields remain unchanged. SQLite and the portable ZIP container are unchanged.

A wall uses `kind: path`, `pathKind: wall`, canonical absolute `nodes` with relative handles, `closed`, derived bounds, fixed baked transform, name, opacity, visibility/lock, `strokeWidth`, `stroke`, `cap` and `join` from the shared path model. It additionally requires:

```json
"wall": {
  "unit": "px",
  "pixelsPerUnit": 1,
  "flip": false,
  "outline": { "enabled": true, "color": "#343632", "width": 2, "opacity": 1 }
}
```

Units are px/cells/ft/m. Canonical thickness is always `strokeWidth` in map pixels; the positive finite scale reference only defines input/display conversion. Grid-cell references are captured, not live bindings. Outline width is per side in map pixels; colors are six-digit hex; opacity is 0–1.

Wall strokes accept solid color or texture with a typed fillPattern asset ID, scale and offset. The shared texture record retains `spacing` for the generic path contract; wall rendering derives repetition from source aspect ratio, thickness and scale and does not use spacing. Flip is across the texture width. Dashed wall strokes, unknown members, invalid IDs/scales, excessive geometry and mismatching derived bounds are rejected. Generic paths cannot contain wall settings. Wall objects in documents claiming format v5 or earlier are rejected.

No preset IDs, snap targets, graphs, junction patches, image instances, sample arrays, selection handles or viewport coordinates are serialized. Asset collection/remapping uses the existing nested texture reference. Recovery, local revisions, clipboard and portable/full backup preserve the concrete wall fields. PNG remains an independent rendered artifact.

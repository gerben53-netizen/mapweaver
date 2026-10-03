# Mapweaver project format v3

Sprint 14 canonical write format. Read [v2](mapweaver-format-v2.md) for unchanged ZIP, typed-manifest, image, object-count and metadata limits. [ADR-0007](../adr/0007-canonical-areas.md) records compatibility and rendering decisions.

`formatVersion: 3`. Stamp objects are unchanged. Legacy `patternFill` objects are accepted and migrated centrally; output always serializes `area` objects. Version 1 first splits mixed stamp/pattern source IDs using the existing deterministic migration.

## Area object

Required fields:

- `kind: "area"`, `id`, `name` (1–120 printable characters), optional boolean `locked`.
- `geometry: {polygons: [{outer: [{x,y}], holes: [[{x,y}]]}]}`. Coordinates are map pixels, independent of viewport. No repeated closing point. Outer signed area positive, holes negative in numeric XY coordinates (clockwise on a downward-Y canvas).
- `x`, `y`, `width`, `height`: exact derived geometry bounds, with numerical comparison tolerance 0.00001. Positive extent; coordinates/bounds within ±1,000,000,000. Fixed adapter fields `rotation: 0`, `scaleX: 1`, `scaleY: 1`.
- `fill`: `{kind:"none"}`, `{kind:"solid",color:"#RRGGBB"}`, or `{kind:"pattern",assetId,mode:"repeat"|"stretch",scale,rotation,offsetX,offsetY}`. Only the pattern variant references a fillPattern asset. No asset field on solid/unfilled areas. Manifest references include area fills everywhere, including portable import remapping and SQLite reference guards.
- `opacity`: fill opacity, 0–1; the existing naming convention is retained instead of adding a duplicate fillOpacity field.
- `strokeColor` (six-digit hex), `strokeOpacity` (0–1), `strokeWidth` (0–1024 map pixels; 0 disables), `strokeStyle` (`solid`, `dashed`, `dotted`). All boundaries, including holes, are stroked. Width remains constant in map units under object scaling.
- `patternFrame: {x,y,width,height}`: finite stable texture frame, positive dimensions. Retained even without pattern fill. Point edits preserve it. Whole-object transforms update it. Repeat offset is frame-relative; Stretch centers the source in this frame and preserves repeat-only settings for later switching.

Layer membership and z-order remain in `layers[].objectIds`, exactly once per object. No extra per-object layerId. Fill paths use opposite winding and one clipped canvas pattern per object; no tile objects and no seams from separately painting adjacent polygons. Missing images show an editor placeholder; PNG export refuses missing sources.

## Validation and limits

Central constants: `src/domain/areas.ts`.

| Limit | Value |
|---|---:|
| Points per normalized ring | 512 |
| Holes per polygon | 16 |
| Polygons per area | 32 |
| Total points per area / boolean result | 2,048 |
| Boolean selected objects | 2–16 |
| Total boolean input points | 4,096 |
| Browser boolean deadline | 1,500 ms |
| Raw freehand samples | 4,096 |
| Simplified freehand points | 512 |
| Freehand sampling distance | 2 map pixels |
| RDP tolerance | 1.5 map pixels |
| Duplicate/short-edge epsilon | 0.000001 map pixel |
| New drawing minimum bounds | 8 × 8 map pixels |
| Ellipse vertices | 32–512, multiple of four |

Ellipse subdivision targets a maximum 0.25-map-pixel chord error, subject to the point cap. Sampling and simplification never depend on zoom. Limits bound validation work and history/serialization size; document-wide 3 MiB edit / 4 MiB file JSON budgets remain applicable. No claim of arbitrary GIS-scale geometry or unlimited objects at maximum detail.

Normalize closure, duplicate consecutive points and winding. Reject self-intersection, degeneracy, nonfinite coordinates, touching/overlapping rings, holes outside their outer ring, overlapping component interiors, unknown fields and invalid styles. Geometry, points, fills and texture frames are explicitly validated, including missing fields. Validation runs on draw/edit admission, file/API read/write, backup/restore validation and PNG construction. Invalid edits leave the prior document intact.

New drawings must start and finish wholly inside the map; an outside contour is rejected, not clipped. Existing objects retain the editor's normal move/resize behavior and may extend outside the map; editor and PNG clip the final map. Point edits and transforms remain canonical map-coordinate geometry.

## Migration and storage

A legacy rectangle maps to `(x,y)`, `(x+w,y)`, `(x+w,y+h)`, `(x,y+h)` with no holes and stroke width 0. Preserve ID, opacity, lock, all pattern settings, texture frame and layer/z-order. Migration is deterministic and idempotent. Original bytes are untouched. Color formats remain conservative six-digit CSS hex, as used throughout the existing format.

SQLite columns and full-backup container version do not change. Project document and project row formatVersion are 3 after save. Full dataset validation uses the same parser and keeps the existing checksums, typed references, generation guards, staging and rollback process. Restore accepts historical valid project documents and canonical v3 areas. Older applications cannot read v3 projects; do not restore v3 datasets into an older binary.

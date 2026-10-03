# Mapweaver project format v4

Historical Sprint 15 format. Current saves use [v5](mapweaver-format-v5.md); the description below records the original v4 decision.

Sprint 15 adds canonical `path` objects. See [v3](mapweaver-format-v3.md) for unchanged areas and [v2](mapweaver-format-v2.md) for ZIP manifests and image/metadata limits. New saves use v4; v1–v3 load through the same central parser and become v4 in memory. No source file is overwritten on import. Older binaries cannot open v4; retain pre-upgrade backups. SQLite schema remains 3 and the full-backup container remains version 2.

## Path object

```ts
{
  kind: 'path', pathKind: 'generic', id, name,
  nodes: [{id, x, y, mode: 'corner' | 'smooth', in?: {x,y}, out?: {x,y}}],
  closed: boolean, strokeWidth: number, opacity: number,
  stroke: {kind:'solid',color:'#RRGGBB'}
    | {kind:'dashed',color:'#RRGGBB',dash,gap}
    | {kind:'texture',assetId,scale,spacing,offset},
  cap: 'butt' | 'round' | 'square', join: 'miter' | 'round' | 'bevel',
  x, y, width, height, rotation: 0, scaleX: 1, scaleY: 1,
  locked?: boolean
}
```

Nodes use **absolute map-pixel positions**. Both handles are **relative vectors from their node**, never absolute positions or viewport coordinates. Omitted handles are absent; if either endpoint supplies the relevant handle, the segment is cubic. Otherwise it is straight. Closed paths connect the last node to the first without a duplicate terminal node. Self-crossings are allowed. Layers own membership/order via `objectIds`; no redundant `layerId` exists on an object.

`strokeWidth` is positive line thickness, separate from the existing object's derived `width`/`height` selection adapter. `x/y/width/height` are conservative curve-extrema bounds including stroke: round/square padding sqrt(2) × half-width, miter padding 2 × half-width, texture padding sqrt(2) × half tile size. Native Canvas miter limit is 2. Baked geometry always retains adapter rotation 0 and mirror signs 1. Numeric comparison tolerance is 0.00001. Move/rotate/flip transform geometry and handles; proportional scale also scales strokeWidth.

Identity: safe 1–80-character alphanumeric/underscore/hyphen IDs; node IDs unique within each path; printable nonempty name up to 120 characters. Import defaults for omitted presentation fields: name `Path`, opacity 1, round cap/join, rotation 0 and scale signs 1. Geometry, closed, stroke and strokeWidth remain required. Bounds must match, including when defaults are used. Unknown object/nested fields and future pathKind values are rejected. Only `generic` is accepted now.

Solid and dashed colors are six-digit hex. Opacity is 0–1. Dash/gap are 0.1–10,000 map pixels. Round caps extend into gaps; use a larger gap or butt cap for a clear gap. Texture references a **fillPattern** ID, checked against the manifest/repository on every admission and restore boundary. A texture is a square patch (source stretched into the square), side = strokeWidth × scale; scale 0.01–100. Spacing is center-to-center map distance, minimum 1; offset shifts the phase modulo spacing. Repeated instances follow the centerline tangent. These are renderer instances, never separate project objects.

## Central limits

`PATH_LIMITS` in `src/domain/paths.ts` is shared by validation and rendering.

| Budget | Limit |
|---|---:|
| Nodes per path | 256; minimum 2 open / 3 closed |
| Coordinate/control endpoint magnitude | 1,000,000,000 |
| Stroke width | >0 to 1,024 map pixels |
| Adaptive samples per path | 8,192 |
| Subdivision depth | 12 |
| Sampling tolerance | 0.25 map pixel by default; explicit 0.05–10 |
| Texture instances | 2,048 per path |
| Nodes across a document | 20,000 |
| Derived samples across a document | 250,000 |

Nonfinite values, zero-length paths, duplicate node IDs, invalid styles, mismatched bounds, missing/wrong-type textures and excessive complexity are rejected before storing. Existing document object/image/JSON budgets also apply. Public engine functions assume immutable geometry after admission; admission invalidates any previous identity cache before checking untrusted geometry again. No samples, segment objects, lookup tables, selection or undo history are serialized.

Portable project remapping, full backup validation, SQLite references, clipboard/history asset retention and PNG all resolve textures through `objectAssetId`. Missing decoded textures have a dashed pink editor placeholder. PNG refuses unavailable source images instead of silently exporting a placeholder.

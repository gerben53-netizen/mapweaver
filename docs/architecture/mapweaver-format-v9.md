# Mapweaver project format v9

Version 9 adds `kind: scatter` with the common object identity/name/opacity/visibility/locking and derived map bounds. Layer and group membership retain their existing canonical location.

- `engineVersion: 1`, `seed`: uint32.
- `sources`: 1–16 `{assetId, weight, width, height}` entries; widths/heights are frozen placement sizes, not natural image dimensions.
- `settings`: diameter, density, minimum spacing, strategy (`random/even`), collision (`allow/distance/bounds`), falloff (`uniform/center/edge`), scale/rotation/opacity ranges, optional X/Y flips, align-to-stroke and `random/size` draw order.
- `strokes`: ordered `{mode: paint|erase, diameter, points}` operations. Erase affects only instances already generated in the recipe. Diameter and points are in the recipe frame.
- Optional `area`: copied canonical Area geometry with polygons/holes. It constrains the full stamp rectangle, including later additions.
- `matrix`: six-number similarity transform, no shear or nonuniform scale. Outer rotation is 0 and scale signs are 1; derived bounds enclose transformed instances, or recipe bounds if empty.
- `instances`: bounded array of `{assetId,x,y,width,height,rotation,scaleX,scaleY,opacity}`. X/Y are centers in the recipe frame. Array order is draw order. Images remain in the existing asset manifest.

Unknown fields, unsupported engines, malformed ranges/IDs, invalid masks/matrices/bounds, missing or non-stamp references and cumulative budgets are rejected by the shared browser/service parser. Export never regenerates; it draws stored instances. Portable import remaps both sources and instances. Normal saves, conflicts, recovery and full backup use the same representation. Formats 1–8 still normalize centrally without changing existing geometry; older binaries refuse format 9. SQLite schema 4 and the full-backup container stay unchanged.

See [ADR 0014](../adr/0014-deterministic-scatter.md) for frame, resource, generation and sizing decisions.

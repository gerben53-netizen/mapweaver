# ADR 0012 — Linked openings and explicit room floors

Status: accepted, 24 September 2026. Implements the supplied Sprint 18 scope.

## Opening model and ownership

`door` and `window` are independent discriminated map objects. `wallId` refers to one existing `pathKind: wall`; `position` is a fraction of its complete centerline arc length. `openingWidth` is in map pixels. Units and pixels-per-unit are display metadata using the Wall convention (pixel units always have reference 1). The ordinary object bounds are derived admission-checked adapter data, not a second placement representation. Depth, tangent and cutout are derived from the referenced wall.

Each opening belongs to the same concrete layer as its wall. The existing layer membership array remains authoritative. Parent wall/group visibility and lock affect its openings. Hiding an individual opening restores that wall section. A group containing an opening must include its wall; a wall can be grouped while its attachments remain implicit dependents. Copy, duplicate and move-to-layer expand to a complete assembly; pasted and duplicated wall IDs are remapped atomically. Optional symbol assets use the existing stamp picker and reference tracking.

Each interval must fit on one segment, with a 0.01-map-pixel minimum separation from other openings. Node edits retain normalized positions and refuse invalid previews. Reversal maps arc position into the reversed node order, preserving the former center and reversing local orientation. Whole-object movement/rotation carries attachments; uniform scaling scales their widths. Linked hidden/locked openings block geometry changes until shown/unlocked. Deleting a wall requires an explicit list/count confirmation and one undoable cascade. Deleting an opening alone restores its wall section.

## Rendering

The existing Wall painter is clipped by the shared opening contour before outline, solid fill or texture patches are drawn. An even-odd clip removes actual wall coverage, without erasing previously painted map objects. Hit painting uses the same exclusion. Symbols have their own hit region. Built-in jambs/leaves/swing arcs and window lines are shared with PNG; optional unreadable symbol images fall back to the built-in symbol. A missing wall is a structural error and blocks export, even if the orphan is hidden.

Cutout sampling uses the existing point-at-distance engine and is capped at 256 subdivisions. Immutable opening/wall pairs cache contours; the per-wall opening index preserves unaffected arrays across edits. No persistent wall graph, detached decorative door model or second path engine is introduced.

## Room detection

An explicit disposable worker samples existing wall paths, splits exact endpoint/T connections and traverses bounded faces of a temporary planar graph. Proper interior crossings and overlapping collinear segments are reported and prevent ambiguous results. Open branches are identified before pruning; their endpoints remain visible diagnostics. No gap healing occurs. Disconnected nested contours create holes and separately selectable inner rooms. Existing `polygon-clipping` computes floor overlap diagnostics; existing Area normalization validates outputs.

Floors follow wall centerlines and are inserted behind objects on the active layer. They are ordinary editable Areas with historical `roomSource` provenance (wall IDs, geometry fingerprint and seed). Provenance is not a live foreign-key relationship: deleting a source wall does not destroy a manually edited floor. Regeneration checks source availability, shows a new preview and requires explicit permission to replace manual geometry. It retains ID, layer, order and style. A changed document invalidates an outstanding preview. Neither door status nor passage gaps break room topology: walls' canonical centerlines define rooms.

## Bounds and persistence

At most 64 openings/wall; width 4–4,096 map pixels. Room input: 256 walls, 2,048 sampled segments, 2,100,000 pair checks, 256 crossing diagnostics; output: 128 rooms, 512 boundary points/face, plus existing Area hole/point budgets. Worker deadline: 1,500 ms. Exact connectivity uses a 0.000001-map-pixel numeric epsilon. These are small-building limits, not architectural/GIS guarantees. Hide unrelated layers or simplify walls when rejected.

Format v7 is required because older applications cannot interpret the new object types/provenance. Central parsing validates references and derived bounds in browser and service; SQLite schema and backup container do not change. Existing v1–v6 readers remain supported by the current parser without a new migration obligation. No Windows distribution or external service is added.

## Open-wall workflow refinement — 28 September 2026

Continue/Extend preserves existing attachment centers by converting their old arc distances to the new total length; continuing from the start reverses local orientation as well. Explicit Open/Close Path preserves distances on retained segments and refuses removal of an occupied closing segment. Ordinary node edits retain normalized-position semantics above. These are command semantics, not a format change. Open passage creation reuses `kind: door, doorType: passage`; the temporary tool choice is not persisted.

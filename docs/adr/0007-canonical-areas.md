# ADR-0007 — Canonical areas and project format 3

Accepted, 23 September 2026, Sprint 14.

## Decision

One Area tool creates rectangles, ellipses, polygons and freehand closed contours. The canonical object is `kind: area`. Geometry consists of map-coordinate polygons with outer rings and holes. Existing layer membership remains authoritative in `layers[].objectIds`; it is not duplicated as an object layer ID. Bounds are derived, serialized for the existing transform adapter, and validated against the points. Whole-area rotation is not enabled; proportional scaling and translation bake into geometry. Stamp transforms are unchanged.

Portable project format **3** is necessary: older readers reject unknown object types, so silently adding areas to format 2 would violate the version contract. The central parser validates v1/v2 before migrating rectangular pattern fills into four-point areas. v1 typed-asset splitting precedes this migration. New writes contain areas, never legacy pattern fills. IDs, layer order and texture parameters survive. SQLite schema 3 remains sufficient; the project row's formatVersion is updated on every write. Old records migrate on read and become canonical on the next save; no bulk rewrite or deletion of user data occurs.

Pattern fill stores a stable map-coordinate frame. Point edits leave that frame untouched; translating/scaling the whole object transforms the frame alongside geometry. Repeat retains native-pixel tile scale, including during resizing; Stretch scales to the retained frame. This preserves old rectangular pattern appearance. Offsets are relative to the frame, not viewport pixels. Stroke width remains in map pixels and explicitly includes hole boundaries.

Union and Subtract use **polygon-clipping 0.15.7** (MIT), the sole boolean library. Its maintained implementation supports multipolygons and holes; see the [upstream algorithm and output contract](https://github.com/mfogel/polygon-clipping). Browser operations execute in a disposable worker with a 1.5-second deadline. Input/output budgets and shared validation apply. The first-selected area supplies style, frame, layer and ID; Subtract removes subsequent selections. Source changes during calculation abort replacement. Empty results require confirmation. Replacement is one history transaction.

Freehand uses a small iterative Ramer–Douglas–Peucker implementation, not an additional overlapping geometry dependency. Samples are map-distance based and bounded before simplification. Self-crossing or degenerate contours are rejected rather than repaired unpredictably. Geometry normalization and topology validation are shared with service, import and restore.

## Consequences

v1/v2 files remain readable; v3 exports require the updated application. Retain older backups for use with older Mapweaver versions. No second legacy drawing/paint component remains. Legacy interfaces/helpers exist for validation, migration and historical fixtures only.

The conservative topology contract rejects touching rings/polygons as well as crossing/overlapping components. A clipping result that exceeds that contract is refused without changing the source objects. This favors predictable editing over accepting every mathematically valid boundary case. Open paths, arbitrary layer masks, visual effects and whole-area rotation remain outside this implementation.

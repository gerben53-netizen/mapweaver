# ADR-0008 — Canonical generic paths

Status: accepted for the explicit Sprint 15 request, 2026-09-23.

## Decision

Add one `PathObject` union member with `pathKind: generic`. Keep centerline nodes and cubic handles independent from areas. Nodes use absolute map pixels; incoming/outgoing handles use relative vectors. Layer arrays remain authoritative. Existing object transform fields are a derived bounding-box adapter, not another editable source of truth. Transform points/vectors and bake orientation, including reflection; scale the line width proportionally.

Use the small MIT [bezier-js](https://github.com/Pomax/bezierjs) dependency (pinned 6.1.4, development typings 4.1.3) for curve evaluation, integration, derivative, extrema, projection and splitting. Keep bounded subdivision, node editing, style validation and store integration in Mapweaver. This avoids a second general Bézier implementation.

Use the existing fillPattern asset kind for basic texture strokes. Tiles are square patches following position/tangent. One Canvas Shape paints all patches; no independent tile objects. The generic painter dispatches on pathKind; unsupported kinds throw instead of falling through. ObjectProperties dispatches on the path object branch. Add specialized renderer/properties dispatch only with actual specialized path kinds in a later sprint.

Write project format v4, centrally accepting/migrating v1–v3. No SQLite schema or backup-container change is needed. Existing typed asset IDs, SHA checks, generation/revision checks and transactional backups remain authoritative. Document format and row formatVersion reflect v4 after save. Older application packages must not load a newly saved v4 dataset.

## Consequences

Straight/curved, open/closed paths share the same model and edit history. Geometry and texture layout are derived, bounded and weakly cached; no permanent samples. A full node edit session is one transaction, cancellable with Escape. Ordinary complete transforms remain separate transactions. Viewport state never enters geometry.

Conservative selection bounds may contain empty space, while hits use the actual centerline with a screen-based minimum tolerance. Curve projection is the library's numerical approximation; inserting uses an exact cubic split at the selected parameter. Arc-distance inversion uses 16 bounded bisections and library partial lengths.

Sharp texture corners and crossings may overlap or leave wedges; no watertight wall joints or junction semantics are claimed. Texture images are mapped to square patches; no aspect-aware wall material system is introduced. Length is currently shown in map pixels: the project has no feet/meters scale. See [path geometry](../architecture/path-geometry.md) and [format v4](../architecture/mapweaver-format-v4.md).

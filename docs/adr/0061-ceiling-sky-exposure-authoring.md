# ADR-0061 — Ceiling / sky exposure authoring

Status: accepted, 2026-10-04. Canonical Campfire Map Contract v3 is now available.

## Acceptance criteria

- Author, select, move, edit vertices, delete, cancel and undo/redo ceilings using existing polygon editing.
- Save/reopen and portable ZIP retain geometry, stable IDs and explicit sky intent.
- A translucent Ceilings overlay is ephemeral and absent from exported PNGs.
- Export uses canonical v3 ceilingRegions; legacy absence is distinct from intentional empty coverage.
- Concavity and overlaps work; courtyards/ruins use several simple polygons, without inferred rooms or holes.
- Invalid geometry and out-of-bounds edits fail without corrupting the document.
- Walls, windows, doors, authored lighting, movement and LOS remain independent.
- Targeted tests, typecheck, lint, production build and actual editor visual QA pass.

## Decision

Use native Area geometry, selection, hierarchy and point-editing, with optional `AreaObject.ceiling: true`. A ceiling has one simple polygon, no holes, no material, and at most 128 vertices. It is a semantic object, not an ordinary painted Area or generated room. The existing object ID is the contract ceiling ID. Duplicate objects receive fresh IDs.

Optional format-12 `map.ceilingExposure: 'explicit'` distinguishes intentional coverage from legacy unknown. New maps set this flag. First ceiling creation sets it in the same history transaction. Deleting the last ceiling retains it and exports `[]`. Loading old maps adds neither the flag nor ceilings. **Map actions → Use explicit sky exposure** is an undoable opt-in for legacy maps. Missing `ceilingRegions` remains unknown; it never means full outdoor illumination.

Mapweaver exports v3 through byte-for-byte derived canonical schemas/types/validator. Polygon validity, bounds and region limits are delegated to that validator. No contract fork or Campfire edits. All authored ceilings are exported even if hidden in the editor hierarchy; visibility is an authoring aid, not a sky-state switch. Ceiling changes therefore participate in revision dependencies even while hidden.

The editor overlay uses temporary color/outline and shared selection/vertex handles. Its visibility toggle does not change data or revisions. The PNG scene excludes ceilings entirely. It is a diagnostic footprint, not a darkness simulation. Campfire interprets overlapping ceiling polygons as a union: direct sky/environment illumination is blocked once. No stacking of runtime intensity, point-light occlusion, movement or LOS semantics is introduced.

Courtyards, broken roofs and cave entrances are expressed as multiple simple polygons leaving sky-exposed gaps. No polygon-boolean engine, 3D ceiling height, renderer mask, sunlight algorithm or runtime profile is added.

## Consequences / handoff

Native files remain format 12 with validated optional fields. Map dimensions cannot shrink beyond existing ceiling vertices; correct geometry first. Canonical contract limits (8192-pixel sides, 64 regions) apply to ceilings. File export and any future API share the existing serializer.

Campfire owns runtime sky-mask composition, environment profiles and illumination. `ceilingRegions` affects only direct sky/environment illumination; windows transmit independently and authored ambient/point lights retain their existing semantics. Missing, empty and nonempty coverage must remain distinguishable on ingest/re-import. Map ID and object IDs remain stable across revisions.

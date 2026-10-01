# ADR-0052 — Campfire Map Contract v1 producer

Status: Accepted, 2026-10-01. Implements the explicit Campfire export sprint; the contract ownership rule in AGENTS.md remains authoritative.

Campfire owns the canonical contract in its immutable `packages/map-contract`. MapWeaver uses pinned byte-identical derived public types/schema/validators with SHA-256 provenance and a build-time drift check. No hand-maintained contract fork or Campfire write is allowed.

ProjectFile.id is the stable external mapId. Format 12 receives optional `map.campfireRevision` and canonical `map.lighting`. Absent revision initializes to 1; absent lighting is fully lit ambient with no lights. Revision is monotonic persisted metadata, independent of SQLite concurrency revision and undo content snapshots. Effective history transactions, undo/redo and service-side content/name changes advance revision; read/save/export alone do not.

Lighting is map-level authoring data with an editor-only preview, not scene artwork or Campfire runtime state. Export serializes visible native Wall paths and opening apertures to canonical line geometry, with deterministic curve subdivision and stable native/derived IDs. Hex/shifted grids, insufficient scale, invalid geometry and resource limits block the dependent export.

The validated pure serializer is separate from file transport and will also serve a future authorized API client. Current transport is ZIP containing map.json and map.png using the existing original-resolution PNG renderer, without semantic illumination or baked grid. No API integration is introduced.

See `docs/campfire-export.md` for exact mapping, revision dependencies, limitations, authoring and verification workflow.

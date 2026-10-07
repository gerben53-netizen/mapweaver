# ADR-0063 — Environmental Detail

Status: accepted, 2026-10-07.

Environmental Detail is an optional version-1 map field in project format 12. It is independent of native scene objects, material geometry and Campfire semantics. Absence preserves historic maps and ordering. Import validates bounded stroke counts, finite brush/world coordinates, seeds, supported immutable DEV revision, concrete variant indices and a 2 MiB JSON budget. No database migration is necessary because the service stores validated map documents.

Surface stores world-distance-resampled strokes. Sparse 256-world-pixel tiles replay paint/erase into per-preset masks, with a shared 32 MiB LRU. Dirt/damp/moss multiply; wear composites normally. Decals persist concrete world tuples and stable IDs, so repaint, viewport changes and reload cannot reselect variants. Seeded local rejection prevents pathological pile-ups without a global collision solver. Density refers to swept world area rather than browser event rate. The editor and native PNG export share one Canvas2D renderer; export rebuilds masks at its 1×/2× resolution.

One pointer gesture previews temporary data and commits one existing history transaction. Cancellation discards preview. Surface erase is ordered destination-out replay across surface presets; decal erase filters stored centers and does not touch surface or normal objects. Hidden/locked detail refuses painting. Wall bias uses visible native centerline samples and stroke thickness, never artwork inference.

Opt-in strata are stable across editor/export: background, Areas/existing terrain and texture paint, surface and floor decals, structural paths/openings, edge decals, props/labels, semantic editor overlays. This intentionally replaces cross-stratum z-order only on maps with environmental detail. Detail clips only to actual map bounds, allowing material-boundary crossings. Ceiling editor overlays remain excluded from export.

Dedicated content namespace `environmental-detail` has `surface`/`decals` roles and immutable component revisions. The current registry contains only DEV diagnostic presets and does not enter SQLite Asset Library/category creation or campaign content. Production authoring handoff describes PNG deliverables independently; a future explicit integration must add governed PNG registration/loading without masquerading as ordinary stamps. New revision content must not silently replace saved outputs. No exporter or alternate Campfire contract is introduced.

Trade-offs: masks replay bounded histories rather than storing huge per-stroke bitmaps; transient cache identity is not persisted. Decals support brush erase/history, not individual scene selection. Future Premium image support is not claimed by this DEV renderer.

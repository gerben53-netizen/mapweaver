# ADR 0039 — User intent above internal drawing modes

Accepted 26 September 2026.

Consolidate the primary toolbar without altering persisted object types. Route is an existing specialized Path, with physical scale, direction, snapping, continuation and appearance, but no independent travel/linkage/pathfinding workflow. One Path entry exposes Generic/River/Road/Border; Trail remains a Road class. The internal `route` drawing mode is retained so existing drawing previews, endpoint continuation, snapping and event cancellation keep their behavior. This is an implementation detail, never a second primary tool.

Land / Water is the primary physical-geography workflow. Remove the competing Landmass creation entry. Existing Landmass Areas, point/contour editing and explicit role conversion remain available. Terrain Region uses a separate user intent over the shared Area geometry engine, with explicit semantic terrain selection at creation. Its initial appearance is copied from the supported terrain mapping; later semantic edits do not overwrite appearance. Generic Area creation never receives biome metadata.

Keep creation capabilities centralized in mapCapabilities. Battlemap creation retains Generic Path and Area; World/Regional additionally exposes geography and semantic Path types. Existing object property editors stay available independently of primary creation visibility.

Terrain Brush has one Material selector for both procedural and immutable premium material IDs. Material selection derives the required fallback style and preserves all brush behavior. Named Brush Presets set size/softness/strength/textureScale only; they never switch materials or semantic biome data. The older combined premiumBrushPreset helper remains usable for historical fixture builders; it is no longer the interactive material selection path. Paint schema versions, renderer, resource IDs and existing mask coverage are unchanged.

This is a UI and transient-state decision, not a project-format migration. Format 12, strict validation, local service/SQLite and ZIP remain unchanged. No external service or dependency is introduced. Compatibility is verified using a seven-object fixture, ZIP round-trip and local-service browser save/reload with identical PNG output.

## Area/material interaction follow-up (28 September 2026)

The duplicate Pattern fill creation entry is removed. Area chooses its initial material during creation; Apply Material is a selection operation through the contextual toolbar and primary Appearance inspector. Its existing shared asset browser previews outside the document, then commits one history action or cancels without mutation. Texture Brush remains independent local paint. See [scope, scale policy and validation](../sprints/area-material-interaction.md). No persistent format changes.

## Toolbar follow-up (28 September 2026)

Place Marker is now the sole marker insertion action. The duplicate Marker choice in Map Elements is removed; the Place registry, wizard, inspector and persistent objects remain unchanged. Rail groups and action tooltips distinguish drawing, surface painting and semantic locations. Map Elements uses centralized capability filtering. See [technical comparison and validation](../sprints/toolbar-semantic-cleanup.md).

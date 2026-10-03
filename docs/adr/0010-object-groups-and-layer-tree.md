# ADR 0010 — Object groups and the canonical layer tree

Accepted 2026-09-23 for Sprint 16.

Objects remain central records. A nonnested object group contains ordered IDs from exactly one concrete layer; each object belongs to at most one group. Groups can contain nonadjacent objects. Group/ungroup never moves intervening objects or changes rendering order.

`layerTree.roots` and layer-group `children` are the only canonical layer order. Depth-first traversal gives front-to-back panel order; rendering reverses the resulting concrete layers. Within each layer, `objectIds` remains back-to-front. The `layers` record array is a lookup collection, not a second ordering authority. Every layer and group has exactly one parent, every entry is reachable, and group depth is at most five. Import rejects ambiguous membership, dangling references, cycles and incompatible ordering.

Group/layer visibility and locking are inherited without rewriting descendant flags. Solo, expansion, selection, editing-group context and guide settings remain transient editor state. Solo affects editor rendering and selection, but not project serialization or PNG. Export honors persisted inherited visibility.

Group transforms bake area/path coordinates and relative path handles in map units. Uniform scale scales strokes. An optional six-component area `patternTransform` affine matrix preserves the texture frame through rotation/reflection/scale; editor and PNG use the same painter. Stamps retain positive dimensions, angle and mirror signs. One completed transform is one history entry.

Portable format v5 adds groups/tree and optional object names/visibility and the area matrix. SQLite keeps the same document column and revision protocol. Clipboard retains immutable image blobs while switching projects and remaps colliding asset IDs. Backup, portable transfer, recovery and history use the same validated document.

The user explicitly waived backwards compatibility on 2026-09-23 and permits removing obsolete data/versions when necessary. Existing small migration paths are retained, but support for old versions is not an acceptance requirement and no new compatibility subsystem is introduced. No unrelated user data or distributions were deleted for this sprint.

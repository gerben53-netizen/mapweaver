# Editable object model

`src/domain/models.ts` defines stamps, canonical areas, generic/wall paths and linked doors/windows. `PatternFillObject` is retained as a legacy boundary/fixture type, not a second active editor tool or renderer. Hydration passes through `parseProject`, so editor documents use stamps/areas/paths/doors/windows/scatter. Current format details are in [v10](mapweaver-format-v10.md).

Stamps use image ID and the existing pivot, dimensions, rotation and mirror signs. Areas use map-coordinate rings plus typed fill and stroke. Cached bounds are checked against geometry. `objectAssetId` resolves stamp sources and area pattern sources; no-image areas introduce no asset reference. Layers own ordered membership for both types.

Geometry logic lives in `domain/areas.ts`; booleans in `domain/areaBoolean.ts` and the bounded worker. `drawArea.ts` paints the same fill/stroke in editor and PNG. `AreaPoints` is a separate editor overlay and never enters export. Temporary shape choice, chosen fill, point/ring selection and live contour live outside the project document.

The project store admits complete areas, previews validated geometry edits and atomically replaces boolean source objects. Drawing creates one history action. Point-edit sessions start a transaction; previews are not autosaved. Done/Enter commits; Escape restores the initial snapshot. Object movement, proportional scale, duplicate, clipboard, deletion and layer commands use the existing history pipeline; copied geometry is immutable and transformed copies receive new IDs.

Point edits retain the texture frame. Whole-object movement moves geometry and its texture mapping. Existing single-object bounding-box edits retain their established behavior. Sprint 16's shared selection transform scales geometry, strokes and area texture mapping together, and supports rotation/mirroring by baking geometry and composing an affine texture matrix. This avoids resetting the texture when transformed bounds change.

Object groups are nonnested metadata over centrally stored object IDs from one layer. They never contain object copies or determine independent draw order. `layerTree` is the canonical depth-first front-to-back layer ordering; `layers` is a concrete-layer lookup collection. `projectView.ts` applies inherited visibility/locking consistently to canvas, export, selection and commands. Solo affects only the editor. Selection expansion respects the currently edited group, and all geometry commands reject the entire selection when a member is uneditable. Group order is normalized after intentional membership/order commands; import instead validates and rejects ambiguous data. See [ADR 0010](../adr/0010-object-groups-and-layer-tree.md).

Paths retain an editable centerline with relative controls, including open/closed mixed straight/cubic segments. `domain/paths.ts` supplies validated geometry, transforms and measurements. `drawPath.ts` is shared with PNG; texture strokes reference fillPattern assets through `objectAssetId`. See [path geometry and history](path-geometry.md).

Walls specialize the existing Path object through pathKind and validated wall settings. See [ADR 0011](../adr/0011-wall-path-specialization.md). Thickness and outline are baked with geometry during selection scaling; endpoint junctions remain visual patches; format v8 additionally retains explicit historical snap annotations for material T/X joins. Optional immutable wall sets and seeds reference a single existing atlas asset; see [ADR 0013](../adr/0013-wall-material-sets.md).


Doors/windows refer to one same-layer Wall by normalized arc position and width; bounds, tangent and contour cuts are derived. Shared admission rejects orphan, overlapping and out-of-segment openings. Ordinary Areas may carry historical room-source provenance. Explicit worker detection/regeneration never introduces a second live room model. See [ADR 0012](../adr/0012-linked-openings-and-room-floors.md).

Scatter batches frozen stamp instances with a versioned, seeded recipe and a similarity frame. `objectAssetIds` carries every source through shared asset-retention boundaries. See [ADR 0014](../adr/0014-deterministic-scatter.md).

Sprint 20: canonical mapType/geography and optional Area.land roles are defined in ADR 0015 and mapweaver-format-v10.md. Physical width is stored in km; all distances derive from it without transforming existing map pixels. Land roles retain the complete existing Area geometry, layer, history and asset mechanisms.


Sprint 21 adds `river`, `road` and `border` path kinds with a validated `route.kind` settings union. Nodes remain the only canonical line geometry; asset IDs remain in the existing stroke. Object groups/layers/list/filter/clipboard and history use ordinary path objects. No route graph or second object registry exists. Details: [format 11](mapweaver-format-v11.md).


## Sprint 22 annotations

Place, Label, Legend and Compass join the existing MapObject union in format 12. Label owner links, offsets, text layout bounds and all new stamp references are centrally validated. Same-layer links use ordinary transactions, resource retention, transforms, groups, clipboard and serialization. Rendering uses bundled fonts and shared canvas/PNG painters. See [ADR 0017](../adr/0017-places-labels-and-map-annotations.md) and [format 12](mapweaver-format-v12.md) for limits, scaling, link semantics, font policy and compatibility.

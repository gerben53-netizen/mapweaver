# Mapweaver format v5

Historical format. Current writers use [v6](mapweaver-format-v6.md), adding specialized walls.

The ZIP container and asset manifests are unchanged. `project.json` writes `formatVersion: 5`, `objectGroups: ObjectGroup[]` and `layerTree: { roots: string[], groups: LayerGroup[] }` in addition to map, central objects and concrete layers. See [ADR 0010](../adr/0010-object-groups-and-layer-tree.md).

`ObjectGroup` has `id`, `layerId`, `name`, `objectIds`, `visible`, `locked`. Membership is nonempty, unique, same-layer, unambiguous and ordered exactly as its subset in the layer's `objectIds`. No nested object groups. Deleting members through editor commands removes empty groups; importing dangling members fails explicitly instead of silently repairing them.

`LayerGroup` has `id`, `name`, ordered `children`, `visible`, `locked`. Children reference concrete layers or groups. IDs are unique across the layer tree. Every entry appears once and is reachable; cycles and more than five nested groups are rejected. Depth-first root/child order is front-to-back. The concrete `layers` array does not supply draw order when a tree is present.

Objects can carry `name` and `visible`; omitted visibility means visible. Areas additionally support `patternTransform: [a,b,c,d,e,f]` applying `x'=a*x+c*y+e`, `y'=b*x+d*y+f` to the existing pattern frame. It must be finite and nonsingular. Area/path geometry and bounds remain centrally validated. No UI selections, solo mode, collapsed states or smart guides are serialized.

History, local autosave, recovery, project duplication, `.mapweaver` transfer and full-dataset backups preserve these fields. Export uses persisted visibility through the same flattened tree. Solo and guides are excluded from PNG.

Existing v1–v4 parsing can initialize empty object groups and a flat root tree, but historical compatibility is no longer a product requirement following the user's 2026-09-23 decision. New documents and saves use v5. The SQLite schema and binary asset layout are unchanged.


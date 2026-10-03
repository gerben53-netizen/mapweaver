# Generator-ready world assets — Sprint B

Open **Asset library**, select a stamp and expand **Generator metadata**. Enable **Generator-ready stamp**, choose controlled values and save. Escape or **Discard generator draft** restores the current saved metadata. Disabling and saving removes procedural metadata without changing image bytes, ordinary metadata, default size or placed objects. Valid pending drafts participate in lifecycle flushing; conflicts and invalid values remain visible. Library undo/redo applies normally.

## Vocabulary

| Field | Supported values |
| --- | --- |
| semanticType | mountain, hill, tree, forestCluster, snowMountain, volcano, rock, rockCluster, swampVegetation, marshCluster |
| roles | ridge, peak, foothill, isolatedFeature, forestInterior, forestEdge, forestCluster, sparseVegetation, rockScatter, swampInterior, swampEdge, landmark |
| biomes | temperate, alpine, snow, conifer, deciduous, tropical, arid, desert, volcanic, swamp, wetland, tundra, generic |
| themes | painterlyFantasy, parchment, darkFantasy, genericFantasy |

The generator object is optional and stamp-only. If supplied, version 1, semanticType and nonempty, duplicate-free roles/biomes/themes are required. Names, tags, filenames and categories never infer procedural meaning. Existing `applicableMapTypes` remains the sole applicability field; empty means any map type.

Weight is positive, from .000001 through 1,000,000. Omission normalizes to the neutral weight 1; 8 is eight times as likely as 1 within the selected candidate pool. Zero is invalid; remove generator metadata to exclude a stamp. Scale is an optional ordered .01–100 multiplier range relative to the separately resolved defaultSize, default 1–1. Rotation is optional, default disabled/0–0; allowed rotation accepts an ordered −180°–180° range. Disabled rotation must specify 0–0. Optional spacing (.1–10, default 1) is a bounding-box spacing multiplier for Sprint C, not a collision polygon. No current placed object or scatter recipe is rescaled by these hints.

## Canonical package example

Use the existing ZIP layout and **manifest schema 3**. Versions 1 and 2 remain readable. SVG source files are authoring resources; the actual stamps are ordinary transparent PNGs.

```json
{
  "schemaVersion": 3,
  "assets": [{
    "file": "assets/temperate-mountain.png",
    "type": "stamp",
    "title": "Temperate mountain",
    "categoryPath": ["World Map", "Mountains", "Temperate"],
    "applicableMapTypes": ["world-map", "regional-map"],
    "defaultSize": {"mode":"world", "width":600000, "unit":"m", "lockAspectRatio":true},
    "author": "Mapweaver",
    "license": "CC0-1.0",
    "generator": {
      "version":1, "semanticType":"mountain",
      "roles":["ridge","peak"], "biomes":["temperate"], "themes":["genericFantasy"],
      "weight":8, "scale":{"min":0.85,"max":1.2},
      "rotation":{"allowed":false,"min":0,"max":0}, "spacing":1.05
    }
  }]
}
```

`generator: null` explicitly clears metadata when importing with Overwrite. Missing generator leaves existing metadata alone. Keep/Fill/Overwrite, preview/review, deduplication, category mapping and collection merging follow the ordinary importer. Export emits schema 3 when any exported stamp carries metadata, otherwise the existing schema 1/2 rules apply. Old binaries cannot read schema-3 packs. The new reader preserves old libraries and packs; no bulk rewrite or deletion occurs. JSON Schema is `public/asset-templates/mapweaver-assets-v3.schema.json`; shared runtime validation additionally enforces min ≤ max and disabled rotation 0–0.

## Query and deterministic selection

`src/domain/generatorAssets.ts` provides `findGeneratorAssets`, `createGeneratorSelector` and `selectGeneratorAsset`. The local endpoint `POST /api/v1/library/generator-query` accepts:

```json
{"semanticType":"snowMountain","roles":["ridge"],"biome":"snow","mapType":"world-map","theme":"genericFantasy"}
```

The response includes the library revision, fallback `level`, and compact candidates with IDs, dimensions, defaultSize, applicability and generator metadata. The SQL query uses an active-stamp semantic-type index and does not load image blobs. At most 10,000 candidates of one semantic type are supported; larger sets produce a clear error rather than silently truncating the selection distribution.

Fallback levels stop at the first nonempty pool:

1. Exact semantic type + any requested role + biome + theme.
2. Type + any requested role + biome.
3. Type + biome.
4. Type + generic biome.
5. Type only.
6. No result.

Map applicability, active stamp status and exact semantic type are mandatory at **every** level. Unspecified filters are unconstrained. Fallback does not merge pools, guess filenames or substitute another semantic family. A missing snowMountain never becomes an ordinary mountain or volcano. Theme/role relaxation is visible through the level in the response; Sprint C should report meaningful fallback rather than hide it.

Compile the selected pool once with `createGeneratorSelector(candidates)`, then call the returned selector with a uint32 seed and nonnegative integer draw index. It freezes sorted ID order and cumulative weights, uses the existing counter-based seeded RNG and binary search, and never calls Math.random. This is O(n log n) preparation and O(log n) per draw. Duplicate IDs are rejected. Same IDs/weights/seed/index give the same result regardless of input order. A different library with regenerated IDs is a different candidate set; Sprint C must freeze selected IDs and placement data in its recipe/output as existing Scatter does.

## Bundled Mapweaver Engraved collection

Import `public/world-assets/mapweaver-world-engraved.zip` through the ordinary Asset Library. Download links are also in the import dialog and the world's **World generator asset readiness** section. Nothing is installed into a user's library automatically.

The pack has **24 stamps**: five mountains (including volcanic mountain), three snow/alpine, three hills, five woodland/tree, two volcanoes, three rocks/cliff, and three swamp/marsh. Six collections group Mountains, Snow & Alpine, Hills, Forests, Volcano & Rock, and Swamp. Hierarchical categories use World Map / Mountains (Temperate, Snow, Volcanic), Hills, Forests (Temperate, Conifer, Sparse), Rocks and Swamp.

All are original code-authored illustrations in one restrained `genericFantasy` family: upright oblique symbols, muted colors, dark outlines, left-side light and right-side shade. They are not a painterly asset set. No third-party artwork or remote resource is used. PNGs have transparent backgrounds and no text; `catalog.png` is a labeled preview only, never an imported stamp. Editable SVG sources, provenance and CC0 notice are included in the repository. `node scripts/build-world-assets.mjs` reproduces PNGs, manifest, ZIP and catalog.

Default widths represent **cartographic footprints**, 280–900 km in metres, not a literal individual tree/mountain size. They are normalized by symbol role, with native aspect lock. At a 6000 km-wide 1200 px map, a 600 km symbol is 120 px; at 40,000 km it is 18 px. World and Regional maps with equal physical extent have identical placement sizes. Change library defaults for a substantially different cartographic scale; no arbitrary pixel fallback is used by this pack. Procedural scale ranges are separate from these defaults.

## Sprint C handoff and limits

The world wizard's secondary readiness section queries installed semantic families. Geography generation still emits Areas/Paths only. Sprint C should query a pool, inspect fallback level, compile weighted selection once, resolve the existing defaultSize, then apply scale/rotation/spacing hints while freezing native editable output. Ridge alignment, clustered forests, collision handling and automatic placement are not implemented here.

Bulk editing of semantic fields is deferred: the existing arbitrary metadata command is deliberately single-asset; its bulk actions are narrow tag/category/collection commands. Adding safe mixed-value semantic merging and a review UI deserves its own change. The initial art library is intentionally compact and one style family; other theme names are supported metadata vocabulary, not supplied matching artwork.


## Sprint C integration

Generator-aware placement is now implemented in `src/world/scatterWorld.ts`; the earlier Sprint C handoff above describes the original Sprint B boundary. The wizard loads a revision-consistent query snapshot and adds optional native stamps. Compatible biome/generic biome and the selected theme are hard constraints before the existing fallback helper. See [world scatter](world-scatter.md) for controls, caps, exclusions and current limitations.

## Painterly World family

The separate [Painterly World pack](../public/world-assets-painterly/mapweaver-world-painterly.zip) supplies 42 transparent raster stamps in eight collections, including 41 terrain assets with complete generator metadata. It uses product theme `world.painterlyFantasy` and metadata family `painterlyFantasy`. Download it under World generator asset readiness and import it through the normal Asset Library flow. Nothing is installed or replaced automatically. See the [art/size/provenance guide](../public/world-assets-painterly/README.md) and [Velanth benchmark](sprints/world-asset-quality.md). The optional tower is a manual stamp; the current generator has no building semantic type.

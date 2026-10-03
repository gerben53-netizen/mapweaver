# Generator-ready world stamps

**OPTIONAL:** ordinary stamps work without generator metadata. To provide it, **REQUIRED:** manifest schema 3, `type: "stamp"` and the `generator` object below. Names, tags and categories never infer semantic meaning. Exact JSON examples with real images: [mountain + forest template](templates/generator-ready-world-pack/mapweaver-assets.json), adapted from the shipped Engraved pack. A valid legacy Painterly example is in [examples](examples/README.md). The current hierarchy edition is `public/world-assets-painterly/mapweaver-world-painterly.zip`.

## Fields

| Field | Requirement | Validation / omission |
| --- | --- | --- |
| `version` | REQUIRED | Integer `1` |
| `semanticType` | REQUIRED | One exact value in taxonomy below |
| `roles` | REQUIRED | Nonempty array of unique supported values; maximum 12 |
| `biomes` | REQUIRED | Nonempty array of unique supported values; maximum 13 |
| `themes` | REQUIRED | Nonempty array of unique supported values; maximum 4 |
| `weight` | OPTIONAL | Finite 0.000001–1,000,000, defaults to 1; relative probability within the chosen candidate pool |
| `scale` | OPTIONAL | Object with REQUIRED `min`, `max`, finite 0.01–100 and min ≤ max; consumer default 1–1 |
| `rotation` | OPTIONAL | Object with REQUIRED boolean `allowed`, finite ordered `min`,`max` within −180…180 degrees. Disabled requires both 0. Consumer default disabled/0–0. |
| `hierarchy` | OPTIONAL | `hero`, `primary`, `support`, `detail`; omitted preserves legacy consumer behavior |
| `ridgeAxis` | OPTIONAL | Finite −90…90 degrees; authored image ridge axis, positive clockwise |
| `lighting` | OPTIONAL | `northwest`, `neutral`, `other`; declared conflicting light is excluded by hierarchy scatter |
| `spacing` | OPTIONAL | Finite 0.1–10, consumer default 1; footprint-spacing multiplier, not a polygon |

Unknown fields, including inside scale/rotation, reject. There is no `generatorRoles`, `generatorWeight`, `generatorScale`, `environment`, `footprint` polygon or arbitrary style-ID field. Those aliases do not work. `generator: null` is supported only for schema-3 stamps and can explicitly clear metadata with Overwrite. Zero weight is invalid; remove metadata to exclude a stamp from procedural selection.

## Exact taxonomy

**REQUIRED values**, case-sensitive:

- `semanticType`: `mountain`, `hill`, `tree`, `forestCluster`, `snowMountain`, `volcano`, `rock`, `rockCluster`, `swampVegetation`, `marshCluster`.
- `biomes`: `temperate`, `alpine`, `snow`, `conifer`, `deciduous`, `tropical`, `arid`, `desert`, `volcanic`, `swamp`, `wetland`, `tundra`, `generic`.
- `themes`: `painterlyFantasy`, `parchment`, `darkFantasy`, `genericFantasy`.

| Supported role | Intended authoring use (RECOMMENDED interpretation) |
| --- | --- |
| ridge | Chain-compatible mountain silhouette |
| peak | Prominent summit |
| foothill | Lower transition feature near mountains |
| isolatedFeature | Standalone terrain symbol |
| forestInterior | Dense interior canopy |
| forestEdge | Edge silhouette / lower density |
| forestCluster | Grouped tree canopy |
| sparseVegetation | Sparse individual vegetation |
| rockScatter | Small scattered rock feature |
| swampInterior | Dense wetland material symbol |
| swampEdge | Wetland margin symbol |
| landmark | Distinctive terrain feature |

The schema validates values but does not enforce semantic-type/role combinations. **RECOMMENDED:** choose honest visual roles rather than adding every value to gain matches. A tower is not a valid new semanticType; leave it a manual stamp rather than mislabeling it a mountain.

## Matching and fallback

The shared query first requires stamp role, exact semanticType, and matching map applicability (empty allows any). Within that base pool it chooses the first nonempty level:

1. Any requested role + exact requested biome + exact requested theme.
2. Any requested role + biome (theme relaxed).
3. Biome (role/theme relaxed).
4. Assets explicitly marked `generic` biome.
5. Any asset of the same semantic type/applicable map type.
6. No candidates.

Absent query filters are unrestricted. Weighted selection sorts stable asset IDs and uses seeded sampling, making the same IDs/seed/index deterministic. Renaming title/category does not define semantics. IDs can change in a new library; do not promise the same composition across unrelated fresh imports.

**World scatter adds stricter consumer checks:** it filters compatible theme families and exact/generic biomes so unrelated symbols do not silently substitute. Thus a service fallback result does not guarantee placement by every generator. Consumer terrain masks, spacing, map containment, source size and placement budgets can skip otherwise valid assets. Current scatter skips footprints above map width/8 or height/8, or below map width/3000, and reports unavailable/oversized candidates. Increasing weight does not override those checks. Product theme ID `world.painterlyFantasy` is distinct from metadata theme `painterlyFantasy`; `world.classicParchment` expects the parchment family. The older Engraved pack supplies `genericFantasy`.

Scale multiplies resolved `defaultSize`; it is not the PNG resolution. Rotation limits should reflect lighting/perspective; most upright illustrated mountains should disable rotation. Spacing uses the full image rectangle, so invisible margins cost packing density. Volcano/landmark density and geographic applicability are consumer rules, not additional pack fields.

## Generator checklist — RECOMMENDED

- Correct semantic type and only visually appropriate roles.
- Exact supported biomes/themes; a consistent family across variants.
- Positive relative weight; inspect rare landmarks rather than inflating them.
- Controlled scale range, physically configured default size and map applicability.
- Rotation policy that preserves upright perspective and lighting.
- Tight transparent edges; spacing suited to full-image footprint.
- Test matching terrain/theme on a map with known physical scale and inspect placement notes.
- Confirm ordinary manual placement, import/export and source/license records too.

## Hierarchy-aware world composition

New Painterly World assets explicitly declare tiers. Hierarchy scatter uses rare nonrepeating hero sources, primary interiors/ridges, support transitions and smaller detail. Higher density mainly adds support/detail. Forest mask distance selects sparse trees at the edge, medium/edge clusters nearby and dense clusters inside. Metadata does not alter stamps already placed on a map.

Bounded consumer scale ranges multiply resolved defaultSize: Hero .96–1.06, Primary .90–1.12, Support .82–1.08, Detail .75–1.05. Author ranges must overlap these bounds or the consumer skips with a note. Choose genuinely small defaultSize for detail art; do not pretend that shrinking a hero silhouette makes it detail. Rotation-disabled art stays upright. A ridgeAxis helps select the best authored direction; permitted rotation is intersected with ±8 degrees, with heroes fixed upright. Provide several ridge silhouettes/directions instead of permitting 180-degree rotations that invert lighting.

Use consistent northwest light, or mark neutral art. `other` explicitly flags unsuitable light for this painterly composition. This does not automatically analyze pixels. Review transparent cutouts on light and dark backgrounds. Hero art should be distinctive; primary should tile visually; support should bridge; detail should use modest source resolution. The new shipped detail sources are at most 256 px on the longest side.

Existing installations must deliberately import the updated package with **Overwrite** to update metadata while retaining image IDs. **Keep** preserves old metadata. Old packages remain valid. [ADR-0043](../adr/0043-world-asset-hierarchy.md) describes engine versions, rarity and bounds.

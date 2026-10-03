# Terrain surfaces and Terrain Brush

**Current capability (updated after the Premium Terrain sprint):** Terrain Brush offers classic procedural `grain`, `sand`, and `waves` styles plus 32 immutable bundled painterly materials. See [Painterly Terrain](../premium-terrain.md) for the registry and presets. These are application resources, not importable custom brush images. There is still no `terrainTexture` asset role or package install hook. The optional fill-pattern ZIP imports ordinary Area copies only. Existing Painterly World/Engraved packs contain terrain **stamps**, not brush textures.

**REQUIRED for a distributable terrain surface image today:** use the ordinary `fillPattern` contract and apply it to an Area. The [minimal-terrain-texture-pack](templates/minimal-terrain-texture-pack/README.md) demonstrates exactly this. It will not appear in Terrain Brush's Style selector and cannot be painted with that tool's softness/strength controls. Importable brush textures remain an unmet product capability, not something metadata can enable.

**OPTIONAL supported metadata:** title, description, category path, tags, applicability, source/author/license, checksum, favorite and collections. Descriptive tags such as `forest-floor` aid search; they do not register styles or prescribe brush behavior. Do not add generator metadata to a fill pattern.

## Current built-in registry

These are product-defined IDs, not package-defined enums:

| ID | Display material | Procedural texture |
| --- | --- | --- |
| land | Generic land | grain |
| grassland | Grassland | grain |
| forest | Forest floor | grain |
| desert | Desert | sand |
| tundra | Tundra | grain |
| snow | Snow | grain |
| swamp | Swamp | waves |
| rocky | Rocky upland | sand |
| volcanic | Volcanic | sand |
| ocean | Ocean | waves |
| shallow | Shallow water | waves |

Terrain Brush operates on World/Regional maps. Size is 8–512 map px; softness and strength are 0–100%; texture scale is 0.01–100. Paint/Erase/Blend manipulate map paint coverage, not asset alpha. Texture scale is anchored to map coordinates, and new settings affect subsequent strokes. A material is a style+scale pair. Current map budgets: 32 used materials, 4,096 tiles, 2 MiB encoded paint within the document's 3 MiB budget; mask resolution two map pixels. These are **REQUIRED map constraints**, not extra ZIP fields. See [Terrain Brush controls](../terrain-paint.md).

Semantic Area terrain appearance, ocean appearance, world themes and geography-finish presets are also map settings. They do not add package-root fields or transform a fill pattern into a brush.

## Production surface guidance — RECOMMENDED

Design for broad world/regional material identity: grassland, rocky upland, foothill, alpine/snow, forest floor, swamp/marsh, dry/arid, shore/coast, volcanic and neutral blend are useful **authoring families**. `foothill`, `shore` and `neutral blend` are not additional brush style IDs. Use category/tag labels freely without implying runtime behavior.

Use low/medium-frequency painterly variation and controlled contrast. Avoid single large rocks/trees that repeat conspicuously; those belong in stamps. Avoid baked coastlines, grids, labels and strong directional highlights. Test material recognition at fit-to-map zoom, then tile at 0.5, 1 and 2. There is no required brush-texture pixel resolution or alpha threshold because imported brush textures are unsupported. For Area fills, opaque tiles give continuous coverage; transparent overlays deliberately reveal the surface beneath. Use smooth, neutral-matte alpha boundaries if present.

## Terrain quality checklist — RECOMMENDED

- Repeat in both directions without seams, visible squares or regular highlights.
- Show clear material identity at the intended geographic scale.
- Keep contrast subordinate to rivers, labels and settlements.
- Inspect fractional scales 0.5/1/2 and both bright/dark underlying colors.
- Match the neighboring terrain palette; test alpha overlays as ordinary Area fills.
- Complete applicability, categories, source and license metadata.
- For built-in brush use, test softness/strength and Blend in the map itself. Do not claim those tests validate a custom imported texture: custom Area fills do not participate in that paint-mask blending.

A future image-backed brush contract would need explicit asset references, preset validation and persistence. None is specified or implemented by this authoring kit.

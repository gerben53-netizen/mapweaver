# Painterly Terrain materials

On a World or Regional map, choose **Terrain Brush → Material**. Choose a named material, or open **Browse materials** and search/filter the eleven families. No library import is required. Material chooses what is painted and derives its procedural fallback automatically; it never resets size, softness, strength or texture scale. Existing strokes and map themes stay unchanged.

**Brush Preset** chooses how to paint: Soft wash, Fine detail or Broad coverage set size, softness, strength and texture scale without changing material or Paint/Erase/Blend mode. Editing a numeric value shows Custom behavior when it no longer matches a preset.

Paint, Erase and Blend retain their existing behavior and one-stroke undo. A palette preview shows the actual repeat-safe material at the selected scale; its full material tone is separate from the stroke strength that blends it over your map. Raw library thumbnails help identify art. Wait for loading before painting; a missing resource reports an error and offers Retry texture. Export waits too, preventing incomplete PNGs.

Procedural materials remain available in the same **Material** dropdown, explicitly marked Procedural. There is no separate Classic style selector. Smaller Texture scale makes source forms smaller/more frequent. Paint several deliberate light passes when more depth is useful. Erase reveals underlying artwork; Blend softens existing coverage between materials. Soft Atlas Earth is a material, not the Blend operation.

| Family | Count | Materials |
| --- | --- | --- |
| Grassland | 2 | Lush Atlas Grassland; Dry Grassland Breakup |
| Rocky upland | 3 | Light Limestone Scree; Dark Slate Upland; Gravel Path Ground |
| Foothills | 1 | Foothill Scree |
| Alpine & snow | 1 | Patchy Alpine Snow |
| Forest floor | 4 | Temperate Forest Floor; Mossy Woodland Floor; Leaf-Litter Forest Floor; Rooty Woodland Floor |
| Swamp & marsh | 2 | Mottled Wet Marsh; Dark Peat Bog |
| Arid & dry | 6 | Dusty Broken Earth; Soft Sand Desert; Wind-Swept Dunes; Stony Desert; Cracked Dry Basin; Salt-Worn Flats |
| Coast & shore | 1 | Coastal Silt and Shallows |
| Volcanic | 1 | Weathered Volcanic Ash |
| Neutral blends | 2 | Soft Atlas Earth; Soft Clay Earth |
| Underground & cavern | 9 | Damp Cavern Floor; Mossy Cave Ground; Wet Stone Floor; Moist Cavern Earth; Broken Cave Floor; Rubble-Strewn Cavern; Jagged Stone Ground; Uneven Rocky Underground; Cavern Lichen Ground |

Use Foothill Scree under and around mountain bases, forest floor under canopy cores and sparse margins, Mottled Wet Marsh in low wet ground, and Coastal Silt and Shallows sparingly near coasts. Broad paint can cover coastline color/ink beneath it; smaller softer strokes retain the coast definition. Land/Water-edited maps keep their existing land clipping. Painting never changes generator biome classification.

The primary art direction is Painterly Fantasy: olive/ochre earth, subdued mineral highlights, cool slate and restrained wet colors. Parchment/Dark/Minimal themes do not automatically recolor these fixed images. Choose them manually only where the palette fits. The layer's overall opacity remains available in Layers.

Sources are 512×512 sRGB opaque PNGs, technically reduced from the larger generation originals. Shared overlap blending produces a 384px repeat-safe period without square borders or mirrored terrain shapes. Fine detail is intended as ground material beneath symbols, not battlemap-scale stones. The mask remains two map pixels, with 1×/2× export using the same logical coverage.

The application ships all brush resources locally. Optional [Area fill-pattern ZIP](../public/terrain-textures-painterly/mapweaver-terrain-painterly-fills.zip) installs separate ordinary library items under `Painterly Terrain / <family>` and matching collections. It does **not** install new brush IDs or custom brush presets. [Catalog](../public/terrain-textures-painterly/terrain-library.json), [exact generation prompts and hashes](../public/terrain-textures-painterly/provenance.json), [usage notice](../public/terrain-textures-painterly/LICENSE.txt).

Old painted maps retain their original appearance. New premium strokes store version-2 paint and require this or a later compatible Mapweaver version. See [ADR 0037](adr/0037-premium-terrain-materials.md).

The Additional Terrain extension adds 18 materials, including Desert and Underground & cavern. Use Soft Sand Desert for broad washes, Wind-Swept Dunes for localized dune fields, and Stony Desert for transitions. Cave materials use low-contrast earth/mineral palettes: combine Damp Cavern Floor with moss/mud, or Broken Cave Floor with smaller rubble/jagged passes. Generic brush presets remain unchanged. These are World/Regional terrain materials; the optional Area fill copies also serve other workflows. [Showcase and validation](sprints/additional-terrain-textures.md).

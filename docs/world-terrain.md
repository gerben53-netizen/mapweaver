# Textured world terrain

When creating a world map, **Generate world map → Textured terrain and soft coasts** previews the optional terrain appearance. Leave it checked to create textured land, softened biome edges, derived shorelines and calm ocean water. Uncheck it for the original plain output. Both create ordinary editable Areas and river Paths.

Select an Area and open **Properties → Terrain appearance**. Choose a terrain style, texture scale and opacity, feather width and edge blend strength, then **Apply terrain appearance**. Widths are map pixels, independent of zoom. Smaller texture scale repeats more often. Landmass Areas also expose the five coast presets and coast size. **Use original fill and stroke** restores the retained original appearance. Each Apply or disable is one undo step.

Imported Fill Patterns remain available through the ordinary Area fill controls and retain their frame, scale, rotation and offsets. They draw over the built-in terrain background; inward feathering applies to the combined fill. Terrain styling does not resize, simplify or move the Area.

For Regional and World maps, **Map → Water appearance** offers Calm Fantasy Ocean, Deep Ocean, Parchment Sea, Minimal Blue and Dark Sea. Texture scale, texture opacity and edge darkening are configurable. **Apply water appearance** changes the base water beneath artwork; **Use plain map color** disables it. Map resizing extends water to the new bounds. Existing river and lake colors are not silently recolored by this map-only action; use their ordinary Properties to match a different palette. Newly generated styled maps start with a coordinated calm-water palette.

PNG uses the same terrain and water painters at 1× and 2×. Transparent export omits base water, while keeping object-level coastlines and Area artwork. Selection handles never enter the PNG.

Built-in textures are subtle procedural grain, sand and waves. Feathering blends toward underlying artwork without leaking beyond the Area or into its holes. Wide feathers can reveal light bands where adjacent biomes share a boundary; reduce width or strength there. Fine texture detail is bounded for large Areas and can look softer at extreme zoom. Mountain/forest stamp packs, automatic scatter and the other cartography-program features remain separate deliveries.

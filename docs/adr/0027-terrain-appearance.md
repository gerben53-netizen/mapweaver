# ADR 0027 — Optional terrain appearance

Accepted for the first cartography-polish delivery, 25 September 2026.

## Model and compatibility

Format 12 gains optional `Area.land.appearance` and `map.water`, each with an explicit appearance `version: 1`. This follows the optional extension policy used by ADR 0018 and ADR 0025; the current reader preserves old documents without adding styling. Older application binaries are not supported readers of styled documents. Unknown versions, preset IDs, fields and out-of-range/nonfinite parameters are rejected at the shared project/service admission boundary. No SQLite migration or external resource is needed.

Terrain appearance stores a registry style ID, fractional pattern scale (.01–100), texture opacity (0–1), inward feather width (0–100 map pixels), blend strength (0–1), coastline preset and coastline scale (.1–10). Water stores style ID, fractional pattern scale, texture opacity and restrained vignette amount (0–.7). Defaults are copied into objects, never recomputed when the map or viewport is resized. Initial terrain pattern/coast scale and feather width reflect map resolution. Changing physical kilometres alone never changes artwork.

Styles live in `src/domain/terrainStyles.ts`. Eleven terrain definitions and five coast/water presets are versioned built-ins. Their small deterministic grain, sand and wave tiles use the ordinary CanvasPattern mechanism; they introduce no alternative asset type, importer, URL or image dependency. Imported Fill Patterns remain normal Area fills, keep their stable pattern frame, transform, rotation and fractional scale, and draw above the built-in ground. Disabling appearance restores the retained original fill and stroke.

## Rendering

`paintArea` and `paintWater` are shared by the interactive canvas, world preview and PNG exporter. Water is the map-bound base color pass, before background artwork and ordinary layer content; transparent export omits it. World layers remain Rivers, Lakes, Forests, Mountains, Biomes and Land, top to bottom. Layer visibility and order remain authoritative.

Area painting draws the derived coast halo and shore bands, then ground color, procedural texture and optional imported Fill Pattern. A bounded scratch surface attenuates fill alpha along the original outer and hole boundaries using 24 inward bands. The coastline line (or ordinary terrain Area stroke) is last. No canonical polygon, hole, hit target, point handle, layer or pattern frame is altered. Coastline roughness continues to use the existing render-only derived contour. `None` disables the styled landmass coastline; disabling the whole appearance restores the original stroke.

The renderer caches immutable Area object/image pairs in an LRU bounded to 16 million pixels (approximately 64 MB). An individual surface is at most roughly two million pixels, at most 2048 pixels per axis and at most 2× native resolution. Large/zoomed terrain textures can consequently be softer than native vector edges; linework remains native. Scratch canvases are derived render caches, never document assets or flattened map output.

Inward feathering deliberately prevents biome paint leaking across a coast or hole. It blends toward underlying artwork, not through a full adjacent-biome mixing solver; broad feathers can expose a light underlying band. Defaults are narrow and users control width/strength. Built-ins are restrained procedural textures, not hand-painted material packs.

## Generator and controls

`world-v1` geography generation and provenance remain unchanged. An optional, deterministic `styleWorld` post-step adds version-1 appearance to its known generated biome output and matches the initial calm river/lake palette. Wizard preview and Create use the same decorated result. Unchecking textured terrain produces the original output. Ordinary Area Properties and Map settings expose subsequent edits, disable actions and normal undo/redo. Changing map water alone does not silently recolor manually edited rivers or lake Areas.

This delivery does not implement semantic asset packs, ridge/forest scatter, general effects, borders, themes or labels. Those remain separate program milestones.

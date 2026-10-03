# Choose tools by intent

| I want to… | Tool | What changes |
| --- | --- | --- |
| Change a coast, add an island/peninsula, cut a lake | Land / Water | Physical land geometry |
| Define a swamp or forest region | Terrain Region → Biome | Semantic Area classification and an initial matching visual preset |
| Make terrain look darker or mossier | Terrain Brush → Material | Independent visual paint only |
| Draw a named danger/encounter/political zone | Area | Generic geometry, name, fill and outline; no automatic biome |
| Draw a line, river, road or border | Path → Path type | Existing editable Path model and type-specific appearance |

Trail is a **Road class**, not another tool. There is no travel-time calculator or routefinding tool. Route objects retain physical length/width, direction, endpoint snapping, continuation, splitting and type-specific styling. River, Road and Border Properties remain conditional. Existing Landmass objects still support point editing, contours, appearance and role conversion; new physical geography starts with Land / Water.

Terrain Region uses the supported semantic vocabulary: Forest, Mountains, Desert, Swamp, Snow and Custom terrain. Other visual styles (such as tundra or volcanic) remain appearance presets; they do not silently invent biome classifications. A new region copies its initial visual preset. Later biome changes in Properties preserve its artwork. Generic Areas may explicitly use visual terrain appearance without becoming semantic biomes.

Material is the only terrain paint imagery selector, including the unchanged procedural materials. Browse materials selects that same value. Family and Painterly Fantasy are descriptive metadata. Brush Preset controls only size, softness, strength and texture scale. Individual numbers stay editable; unmatched settings show Custom behavior. Paint/Erase/Blend remain separate operations. Material choice and Brush Preset affect future strokes only.

## Toolbar

- Selection: Select.
- Assets: Place asset, Scatter, Pattern fill (retained useful asset workflow).
- Geography, on World/Regional: Land / Water, Terrain Region, Terrain Brush, Water Depth, Measure.
- Drawing: Path, Area. Geographic Path types are offered on World/Regional; Generic remains available everywhere.
- Structures, on battlemaps: Wall, Opening.
- Cartography: Place marker, Map Elements.

Group labels, tooltips and active tool text expose intent to assistive technology and keyboard users. Path stays visibly active for its semantic types. Terrain Region and Area have distinct active identity even though they share a geometry engine. Existing objects keep their editors if the map type changes.

Keyboard help retains V Select, F Fit, Shift+F Fit selection, Escape cancel, Enter finish and the existing object/history shortcuts. No Route or Landmass shortcut existed; no hidden duplicate shortcut was added. Normal text entry stays untouched.

No format, asset, SQLite or service migration is needed. Serialized objects, geometry, identifiers, provenance, layers and renderers are unchanged. See [ADR 0039](adr/0039-tool-intent.md) and the [sprint validation](sprints/tool-consolidation.md).

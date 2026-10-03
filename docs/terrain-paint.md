# Terrain Brush

The optional [Painterly Terrain library](premium-terrain.md) adds 14 bundled materials. Choose Material or Browse materials to select imagery; Brush Preset separately controls size, softness, strength and texture scale. Procedural materials share the same Material selector. Existing paint stays unchanged.

Open a World or Regional map and choose the **brush icon / Terrain Brush** in the tool rail. The controls appear above the canvas. Click-drag to refine the map; release to complete one undoable stroke. Space-drag or middle-drag pans. Escape, pointer cancellation or window focus loss cancels the unfinished stroke.

- **Paint** adds the selected existing terrain style: grassland, forest floor, rocky upland, desert, snow, swamp, volcanic and the other built-ins. It changes appearance only. The generator still sees the original semantic biomes.
- **Erase** reduces visual paint coverage, revealing the underlying semantic terrain. It does not remove Areas, stamps or paths. This layer combines material weights rather than retaining a separate layer for every brushstroke, so erasing does not reconstruct old strokes underneath.
- **Blend** locally averages neighboring paint masks, softening their transitions and alpha boundaries. It does not smooth or merge semantic geometry. Repeat strokes for a stronger blend.

**Size** is the circular diameter in logical map pixels, from 8 to 512, with numeric input and slider. **Softness** runs from 0% (hard) to 100% (smooth falloff from the center). The outer cursor shows the diameter; the dashed inner circle shows the hard core. Erase is pink, Blend blue, Paint cream. The cursor is editor-only.

**Strength** is the maximum contribution of one stroke. Moving slowly or holding still does not build up extra opacity. Releasing and painting again accumulates: 40% over empty paint becomes approximately 64% after the second stroke. Strength also serves as flow in this version; there is no timed airbrush buildup.

**Texture scale** accepts fractional numbers, including `0.25`, `0.5`, `0.75` and `1.0`. Smaller values make the existing procedural texture denser. It does not change the brush diameter. Each style/scale combination remains fixed in the paint already on the map; changing the control affects subsequent strokes. Textures are anchored to map coordinates, independent of zoom and PNG export resolution.

After the first stroke, **Layers → Terrain paint** has visibility, lock and overall opacity controls. It is one logical map-bound layer. Semantic land/terrain Areas render beneath it; stamps, ordinary artwork, paths and annotations render above it, with the existing effects pipeline. Order within each category remains stable. This pass order applies once the paint layer exists, even if hidden. The layer is independent of object-layer solo, locks and selection. Hide paint to compare with the base map.

Paint is included in autosave, Save, reopening, project ZIPs, recovery and service backups. Existing maps without paint retain their previous rendering order. Themes and semantic Area edits leave paint intact. The current world generator creates a **new map** rather than regenerating an existing one, so it never deletes paint from the source map. Shrinking the map clips the displayed paint but retains out-of-bounds tiles for later enlargement.

## Bounds and follow-up work

The v1 mask resolution is two map pixels. Export at 2× doubles output resolution while retaining that logical coverage and texture detail. It does not manufacture finer brush detail. Classic styles use the existing procedural terrain registry. Premium versioned materials use bundled local images; arbitrary imported brush images remain unsupported.

One map supports 32 used style/scale combinations, 4096 tiles and 2 MiB of encoded paint, within the existing 3 MiB editable-document budget. A single stroke can touch 256 tiles; exceeding a limit reports an error and preserves the previously committed map. Reuse scales, erase unused paint or use shorter strokes when a limit is reached. Large brush/many-material blending is more expensive than ordinary painting.

The renderer caches up to 1024 logical tiles (64 MiB RGBA). First rendering of a heavily painted map can briefly pause while the cache is built. Subsequent frames reuse untouched tiles. See the [measured sprint report](sprints/terrain-paint-report.md).

Independent timed flow, edge noise/jitter, eyedropper, multiple paint layers, finer mask resolution and a worker-based cold-cache builder remain follow-ups. The storage decision and validation rules are in [ADR-0033](adr/0033-terrain-paint.md).

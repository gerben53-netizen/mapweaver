# Water Depth

On a **World** or **Regional** map, select the droplet **Water Depth** tool and enable **Use automatic depth**. Existing maps retain their current water until you enable it. The surface becomes lighter near coasts, islands and lake shores, with darker water farther away.

Use **Depth mode**:

- **Paint Shallow** adds shelves, shoals, harbor shallows and lighter water.
- **Paint Deep** adds channels and deeper basins, including within the automatic shelf.
- **Erase / Reset to automatic** removes manual depth locally. Full strength and a hard brush clear a covered area completely; softer/lighter strokes progressively return it to automatic.
- **Blend / Soften** smooths the final automatic and painted depth field in refined bathymetry (legacy maps retain weight-only smoothing). It does not edit coastline or terrain.

Brush size, softness and strength control the next stroke. The two cursor rings show its outer footprint and solid core; live painting shows the water-only result. Cross a coast freely: land is excluded. Each finished drag is one undo; Esc or focus loss cancels unfinished painting. Space+drag and middle-drag still pan. Undo/redo restores complete paint snapshots.

**Reset painted depth** clears all manual depth in one undoable action. Disabling **Use automatic depth** restores the legacy water view while keeping your paint for later use. These operations never change land or river geometry.

Expand **Water appearance** to adjust shallow, medium and deep colors, coastal shelf width in map pixels, blend softness, texture visibility and river-mouth blending. Changes appear immediately. New styles use muted bathymetric colors, varied coastal shelves and smaller shelves around small islands. **Thin shoreline edge** is optional and independent of water depth. **Apply current water style** upgrades legacy water to refined bathymetry and resets these settings to the current water-style palette while retaining paint. Explicit world-theme application uses theme-owned settings and preserves manual paint. Painterly Fantasy and the default deep ocean have different blue ramps; parchment, dark and minimal styles have their own ramps too.

A river's downstream endpoint must reach nearby water to acquire an automatic shallow mouth. Small lake inflows and wider sea inflows get different sizes. The water-side line/bank fades into the receiving water, with no added triangle or delta object. Correct reversed paths using existing route controls. An inland endpoint is not silently extended into the sea.

Coasts come from visible semantic **Landmass** Areas. Holes represent inland water; terrain-region Areas with **Ocean** or **Shallow water** appearance also define water within land. Arbitrary blue stamps, broad river strokes and imported background pixels are not classified as water geometry. Hide/solo layers intentionally changes the visible geography used for depth. Depth painting has its own map-bound data, separate from Terrain paint and library assets.

All settings and strokes save inside the project. Opening old maps does not repaint them. The same renderer supplies editor and 1×/2× PNG; the brush cursor and controls are excluded. Automatic depth is a stylized visual estimate, not a physical depth measurement. Its raster is capped at 768 pixels on the longest edge; on very large maps, use sufficiently broad strokes for readable results.

[Benchmark, validation and known limitations](sprints/water-depth.md) · [Storage and rendering decision](adr/0038-water-depth.md).

Automatic mouth influence is limited to the first 256 eligible visible river mouths. Extremely wide rivers use a bounded fade patch to keep memory predictable.

Refined soft strokes have gentle world-space edge variation inside the circular cursor. Their strength accumulates across strokes; all modes change scalar depth before color conversion. Existing maps are not silently restyled. [Refinement evidence](sprints/bathymetry-refinement.md) · [ADR-0041](adr/0041-bathymetry-refinement.md).

## Coastal contours

Open **Water Depth → Coastal contours**. Enable this independently of automatic depth. Choose **Painterly Atlas**, **Engraved**, **Minimal**, or **Dark Fantasy**, then 0–3 lines, Close/Medium/Wide spacing, opacity and variation. Advanced settings expose map-pixel spacing and line width, opacity falloff, color and lake inclusion. Off/disable retains settings; edits are undoable. Applying a preset explicitly resets contour settings.

Contour lines follow water-side distance from visible semantic land. Small islands get fewer lines; tiny islands may get none. Nearby shores share a field, and narrow passages may interrupt contours. Downstream river mouths leave an open gap. This does not edit land, river geometry or painted depth. Zoom and export preserve map-space spacing. Presets scale to map size when applied; custom numeric spacing remains fixed until changed.

Missing contour settings leave existing maps unchanged. Explicit world-theme application can add/update theme-owned contour fields. [Architecture](adr/0042-coastal-contours.md) · [Validation and visual evidence](sprints/coastal-contours.md).

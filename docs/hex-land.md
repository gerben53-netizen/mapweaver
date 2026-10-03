# Hexagonal land and water

On a World or Regional map, choose **Land / Water → Shape → Hexagon**. Click once to add one hex island, or select Remove Land to cut a hex lake or bay. Dragging unions successive fixed-orientation footprints into a stroke; it does not create separate board cells.

- **Flat top** (default) places opposite corners left/right, with horizontal top/bottom edges.
- **Pointy top** adds 30° and places opposite corners top/bottom.
- **Rotation** adds 0–360° relative to that orientation. With a hex grid active, **Snap to hex grid** aligns centers and locks orientation/rotation to the grid. **Match one hex cell** also derives the diameter from the grid. Alt temporarily bypasses center snapping and retains the existing Add/Remove inversion. These brush options are independent of the general placement Snap toggle.
- **Size** is the circumscribed diameter: distance between opposite corners, converted from logical map pixels to the existing km/mi display. It is independent of editor zoom. A flat-top unrotated hex has width D and height √3/2 D; pointy-top swaps these dimensions.

**Exact** has six straight edges and six corners. Roughness, smoothing and softness are hidden because they cannot change an exact Add/Remove footprint. **Soft Coast** and **Rough Coast** keep the same six corner anchors and add bounded inward edge detail. Roughness increases that detail, softness attenuates its amplitude/high frequencies, and smoothing attenuates high frequencies. Neither softness nor smoothing shrinks the canonical corner-to-corner size. The maximum inward variation is bounded by 3.5% of radius for Soft and 11% for Rough, before the selected roughness/softness factors.

Smooth Coast and Roughen Coast actions retain their existing circular falloff on existing land. For those actions the hex orientation/edge controls are hidden and a note explains the distinction. Choose Add Land or Remove Land to create hex footprints.

The result is an ordinary editable Landmass Area. Existing coast styles, water-depth bands and terrain clipping render it in the editor and export. Exact refers to canonical geometry; decorative coast styling may still render around its straight edges. Intersecting existing land merges it normally; map boundaries clip it normally. One stroke is one undo entry, including land-edit metadata and derived water/clipping effects.

Only the resulting geometry is saved. Like other Land / Water settings, orientation, rotation and edge choice are transient session settings, not extra project metadata. The optional grid type and existing grid settings persist in project format 12; old files without a type keep their square behavior. SQLite needs no migration. No special asset or external service is required.

Exact + Match one hex cell uses the same vertices as the visible grid. Adjacent cells merge into native Landmass geometry; removing a cell subtracts that footprint. Soft/Rough still vary inward from the shared corner anchors. No per-cell terrain records are created. A future Paint hex cells workflow should reuse the shared axial utilities; see [ADR-0040](adr/0040-hex-grid.md).

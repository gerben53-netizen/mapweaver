# ADR 0034 — Brush editing of canonical semantic land

Accepted 26 September 2026.

Landmass Areas remain the authoritative semantic land/water boundary. The brush creates a temporary vector coverage mask and uses the existing polygon-clipping dependency to extract union/difference contours, including islands and holes. No second persisted raster land mask is introduced. Validated results are ordinary editable Areas and reuse coastline and water painters.

Add joins intersected editable landmasses into the first affected Area, retaining its ID/style/layer. Separate islands create new Areas. Remove, Smooth and Roughen affect only touched visible editable land. Touching protected land refuses the stroke. Hidden geography remains untouched. Linked labels retain their world positions; references to removed owners are detached. Group memberships are cleaned. No terrain, paint, stamp or path source data is deleted.

Optional format-12 `map.landEditing = {version:1, manual:true, revision}` records manual geography overrides and opts the map into non-destructive clipping of terrain regions and visual paint to visible semantic land. The same clip path is used by editor and PNG. Old maps without this field render unchanged. New land uses a solid semantic land style and existing theme/coast presets. Existing geometry edits keep their appearance. Generator provenance remains historical; future replacement must warn about manual overrides. The current generator creates separate maps.

One shared polar brush framework provides Round, Organic, Jagged, Island, Peninsula and Coastline Detail. Noise is deterministic and map-space based; spatial stroke interpolation is independent of pointer event rate. Softness changes the threshold contour of temporary coverage, never persists semi-land. Smoothing/simplification and small-fragment cleanup operate only on affected contours, with native topology/point budgets remaining authoritative. Invalid or over-budget results leave the previous document intact.

A disposable worker batches contour previews and final computation, with bounded points and a timeout. Preview state is transient; release commits one history transaction. Caches/derived clipping contain no persistent competing geography. No SQLite schema or dependency change is needed.

Edited maps render visible landmasses as the base before terrain, regardless of their prior interleaving, using the same ordering in editor and export. Relative order within land and within remaining objects stays intact. This prevents a newly added island from obscuring restored terrain. Layer visibility/protection still applies. This opt-in behavior does not change unedited maps.

Limits: 2,048 input samples, 256 interpolated footprints and a five-second worker deadline. RDP tolerance is 0.15–2 map pixels times the selected smoothing multiplier; it applies to all contours of touched Areas, so distant vertices of the same Area may be simplified slightly. Fragments/holes below max(1, min(25, (diameter × .012)²)) square map pixels are removed. Native Area and total land budgets remain unchanged. Smooth Coast rejects total land-area changes above 3%. Smooth/Roughen use a circular falloff along the stroke within touched Areas; the six shape silhouettes apply directly to Add/Remove coverage. These are deliberate bounded v1 choices, not an unbounded raster terrain engine.


## Hexagon extension — 26 September 2026

Hexagon extends the existing footprint dispatch with six exact corner anchors, flat/pointy orientation and explicit map-space rotation. Size is opposite-corner diameter, independent of stroke heading and zoom. Exact Add/Remove skips approximate contour simplification; over-budget native geometry is rejected rather than silently rounded. Natural hex edges use bounded inward samples anchored at the six corners; their tighter contour tolerance retains subtle detail. Existing non-hex footprints and simplification remain unchanged.

The hex configuration is transient brush state only. Coverage still uses the same worker/boolean engine, transaction, canonical Area, landEditing metadata and shared render/export. There is no saved hex object kind and no format migration. Square grids are the only existing map grid, so hex snapping and single-cell matching are deferred until a central hex-grid model exists. See the [hex land guide](../hex-land.md).

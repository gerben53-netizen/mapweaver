# River styling

Select a River Path and open **Properties → River style**. Choose Minimal River, Fantasy River, Parchment River, Bright Water or Dark Water. Presets copy concrete values into that object; later edits do not change other rivers.

- **Uniform** uses the same width throughout.
- **Taper downstream** derives the upstream width as one quarter of the end width.
- **Manual** lets you edit both endpoint widths.

Direction is the first node (source) toward the last node (mouth). Width varies by distance along the curve. Width units reuse Map pixels/Kilometres/Miles; zoom and PNG resolution do not change logical dimensions. The physical-unit reference remains fixed until you explicitly choose a width unit again.

**Smoothing** Off/Low/Medium/High derives bounded curves without moving control points. Explicit Bézier handles override automatic smoothing locally. Inserting or splitting a smoothed segment creates explicit handles to preserve its current shape; resetting those handles allows automatic smoothing there again. Extreme reversals are deliberately less smooth to avoid loops.

Main color, opacity, outline and halo update live. Halo offers color, width, opacity and softness; it is a finite, subtle layered edge rather than a general blur filter. Caps and joins are rounded. **Texture surface** retains the existing fill-pattern option. Choosing a main color replaces a texture with solid water.

For numeric fields, Enter or leaving the field keeps one undoable edit; Escape restores the previous state. Invalid input never enters the saved model. Finish node editing before changing appearance. Existing Edit path controls support dragging nodes/handles, adding or removing nodes and moving the whole path. Reversal keeps the visible width profile but switches a downstream style to Manual so it does not silently flip the artwork.

New generated worlds with styling enabled receive Fantasy River. Existing saved rivers and generic paths do not change automatically. With styling disabled, the original world-v1 terrain and river output remains available. Generated river taper is local to each Path: the current document has no stream-order hierarchy for automatic widening after confluences.

PNG export shares the same geometry and layered painter at 1× and 2×. Halo is included in bounds, while selection chrome is excluded. The editor keeps a minimum screen-sized hit target even at a thin source.

See [ADR 0030](adr/0030-river-appearance.md) and the [Sprint D validation report](sprints/river-styling-report.md). Full map effects/borders and automatic labels are separate later work.

# ADR 0033 — Independent terrain paint masks

Accepted 26 September 2026.

Format 12 gains optional `map.terrainPaint`, version 1. It is one map-bound visual layer, independent of Area geometry, generation and theme ownership. Existing maps without it keep their rendering order. A painted map renders semantic land Areas, paint, other artwork (stamps before paths before annotations), with the existing fog/effect passes. Paint visibility and locking are independent of the object-layer tree and solo mode.

Sparse 128-map-pixel tiles hold 64 × 64 eight-bit material weights. Materials reference the existing terrain style ID and a fractional texture scale. Each sample's total weight is at most 255. Paint replaces weights locally; erase reduces all weights to reveal the semantic base; blend averages neighboring paint weights. This is editable visual coverage, not semantic classification and not a retained stack of every historical stroke.

Masks use bounded raw or run-length base64 encoding. Limits: 32 material combinations, 4096 tiles, 2 MiB encoded paint, 8192 mask records, at most 256 touched tiles per stroke, plus the existing document budget. Admission validates keys, codecs, dimensions, weights and budgets. No external files or assets are needed. Existing SQLite, recovery, project ZIP and backup paths carry the optional field. Resize clips without deleting tiles; semantic edits and theme changes preserve paint. The current generator creates new maps; it never overwrites the painted source map. Any future in-place regeneration must retain this independent field.

During a stroke only touched tiles are decoded and modified. Coverage uses the maximum dab contribution per sample against the pre-stroke state: slowing or holding the pointer does not increase opacity. Spatial interpolation makes fast drags continuous. One release commits one immutable layer; untouched tile references are shared by history. There is no document serialization or project mutation per pointer sample. Texture rendering is globally map-anchored, cached and shared by editor and PNG. Two-times export samples the same logical paint surface at double output resolution.

The initial mask resolution is two map pixels; this is a texture-refinement tool, not a subpixel illustration editor. Strength includes flow; independent timed flow, edge noise and eyedropper are deferred. The renderer does not duplicate Area presets or effect logic.

# ADR 0030 — Non-destructive river appearance

Accepted for Sprint D, 25 September 2026.

River remains a native Path with `pathKind: river` and existing RouteSettings. Canonical widths, bank color/width, main stroke, opacity and selected px/km/mi reference remain in their existing fields. An optional `route.appearance` version 1 adds widthMode, smoothing, outlineEnabled and bounded halo {enabled, color, width, opacity, softness}. The existing route.preset identifies the copied central preset. No duplicate geometry, separate outline objects, database table or external resource is introduced.

Absent appearance retains the complete existing route behavior and pixels: start/end factors, bank, authored curves, no halo and no automatic smoothing. Generic, road, border and wall paths are unchanged. New fields are admitted by the central route validator and persist in the current project format. Old documents still load without materializing new fields. Older binaries may reject new appearance fields; this is not a forward-compatibility promise. This sprint's explicit compatibility requirement takes priority over the general permission to discard old data.

## Geometry and width

Width is interpolated by cumulative arc distance through the existing Bezier integration and ribbon sampler. Uniform uses the effective end width everywhere. Downstream is a UI policy setting start width to one quarter of the chosen end width (minimum 0.1 px). Manual exposes both widths. Coordinates, dimensions and halo widths are logical map pixels; editor zoom, DPR and export scale never become geometry inputs. Existing frozen physical-unit conversions are reused.

Automatic smoothing creates temporary Catmull-like tangents from neighbouring nodes. Handle magnitude is at most 24% of the shorter adjacent chord; projection stays within the end thirds and perpendicular control offset within 15% of the current chord. Low/Medium/High multiply strength by .35/.65/1. Sharp reversals, repeated nodes and authored handles are respected; the derived spline does not move stored nodes. Geometry caches include smoothing mode, so changing only color can reuse geometry. Samples, bounds, snapping, hit testing and insertion all use the same derived curve.

Explicit insertion or splitting materializes derived handles to preserve the displayed spline exactly as the geometry changes. This is an explicit edit and is undoable; it is not a style-time rewrite. Manual handles then override automatic smoothing locally. Reversal swaps effective endpoint widths and keeps the visible profile; a directional styled taper becomes Manual when reversed or split. Existing legacy reversal/split behavior is retained.

## Rendering

Shared paintRoute draws halo, outline, then main water. Halo uses at most five nested translucent ribbon fills with a softness-controlled width distribution. It has finite support, no hardware blur, no full-canvas filter and no independent object. Zero softness is one crisp pass. Outline reuses the existing bank ribbon, with a separate enable flag that retains its width/color. Organic river caps and joins remain round. Non-river cap/join choices are unchanged.

Existing visible-device-bounds scratch compositing applies object opacity once over all artwork. Halo is included in conservative bounds so clipping, selection boxes and export agree. Hit rendering omits halo and retains the separate minimum ten-screen-pixel centerline stroke. Editor, previews and PNG call the same painter; selection/node overlays remain editor-only.

## UI and generation

A stable-ID RiverProperties panel handles live appearance gestures independently from the existing keyed node/name panel. Numeric changes preview inside one existing history transaction; blur/Enter commits, Escape or invalid completion cancels. Selection change/unmount cancels an unfinished style gesture. Styles are disabled during a node-edit transaction. Texture source choice and scale remain available. Non-river objects do not receive this panel.

The central registry contains Minimal River, Fantasy River, Parchment River, Bright Water and Dark Water. The optional styled-world pass copies Fantasy River onto newly generated paths; loading saved rivers never applies a preset. Turning off textured/styled terrain retains the original plain world-v1 generation. No flow-order metadata exists in current saved generated rivers, so taper is per path; branch-aware widening is deferred. Tributaries remain independently editable styles, not a new hydrology graph.

Limits: existing 256 nodes and 8,192 samples per path; effective water width at most 1,024 px; halo/outline at most 128 px; opacity/softness 0–1. No map-wide effects, borders, themes, labels or new dependency are added.

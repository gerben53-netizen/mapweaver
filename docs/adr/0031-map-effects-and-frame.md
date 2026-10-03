# ADR 0031 — Optional map atmosphere and map-bound frame

Accepted for Sprint E, 25 September 2026.

## Model and ownership

Format 12 gains optional `map.effects` version 1: fog, vignette and frame with explicit values and stable preset IDs. Stamps alone gain optional `effects` version 1 with shadow and glow. Absence means off; loading never applies new styling. Central validators reject unknown fields/versions/preset IDs, invalid colors, non-finite numbers and values outside documented limits. Archives, local service storage and recovery share this admission path. No database schema or asset data changes.

The map frame is equivalent map-bound decoration, not an ordinary transformable Annotation: it follows map bounds without independent coordinates, layer membership, rotation or an asset ID. Map → Effects & map frame owns its Properties and visibility. It is permanently protected from canvas selection/drag, rather than maintaining a redundant lock flag. Removing its visible appearance uses Show map frame; undo restores it. Capturing an object prefab excludes map effects/frame from the capture document, while retaining stamp effects.

Fog uses the whole map or one existing Area ID as a mask. Polygon geometry and holes remain canonical Area geometry. A hidden/deleted/unresolved mask yields no mist; it never changes to whole-map scope. Undoing deletion restores the reference naturally. The optional dangling historical ID is admitted safely and shown as missing in Properties. Area opacity/fill do not control mask coverage. No second polygon tool or duplicated geometry is added.

## Rendering contract

Without enabled fog, original object/layer order is unchanged. With fog enabled, ordinary artwork retains its relative order, then fog, then all Annotation objects (labels, places, cartographic elements) in their relative order. This explicit overlay boundary protects annotation readability; it is not arbitrary pipeline reordering. Local stamp glow/shadow render directly below their source stamp in its existing layer, and can therefore be covered by later artwork.

The complete order is background/water; below-art grid; ordered artwork with per-stamp effects; fog; elevated annotations when fog is enabled; above-art grid; optional export corner scale bar; vignette; frame; editor chrome. Selection/handles/previews remain outside the exported scene. Vignette and frame may cover annotations at the extreme map edge. Neither effect changes object positions, dimensions or source pixels.

`drawMapEffects.ts` and `drawStampEffects.ts` are shared by React/Konva editor nodes and independent export nodes. All sizes are logical map pixels; zoom/DPR/export ratio are absent from saved settings. Exports at 2× double resolution only. The map bounds intentionally clip everything beyond the final map. Stamp effect cache tiles include conservative padding, preventing accidental object-tile clipping. Canvas nodes keep the original selection/transform geometry; custom paint may extend beyond it, up to the map clip.

Fog is a fixed-seed non-tiling cloud field of 140 radial puffs. It is cached as a transparent overlay with maximum 1,024-pixel long edge, not a rasterization of map content. Four entries bound memory; opacity/mask/viewport changes reuse the field. Scale is a fraction of the short map edge. Density controls cloud coverage strength. Area clipping uses even-odd fill for holes.

Vignette is an elliptical radial gradient derived afresh from normalized radius/softness and current map bounds. No old-size bitmap is saved. Frame presets use vector rules, inward-facing independent corner ornaments and optional edge-center motifs. No stretched corner images or tiled seams exist. Logical thickness/inset stay constant through resize; ornament size is bounded by available space, and very small maps proportionally reduce decoration.

Stamp effects cache only the source alpha silhouette and its local glow/shadow. They never cache the full map or alter the asset. An off-tile source casts its shadow into a padded local canvas; eight ring samples plus native local blur implement optional glow spread/softness. Cached tile ratio is at most 2 logical pixels per map pixel, capped at a 2,048-pixel edge. FIFO eviction caps 16 million tile pixels and 128 entries. Geometry/style/image changes invalidate the relevant tile; position, rotation, mirror, opacity and unrelated UI changes reuse it. Effects follow the stamp's rotation/mirroring; their widths stay in logical map pixels after resizing the stamp.

River halo remains the existing bounded vector-ribbon implementation from ADR 0030. Stamp alpha silhouettes need a different primitive; no duplicate river controls or altered river rendering is introduced. Existing text halos remain in the annotation renderer. Applying these new effects to Areas, Scatter objects or annotations is deliberately not exposed; fog can still cover Areas and stamp effects work on ordinary generator-produced stamps.

## Presets and UI

`mapEffects.ts` owns fog.softMist, fog.denseFog, fog.coldMist, fog.arcaneHaze; vignette.subtleDark, vignette.parchmentEdge, vignette.dramaticDark; border.minimal, border.classic, border.parchment, border.fantasyOrnate, border.elven, border.darkOrnamental; shadow.softTerrain and glow.arcane. Presets copy explicit values; later custom edits retain the source ID. None/off is an enabled flag, not a hidden theme lookup.

Map and stamp panels use local drafts and a single Apply/undo transaction, with native bounded numeric inputs and conditional advanced controls. Pending fields are not persisted or autosaved until Apply. Active history gestures disable these forms; locked objects inherit disabled Properties. No global Effects dialog, automatic asset-specific restyling, one-click theme or automatic label generation is included.

## Limits

One fog field/mask per map; no layered fog objects, animated weather or fog-of-war. Area mask edges are exact geometry rather than feathered boundaries. Fixed-resolution fog/silhouette caches trade very large-image detail for bounded memory; editor/export share the same samples. Borders are internal vector ornaments, with no custom SVG/bitmap frame import or per-side controls. Text and normal map content should be kept inside the chosen inset. Older binaries may reject the optional new fields; current Mapweaver still renders old projects unchanged.


## Stamp Soft Shadow — 28 September 2026

Optional `map.effects.stampSoftShadow: { enabled: boolean, intensity: number }` (0..1) and `stamp.effects.softShadow: 'default' | 'on' | 'off'` extend the existing version-1 effect records in format 12. Missing map settings mean Off with intensity 0.25; missing override means Default. On overrides the enabled switch, Off excludes a stamp, Default follows the map. Intensity remains global, including for forced-On stamps; zero intensity draws nothing. Unknown modes/nonfinite/out-of-range intensity are rejected centrally. No load-time defaults are inserted into old documents. New maps also remain Off until explicitly enabled.

This directionless contact effect is separate from the pre-existing configurable directional shadow/glow. It uses the same bounded alpha-only effect cache, shared editor/export painter, local stamp transforms and ordering immediately below its own image. Eight symmetric ring samples at spread 2 logical pixels, blurred at 6 logical pixels, supply a small spread approximation. Opacity is distributed across the passes to total the chosen intensity rather than multiplying it eightfold. Both sizes use `clamp(sqrt(min(width,height)/100),0.25,4)` so tiny props do not acquire a huge fringe and larger objects get proportionate grounding. There is no net offset or lighting model. Existing effects can intentionally coexist.

The 2× cache resolution (maximum 2048-pixel edge) is shared by 1× and 2× output, preserving world-space effect size. Changes of image, dimensions or effect settings produce a new tile; translation, rotation, mirror and object opacity reuse it. Current cache budget is 512 entries and 16 million pixels. Scaling previews reuse the node transform; the settled object dimensions produce the final tile. No separate layer/canvas node hierarchy per instance is created.

Map → Effects & map frame offers only Off/On and intensity for this feature. Existing stamp Appearance offers Default/On/Off using the existing Apply/history workflow. Asset taxonomy remains unchanged: flat graphics are explicitly excluded with per-stamp Off. Asset names/tags are not heuristically reclassified and no new asset metadata schema is introduced. Scatter-instance renderers, annotations, walls and terrain are outside this placed-stamp feature; ordinary grouped/duplicated/generated stamp objects are supported.

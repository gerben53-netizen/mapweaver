# ADR 0014 — Deterministic scatter recipes and frozen instances

Accepted 24 September 2026 for Sprint 19.

A scatter is one semantic map object. Engine 1 stores a uint32 seed, weighted stamp source IDs with frozen map-pixel dimensions, a bounded ordered paint/erase stroke recipe, an optional copied Area mask, explicit variation/collision settings and the resulting instance records. Instances contain source references and transforms, never image bytes. The existing image cache, library, archive, project/recovery and asset-usage mechanisms carry every source via the shared plural `objectAssetIds` adapter.

Instances are the authoritative saved rendering result. Explicit regeneration runs the versioned recipe. Erase is an ordered recipe operation; subsequent paint can refill erased regions. Global recipe edits explicitly regenerate the complete object. Changes to asset metadata do not touch existing instances. Recalculate defaults requires confirmation. Ordinary metadata/visibility/name edits preserve the placement array.

Counter-based random numbers reuse the wall-material RNG. Brush centers are resampled by arc length in canonical map units, removing redundant collinear input; pointer event frequency and zoom do not determine density. A curved path represented by different polylines can naturally differ. Uniform, center and edge falloff affect acceptance. Random and jittered even strategies share bounded attempts and source selection. Collision uses a spatial hash within this scatter only; bounds avoidance is conservative AABB avoidance, not alpha collision.

The recipe and instances stay in a canonical coordinate frame. A persisted similarity matrix applies translation, uniform scale, rotation and reflection to both. Nonuniform scaling/shear are refused, including arrangement commands. Regeneration after a transform preserves placements in that frame; new brush points are inverse-transformed. Selection exposes one aggregate box, not thousands of handles. Expand bakes the frame into ordinary stamps in the same layer, group and order, with confirmation and one undo transaction.

Area filling copies existing canonical multipolygon/hole geometry. It keeps whole rotated image rectangles inside the mask, excluding boundary intersections and enclosed holes. This is deliberately conservative for images with broad transparent padding. The source Area remains independent; no live dependency or terrain engine is introduced.

Generation uses a disposable worker with cancellation and a five-second deadline. Preview is temporary and throttled; completion validates current project/layer/object identity before one history transaction. Rendering batches instances into one Canvas painter/one Konva Shape per object, shared with PNG. Image leases are per source, not per instance. Missing scatter-only images permit a warned editable placeholder; saving and PNG require restored/replaced sources.

Format 9 adds scatter; formats 1–8 use the existing central parser and retain their pixels. SQLite schema remains 4 and stores normal project JSON plus existing asset reference rows. Five recent weighted source sets use the existing settings table, no additional library or blobs. Presets may reference deleted assets and display them as missing on recall; projects/history/clipboard retain strict usage protection.

Limits: 16 sources, 128 strokes, 4,096 raw/resampled brush points, 100,000 generation attempts, 5,000 instances/object, 10,000/document, plus existing 3 MiB editable metadata budget. Density is attempts per 10,000 map pixels²; brush dabs compensate for their one-third-diameter spacing. Saturation/overlap rejection can reduce actual counts. Reaching the instance cap is reported. Native/grid default sizing is captured with aspect ratio preserved; world sizing falls back visibly to native size because current battlemaps have no canonical physical scale. No physical scale is invented.


## Explicit scatter rotation — 28 September 2026

Engine 1 accepts optional `settings.rotationMode` (`none`, `random`, `range`) and optional frozen `sources[].rotation` (finite degrees, −360..360; absent = original image orientation, 0). Existing asset metadata has no canonical rotation field: library images retain their authored pixel orientation, as with ordinary stamp placement. A supplied source recipe can freeze different angles per source; this does not introduce a new library metadata editor.

`none` adds no rotation, including no stroke alignment. `range` adds a channel-6 seeded offset between existing rotationMin/rotationMax to each source angle, with no tangent contribution. Explicit `random` uses channel 6 across 0..360 plus source angle and the existing optional stroke alignment. Stored angles remain normalized to 0..360; −10° is equivalently 350°. Other RNG channels are unchanged. Rotation-dependent bounds collision/Area clipping can legitimately accept different instances.

Missing rotationMode takes the exact prior engine-1 formula (min/max plus optional tangent), without injecting defaults or rewriting the recipe. Frozen instances remain authoritative on load. No format-version increment or regeneration on load is needed for these optional validated fields. Explicit user rotation edits regenerate the selected matching-source Scatter through the existing guarded, single-history action. New-operation tool settings have no document history until applied in a stroke or Area fill. Changing frozen source dimensions/orientation starts a new paint recipe, consistent with changing the source set.

New project sessions/map-type changes initialize transient tool defaults to None for Regional/World, Random for Battlemap. Defaults resolve before explicit settings/preset overrides. Current recent-source presets contain only IDs and weights, so do not override rotation. No new preset UI/storage is introduced. Continuing an existing object retains its own recipe, including legacy behavior.

# ADR 0047 — Battlemap texture paint

Status: accepted, 2026-09-28.

## Decision

Battlemap exposes **Texture Brush** with Paint, Erase and Blend. It uses the existing fill-pattern library and its search, categories, thumbnails and map applicability. It does not introduce a second material catalogue or alter source pixels.

One optional `map.texturePaint` layer is persisted in project format 12. This additive field contains paint version **3**: `{visible, locked, opacity, materials, tiles, baseTiles?}`. A material is `{assetId, scale}` keyed as `asset:<id>@<scale>`. Its source must be a project-embedded fillPattern. Terrain paint versions 1/2 keep their existing representation and two-pixel mask sampling; version 3 is accepted only by the texture-paint validator.

Texture paint uses 64×64 alpha-mask tiles at **one sample per logical map pixel**. The shared stroke engine retains compression, stroke interpolation, immutable snapshots, bounded work, accumulated strength per completed stroke and symmetric cross-tile Blend. A completed stroke prunes unused material references. One gesture is one history action; Escape, lost capture and window blur cancel its temporary state.

Limits remain 32 material/scale combinations, 4,096 tiles, 8,192 masks, 2 MiB encoded masks and 256 touched tiles per stroke. The existing editable-document and decoded-image budgets also apply. Work is refused atomically when a limit is exceeded.

## Rendering and surface policy

The shared editor/export renderer samples the original decoded image at map origin (0,0), using fractional CanvasPattern scale. The origin never restarts per dab, stroke or mask tile. Texture sampling is independent of zoom and pan. Only final logical-resolution tile composites are cached; source images are not reduced to miniature repeating textures. PNG 2× scales this logical paint resolution; it does not invent additional mask detail.

Texture paint has two sparse surfaces sharing materials and layer controls. Optional `baseTiles` renders immediately above the background and below all Areas and other artwork. `tiles` retains the existing Area paint pass above Areas and below other artwork. Relative order within each pass is retained. A document with any filled Area clips paint to its **visible filled Areas**, including their holes; hidden floors do not expose paint. The Brush now writes outside visible filled Areas to `baseTiles`, so no Area is required. Inside a visible filled Area it writes to `tiles`. Base Erase/Blend touch only these masks, never the background or Area geometry. Captured pointer movement outside the map stops at its boundary and starts a new segment on re-entry. Outer map clipping always applies. Area fills, walls, doors and stamps retain their original data. The layer is independent of object-layer lock/Solo and explicitly has its own visibility, lock and opacity controls. Room Generator rooms do not acquire separate paint layers.

Loading never moves masks between surfaces. Old `tiles` keep their exact clipping, including hidden paint outside Areas; old maps without any filled Areas keep their map-wide `tiles` editable. New empty maps use `baseTiles`. No background image bytes are modified. Limits aggregate both surfaces, including 256 touched surface-tiles per gesture.

This policy deliberately treats filled generic Areas as valid surfaces; it does not infer room/floor semantics or implement a target picker. Existing maps without the field keep their original object order and appearance.

## Assets and persistence

Paint material IDs participate in project gathering, kind validation, image budgets, local-service project references, removal protection and undo-history invalidation. `.mapweaver` ZIP contains original source image bytes plus editable masks. ZIP import remaps material keys and tile references when service asset IDs change or hashes deduplicate. SQLite backup contains the same project data and image files.

Optional library `patternScale` is a finite number from 0.01 through 100, valid only for fill patterns. Manifest schemas 1/2/3 accept this additive recommendation. SQLite schema 9 adds a nullable checked column with a pre-migration backup. Library import/export preserves it; role copies and removed-asset metadata reset it. Choosing a library material initializes the brush from this value, otherwise 1. Existing strokes store their own scale and never change when library metadata changes. Embedded project assets retain the actual paint scale, but do not carry library recommendations for new placements.

## Consequences

No new backend, image synthesis, per-room paint layer, per-stamp painting, stochastic tiling or automatic wear. Tileable source quality remains the author's responsibility. Erase reveals the base exactly; Blend smooths material coverage over a three-logical-pixel neighborhood rather than blurring texture pixels. Full-map painting is bounded by storage budgets and is not an unlimited raster editor.

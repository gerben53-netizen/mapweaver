# Rough Stone Masonry — production integration

Status: **PASS WITH NOTE**. Registered as `rough-stone@production-1`, **Ruwe natuursteen**, using the existing generic masonry engine. Defaults: width 1 ft, Regularity 25%, Variation 70%. No renderer, Rock/Cave engine, project format, contract, or artwork changes.

## Artwork admission

All six accepted `artwork/` PNGs from `Premium-Rough-Stone-Masonry-Wall-Component-Pack (1).zip` were copied byte-identically. Supplier KEEP-FIX-REJECT was read before integration; its permission includes Mapweaver application distribution. SHA-256, dimensions and metadata are recorded in `rough-stone-production-provenance.json`.

Large: 384 × 128 px / 1.5 × 0.5 ft; medium: 256 × 128 / 1 × 0.5 ft; small: 128 × 128 / 0.5 × 0.5 ft. Two variants per role, weight 1, +X authoring, full-canvas-center anchor. RGBA8/sRGB; zero RGB at alpha zero; clear two-pixel gutter; one alpha>=128 connected silhouette and no internal holes. All partially transparent pixels lie within four pixels of transparent background; the interior is opaque. Rough chipped silhouettes occupy less opaque canvas area than dressed stone, so admission does not impose an unrelated dressed-stone 85% opaque-canvas threshold.

## Actual Mapweaver proof

Evidence directory: `deliverables.local/Rough-Stone-Masonry-Integration/` (local, excluded from Git). The reused editable masonry benchmark contains long straight spans, free ends, passages, broad/S curves, 90-degree corner, independent T/cross walls and Thin/Standard/Heavy/Massive widths. `masonry-benchmark.mapweaver` retains native walls, opening ownership and seeds; no scene-stone objects or flattened wall textures.

Inspected actual editor at 100%, 75%, 50% and fit, final PNG at 1x/2x, high-resolution straight reference and same-geometry comparison (top Pale Stone, middle Rough Stone, bottom Marble; 80 map px/ft, 1-ft width). Existing Premium natural wood, parquet, pale stone, neutral marble and heartwood floors plus three existing Eldric stamps form the context proofs. Stamp Soft Shadow uses existing behavior; no new wall contact effect was introduced.

Rough Stone reads as constructed rustic masonry, distinct from Pale Stone/Marble and continuous cave rock. Pores and chips are visible in close inspection, but do not produce a dominant repeated dark motif at play zoom. No continuous dark extrusion lip, cast-shadow band or vertical side face reappeared. Curves and joins retain the shared masonry geometry, without new fusion rules. The six source variants remain recognizable at authoring scale; the pack is finite rather than an unlimited variation library.

**Note:** similar gray/taupe floors reduce wall/background contrast, especially Thin at 50%. Darker wood and lighter stone offer clearer separation. No artwork contrast editing or hidden outline was applied to manufacture a pass.

## Behavior and validation

Actual Wall Tool selection: Enter and double-click finish open walls; clicking start closes. Properties Randomize plus keyboard undo/redo passed. Native node/curve/width/Regularity/Variation and opening add/remove transactions undo/redo exactly. Isolated SQLite autosave/reload preserves IDs, recipe and seed; before/after PNG bytes identical. Native .mapweaver archive roundtrip exact. Export clipping equals the raw-pixel crop of the full map. Browser emitted no page errors.

84 focused client tests and 14 focused service tests passed, including production hashes/footprints, shared masonry geometry, controls, SQLite reopen/archive transfer, Living Root, Rock/Cave, continuous walls, openings and Campfire semantics. Typecheck, targeted ESLint, client build, service build and full build all passed. Full build verified the read-only canonical Campfire contract and bundled font licenses. Existing large-chunk/dynamic-import build warnings remain non-blocking. The full unrelated test suite and installer build were not run.

Measured on the local 11-wall fixture: initial cached-surface construction 20.1 ms; cached redraw 0.22 ms; changing curve previews 3.8–9.0 ms; PNG 1x 22.8 ms, 2x 28.0 ms. These are fixture measurements, not general performance guarantees.

Production inventory includes six components and provenance for future Windows packaging. No installer/executable was built. QA used an isolated disposable data directory and nonstandard loopback ports 48284/48285 after checking listeners; own instances were stopped. Existing user databases and Campfire packages/map-contract were not changed. No push or external action.

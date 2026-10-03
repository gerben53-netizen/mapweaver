# Natural Cave Rock — production integration

Status: **PASS WITH NOTE**. Material **Natuurlijke grotrots**, `natural-cave-rock@production-1`, uses the existing generic `rock` strategy (ADR-0057). Defaults: **1 ft / Roughness 55% / Variation 70%**, initial deterministic seed 1; Randomize explicitly creates another seed. No Density control exists. No engine, renderer, persistent format, contract or artwork changes.

## Source and technical admission

All nine accepted PNGs from `Premium-Natural-Cave-Rock-Generated-Wall-Component-Pack.zip` were copied byte-for-byte. The complete supplier KEEP-FIX-REJECT report was read, including its permission for use, editing and distribution in the Mapweaver artwork project under applicable generated-output terms. Source/archive/report hashes and per-component metadata are in `natural-cave-rock-production-provenance.json`. No regeneration, repainting, trimming, resizing or alpha repair occurred.

| IDs / exact filenames | Role | Canvas per file | Nominal physical footprint | Weight |
| --- | --- | --- | --- | --- |
| rock-large-1.png, rock-large-2.png, rock-large-3.png | rock-large | 256 × 256 px | 1 × 1 ft | 1 each |
| rock-medium-1.png, rock-medium-2.png, rock-medium-3.png | rock-medium | 192 × 192 px | 0.75 × 0.75 ft | 1 each |
| rock-small-1.png, rock-small-2.png, rock-small-3.png | rock-small | 128 × 128 px | 0.5 × 0.5 ft | 1 each |

Independent preflight verified RGBA8/sRGB, full untrimmed midpoint anchor, the completely opaque centered disk at radius 39% of canvas width, opaque silhouette within 47%, at most one-source-pixel antialias fringe and transparent two-pixel safe gutter. Pixel-center radial tests found zero violations. RGB is zero wherever alpha is zero. Every file has one 8-connected silhouette and zero enclosed transparent holes. Full rotation 0–360°, uniform scaling only, no mirroring. Footprints/weights equal DEV. Visual inspection confirms overhead mineral masses without floor, baked cast shadow or vertical front face.

## Actual Mapweaver proofs

Local evidence is under `deliverables.local/Natural-Cave-Rock-Integration/` (ignored by Git). Supplier proofs remain in `supplier/` and are **not** substituted for engine evidence.

The existing editable `Rock-Cave-Generated-Walls/rock-cave-benchmark.mapweaver` was reused. Fifteen native Walls and two existing passage objects keep IDs, nodes, handles, widths, closure and seeds; only generated material ID/revision change. It includes long straight, broad/tighter/S curves, practical corner, free ends, T/cross, Thin/Standard/Heavy/Massive, independent open corridor and closed cave. Randomize/history tests subsequently change one seed; the saved production benchmark retains that deterministic result. No scene-stone stamps or flattened wall objects were added.

Actual browser authoring verifies selection, click/Enter and double-click open finalization, and start-node closure. Properties Randomize and keyboard undo/redo work. Store transactions separately verify native node/curve/width/Roughness/Variation and opening add/remove with exact undo/redo. Isolated SQLite autosave and explicit project reload retain recipes/geometry; before/after PNG bytes match. Editable archive encode/decode retains exact native objects.

Final transparent PNG 1×/2× checks cover all 15 walls: **9,318 opaque inner-band samples**, plus unobstructed passage centers. Broad/tight/S curves, corner and T/cross show no wedge holes or outlier masses. Ends are rounded ordinary masses; passages have no floating slivers. Heavy/Massive add masses without stretching their square footprint. Source PNGs retain safe clean alpha; final exports show no matte lip or missing masses. Map-edge output equals the raw-pixel crop of the full render. Final export uses the shared final-quality wall surface, not editor preview raster quality.

Actual editor proofs exist at 100%, 75%, 50% and fit; PNG evidence at 1× and 2×. `straight-rock-reference.png` is an actual high-resolution native 1-ft wall at 70 map px/ft. `repetition-proof.png` copies that actual export; named detail proofs crop the actual benchmark without painting over it.

`cave-versus-masonry-1x/2x.png` compares the same curved geometry at 1-ft width / 80 map px/ft: Natural Cave Rock above, unchanged Ruwe natuursteen masonry below. The cave boundary has irregular mineral coverage; masonry retains separated construction blocks/courses. No clipped strip, rectangular cap, front-face extrusion or regular large scalloped rhythm was introduced. Individual source masses and cracks remain identifiable under close inspection; nine variants do not promise unlimited visual uniqueness. There is no dominant short-cycle dark spot or repeating mineral logo at play zoom.

`cave-context.mapweaver` uses the already accepted Premium restrained-earth floor, independent open native cave boundaries, a separate two-wall corridor and native door/passage. No new artwork or decorative stamps conceal defects. Independent free walls are not automatically fused into a sealed room; their intentionally separate endpoints remain visible. Context has fit/100/75/50 editor proofs and 1200 × 900 / 2400 × 1800 PNGs.

**Non-blocking note:** fine cracks disappear at low zoom, particularly Thin at 50%; similar gray/brown/earth floor values reduce material contrast. Wall boundary and passage remain readable. The pack is a finite set of overlapping rock masses, not seamless infinitely varied geology. No hidden outline, cast shadow or source contrast edit was applied to manufacture a pass.

## Validation and distribution

**105 focused client tests + 22 focused service tests passed**. Coverage includes production admission/defaults, identical DEV/production geometry, open/closed validation, immutable source hashes/footprints, material chooser and exact saved DEV retention, deterministic layouts/coverage, history, SQLite reopen and archive transfer. Regressions include Living Root, DEV rock, Pale/Marble/Rough masonry, Linear/Timber, normal/continuous walls, openings, and current Campfire wall/door/window/light semantics.

Commands executed: focused Vitest files `rockWalls`, `GeneratedWallFields`, `contract`, `generatedWalls`, `masonryWalls`, `linearWalls`, `continuousWallMaterial`, `walls`, `openings`, `windowLights`; service `generatedWalls.test.ts`; `npm run typecheck`; targeted ESLint of changed TypeScript files; `npm run build:client`; `npm run build:service`; full `npm run build`; `git diff --check`. All passed. Full build verifies the unchanged canonical Campfire source and bundled font licenses. Existing large-chunk/ineffective-dynamic-import warnings remain non-blocking. No full unrelated test suite or installer build was run.

Measured 15-wall fixture: initial surface construction 48.8 ms, cached redraw 0.284 ms, changing curve previews 8.3–16.6 ms, PNG 1× 67.5 ms / 2× 94.7 ms. These are local fixture measurements, not general guarantees.

Canonical default-content inventory includes nine production components and provenance for future Windows packaging through the existing generated-walls resource directory. DEV rock resources/registry remain intact for saved maps and test fixtures, but are hidden from new normal choices; an exact saved DEV selection still appears. No migration or user-data reset.

QA checked existing instances before starting its own loopback-only service/Vite on nonstandard **48288/48289**, with an isolated disposable data directory. Own processes were stopped. No existing instance, user database, other production artwork or Campfire contract file changed. Exactly one local commit on develop: `Sprint: Integrate Natural Cave Rock`. Nothing pushed; no executable/installer built.

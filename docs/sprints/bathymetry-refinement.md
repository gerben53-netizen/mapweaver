# Water Depth Rendering Refinement — delivery evidence

## Acceptance and root cause

The acceptance target was one continuous scalar water-depth field, muted theme ramps, variable/coherent shelves around coasts and islands, water-only scalar Shallow/Deep/Reset/Blend, directional river mouths, preserved old projects, exact history/save/reload, 1×/2× parity and bounded repaint work. No package or external action was requested.

Inspection found that the previous surface was **already opaque scalar depth**, not a cyan alpha-overlay brush. The visual glow came from very light shallow colors, smoothstep interpolation holding those colors near shore, nearly uniform distance falloff, broad shelves around small islands and a radial river-end mask. Blend only blurred manual weights, ignoring the automatic depth underneath. Legacy Area coastal halos and Geography Finish ocean sit below the opaque water pass and are covered in receiving water. There was no need to replace the storage system.

## Implementation

- `src/domain/waterDepth.ts`: optional versioned bathymetry model; five restrained style ramps; component-size shelf caps; deterministic low-frequency variation; combined distance fields without nearest-island seams; directional compact estuaries; scalar pre-stroke sampling and Blend targets.
- `src/domain/terrainBrush.ts`: optional scalar blend target and bounded soft-edge distance variation for water. Existing Terrain paint uses its unchanged path. Logical stroke coverage and immutable tile snapshots remain shared.
- `src/canvas/drawWaterDepth.ts`: shared opaque raster, quieter depth-aware texture, optional independent narrow shoreline edge, along-flow river-end transition using the final water surface, cached depth sampling and diagnostics. Existing dirty-tile recoloring is retained.
- `src/canvas/WaterDepthController.tsx`: provides automatic depth to refined strokes; existing cancellation/history remains intact.
- `src/app/WaterDepthTools.tsx`: legacy appearance explanation, explicit style upgrade retaining paint, separate Thin shoreline edge checkbox.
- Targeted domain/UI tests plus reproducible local benchmark builder, browser validation and comparison scripts; water documentation and ADR-0041.

Depth uses 0 shallow / 1 deep. Automatic coast distance, shelf variation and estuary contribution produce an automatic scalar. The existing two weighted manual masks move this toward shallow/deep; unpainted weight retains automatic depth. Strength accumulates across logical strokes. Reset removes override weights. Blend averages final scalar samples at nine water-only neighbors and expresses the result relative to local automatic depth. Softness affects scalar coverage, not image alpha. World-space edge variation stays within the circular cursor. New masks are not converted into destructive raster images.

The color ramp is piecewise linear in the existing RGB renderer. Shallow blue/teal is lighter than offshore water without near-white/cyan defaults. Parchment and dark styles retain separate ramps. A small secondary texture term is quieter near shore. Mouth shallowing enters the same field; a directional alpha transition only recolors the existing river endpoint with that final surface. It adds no separate cyan color.

## Compatibility

Project format 12 and Water Depth version 1 remain. Optional `model: 'bathymetry'` and `coastEdge` are strictly validated by the shared service/client parser. Missing model preserves previous behavior, palette and masks. **Water Depth → Water appearance → Apply current water style** explicitly upgrades appearance while retaining masks; undo restores the old configuration. New opt-ins use the new model. Opening a map does not silently upgrade it. Existing manual paint is not discarded or reauthored.

## Benchmark copies and visual evidence

All output is under `deliverables.local/Bathymetry-Study/` (local deliverables, not version-controlled):

- `original.mapweaver`: byte-identical copy of the existing WaterDepth study.
- `before.mapweaver` / `after.mapweaver`: identical native geography and manual masks, with one additional identical Deep stroke in both. Only after applies the new style.
- `velanth-before.mapweaver` / `velanth-after.mapweaver`: copies of the existing 537-object / 421-stamp Velanth study.
- `baseline-1x.png`, `baseline-2x.png`, `after-1x.png`, `after-2x.png`; full editor screenshots.
- Before/after comparisons: `ocean-comparison.png`, `coast-comparison.png`, `island-comparison.png`, `bay-comparison.png`, `mouth-comparison.png`, `shallow-comparison.png`, `deep-comparison.png`, plus `lake-comparison.png`.
- `sources.json` and `heavy-source.json`: original source paths and SHA-256 hashes. Both original studies remain unchanged.

Visual review caught a sharp seam in the first island-cap implementation. It was fixed by combining distance influences before color conversion, with a dedicated continuity regression test. Final coast, island, bay, lake, manual depth and mouth images show restrained depth gradients rather than the previous pale cyan bands. Geometry remains intentionally simple in the controlled study; the larger Velanth copy supplies real-map context.

## Validation

- 47 targeted Vitest tests passed across Water Depth, new bathymetry tests, Water Depth store/UI, terrain paint and terrain paint actions. No full suite was run.
- Tests cover legacy exact field behavior, invalid model metadata, monotonic/deterministic depth, island caps/continuity, lakes, theme ramps, accumulation/reset/water clipping, final-field Blend including unpainted automatic depth, immutable sources and directional mouth bounds.
- Browser no-halo regression: every depth-raster pixel is opaque; a fully shallow stroke equals the configured shallow ramp endpoint; refined river ends do not invoke radial gradients. Unrelated label/stamp changes rebuild zero automatic fields.
- Real pointer Shallow/Deep/Blend/Reset operations, exact undo/redo, Escape/blur cancellation and Space pan passed. Controls stay within 1280×720.
- Dirty-tile output equals a freshly rebuilt raster. Local service save/reload preserves exact snapshots for legacy and refined copies.
- Controlled benchmark: editor vs PNG at 1× and 2× has **zero differing pixels** for both before and after, including coast, manual shallow/deep and mouths. Zero browser errors.
- On the controlled study, two-frame pan updates measured 33.4 ms median / 33.5 ms p95 both before and after, with zero new canvases. Local stroke generation plus dirty repaint measured 7.2 ms median / 9.3 ms p95 over 12 samples. Refined PNG export measured 84 ms at 1× and 216 ms at 2×. Pointer automation elapsed times include event scheduling and history assertions; they are not single-frame render times.
- The 537-object / 421-stamp Velanth comparison measured pan median/p95 78.3/85.5 ms before and 78.1/85.8 ms after (40 samples, two animation frames per update); zero allocated canvases. Both copies save/reload identically and have exact 1× editor/export parity. Refined 1× export took 1.35 s. Velanth 2× was not run; the controlled benchmark covers both scales. These are whole-editor measurements, not a claim of 60 fps on this large map.
- Scoped ESLint, TypeScript client/service checks and the production client/service build passed; the existing >500 kB chunk warning remains.
- Full machine-readable results: `validation.json` and `validation-velanth.json`.

## Limits and follow-up

This is stylized depth, not a hydrodynamic model. Automatic raster remains capped at 768 pixels on its longest side; very narrow water/features on huge maps can be subpixel. Shelf caps use area-derived radius and logarithmic size classes rather than geology or curvature; geography edits crossing a size class can change the cap. A future improvement could blend adjacent size classes or incorporate semantic rocky coast hints. Existing manually authored shapes are preserved, so a deliberately hard circular override remains a circular depth feature; soft interpolated strokes avoid individual dab rings and additive bloom. Very wide river transitions and the first 256 eligible mouths retain existing memory/work limits.

No push, merge, release, upload or deployment occurred. No Windows package was built. Original benchmark files were not overwritten.

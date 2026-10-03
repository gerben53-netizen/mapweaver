# Water Depth and river mouths — delivery report

Implemented 26 September 2026 on develop. Water is now controlled by an optional automatic depth surface plus independent manual depth paint. Native coastal and lake river endpoints blend into the receiving water. Existing maps remain on their legacy renderer until explicitly enabled or restyled with a world theme.

Acceptance was: coastal/island/lake distance-based depth; continuous shallow/mid/deep progression; water-only Shallow/Deep/Erase/Blend with size, softness, strength and live preview; one undo per completed drag; safe reset; downstream mouth blending; theme integration; persisted settings/paint; unchanged old maps; native editor/PNG parity at 1× and 2×; identical comparison crops; measured rendering and storage performance. No package or external publication was requested.

## Implementation

Automatic depth uses visible semantic land geometry, including polygon holes and explicit water terrain Areas. A bounded shore-distance field feeds an exponential depth curve and smooth three-color interpolation. Low-frequency variation and restrained texture keep the progression continuous. Nearby islands and enclosed bays influence the same field. Painterly Fantasy and default deep water use distinct palettes; other existing water styles also have presets. Values are ordinary editable map settings, integrated into existing theme ownership.

Manual strokes use the existing bounded tiled mask codec with two private depth targets. Remaining weight keeps automatic depth; shallow paint targets 0 and deep paint targets 1. Erase reduces those weights and Blend smooths existing weights. Rendering and writes are water-constrained. Later land edits cover retained paint non-destructively. The layer is separate from Terrain paint and never modifies geometry. Reset is undoable, and disabling depth retains paint.

River detection checks downstream direction, nearby receiving water and an upstream land sample. Width controls a bounded elongated shallow influence. A feathered patch of the receiving water fades the water-side end and bank. No triangle, delta object or path mutation is introduced. [Usage guide](../water-depth.md) · [ADR 0038 / exact persistent model](../adr/0038-water-depth.md).

Changed areas:

- `src/domain/waterDepth.ts`, `waterGeometry.ts`: configuration, pure depth/color/mouth logic, semantic water geometry and brush adapter.
- `src/domain/terrainBrush.ts`: optional paint-admissibility predicate; existing terrain behavior retains its original default.
- `src/canvas/drawWaterDepth.ts`, `WaterDepthNode.tsx`, `WaterDepthController.tsx`, `WaterDepthFootprint.tsx`: shared renderer, bounded caches, transient preview and pointer lifecycle.
- `src/store/waterDepthStore.ts`: brush preferences, preview and guarded undoable commits.
- `src/app/WaterDepthTools.tsx`, shared numeric draft control, tool rail/icon/help and `MapCanvas.tsx`: dedicated tool, understandable controls, live appearance settings and reset.
- `MapContent.tsx`, export scene/render, map model/settings, project parser and theme application: shared ordering, serialization, compatibility and theme ownership.
- Focused domain/store/UI tests; native fixture, benchmark builder, browser validator and comparison script; README, glossary, guide and ADR.

No new dependency, SQL schema, cloud service or asset pack is required.

## Benchmarks and visual evidence

[WaterDepth-Study](../../deliverables.local/WaterDepth-Study/WaterDepth-Study.mapweaver) is a controlled native map with a bay, open water, island, inland lake and two differently sized river mouths. Its [before copy](../../deliverables.local/WaterDepth-Study/WaterDepth-Study-before.mapweaver) has identical geometry and paths. The after copy includes a manually painted offshore shoal. This deliberately isolates water features from unrelated stamp rasterization.

[Full before](../../deliverables.local/WaterDepth-Study/baseline-1x.png) · [Full after](../../deliverables.local/WaterDepth-Study/after-1x.png) · [1280×720 controls](../../deliverables.local/WaterDepth-Study/water-controls-1280.png).

Identical-coordinate comparisons:

- [Coastal shallows](../../deliverables.local/WaterDepth-Study/coastal-shallows-comparison.png)
- [Open/deep water and manual shoal](../../deliverables.local/WaterDepth-Study/open-water-comparison.png)
- [River mouth / estuary](../../deliverables.local/WaterDepth-Study/river-mouth-comparison.png)
- [Inland lake](../../deliverables.local/WaterDepth-Study/inland-lake-comparison.png)

The visual comparison shows lighter shelves, darker open water/lake centers, author-controlled offshore depth and a river end that dissolves into receiving water instead of a blunt cap. The large-map [Velanth-WaterDepth copy](../../deliverables.local/WaterDepth-Study/Velanth-WaterDepth.mapweaver) and [render](../../deliverables.local/WaterDepth-Study/velanth-1x.png) also demonstrate the automatic surface around real coasts/islands with 537 objects / 421 stamps. It derives from the prior premium-terrain copy and changes only document identity and water-depth settings. Original Velanth and prior benchmark files were not overwritten; [source hashes](../../deliverables.local/WaterDepth-Study/sources.json).

## Validation

**54 targeted Vitest tests passed** across:

```text
npm test -- src/app/WaterDepthTools.test.tsx src/domain/waterDepth.test.ts src/store/waterDepth.test.ts src/domain/terrainPaint.test.ts src/domain/geographyFinish.test.ts src/domain/worldThemes.test.ts
```

Tests cover monotonic depth and palette separation; island influence; coast/lake water masks; shallow/deep layering, erase and soft falloff; immutable Blend; width-scaled downstream mouths; unsupported references/values; optional old-map defaults; project ZIP roundtrip; guarded commits and undo/redo; reset/disable; theme paint preservation; existing terrain/geography/theme behavior.

`npm run typecheck` and scoped ESLint over all modified TypeScript/TSX and scripts passed. Final `npm run build` passed client, service and eight bundled font families/licenses. The existing large-chunk warning remains. No unrelated full suite or Windows package was run.

The real headless Chrome browser harness uses a fresh isolated local service dataset on every run. Both native before/after maps passed **pixel-exact editor versus PNG at 1× and 2×** (four comparisons; zero different pixels/channels), with no editor chrome. The editor comparison clones the actual `.map-art` and water node, not another export scene. Config and manual masks survived save/reopen with identical full snapshots. The Velanth variant passed identical save/reopen and pixel-exact 1× comparison as well. Neither harness produced browser errors.

Real mouse/keyboard checks passed: one drag creates exactly one undo and restores the entire map; Esc and focus loss cancel; Space-drag pans without painting; controls fit inside 1280×720. Incrementally updated paint rasters match a freshly rebuilt raster exactly. [Native measurements](../../deliverables.local/WaterDepth-Study/validation.json) · [Velanth measurements](../../deliverables.local/WaterDepth-Study/validation-velanth.json).

## Performance

| Map | Open / save / reopen | Viewport median / p95 | 1× export | 2× export |
| --- | --- | --- | --- | --- |
| baseline | 2.60 / 0.08 / 2.62 s | 33.4 / 33.5 ms | 0.091 s | 0.323 s |
| after | 2.59 / 0.13 / 2.58 s | 33.4 / 33.6 ms | 0.089 s | 0.195 s |
| velanth | 9.59 / 1.08 / 9.30 s | 88.9 / 98.3 ms | 1.646 s | Not repeated (existing stamp limitation) |

Native paint update calculation plus raster refresh: median **9.5 ms**, p95 **17.9 ms** across twelve samples. The earlier full-surface repaint was about 78 ms median; changed-tile bounds and cached static variation removed that avoidable work. The real twenty-step pointer gesture took **0.65 s**, including browser input pacing and a 200 ms settle; this is not a single-frame cost.

Pan measurements use two animation frames per update, five warmups and forty samples. Both native and Velanth cases allocated zero new canvases during warmed pan measurements. Native cache checks retained at most two 768×480 base surfaces (737,280 raster pixels), plus bounded scalar fields and small mouth patches. Open/reopen values include scripted settling and are single-run observations. These are not claims of 60 fps on Velanth or cross-machine benchmarks.

## Limits and follow-up

- The existing default-Chrome **2× stamp** discrepancy remains outside this change. It was previously demonstrated on unchanged Velanth. This sprint's new water features are pixel-exact at both scales on the native study; the heavy stamp map's 2× comparison was not repeated or represented as fixed.
- Automatic depth is an artistic shore-distance estimate, not physical bathymetry or hydrology. The 768px longest-edge raster bounds cost; tiny features/strokes on extremely large maps have limited visual resolution. 2× uses the same logical field.
- Imported image backgrounds, blue stamps and broad river centerlines do not supply semantic coastlines. Use semantic landmass geometry or water Areas. Very small ponds may remain mostly shallow, as intended.
- At most 256 eligible mouths contribute per visible map. Fade patches are capped at 256×256 pixels and 64 retained patches per base surface, avoiding unbounded image allocations from very wide rivers.
- Mouth inference requires an endpoint near water and an upstream land sample; reversed paths, long overshoots into water or inland-ended paths need author correction. No automatic deltas, lake outlets or sediment simulation are inferred.
- Hidden/solo geometry changes the visible water mask. Adding land hides retained manual depth rather than deleting it. Water styling does not constrain later ordinary stamps or Terrain paint from covering it.
- The native study demonstrates all new features; Velanth remains a heavy scene at approximately 89 ms median viewport-update measurement. The improvement does not solve general large-map rendering limits.

Recommended follow-up: finer adaptive depth resolution for very large maps and explicit mouth overrides for intentionally overshooting/custom river paths. The known 2× stamp raster issue should remain a separate focused renderer investigation.

No push, merge, release, deployment, upload, cloud change or Windows package was performed. All benchmark files are local copies. The original Velanth SHA-256 remains `36900eaa6b90f5b8fc619712bd6dd720b4d9838a4115aecbcc2ecdb19e51b4fd`.

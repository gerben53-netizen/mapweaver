# Terrain Brush sprint

## Acceptance and validation plan

- World/Regional Terrain Brush with Paint, Erase and Blend, numeric/slider diameter, softness, strength and fractional texture scale.
- Logical-map footprint and smooth interpolated dragging at 50%, 100%, 200% and 400% zoom; no dwell oversaturation; preview excluded from export.
- One logical paint layer with visibility and lock; semantic Areas/generation unchanged; regeneration preserves manual paint.
- One undo entry per stroke with unchanged chunks shared; cancellation and navigation safe.
- Validated save, reopen, ZIP and backup persistence; unchanged no-paint documents.
- Shared editor/PNG rendering with 1×/2× parity; representative many-stroke timing and bounded caches.
- Targeted tests, typecheck, scoped lint, production build and browser screenshots. No Windows packaging or external actions.

## Delivered behavior

World/Regional maps now expose Terrain Brush in the tool rail. Paint, Erase and Blend have contextual diameter (number and slider), softness, strength and fractional texture-scale controls. The circular, mode-colored footprint includes a dashed hard-core boundary and is excluded from PNG. One Layers row controls paint visibility, lock and opacity; internal chunks never appear as objects.

Paint references `TERRAIN_STYLES` and the existing deterministic terrain texture painter. New style definitions, assets, dependencies and cloud resources were not introduced. Strength is per stroke rather than time-based flow. Noise/jitter and eyedropper were intentionally deferred.

## Storage, rendering and history

`map.terrainPaint` is an optional version-1 field in project format 12. Sparse 128-map-pixel tiles carry 64 × 64 byte masks per style/scale material. Validated base64 raw/RLE encoding bounds decompression, positions, material references, total per-sample weight and storage. Paint mixes weights toward the selected material, erase reduces all paint weights, and blend samples neighboring pre-stroke masks across tile boundaries. Semantic Areas and generator provenance never change.

The render pass is semantic land/terrain Areas → visual paint → ordinary artwork/stamps → paths → annotations, with the existing fog and finishing-effect passes. Object order is stable within each category. Unpainted maps retain their original order. The editor and PNG use `drawTerrainPaint.ts`, with map-anchored CanvasPatterns and up to 1024 cached tile images (64 MiB RGBA). Export scale does not enter paint coordinates or texture scale.

Dabs are interpolated by map-space arc length at 8% of diameter (minimum two pixels). Maximum coverage against the pre-stroke mask avoids repeated buildup from slow movement or duplicate events. A temporary stroke owns mutable dirty tiles; only changed tiles are encoded for throttled previews. There is no project mutation, history publication or full-document serialization on pointer samples. A release commits one immutable layer through existing history; unaffected tile references are shared. The existing history budget/serialization occurs at the completed-edit boundary. Escape, cancellation, map replacement and focus loss discard the preview.

The shared parser and optional map field carry paint through local autosave/manual save, reopen, recovery, ZIP and service backup/restore. SQLite schema and archive layout stay unchanged. Resize clips rather than deleting paint. Theme application and semantic editing preserve the field. The current generator creates new maps, so it never replaces manual paint on the source map; future in-place regeneration must retain the independent field.

## Changed files

| Responsibility | Files |
| --- | --- |
| Model, codec, validation, brush algorithm and pass order | `src/domain/terrainPaint.ts`, `terrainBrush.ts`, `models.ts`, `mapSettings.ts`, `mapCapabilities.ts` |
| Temporary controls/preview and history commit | `src/store/terrainBrushStore.ts`, `terrainPaintActions.ts` |
| Shared painter, gesture controller and editor-only cursor | `src/canvas/drawTerrainPaint.ts`, `TerrainPaintNode.tsx`, `TerrainBrushController.tsx`, `TerrainBrushFootprint.tsx`, `MapContent.tsx`, `MapCanvas.tsx` |
| Tool controls, logical paint layer, icon and help | `src/app/TerrainBrushTools.tsx`, its CSS Module, `ToolRail.tsx`, `LayerTreePanel.tsx`, `Icon.tsx`, `editorUx.ts` |
| Admission/export | `src/projects/format.ts`, `src/export/scene.ts`, `render.ts` |
| Tests | `src/domain/terrainPaint.test.ts`, `src/store/terrainPaintActions.test.ts`, `src/app/TerrainBrushTools.test.tsx`, `service/terrainPaint.test.ts`, `tests/persistence/terrain-paint.mjs` |
| Documentation | ADR-0033, `docs/terrain-paint.md`, this report, README, CHANGELOG and AGENTS glossary |

## Executed validation

- 48 targeted Vitest tests passed across seven files: the three new client test files, existing export, terrain appearance, map effects and recovery tests. The 26 new client tests were rerun after Blend optimization and passed.
- One focused service test passed: generated semantic terrain plus paint survives revisioned SQLite updates, service/storage reopen, ZIP transfer, checksum-validated backup extraction and restored database loading. Invalid paint versions are rejected.
- `npm run typecheck` passed; final `npm run build` also passed both application/service TypeScript compilation, Vite client/service builds and the eight bundled font/license checks. Existing >500 kB bundle warnings remain (approximately 518 and 530 kB).
- Scoped ESLint passed for all 26 changed/new TypeScript/TSX/MJS implementation and test files.
- `node tests/persistence/terrain-paint.mjs` passed against an isolated loopback service/data directory and Chrome. This is the focused browser script, not a full Playwright suite. It checks real pointer painting, all modes, one-step undo/redo, lock refusal, Escape/focus-loss cancellation, Space/middle panning without paint changes, actual autosave/manual save/reload, and exact masks for the same straight stroke at 50%, 100%, 200%, 400% zoom.
- Browser fixture: generated and themed world with 152 objects, including 89 generated terrain stamps. Rocky upland, forest floor, grassland/desert transitions, snow and swamp refinement, erase and blend are exercised. Object geometry, biome classifications and generator data compare unchanged.
- Editor art and PNG compared at 1200 × 800 and 2400 × 1600: **zero differing RGBA channels** at both scales. The art-only comparison excludes selection/cursor chrome. Texture scale .5 and soft, partial, overlapping, erased and blended paint are present.
- Screenshots were inspected, including the brush footprint and the 1280 × 720 layout. The controls wrap without covering the map or side panels.
- Full unrelated unit/E2E suites, packaging, Windows launcher tests and deployment were not run. There are no dependency changes. The checkout has no existing develop branch or commits and was preserved; pre-existing untracked repository files were retained.

## Performance and limits

Final browser measurements and screenshot paths are recorded below. The stress fixture has 120 strokes on a 4096 × 3072 map, 221 occupied tiles, four materials and about 1.96 MB serialized paint. A second interactive test combines it with 752 map objects (689 stamp image nodes). Cold-cache construction, warmed rendering and end-of-stroke costs are reported separately; this is not a claim of 60 FPS for all maps.

The largest Blend footprint was measured at about 255 ms before optimization. Reusing neighboring mask arrays and pre-stroke blur targets avoids repeated string-key lookups and neighborhood calculations. Ordinary brushes are faster; 512 px Blend remains the costly end of the supported range.

Limits: two-map-pixel masks, 8–512 px diameter, 32 used style/scale combinations, 4096 tiles, 8192 mask records, 256 touched tiles/stroke, 2 MiB encoded paint and the existing 3 MiB editable-document budget. Errors leave the prior committed map intact. Erase reveals the semantic base rather than reconstructing a hidden historical stroke stack. Painting may intentionally cross coastlines; there is no automatic semantic-land clipping.

Follow-ups: independent flow, optional edge noise, eyedropper, finer masks and background-worker cold-cache generation. A large layer can pause briefly on initial rendering, and large end-of-stroke commits can produce a longer frame. No unrelated renderer rewrite was introduced.

No Windows package was created. No push, merge, publication, deployment or external service action was performed. All browser test data is isolated under ignored `.qa.local` directories.


## Final measured evidence

| Check | Result |
| --- | --- |
| Pure stroke processing (120 strokes) | p95 15.4 ms; maximum 20.5 ms |
| Blend, one dab | 120 px: 17.7 ms; 512 px: 120.3 ms |
| First full paint-layer render | 960.2 ms |
| Warmed full paint-layer render | 0.7–1.0 ms |
| Interactive editor frames, 752 objects | median 18.0 ms; p95 36.1 ms; maximum 342.0 ms across 133 frames, including completion |
| Editor/PNG parity | 1× and 2×: zero differing RGBA channels |
| Browser errors | None |

Screenshots and raw results are local ignored QA artifacts, not production assets:

- [Before painting](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/before.png>)
- [Painted generated world](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/painted-world.png>)
- [Erase and Blend](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/erase-and-blend.png>)
- [Brush footprint](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/brush-footprint.png>)
- [Hidden paint: unchanged semantic terrain](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/hidden-paint.png>)
- [Final editor](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/final-editor.png>)
- [1280 × 720 layout](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/layout-1280x720.png>)
- [752-object stress fixture](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/stress-editor.png>)
- [1× PNG](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/paint-1x.png>)
- [2× PNG](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/paint-2x.png>)
- [Raw timings and comparison results](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/results.json>)

![Terrain Brush on a generated, themed world](<C:/Users/gerbe/Documents/ChatGPT/Mapweaver/.qa.local/terrain-paint-1790394670601/brush-footprint.png>)

# Battlemap Texture Brush — delivery report

28 September 2026 · develop · local implementation

## Delivered

**Battlemap → tool rail → Texture Brush → Browse** selects existing fill-pattern assets. The ordinary library picker supplies map compatibility filtering, name search, categories, thumbnails, Library/Project assets and recent choices. No separate material library or generated artwork was introduced.

The normal tool palette exposes Paint, Erase, Blend, logical Size (ft/m or cells without a game scale), Softness and Strength percentages, fractional Texture scale and Done. A library recommendation `patternScale` initializes the scale; otherwise it starts at 1. The decoded choice is made available immediately when the picker closes. Per-material loading remains guarded against unavailable assets and project switches.

Paint uses stable map coordinates and one original image origin. Connected strokes share the same pattern phase; zoom/pan never change paint coordinates. The original 1024/1254-pixel fixture images were retained, without converting them to tiny repeating source textures. Brush masks have one sample per logical pixel, in 64×64 chunks. PNG 2× scales that logical raster, rather than adding mask detail.

One editable, map-wide **Texture paint** layer appears in Layers after painting, with independent visibility, lock and opacity. It is above filled Areas and below other objects. Visible filled Areas define the surface mask when present; otherwise the map base is valid. Hidden floors do not expose paint. Floor geometry/materials, room structure, walls, openings and stamps remain unchanged. It does not add one paint layer per room or follow object-layer Solo.

The existing stroke infrastructure supplies interpolation, softness, strength buildup, cross-tile Blend and temporary previews. A drag commits once. Escape, capture loss and window blur cancel unfinished paint; Space/middle-button navigation retains precedence. Erase removes only the paint coverage and reveals the base. Blend smooths coverage over a three-pixel neighborhood, without blurring the source artwork or adding a bright halo.

Undo/redo retains editable masks and source references. Local save/reopen, `.mapweaver` ZIP and verified backup restore preserve paint. ZIP import remaps material IDs and tile keys when assets receive new IDs. Asset deletion protects current paint, and deletion of history-only references invalidates the affected history. Fully erased material combinations are pruned.

## Important files

| Area | Files |
| --- | --- |
| Tool, logical controls and layer UI | `src/app/TextureBrushTools.tsx`, `ToolRail.tsx`, `LayerTreePanel.tsx`, `SelectionToolbar.tsx`, `editorUx.ts` |
| Capabilities, units, metadata and mask model | `src/domain/textureBrush.ts`, `terrainBrush.ts`, `terrainPaint.ts`, `mapCapabilities.ts`, `models.ts`, `mapSettings.ts`, `assetManifest.ts` |
| Stroke preview and common painting | `src/canvas/TerrainBrushController.tsx`, `TerrainBrushFootprint.tsx`, `TexturePaintNode.tsx`, `drawTerrainPaint.ts`, `drawTexturePaint.ts`, `MapContent.tsx`, `MapCanvas.tsx` |
| State/history | `src/store/textureBrushStore.ts`, `terrainPaintActions.ts`, `history.ts`, `editorStore.ts` |
| Library and asset lifetime | `src/library/chooseAsset.ts`, `assetRemoval.ts`, `src/storage/api.ts`, `remoteLibrary.ts` |
| Save/import/export | `src/projects/format.ts`, `archive.ts`, `session.ts`, `src/export/scene.ts`, `render.ts` |
| Local service and pack recommendations | `service/storage.ts`, `library.ts`, `libraryPacks.ts`, `removedAssets.ts` |
| Tests | `src/domain/textureBrush.test.ts`, `src/store/texturePaintActions.test.ts`, `service/texturePaint.test.ts` |
| Contract and usage | [ADR-0047](../adr/0047-battlemap-texture-paint.md), README, AGENTS glossary, asset-authoring fill/package guides, manifest JSON Schemas |

SQLite schema 9 adds only a nullable checked `patternScale` column, with a consistent backup before migrating an existing database. Manifest schemas 1/2/3 accept the recommendation only on fill patterns. Role copies/reset metadata clear it. The actual scale used by paint is stored in the project; embedded project assets do not retain library recommendations for future selections.

## Validation

- **38 client tests passed**: `npm run test -- src/domain/textureBrush.test.ts src/store/texturePaintActions.test.ts src/domain/terrainPaint.test.ts src/store/terrainPaintActions.test.ts src/library/assetRemoval.test.ts`.
- **21 service tests passed**: `npm run test:service -- service/texturePaint.test.ts service/library.test.ts service/terrainPaint.test.ts`.
- `npm run typecheck`: passed, client and service.
- Scoped ESLint across changed TypeScript/TSX files: passed.
- `npm run build`: passed, client, service and bundled-font resource check. Vite retains its warning about chunks above 500 kB.
- Focused real-Chrome browser workflow: library selection, material switching, two connected strokes, Paint/Blend/Erase undo/redo, Escape, equal world-space footprint at different zooms, layers, pan, save/reopen, floor masks, exports and performance passed. No browser page errors.
- Production-renderer pixel assertions: full Erase restores the base exactly; pixels outside floors and under hidden floors remain unchanged. Real table stamps, walls and doors remain above paint.
- Editor map content and normal PNG 1×/2× matched exactly in the tested 700×500 logical-pixel floor region, including material transitions and furniture. The brush cursor and editor controls are excluded from export.
- Three adjacent independently rendered mask tiles at scale 0.75 match a single global CanvasPattern with mean channel difference 0.0246/255, maximum 6/255 from Canvas sampling/rounding. There is no per-tile or per-stroke phase restart.

No unrelated full test suite was run. An additional **legacy Dexie migration test failed** (`service/migration.test.ts`): its model comparison checks an unnormalized format-2 recovery document against the current normalized document, which adds mapType/geography/objectGroups/layerTree. This legacy path was not changed in this sprint. It does not affect the passing current-project reopen/ZIP/backup checks. Original legacy source rows are retained; do not interpret this report as verification of that old migration path.

## Performance

Measured in local headless Chrome on this Windows host, using an isolated local service and original library images. These are fixture measurements, not guarantees for every map/device. The substantially painted fixture is 1000×800 logical pixels: 8 long strokes, 176 measured input samples, 208 populated tiles, plus prior multi-material paint and room artwork.

| Measurement | Result |
| --- | ---: |
| Mask data JSON | 447,739 bytes |
| Stroke sample processing, median / p95 | about 11 / 15 ms |
| Preview snapshot publication, median / p95 | about 0.6 / 1.3 ms |
| Time to next animation frame, median / p95 | about 15 / 22 ms |
| Completed-stroke commit, median | about 19 ms |
| Save / reopen substantially painted map | about 0.53 / 0.34 s |
| Project ZIP, including original images | about 7.7 MB; 0.26 s |
| Painted PNG 1× / 2× | about 0.51 / 0.31 s |

The second export benefits from warm caches; 2× is not intrinsically faster. The smaller stone example exported in about 0.18 s / 0.54 s. Texture tile cache identities use weak source IDs so cached logical tiles do not retain decoded images from closed projects. Unrelated object React subscriptions do not update for every mask sample, although the shared Konva layer redraw still incurs normal canvas work.

## Evidence

Artifacts are under `deliverables.local/Texture-Brush/`:

- `01-wood-wear.png`: connected wear on wooden planks, with tables above paint.
- `02-secret-passage.png`: Ancient Heartwood with Damp Root Earth, moss and dust.
- `03-stone-dirt.png`: stone wear and entrance dirt, with walls/door intact.
- `04-heavy-1280x720.png`: heavily painted fixture at the minimum desktop size.
- `stone-1x.png`, `stone-2x.png`: normal exported PNGs.
- `results.json`: exact final measurements, assertions, asset sources and isolated database path.
- Reproducible local browser harness: `.qa.local/texture-brush-browser.mjs`.

The exact Pale Palace Wood/Worn Light Planks/Pale Stone/Worn Stone names were not present locally. The wood/stone examples therefore use the existing warm/rough wooden planks, light paving stones and stained stone images. The secret-passage textures use the supplied existing sources. No source artwork was generated, recolored or redesigned.

## Limits and follow-ups

- One map-wide layer; no per-room targeting, paint objects or per-stamp painting. Any filled Area can act as a surface.
- Current budgets: 32 material/scale combinations, 4,096 tiles, 8,192 masks, 2 MiB encoded masks, 256 tiles touched per stroke, plus existing document/image limits. Long strokes beyond the budget are cancelled with a message.
- Blend smooths coverage locally; it is not large-radius texture synthesis. Large mismatches in source color or non-tileable artwork remain visible. Author good tileable source materials.
- Recommendations are supplied through asset-pack metadata; no separate new recommendation editor was added to the asset details UI.
- Larger maps, many full-resolution materials and maximum brush sizes may need further profiling before raising budgets. Per-room layers, stochastic sampling and automatic wear remain deferred.

No push, merge, publication, deployment or other external action was performed. No Windows executable/package was built. User projects and the primary library were not modified by QA.

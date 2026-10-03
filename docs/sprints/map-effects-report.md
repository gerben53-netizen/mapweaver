# Sprint E — Effects and map frame

Status: complete (25 September 2026).

Acceptance: optional deterministic fog (whole map or existing Area), bounds-relative vignette, selective stamp shadow/glow, six centrally registered vector frame styles, conditional editable controls, history and persistence, unchanged legacy rendering, shared editor/1×/2× export, targeted tests and representative visual/performance evidence. No whole-map themes, automatic labels, external actions or Windows packaging.

Inspection: the existing layer ordering and shared painters are retained. Map-bound settings are preferable to a freely transformable Annotation for a frame which must follow resize. Fog is an explicit compositing boundary: only while enabled, annotations render after map artwork and fog. Stamp effects use a bounded local image cache; they never rewrite source assets or flatten the map. River-local halo retains Sprint D behavior.

## Architecture and delivered behavior

Optional `map.effects` version 1 contains fog, vignette and frame. Optional stamp `effects` version 1 contains shadow/glow. These extend format 12 through central admission; no database migration or new dependency. Absent fields retain old behavior. See [ADR-0031](../adr/0031-map-effects-and-frame.md) and the [user guide](../map-effects.md).

- Fog: four stable presets (Soft Mist, Dense Fog, Cold Mist, Arcane Haze), None, opacity, density, scale, softness and tint. A deterministic, non-tiling transparent cloud overlay is cached independently of map art. Whole-map scope or an existing Area mask, including holes. Hidden/missing masks produce no fog, not global fog.
- Vignette: Subtle Dark, Parchment Edge, Dramatic Dark and None; amount, normalized radius/softness and color. The elliptical gradient derives from current map bounds, so resizing retains configuration and adapts its shape.
- Shadow: opt-in on ordinary stamps, including editable generator output, with offset X/Y, blur, opacity and color. It uses a bounded local alpha-silhouette cache. It does not alter source assets or apply indiscriminately to all terrain.
- Glow: opt-in stamp color, radius, opacity and softness. Eight ring samples and local native blur create a padded cached silhouette. Existing River halo and annotation text halo retain their shared editor/export painters; those controls are not duplicated.
- Frame: Minimal, Classic, Parchment, Fantasy Ornate, Elven and Dark Ornamental. Each uses a stable `border.*` ID, vector edges, independent corner details and appropriate center motifs. Inset, thickness, opacity, tint and visibility are editable. Corners do not stretch with aspect ratio; tiny maps bound ornament size. It is a protected map-bound decoration edited in Map settings, not a movable layer object.
- UI/history: compact Map effects section and conditional Stamp shadow & glow Properties. Local drafts plus Apply make a single undo action. Editing is disabled during active history gestures; object lock state is respected. Stamps keep their original selection/transform geometry while effects can paint beyond it. Capturing a prefab excludes map-bound effects/frame but preserves stamp effects.

Normal layer order stays exact with fog off. With fog on, relative artwork order is preserved, followed by fog and then annotations (including places, labels and cartographic elements) in their relative order. Stamp effects are under their own stamp in its layer. Above-art grid/corner export scale bar, then vignette/frame, follow the artwork. Editor chrome stays last and is excluded from export. Frame/vignette can cover text at extreme map edges; users should keep text inside the frame inset.

## Validation and evidence

All final checks passed:

- **59 targeted tests / 9 files:** mapEffects, EffectSettings, terrainStyles, export, mapSettings, riverAppearance, prefabs, MapCanvas and canvasEditing. Covers preset/field validation, legacy absence, archive round-trip, fog ordering, resize/aspect ratios, stamp-only admission, undo/redo, disabled controls, prefab isolation and existing selection/transform/pan behavior. The older canvas test mock was updated to include Shape; its stale Escape expectation now matches the documented clear-selection behavior.
- **Scoped ESLint:** 19 changed TypeScript/TSX implementation/test/fixture files.
- **Typecheck and production build:** client and local service pass; eight bundled font/license checks pass. Vite gives an advisory approximately 505/508 kB chunk warning, not a build failure.
- **Browser:** `node tests/persistence/map-effects.mjs` uses an isolated local service/data directory and headless Chrome at 1440 × 1000. Real UI edits, map/stamp Apply, undo/redo, an actual styled-stamp mouse drag, map resize/undo, save/reload and no page errors. Fixture assets are imported into that isolated local service.
- **Pixels:** Area mask and holes, missing mask, disabled effects, visible shadow outside the object rectangle, glow, all six frame presets at three aspect ratios (18 cases), transparent frame centers and full editor/PNG comparison. Both 1× and 2× exported map pixels match the cloned editor artwork exactly (maximum and mean channel differences both zero). Selection overlays are absent.

The 1200 × 800 representative map has textured terrain, 120 ordinary mountain/forest stamps, three styled rivers, title, compass and label: 128 objects total. Regional fog, mild vignette, selective shadows, one glow example and an ornate frame were compared with an unstyled baseline. Visual inspection confirmed readable annotations, restrained framing, visible shadows and no frame seams. The Area mask edge intentionally remains crisp.

Latest evidence directory: `.qa.local/map-effects-1790368121425` (ignored local QA data).

- [Before effects](../../.qa.local/map-effects-1790368121425/baseline.png)
- [Editor](../../.qa.local/map-effects-1790368121425/editor.png)
- [Map Properties](../../.qa.local/map-effects-1790368121425/map-properties.png)
- [Stamp Properties](../../.qa.local/map-effects-1790368121425/stamp-properties.png)
- [1× PNG](../../.qa.local/map-effects-1790368121425/effects-1.png) and [2× PNG](../../.qa.local/map-effects-1790368121425/effects-2.png)
- [Wide Elven frame](../../.qa.local/map-effects-1790368121425/border.elven-1600x400.png), [Dark Ornamental frame](../../.qa.local/map-effects-1790368121425/border.darkOrnamental-1200x800.png)
- [Measurements](../../.qa.local/map-effects-1790368121425/results.json)

The first scene render with newly decoded stamp images took 10 ms; five repeated renders took 6.3–7.0 ms on this machine. These are local scene-render timings, not an end-to-end frame-rate guarantee. Fog cache is capped at four overlays with a 1024-pixel long edge; stamp tiles at a 2048-pixel edge, 16 million pixels total and 128 entries. Changing unrelated UI state does not regenerate their pixel content.

The full unrelated suite and Windows packaging were not run. Personal project storage was not touched. During documentation work a text-encoding write error emptied README; it was restored byte-for-byte from the latest local Sprint D Git blob before appending the new section. No previous README content was discarded.

## Changed files

Domain/storage: `src/domain/mapEffects.ts`, `models.ts`, `mapSettings.ts`, `prefabs.ts`, `src/projects/format.ts`, `src/store/effectActions.ts`.

Rendering: `src/canvas/drawMapEffects.ts`, `drawStampEffects.ts`, `MapContent.tsx`, `EditableStamp.tsx`, `src/export/scene.ts`, `render.ts`.

Properties: `src/app/EffectSettings.tsx`, its CSS Module, `MapSettingsPanel.tsx`, `ObjectProperties.tsx`.

Tests: mapEffects/EffectSettings tests, canvasEditing mock/expectation, `tests/fixtures/mapEffects.ts`, `tests/persistence/map-effects.mjs`. Documentation: README, AGENTS glossary, ADR-0031, guide, this report and program status.

## Limits and Sprint F handoff

One whole-map or Area-masked fog field; no animated weather, feathered Area-mask edges or independent localized fog objects. New shadow/glow controls support ordinary stamps, not Scatter containers, Areas or annotations; those retain their existing applicable styles. The map frame is always protected from canvas manipulation and has no free layer membership or unlock/move mode. Custom frame images, per-side visibility and imported frame resources are not included. Large enlarged raster silhouettes can reveal the bounded cache resolution. Artwork outside map bounds is intentionally clipped.

Sprint F may compose the stable `fog.*`, `vignette.*`, `border.*`, `shadow.softTerrain` and `glow.arcane` IDs with existing terrain/river presets. Copy concrete values in one deliberate, undoable operation; define preserve/customize/reset behavior explicitly and never apply a theme while loading existing documents. Retain the shared rendering order, cache budgets, mask semantics and editor/export tests. No whole-map theme composition or automatic labeling has been started.

No external actions (push, release, upload to external services, deployment or cloud changes) were performed. No Windows package was created. There is no develop branch in this untracked checkout; no branch or Git history changes were made.

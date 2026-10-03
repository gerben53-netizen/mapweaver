# Stamp Soft Shadow — 28 September 2026

## Acceptance and result

Implemented optional, directionless contact shadows for placed Stamp objects, based on the real image alpha silhouette. Global Off/On plus intensity; per-stamp Default/On/Off; transforms, history, persistence, 1×/2× export and an OFF/ON room benchmark validated. Existing maps and new maps remain Off unless enabled. No user data reset, external action or Windows package.

## Rendering and defaults

The existing shared editor/export stamp-effect painter caches a padded alpha-only tile. Eight symmetric samples approximate a small spread, followed by native blur. No net offset, light source, elevation or directional computation. The pass opacities compose to the selected intensity. It renders immediately beneath its own stamp image in the existing object/layer order; higher objects can cover it.

Defaults: global Off, intensity 25%; spread 2 px and blur 6 px at a 100 px short-side stamp. Sizes multiply by `clamp(sqrt(min(width,height)/100),0.25,4)` in map space. This keeps small props subtle and scales larger ones conservatively. Rotation/mirroring reuse the tile; settled dimension changes recalculate. The same at-most-2× tile is sampled by editor and exports, with a 2048 px edge cap.

The cache remains bounded to 512 tiles / 16 million pixels. Image, size and style changes invalidate the relevant key; translation, rotation, mirroring and object opacity reuse it. No full-map blur or extra Konva layer per stamp.

## UI and persistence

- Map → Effects & map frame → **Stamp Soft Shadow**: Off/On, Intensity (%), existing Apply map effects.
- Stamp Properties → Appearance → Stamp shadow & glow → **Soft Shadow**: Default/On/Off, existing Apply stamp effects.
- Default follows the map; On overrides its enable switch; Off excludes rugs/floor decals. Intensity is always global, so intensity zero hides forced-On shadows too.
- Optional `map.effects.stampSoftShadow` and `stamp.effects.softShadow` extend existing validated version-1 effect records in format 12. Missing settings remain absent on loading, visually Off. Existing configurable shadow/glow remains unchanged and can coexist.
- No new classification or asset metadata schema: flat assets are explicitly excluded per stamp. Existing free-form tags/categories do not provide a reliable physical-versus-flat default.

## Changed files

- `src/domain/mapEffects.ts`: optional data, validation, defaults and scale resolver.
- `src/canvas/drawStampEffects.ts`: cached contact silhouette and padding.
- `src/canvas/EditableStamp.tsx`, `src/export/render.ts`: map setting integration in the shared paint path.
- `src/app/EffectSettings.tsx`: minimal global and override controls.
- `src/domain/mapEffects.test.ts`, `src/canvas/drawStampEffects.test.ts`, `src/app/EffectSettings.test.tsx`: targeted tests.
- README and ADR-0031: operation and persisted optional-field contract.

## Validation

- 19 Vitest tests passed across the three changed test files: defaults/validation, controls, serialization, undo/redo, duplication, transform invariance, padding and bounded cache reuse.
- Typecheck passed (client and service), scoped ESLint passed for all eight changed source/test files, production build passed including service and font-license checks. Existing >500 kB chunk warning remains.
- Isolated local Chrome QA used existing Eryndor desk, table, chair, bookshelf, chest, candlestick and floor ornament on a lightened wooden-floor Area. Source images were not modified/generated. The floor ornament is Off.
- Real global UI interaction; actual multi-selection pointer drag and keyboard duplicate/undo/redo; 60 resize/rotate/mirror edit previews through the regular history pipeline; all passed.
- Automatic local save, manual save/reopen and editable archive encode/decode passed. Reopened 1× PNG is **byte-identical** to the pre-save export.
- Alpha-mask probe: no alpha in transparent image-bound corners; soft pixels beyond a circular silhouette; centroid (79.4998, 79.4960) around expected (79.5,79.5), no directional offset.
- Actual export scene 1× versus downsampled 2× has mean alpha difference 0.279/255; physical footprint is unchanged.
- Warm-cache 400 contact-shadow draws: about 1.3 ms. A headless Chrome canvas with 400 repeated rotated stamps measured median frame interval 19.5 ms, p95 32.3 ms over 30 viewport redraws. This is a local benchmark, not a hardware-independent frame-rate guarantee.
- No browser errors. No unrelated broad suite run.

## Benchmark / evidence

`deliverables.local/Stamp-Soft-Shadow/` contains:

- `benchmark-off-1x.png`, `benchmark-on-1x.png`: identical composition, subtle grounding around furniture; floor ornament unchanged.
- `benchmark-on-2x.png`: 2× output.
- `editor-off.png`, `editor-on.png`: UI screenshots.
- `reloaded-on-1x.png`: identical saved/reopened result.
- `browser-results.json`, `performance-results.json`: checks and local timing evidence.

QA scripts: `.qa.local/soft-shadow-browser.mjs` and `.qa.local/soft-shadow-performance.mjs`; separate service data under `.qa.local`, never production storage.

## Limits

Applies to ordinary placed/generated/grouped Stamp objects, not internal Scatter instances, walls, Areas or annotations. Flat-asset exclusion is explicit per stamp, not an automatic classifier. Cached silhouettes are resolution-capped for very large images. Baked outlines/shadows and stray source pixels remain part of the original artwork; the new effect does not retouch them. Grouping retains ordinary stamp rendering and z-order; no new group effect is introduced.

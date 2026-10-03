# Fill pattern scale and world dimensions — 24 September 2026

## Acceptance and findings

Deliver fractional live pattern sizing, stable pattern origin, matching editor/export density, world-first derived object dimensions, existing editable pixel dimensions, undo, and compatible project reads. No package or external action.

The reported `scale >= 1` constraint was not present in this checkout. Area and legacy-pattern validation already accepted **0.01–100**, and the renderer already multiplied native tile size by scale. The actual UI used a draft-only numeric field with `step="any"` and a generic Apply action, so typing a fractional value did not update the canvas. The new focused scale control gives immediate visual feedback and uses 0.01 arrow-key/spinner increments. There was no existing slider to preserve.

## Changes

- `app/AreaPatternScale.tsx`: live repeat-scale input, explicit min/max, accessible error/hint, Enter/blur commit, Escape rollback. All valid changes during one field edit are one existing history transaction; incomplete/invalid input never reaches the renderer. Window blur completes a valid edit or cancels an invalid one. Stretch disables this control and retains repeat scale.
- `app/AreaProperties.tsx` / `ObjectProperties.tsx`: remove the duplicate deferred scale field; mount the live control independently of the existing appearance form's draft lifecycle. Rotation, offsets, and other appearance settings retain their existing Apply workflow.
- `domain/mapScale.ts`: extract the existing `metersPerPixel` and `unitMeters` from decorations into a dependency-light shared module. Placement, scale bars and derived dimensions now share these conversions. Decorations re-exports the original API for existing callers.
- `app/WorldDimensions.tsx`: show Width/Height with world units prominently and logical pixels below. Stamp Transform retains its editable pixel inputs. Other single-object Properties show the same local geometry dimensions. No new aggregate semantics for multi-selection. Without a physical scale, only pixels appear; regional/world maps use their configured km/mi scale.
- `library/AssetDefaultSummary.tsx`: show known library defaults in the existing secondary Asset settings section. Failed/unavailable metadata requests do not fabricate defaults. Values refresh after library changes; existing objects never resize because a default changed.
- `domain/areas.ts`: reuse the existing pattern-scale constants instead of duplicate bounds. `projects/format.ts` defaults an omitted area/legacy pattern scale to 1 at the read boundary; explicit zero, null, negative and out-of-range values remain invalid.

## Geometry, rendering and compatibility

World size = `logicalPixels × metersPerPixel(map) / unitMeters(displayUnit)`. On battlemaps this is `logicalPixels / cellSize × distancePerCell`. Feet and metres follow the configured physical grid unit; no zoom, DPR or export multiplier enters this calculation. Width/height use the same local full extents as their pixel counterparts, including rotated stamps. Rounded display values never write back into geometry.

The repeat renderer was not changed. It uses one native repeating CanvasPattern with a continuous DOMMatrix; it does not create one object or draw call per tile. Scale multiplies the tile size after the stable frame translation, offsets and rotation. The exact frame, offsets, geometry and affine transform remain untouched by scale edits. The established **0.01–100** range is retained to avoid rejecting existing fractional values; 0.5 means half-sized tiles, not twice-sized tiles. Tiny periods can naturally lose detail through raster sampling, but do not allocate an unbounded tile list.

Editor and PNG export still share `paintArea`; export resolution affects pixel density only. Existing stored values and schema versions are unchanged. Missing scale reads as original size; there is no database migration or rewrite. The repository has no existing develop branch (unborn master); existing untracked work was preserved.

## Validation

- **61 tests pass**: `npx vitest run src/app/scaleUx.test.tsx src/domain/worldStampSizing.test.ts src/domain/areas.test.ts src/domain/decorations.test.ts src/domain/patterns.test.ts`. Coverage includes fractional bounds and invalid values, JSON parse/reload, missing legacy/area scale, stable frame/offsets, live update, grouped undo/redo, Escape, feet/metres, map-scale change, local geometry resize and zoom independence. Stamp placement and the displayed inverse conversion agree for 5/10/20 ft cases.
- `node tests/persistence/pattern-world-scale.mjs`: isolated service and Chrome, actual imported striped fill. At DPR 1 and 2 and scales 1 / 0.5 / 0.25 / 0.1 / 0.75, sampled repeat intervals match source width × scale in both the editor and 1×/2× PNGs. All sampled interior pixels are opaque; frame and geometry match before/after. UI invalid input, Escape, undo/redo, service save/reload, editable pixel width, a real corner-handle drag, 400% zoom and map-scale edits pass. Evidence: `.qa.local/pattern-world-1790283631719/` (ignored local output).
- Scoped ESLint passes for modified TS/TSX and the browser workflow.
- Production build passes, including client/service TypeScript checks and font-resource validation. Final build repeated after the missing-legacy-scale read default and spacing adjustment. No full unrelated suite or Windows packaging run.

## Limits

World dimensions are read-only derived values; pixel fields remain authoritative. The browser texture is deterministic opaque stripes, not every possible imported texture: seams already present in an image are not repaired. Very fine subpixel texture detail can alias. The independent Project assets default-metadata limitation noted in the previous sizing investigation is outside this sprint.

No user data was changed by tests. No push, merge, release, upload or deployment occurred.

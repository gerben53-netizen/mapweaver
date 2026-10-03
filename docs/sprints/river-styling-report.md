# Sprint D — River/path styling

Status: complete (25 September 2026).

Acceptance: five centralized river presets, logical arc-distance taper modes, bounded non-destructive smoothing, outline and soft halo, conditional live Properties, stable node editing/history, unchanged legacy paths, new-world defaults, shared editor/1×/2× PNG, targeted tests and measured visual/performance evidence. No map effects, borders, labels, external actions or Windows packaging.

Gap analysis: existing river RouteSettings already provide physical width references, arc-distance taper, bank ribbon, round joins/caps, opacity compositing and shared paintRoute. Shared Paths already provide Bézier handles, insertion, transforms and screen-sized hit strokes. Borders have a bounded halo, but rivers have no halo, preset registry or non-destructive automatic smoothing. These are the bounded extensions for this sprint. No develop branch or CODEX.md exists in this checkout; work stays in the current untracked checkout.

## Delivered architecture and behavior

Rivers remain native editable Paths with existing River RouteSettings. Optional, validated `route.appearance` version 1 adds width mode, smoothing, outline enablement and halo settings; project format remains 12. Existing width, unit/reference, surface, opacity and preset ID fields are reused. No database migration or transient editing state is added. See [ADR-0030](../adr/0030-river-appearance.md) and the [user guide](../river-styling.md).

- Central presets: Minimal River (`minimalRiver`), Fantasy River (`fantasyRiver`), Parchment River (`parchmentRiver`), Bright Water (`brightWater`), Dark Water (`darkWater`). Presets copy concrete values and retain a source ID for future themes.
- Width: Uniform, downstream taper (start at one quarter of end), or Manual endpoints. Interpolation uses accumulated centerline distance and existing physical-unit conversion, independent of zoom/export resolution.
- Smoothing: Off/Low/Medium/High derive bounded Catmull-like Bézier handles without changing stored nodes. Handle lengths, forward projection and perpendicular displacement are clamped; repeated nodes and sharp reversals remain unsmoothed. Explicit user handles take precedence. Inserting/splitting explicitly materializes derived handles to preserve the visible curve.
- Rendering: halo, outline, then main ribbon with round caps/joins. Halo uses at most five nested finite-width passes, avoiding full-canvas blur. Existing compositing applies object opacity once. Bounds include visible halo; hit paint excludes halo and retains the practical minimum screen-space hit width. Editor and PNG use the same renderer.
- Properties: conditional River panel with live presets, widths/units, smoothing, color, opacity, outline and halo controls. Numeric edits form one undo gesture; Escape cancels. Node editing remains separate, with styles disabled during an active node edit. Existing texture controls remain available.
- Generator: the styled-world pass applies Fantasy River to newly generated rivers. Plain generation remains plain. Saved rivers are never restyled automatically. Existing metadata and direction are retained; no flow-order schema is introduced.
- Compatibility: absent appearance fields keep the original renderer/geometry behavior, including any previously configured taper or bank. Ordinary paths, roads and borders keep their controls and appearance.
- Related correction: a pending autosave no longer finishes a subsequently started node edit. It waits until the history gesture ends, and still saves earlier committed changes if the gesture is cancelled.

## Files changed

New domain modules: `src/domain/riverAppearance.ts`, `riverPresets.ts`, and `riverAppearance.test.ts`. Extended `routes.ts` and `paths.ts` for validation, widths, bounds, derived geometry, insertion, splitting, reversal and transforms.

Presentation/rendering: `src/canvas/drawRoute.ts`, new `src/app/RiverProperties.tsx` and its tests, `ObjectProperties.tsx`, `ObjectProperties.module.css`, `PathProperties.tsx`, and `src/world/styleWorld.ts`.

Persistence correction: `src/projects/localSession.ts` and its regression tests. Browser evidence: `tests/fixtures/riverStyling.ts` and `tests/persistence/river-styling.mjs`. Documentation: ADR-0030, river guide, path geometry architecture, this report, program status, README and AGENTS glossary.

## Validation

All checks passed:

- 58 targeted Vitest tests across `localSession`, `RiverProperties`, `riverAppearance`, `paths`, `routes`, `terrainStyles` and `WorldWizard`. Coverage includes legacy admission, presets, modes, interpolation, smoothing bounds, transforms, insertion/removal/splitting, draw order, halo bounds/hits, conditional/live UI, undo/redo and the autosave race.
- Scoped ESLint on the 14 changed TypeScript/TSX source, unit-test and fixture files.
- Production `npm run build`, including TypeScript, client/service builds and eight font checks. Vite reports an advisory approximately 504 kB chunk-size warning; the build succeeds.
- `node tests/persistence/river-styling.mjs`: isolated local service/browser run, live styling, actual node drag, undo/redo, pending-autosave edit stability, save/reload, legacy pixel identity and 1×/2× editor/export comparison. No browser errors. Personal project storage was not used.

The representative map contains a long main river, two narrower tributaries, multiple bends, and textured grassland/forest. Screenshots and exported PNG were visually inspected: gradual downstream widening, rounded bends, restrained outline/halo, and no exported selection chrome. The test uses opacity 0.85 to exercise compositing as well as smoothing and halo softness.

Editor/export pixel comparison on the isolated river has maximum channel difference 1/255 at both resolutions, mean difference 0.00014896 at 1× and 0.00008216 at 2×. Legacy appearance comparison is exact. A batch of 100 styled rivers took 115.7 ms cold and 75.8 ms warm in this run (103 geometry samples for the representative river). These are local batch timings, not a frame-rate guarantee.

Evidence (local, ignored QA directory):

- [Editor screenshot](../../.qa.local/river-styling-1790366728024/editor.png)
- [Properties screenshot](../../.qa.local/river-styling-1790366728024/properties.png)
- [1× PNG](../../.qa.local/river-styling-1790366728024/river-1.png)
- [2× PNG](../../.qa.local/river-styling-1790366728024/river-2.png)
- [Measurements](../../.qa.local/river-styling-1790366728024/results.json)

The full unrelated test suite and Windows packaging were not run.

## Limits and Sprint E handoff

Smoothing is a bounded local interpolation, not a global topology solver; explicit handles deliberately override automatic smoothing. Halo softness is a finite five-band approximation, not Gaussian blur. The map boundary still clips artwork outside the map. Confluences use ordinary route compositing and may show a junction outline seam; no hydrology/network renderer was introduced. Generator metadata has no persistent stream order, so taper remains local to each path; branch-aware widening is a documented follow-up.

Sprint E can build map-level Effects and Map Border separately. Keep path-local appearance, finite bounds, shared editor/export rendering and history gestures intact. Do not retroactively apply new themes/effects to saved river styles. The central preset IDs are ready for later theme selection. Automatic labels are not implemented.

No external actions (push, release, upload, deployment or cloud changes) were performed. No Windows package was created.

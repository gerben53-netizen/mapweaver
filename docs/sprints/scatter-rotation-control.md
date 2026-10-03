# Scatter Rotation Control — delivered 28 September 2026

## Acceptance

Inline None/Random/Range between Spacing and Paint; per-source orientation; signed validated offsets; new World/Regional None and Battlemap Random; deterministic independent RNG channels; unchanged legacy rendering/recipes; save/reopen and single-step undo/redo; usable desktop/narrow layouts. No new modal, Properties section, external action or Windows package.

## Implementation

- `src/domain/scatter.ts`: optional validated rotationMode and frozen source rotation; explicit legacy branch; map-type defaults with explicit override precedence. Engine-1 channel 6 remains rotation-only. None does not sample it. Source angle plus offset is normalized for existing renderers (−10° = 350°).
- `src/app/ScatterRotation.tsx`: shared compact control, help per mode and conditional signed Min/Max drafts. Enter/blur commits only valid ranges. Existing ScatterFields reuse the same control; no new modal or inspector section. Align to stroke is disabled for explicit None/Range; Random and legacy retain alignment behavior.
- `src/app/ScatterTools.tsx`, `Scatter.module.css`: toolbar placement, selected matching-source regeneration through existing history/worker guards, compact single row with horizontal overflow at narrower widths. Recalculating source sizes preserves frozen source angle.
- `src/store/editorStore.ts`, `mapToolContext.ts`, `src/projects/session.ts`: transient defaults on new/open session or map-type change, without modifying existing object recipes.
- `src/canvas/useScatterDrawing.ts`: source comparison includes frozen size/orientation, consistent with toolbar target matching.
- README and ADR-0014 describe usage and optional persisted fields. Current document/engine versions remain unchanged; no migration or load-time regeneration.

None preserves the original image orientation and any per-source frozen angle. The current asset authoring model has **no separate default-angle metadata**; ordinary library stamps therefore use angle 0 relative to their original artwork, just like direct placement. Nonzero angles were tested through source recipes, not invented library metadata. No asset authoring UI was added.

Explicit Random samples a full turn using the original seeded channel, preserving old full-turn results for zero-oriented sources. Range adds only the requested signed offset to the source angle. Bounds collision/Area clipping can legitimately produce different accepted instances when their rotated rectangles differ; asset/position/scale random channels themselves remain unchanged.

Current recent sets (`scatter-presets`) contain only IDs/weights and leave the selected rotation unchanged. The default resolver applies supplied explicit recipe settings after map-type defaults. No unsupported new preset editor/storage was introduced.

Saved instance arrays remain authoritative. Missing mode uses the exact previous min/max/tangent formula and remains absent on round-trip; no source angle is retroactively introduced. Global edits of a selected matching-source object regenerate in one undo action. Unapplied toolbar settings are transient; the eventual stroke/Area application is undoable.

## Validation

- `npx vitest run src/domain/scatterRotation.test.ts src/domain/scatter.test.ts src/app/ScatterRotation.test.tsx src/app/map-context.test.tsx`: **32 passed**. Includes toolbar order, conditional controls, rejected drafts, source angles, all modes, RNG stability, map defaults/overrides, pinned legacy output, parsing, exact undo/redo and persistence.
- `npm run typecheck`: passed (client and service).
- Scoped ESLint on all changed TypeScript/TSX source/test files: passed.
- `npm run build`: passed, including service and eight font-family/license checks. Existing >500 kB chunk warning remains.
- Isolated local Chrome QA (`.qa.local/scatter-rotation-browser.mjs`): real pointer strokes on World and Regional with existing mountain/capital artwork and source angles 0/15/−10; all orientations verified. Actual toolbar Random/Range regeneration, rejected range, exact undo/redo, same-seed regeneration, local-service save/reopen all passed. No browser errors.
- Layouts: 1440×900, 1280×720, 1000×720; one row, no page overflow, controls reachable by horizontal scrolling. Browser checker initially observed the asynchronous worker too early; waiting for completion resolved the assertion without changing application history.
- No unrelated full test suite, package build, push, merge, publication or deployment.

## Screenshots and evidence

Stored in `deliverables.local/Scatter-Rotation/`:

- `world-map-none.png`: final toolbar and directional World stamps.
- `regional-map-none.png`: Regional None result.
- `range-desktop.png`: Range controls and result.
- `range-1280.png`, `range-1000.png`: compact layout validation.
- `browser-results.json`: successful checks and isolated QA data directory.

Existing map compatibility is verified by the pinned engine-1 fixture and exact parser round-trips; no claim of inspecting every personal project. User production storage was not used for QA. No new images were generated.

# Sprint 3 — Single-object editing

## Acceptance scope

Single selection, clear on empty canvas/Escape, map-coordinate dragging, proportional corner scaling, free/Shift-snapped rotation, two explicit mirror actions and validated numeric X/Y/rotation. Preserve the existing viewport and import/library/placement integration. No history, multiselection, deletion, persistence or export.

## Model and interaction decisions

- Selection is `editorStore.selectedObjectId` only; document objects contain no selection flag.
- X/Y retain the unrotated rectangle's top-left semantics. Rendering uses a centered outer Konva Group with half-width/height offsets. An inner image carries the existing scale signs, so mirroring preserves the pivot even on a rotated object.
- Width and height are positive rendered map-unit dimensions; outer Konva scale is normalized to 1 after every gesture. Mirror signs are exclusively ±1 in `scaleX`/`scaleY`; no competing boolean fields were added. Rotation is normalized to `[0, 360)`.
- Resize minimum: 8 map units on both dimensions, with a common scale factor. Transformer boxes are absolute canvas pixels, so the minimum is multiplied by the current zoom. Rotation of an already-small imported image is allowed; moving/rotating it does not enlarge it. Handles cannot accidentally reflect images.
- The real Konva Transformer attaches to exactly one registered outer group. It sits outside the map clip so its controls remain usable at the map edge. Attachments are cleared on selection changes, node removal and unmount. `forceUpdate` synchronizes the group bounds after baked dimension changes; a real-Konva geometry test checks alignment without pixel snapshots.
- React rendering props are frozen only during Konva's active gesture. Model previews update the property panel; completion resets temporary node scale/offsets to the canonical model. `beginObjectEdit` captures the initial object and `commitTransform(before, after)` is invoked once for a changed completed gesture. No history stack or event framework was added.
- Native capture listeners arbitrate pan before Konva's mouse handlers. Middle drag or Space drag consumes the pointer's mouse start. Space taking over an existing edit finishes that edit, stops Konva dragging/transforming and starts viewport pan. Blur/cancel clears interactions. Wheel zoom is ignored during an active object gesture.
- The properties component subscribes to the selected object. The shell subscribes only to map identity/object count, and asset-name lookup depends only on asset ID, not pointer frames.

## Validation

Only these six test files were run for Sprint 3 (41 distinct tests):

- `src/domain/transforms.test.ts`: normalization, ratio/minimum, model/node conversion, rotation/snapping, both flips, numeric validation, real Konva attachment/zoom/pan/resize geometry and absolute resize bounds.
- `src/store/objectEdits.test.ts`: single temporary selection, one completed mutation boundary and invalid model input rejection.
- `src/app/ObjectProperties.test.tsx`: keyboard property edits, invalid values, stable accessible field labels and reversible flips.
- `src/canvas/canvasEditing.test.tsx`: selection/attachment/deselection/Escape/unmount, drag conversion at 1%, 50% and 400%, normalization, Shift snapping, pan priority and mid-drag Space takeover. Konva rendering is mocked while its Group math is real.
- `src/canvas/useCanvasNavigation.test.tsx`: directly modified navigation lifecycle.
- `src/canvas/MapCanvas.test.tsx`: directly modified canvas and fit/resize integration.

TypeScript, the standard ESLint command and production build were also run. No full suite, unrelated import/storage tests or Playwright suite was run. Vite retains the existing non-blocking warning for the main bundle exceeding 500 kB (about 624 kB, 194 kB gzip).

Browser checks at 1280 × 720: single selection/switching, empty-canvas and Escape deselection, dragging at fractional zoom, proportional scaling with correctly updated selection bounds, free rotation, both flips twice without position change, normalized numeric rotation, rejected blank coordinates and selection alignment after zoom. The available browser controls cannot hold Shift/Space or the middle button while dragging. Manual Shift-snapping, both pan methods and pan/selection alignment therefore remain unverified manually; focused integration and real-Konva geometry tests cover these cases.

No push, merge, publication or deployment. The repository remains in the original uncommitted `master` worktree. The map is still session-only; library persistence is unchanged.

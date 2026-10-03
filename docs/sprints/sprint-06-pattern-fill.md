# Sprint 6 — Rectangular pattern fills

## Acceptance scope

An explicit Select/Pattern fill tool, library asset choice with thumbnail/name/readability feedback, normalized clipped rectangle drawing with grid corners and Alt bypass, and one independently editable area per drawing. Repeat/Stretch, internal scale/rotation/offsets/opacity and validated Apply properties; replacement image; generic layer and object management; exclusive interaction ownership and future undo boundaries. No history, file format, export, new asset storage or tile-object generation.

## Implementation

- `domain/models.ts`: `MapObject = StampObject | PatternFillObject`; existing `PlacedObject` is an alias. Existing stamp constructors/typed fixtures gain `kind: 'stamp'`. Patterns retain fixed literal orientation (0/1/1) for the existing shared transform adapter and separate editable internal pattern fields. Optional object locks are respected alongside layer locks. No persisted map format exists to migrate.
- `domain/patterns.ts`: rectangle normalization, clipping, central 8 px minimum, corner snapping, parameter validation, capability selection and pure native-pattern rendering props. Scale is 0.01–100, offsets finite, rotation normalized, opacity 0–1.
- `canvas/usePatternDrawing.ts`: native capture listeners after navigation; one pointer session owns an imperative preview Rect. Escape, blur, cancellation, tool/asset change and pan takeover discard the preview. Creation rechecks map identity and active eligible layer. No React update per pointer pixel.
- `canvas/PatternPaint.tsx`: one Rect using Konva's CanvasPattern inside a rectangular clip. Repeat never expands into tile nodes or map objects. Stretch draws one nonrepeating scaled source centered in the clip. Alpha is preserved. Shared `useImage`/image cache leases own decoding and URL revocation.
- `canvas/EditableStamp.tsx` and `MapContent.tsx`: shared object selection/dragging; patterns have independent rectangular resize anchors and no whole-object rotate/flip controls. Pattern paint compensates for the parent's temporary resize scale so repeat tiles do not enlarge during the gesture. Persisted bounds bake scale into width/height.
- `app/PatternTools.tsx`, `PatternProperties.tsx`, library thumbnails: explicit active tool, readable pattern indicator, validated atomic Apply form and replacement picker. Repeat scale/offset drafts remain available after switching back from Stretch. Toolbar reserves enough height to avoid shifting the canvas on ordinary tool changes.
- `store/projectStore.ts`: one creation, property application and asset replacement boundary; existing completed transform/group movement boundaries remain. Duplicate/paste copy metadata with new IDs, retaining the same asset ID. `store/patternAssets.ts` validates replacement readability and guards asynchronous selection changes. No history stack.

## Automated validation

Passed seven cases in `src/domain/patterns.test.ts`: all drawing directions/clipping/minimum/outside starts; both-corner snapping and Alt table (two cases); parameter validation/atomic rejection; independent resize and repeat/stretch rendering props; duplicate/paste metadata; type capabilities plus directly affected layer ordering/move/hide/lock/delete.

The requested manual pointer combinations were unavailable, and the attempted native drag did not create an area. One additional focused integration case in `src/canvas/patternDrawing.test.tsx` therefore covers the concrete ownership risk: reverse-direction creation and selection, Escape/blur cancellation, middle-button pan and Space takeover of drawing without creating extra objects. It passed. jsdom simulates pointer capture and uses a Konva Group's Node attribute API for the preview, without pixel rendering.

Commands: `npm exec -- vitest run src/domain/patterns.test.ts src/canvas/patternDrawing.test.tsx` (initial integration run failed because jsdom has no pixel canvas; corrected to Node-only preview and reran that file successfully); `npm run typecheck`; `npm run lint`; `npm run build`. Build has the non-blocking Vite warning for its approximately 654 kB / 203 kB gzip bundle.

No complete test suite, broad regressions, old Sprint 1–5 suites, Playwright, screenshots-as-tests or pixel comparisons were run.

## Manual browser round — incomplete

Using computer-use against the local Chrome app, observed the Select default, tool buttons, library Use as pattern actions, switching into Pattern fill, chosen asset thumbnail/name and ready-to-draw hint. The shell and empty map rendered.

One primary drag was attempted but produced no object. Its cause was not established: the Windows tool could not complete pointer diagnostics. Computer Use then stopped because it could not determine the current browser URL confidently enough to enforce its policy. No further UI actions were attempted; temporary diagnostic instrumentation was removed.

Still unverified manually: successful rectangle creation in multiple directions; snap/Alt; Repeat/Stretch pixels, seamlessness and alpha; parameter application and replacement; selection/move/resize; layer visibility/locks; duplicate/copy/paste/delete; both pan methods; final toolbar sizing. The control API has no held modifier/middle-button drag parameter. Automated model/ownership tests do not substitute for this visual check. Consequently the full manual acceptance criterion remains open.

## Limits and follow-up

Complete the listed browser checks before calling Sprint 6 fully accepted; investigate a real mouse drag first if it also fails. Rotated Stretch can leave transparent corners by design. There is no undo, map persistence or PNG export; these remain outside this sprint. No external push, merge, publish or deployment was performed.

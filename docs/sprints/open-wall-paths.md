# Open Wall Paths & Manual Openings

Completed 28 September 2026.

## Acceptance and implementation

Independent open walls must finish with Enter/double-click, support curves and manual linked openings, extend from either end, persist through save/reload and export identically. Closed walls require explicit closure; no Areas, rooms, floors or automatic merging are introduced.

Inspection confirmed that the native path model and Enter/double-click already defaulted to `closed: false`. The changes clarify the workflow and repair concrete interaction gaps:

- `usePathDrawing.ts`: switching Straight/Curved retains the active draft. Continue preserves existing opening centers and orientation at either endpoint. Backspace cannot erase the source geometry of an extension draft.
- `openings.ts`: bounded attachment conversion for explicit extension; no competing opening model.
- `projectStore.ts`: explicit closure changes retain attachment distances on surviving segments; removing an occupied closing segment is refused atomically.
- `WallTools.tsx`, `PathProperties.tsx`: explicit open-wall guidance, Open Path / Close Path in Geometry and reliable owning-layer selection for Extend.
- `OpeningTools.tsx`, `useOpeningPlacement.tsx`, `editorStore.ts`: direct Open passage placement using the existing door/passage contract. Width, projection, collision checks and linked ownership remain shared.

No renderer rewrite, persisted field change, migration or user data reset. Existing closed walls load untouched. Generated Living Root uses its existing free-end treatment and opening clipping.

## Validation

- `npx vitest run src/canvas/openWalls.test.tsx src/canvas/pathDrawing.test.tsx src/domain/openings.test.ts src/domain/walls.test.ts src/domain/generatedWalls.test.ts`: **39 passed**. Covers simple/generated mixed drawing, Enter/double-click, explicit close/open, attached openings, both extension ends, undo/redo, node edits, snapping and refusal of invalid changes.
- `npm run test:service -- service/openWalls.test.ts`: **1 passed**. SQLite close/reopen and real project ZIP export/import preserve open and closed walls plus manual openings.
- `npm run typecheck`: passed.
- Scoped ESLint on all changed TS/TSX files: passed.
- `npm run build`: passed (client, service, bundled fonts); existing large-chunk warning remains.
- Isolated Chrome browser exercise: actual pointer and keyboard creation of two 40-ft open walls, Enter and double-click completion, smooth-handle edits, one passage in A and two in B, extension, node movement and undo/redo. Second irregular curved corridor uses two additional independent walls. No Areas or rooms. No browser page errors.
- Autosave and explicit save/reload retain exact object data and **byte-identical PNG**. Editable `.mapweaver` roundtrip retains handles and attachments.
- PNG 1× **1400 × 1050**, 2× **2800 × 2100**; inspected editor screenshot and exported image. Downsampled 2× mean channel difference from 1×: **0.160/255** (antialiasing).

Local artifacts: `deliverables.local/Open-Walls/` contains the editor screenshot, 1×/2× and reloaded PNGs, `open-corridors.mapweaver`, browser results and pixel results. Browser test code: `.qa.local/open-walls-browser.mjs`. All storage was isolated under a new `.qa.local/open-walls-*` directory; owned browser/service processes were stopped.

## Boundaries

An opening still must fit one path segment. Ordinary node edits retain normalized positions and may be refused if a door no longer fits. Outside-aligned boundary walls require closure and have Open Path disabled with an explanation; no offset conversion or node rewrite is attempted. Split Wall was intentionally omitted as optional: linked openings already supply gaps. Living Root artwork remains the previously documented development pack.

No broad unrelated suite, Windows package, push, merge, deployment or external action was performed.

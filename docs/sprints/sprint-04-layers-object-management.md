# Sprint 4 — Layers and object management

## Acceptance scope

Layer creation/naming/activation/order/visibility/locking/deletion; active-layer placement; per-layer object order and cross-layer transfer; Shift multi-selection and shared translation; duplicate/copy/paste/delete; editable-field shortcut guards. Preserve single-object transforms and pan priority. No undo, grouping, lasso, multi-object transforms, persistence or export.

## Model and decisions

- Retain the existing canonical `objects` array to avoid rewriting working transform/import consumers. Array order is not render order. `layers` stores unique layer IDs and ordered object ID references; every instance belongs to one layer. No second mutable lookup or object membership field exists. Render order comes from reversing panel layer order, then resolving each layer's back-to-front object IDs.
- Dimensions/background remain in `map`; keeping layers beside them prevents layer edits from retriggering the existing fit effect. `createLayeredContent` adopts an existing flat object collection into Objects. There is no persisted project format to migrate.
- `selectedObjectIds`, `activeLayerId`, clipboard and consecutive paste count are temporary editor state. Clipboard snapshots preserve global back-to-front order and contain asset IDs, never image payloads. Offset is centrally 24 map units per axis.
- Store actions enforce visibility/locking independently of UI controls. Hidden layers mount no stamp nodes and acquire no stamp images. Locked layers render without listening/dragging. Hiding, locking and deleting clean selection. The last layer and locked layers cannot be deleted. Populated-layer deletion requires explicit confirmation with an object count.
- Normal object deletion deliberately has no confirmation/undo, following this sprint's explicit override of AGENTS.md. Library assets are never removed. Undo is deferred to Sprint 7.
- The single-object Transformer remains exclusive to a single selection. Multi-selection uses non-interactive per-object outlines and a joint axis-aligned boundary accounting for rotation. This avoids Konva Transformer's built-in multi-node drag proxy competing with the store's shared delta. A group gesture captures initial map positions, previews one delta and ends at one `commitTranslation` boundary. Other management actions each have a central store boundary; no history stack is implemented.
- Shortcuts are handled centrally and ignore editable descendants. Space pan uses the same editable guard. Group drag preserves selection; an ordinary click collapses it; Shift-click toggles it. Panning retains capture-phase priority.

## Validation

20 distinct tests passed in four narrowly related files:

- `src/store/objectManagement.test.ts`: six new compact cases covering layer/render order; hide/lock enforcement and selection cleanup; multi-selection/shared translation; duplicate/paste identity/assets/offsets; transfer/delete data preservation; editable shortcut guards.
- `src/canvas/canvasEditing.test.tsx`: one added integration case for Shift selection, shared drag and a single completion boundary when Space takes over. This directly modified file's existing selection/transform/navigation integration cases also passed (nine cases total). Konva drawing is mocked while group geometry is real; this does not replace visual validation.
- `src/store/objectEdits.test.ts`: three existing tests updated for the selected-ID array and layer fixture.
- `src/app/ObjectProperties.test.tsx`: two existing tests with a layer-aware fixture, checking the directly changed single-selection property panel.

Commands executed:

- `npm exec vitest run src/store/objectManagement.test.ts`
- `npm exec vitest run src/store/objectManagement.test.ts src/store/objectEdits.test.ts src/canvas/canvasEditing.test.tsx`
- `npm exec vitest run src/store/objectManagement.test.ts src/app/ObjectProperties.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

TypeScript, lint and production build pass. Vite retains the non-blocking >500 kB chunk warning (approximately 635 kB, 198 kB gzip). No dependencies were added. No full testsuite, unrelated import/storage/viewport tests, or Playwright suite was run.

## Manual validation limitation

The focused browser round could not be performed. The Computer Use tool stopped when it could not determine the current Windows browser URL with sufficient confidence to enforce its policy. No further UI automation was attempted. Consequently, layer UI operations, visual z-order, real Shift-click/group dragging, delete/duplicate/copy/paste UI, shortcuts in real browser fields, single-object transformation and the 1280 × 720 layout remain manually unverified in this sprint. The one additional integration case addresses the most important uncovered pointer risk; it is not claimed as a manual check.

The implementation and automated checks are complete, but the manual-browser portion of acceptance criterion 16 remains outstanding. Maps are session-only and deletion is not undoable. No push, merge, publication, deployment or other external action was performed. Existing uncommitted work was retained.

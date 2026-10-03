# Sprint 7 — Undo/redo

## Acceptance and mutation inventory (before implementation)

One completed gesture or applied form is one atomic history entry; no-op/cancel makes none. Undo/redo preserves exact identifiers, layer membership/order and pattern data; branching discards redo; a central 100-entry limit and clean-baseline API support future new/open/save workflows. Visible labeled controls and scoped keyboard shortcuts must leave text undo alone.

Historical actions: place/createPattern, transform/numeric/flip and group translation (completion only), applyPatternProperties/replacePatternAsset, deleteSelection/duplicate/paste/moveSelection/orderSelection, add/change/reorder/deleteLayer, applyMapSettings, setBackground. Preview updateTransform/translate/snapObjects belong to the current gesture transaction, not independent commands.

Excluded: copy, selection, active layer/tool/pattern choice, zoom/pan, messages, search/panel/form drafts, stamp/category import and library blobs. Direct store hydration is reserved for future new/open/recovery followed by resetHistory; it is not recorded by an implicit subscription.

Approach: structurally shared immutable snapshots of map/objects/layers at command boundaries, never the library or runtime resources. Current model actions already replace rather than mutate these values. Compare content once at completion for no-op detection. Background blobs remain in a separate session resource registry and are retained only while referenced by the current document or retained undo/redo states.

## Delivery and validation

Implemented the inventory above through `store/history.ts`, wrapped existing project actions, shared object-edit transactions, cancellation-aware canvas ownership, scoped central shortcuts and visible header controls. `images/backgroundAssets.ts` separately retains undoable background bytes; no URLs/nodes/images/blobs are stored in snapshots. ADR-0002 records the tradeoff. Clean comparison occurs at committed boundaries; previews are transient. `history.reset()` clears stacks and marks the current hydrated state clean; `markClean()` preserves history for future save integration.

Seven new cases in `src/store/history.test.ts` passed: exact state/IDs/order/background lifetime and clean point; many single/group previews and active undo blocking; compound layer deletion/pattern/map edits; branching; limit; no-op/invalid/cancel rollback; scoped Ctrl/Cmd shortcuts and editable controls. A test-target typing issue was corrected after TypeScript flagged `Element` instead of `HTMLElement`.

`npm run typecheck`, existing quick `npm run lint`, and `npm run build` passed. Production bundle approximately 657 kB / 204 kB gzip, with Vite's non-blocking >500 kB warning. No dependencies added. No full suite, broad regression run, old sprint suites or Playwright tests.

## Focused manual browser round

Verified in local Chrome: initially disabled Undo/Redo, add layer enabling Undo, a laagnaam draft making no extra command until Enter, rename undo restoring the previous name, a second undo removing the new layer, Undo disabled at the beginning, Redo restoring that layer, and next-action tooltip/accessible labels. A Ctrl+Z attempt with the name field shown did not undo the layer; native text undo and editor keyboard execution were not conclusively validated because later focus inspection showed browser address-bar focus. Automated shortcut guard tests passed.

The requested stamp drag produced no placement through Windows computer-use, as in earlier rounds. Thus the full requested chain of placement, transform, pattern edit, deletion and undo/redo remains unverified manually. No success is claimed for those visual/pointer checks. Model/transaction tests cover their history boundaries, but do not substitute for a real pointer acceptance round. The map contains only session test layer changes; library content was retained.

## Remaining limits

Manual acceptance of the full object/pattern chain and real focused-field keyboard undo remains open. History is session-only, capped at 100 steps, with no storage/export/timeline/library undo. Full map-setting restore uses the existing fit behavior; zoom and pan themselves are not recorded. Selection is cleaned rather than generically restored. Existing uncommitted work on master was preserved. No push, merge, publish, deploy or other external action was performed.

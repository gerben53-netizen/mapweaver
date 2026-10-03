# UX follow-up — Selection, Properties and contextual editing

## Goal and acceptance

Make selection unmistakable, separate finding objects from editing them, put identity and editable fields first, show only applicable bulk actions, retain direct manipulation/keyboard/history and current project compatibility. Preserve the existing shell, tool configuration, renderer, layer model and storage formats.

## Delivered

- Objects: selected background/accent plus checkmark; dashed keyboard focus distinct from selection/hover; compact selection count. Search, scope/type filtering, virtualized rows, keyboard selection and explicit Reveal remain. Single selections scroll only within matching filters; multi-selection does not auto-scroll.
- Shared display identity: Properties starts with name, type and layer. Duplicate display contexts (including same-named layers) receive list-order `Item N` context in both inspectors, without database IDs.
- Objects no longer includes Group, Transform, arrangement, layer assignment, Copy/Duplicate/Delete or Edit selection properties. Group expansion and Exit group remain navigation. Show/Unlock recovery controls remain for unavailable focused items because those items cannot enter normal selection; inherited restrictions still belong to their parent layer/group.
- Properties: primary controls first, then layer/order, specialist bulk controls, collapsed Asset settings, and secondary object actions. Stamp dimensions are editable and proportional around their center, using existing transform/history commands. Numeric fields track canvas changes. Geometry objects retain a single uniform transform section; Path flip controls were consolidated into it. Existing specialist forms retain their Apply/draft behavior.
- Group creation appears only for a supported multi-selection using the existing grouping validator. Align requires two objects; Distribute requires three. Single selection has no multi-object Group/Align/Distribute sections. Multi wall/label/Area controls require matching types. No selection renders only the empty state.
- Asset settings appears only for stamp-containing selections; save default is single-stamp only. Successful feedback expires after five seconds; warnings and failures remain dismissible. Removed the redundant persistent Ungroup success message.
- Full Layers responsibilities, Map settings and tool-specific controls remain in their existing locations. No model, schema, package or persistence-format changes.

## Important files

- `src/app/ObjectsPanel.tsx`, `ObjectsPanel.module.css`: browser responsibilities, selection and focus.
- `src/app/useObjectBrowserData.ts`, `src/domain/objectList.ts`: shared metadata and duplicate identity; metadata-only retrieval, bounded concurrency, stable row selectors.
- `src/app/ObjectProperties.tsx`, `ObjectProperties.module.css`: hierarchy, stamp dimensions, secondary controls and empty/locked states.
- `src/app/GroupControls.tsx`, `selectionContext.ts`, `LayersPanel.tsx`, `SelectionToolbar.tsx`, `PathProperties.tsx`: conditional grouping, consolidated transforms and arrangement.
- `src/app/App.tsx`: removes the former generic action block above Properties and mounts Properties when active.
- `src/library/AssetDefaultActions.tsx`, `src/app/OperationFeedback.tsx`, `src/store/managementActions.ts`: feedback behavior.
- `src/app/SelectionInspector.test.tsx`, `OperationFeedback.test.tsx`, updated `ObjectProperties.test.tsx` and `src/domain/objectList.test.ts`: focused regressions.
- `tests/persistence/ux-selection.mjs`: repeatable isolated Chrome acceptance checks; README updated.

## Validation

- Focused Vitest: **32 passed across 9 files**. Command: `npm test -- src/app/SelectionInspector.test.tsx src/app/OperationFeedback.test.tsx src/app/ObjectProperties.test.tsx src/app/ObjectsPanel.test.tsx src/store/management.test.ts src/store/arrangement.test.ts src/domain/objectList.test.ts src/library/resetAssetSizes.test.ts src/domain/selectionTransform.test.ts`.
- Covers selection identity/synchronization, duplicate names, single/multi/empty contexts, conditional grouping/alignment/distribution, unavailable selection guards, keyboard focus, no multi-scroll, numeric synchronization, proportional dimensions and undo, geometry scaling, asset applicability, and transient/dismissible feedback. Existing 1,000-row test verifies bounded rendering and no browser-list rerender on object movement.
- `npm run build:client`: TypeScript project check and Vite production build passed.
- Targeted ESLint on all changed TypeScript/TSX and the new browser script: passed.
- `npm run lint` was also attempted: five pre-existing errors remain in unrelated scripts: empty catch blocks in `lifecycle-browser.mjs:33`, `lifecycle.mjs:59`, `prefab-package.mjs:44`, and two unused bindings in `sprint23b.mjs:37`. These scripts were not changed.
- `node tests/persistence/ux-selection.mjs`: **7 browser checks passed**, no page errors. Actual Chrome on Windows, headless, isolated service/data on port 48009. Existing house project imported; canvas click/drag, list and Properties synchronization, resize/undo, duplicate context, bulk controls, keyboard navigation and save/reload exercised. Format remains 12. Screenshots at 1280×720 and 1600×1000 were visually inspected. Evidence is in `evidence/ux-selection-follow-up/`.
- No full test suite, service suite, native launcher validation, Windows packaging or unrelated broad checks were run. Browser tests exercised the existing local service; no service code changed.

## Decisions and limitations

- The requested develop branch does not exist: this workspace has an unborn master branch and all files are untracked. Work stayed in the current workspace; no branch creation, checkout, commit or reset was performed.
- Filters, collapsed groups and active layer are respected during automatic selection reveal. Explicit Reveal handles a filtered/collapsed/out-of-scope selection. This avoids surprising navigation, especially during multi-selection.
- Item numbers follow current object order and may change after reordering; they are display context, not persisted IDs. Long list labels are ellipsized with a name tooltip; Properties shows full identity.
- Stamp dimensions remain proportional, matching existing canvas behavior. No new nonuniform transform model was introduced. Specialist geometry/forms are retained instead of rewritten into a universal property editor.
- Quick Duplicate/Delete/Group in the existing canvas context toolbar remain available alongside lower-priority Properties actions; Objects itself has no second editor.
- No new Windows package was built. Existing packages and user data were not removed. No push, merge, publish, release, deployment or cloud action was performed.

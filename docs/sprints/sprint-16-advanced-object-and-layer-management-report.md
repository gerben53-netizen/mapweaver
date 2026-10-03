# Sprint 16 — Advanced object and layer management

Completed 2026-09-23. Replaces the earlier partial report. Sprints 17–22 remain queued.

## Acceptance and model audit

Baseline: the supplied Sprint 16 brief covering same-layer groups, mixed transforms, arrangement, screen-space snapping, object management, hierarchical layers, atomic history, durable transfer, 1,000-object measurements and desktop Chromium at 1280 × 720. The user subsequently removed the requirement to support old versions/data. Existing small migrations remain; no new compatibility subsystem or data purge was necessary.

Objects remain central. Nonnested object groups contain unique IDs from one concrete layer and preserve their exact layer order, including noncontiguous members. The sole layer-order authority is layerTree, flattened depth-first front-to-back. Rendering reverses that layer order; each layer's object IDs remain back-to-front. Validation rejects dangling or ambiguous references, cycles, duplicate parents and depth beyond five. Commands deliberately prune deleted memberships; imports reject corruption.

## Delivered

- Group/ungroup, group selection, Enter/double-click editing, breadcrumb and Escape retaining selection; rename, membership, hide/lock, transform, duplicate, clipboard and delete. Each completed action is one undo step. Transfers move complete groups; an individually edited member must first leave its group.
- Shared uniform scale, rotation and reflection for stamps, Areas and Paths. Positive dimensions, relative path handles and canonical ring winding are preserved. Selection scaling includes strokes. An affine area pattern matrix keeps textures attached during rotation/reflection and later movement. Editor and PNG share the painter.
- Six alignments, horizontal/vertical equal-center distribution, matching width/height/size, and combined-selection map centering. First selection anchors alignment and sizing. Uneditable members cause whole-operation rejection. Width/height matching is proportional. Exact same size explicitly rejects mathematically unrepresentable rotated stamps or stroked bounds without partial changes.
- Snap targets built once per drag, sorted and queried by binary lookup. Edges, centers, existing path nodes and map center use eight screen pixels through the shared tolerance contract. Adjacent candidates provide bounded equal-gap labels. Object matches precede grid per axis; a single delta moves the selection. Alt bypasses all snapping, including at release. Hidden/locked targets are excluded. Grid, object snapping and guide visibility have separate controls. Guides never enter export.
- Objects inspector: active/visible-layer scope, names, search/type filter, collapsible groups, rename, hide/lock, membership, ordering and reveal-selection. Keyboard/canvas selection synchronize. Virtualized rows use metadata-only asset names; geometry previews do not rerender the list.
- Layer tree: bounded nesting, move/reorder, rename, inherited flags, transient Solo, subtree duplication and counted deletion. Deletion uses the existing accessible app modal, with cancellation and undo. The active layer stays concrete. Solo never changes persisted visibility or PNG.
- Format v5, history, SQLite autosave, recovery, portable files, cross-project clipboard and backup/restore preserve groups/tree. Clipboard retains source image blobs and remaps conflicting IDs. Clean-dataset import verifies remapped texture references and exact image bytes.

Key files: domain/grouping.ts, projectView.ts, selectionTransform.ts, arrange.ts, objectSnapping.ts, objectList.ts; store/managementActions.ts and project/editor/history/shortcut stores; app/LayerTreePanel.tsx, ObjectsPanel.tsx and GroupControls.tsx; canvas interaction/painter; project format/assets/session/archive; export scene. README, model documentation, shortcut reference, format v5, ADR 0010 and roadmap were updated.

## Validation

**116 distinct focused tests passed**, excluding duplicate reruns:

- 79 tests in 15 files: grouping, arrangement, snapping, list metadata, management/history/editor stores, canvas, Objects/LayerTree panels, workspace integration and clipboard assets.
- 2 selection-transform tests: affine texture attachment through reflection/rotation and later dragging; real path-node guide coordinates.
- 32 directly dependent tests: project archive, local session, recovery, export and object-edit transactions. Recovery now explicitly retains the cross-project clipboard.
- 3 native service tests: groups, paths and areas; revision rejection, portable transfer, clean-dataset import, image bytes, full backup extraction/validation and reopened data.

Client/service TypeScript and production builds passed. Scoped ESLint passed over domain, stores, app, canvas, changed project/export/storage files, service group tests and the browser runner. General npm run lint additionally exposed two pre-existing empty catches in tests/persistence/lifecycle.mjs and lifecycle-browser.mjs; those unrelated files were left unchanged. No broad unrelated suite or Windows packaging command was run.

Reproduce Chromium acceptance with `node tests/persistence/sprint16.mjs` after `npm run build`. It owns an isolated dataset and loopback service, checks its PID, authenticates writes, gracefully restarts/stops it and captures browser errors. Successful evidence: `.sprint16.local/1790195607507/`.

Passed browser checks: mixed grouping; joint dragging/map-center guide/Alt; scale/rotate/flip; enter/edit/exit; ungroup draw order; six alignments and both distributions; dimensions/map-center; search/filter/keyboard selection; nested layers/movement/hide/lock/Solo; subtree duplication; counted delete cancellation/confirmation/undo/redo; autosave/restart; portable export; virtualized 1,000-object search; 100-layer keyboard navigation; 100-member drag among 1,000 with equal deltas. No uncaught browser errors. No horizontal overflow at 1280 × 720.

Screenshots layer-tree.png, object-group.png and smart-guides.png were visually inspected: readable controls, preserved canvas space, visible group selection/guide and no overlapping editor controls. An additional interactive in-app Chromium pass checked the tree and layer duplication. A native confirmation blocked that browser-control connection; deletion was replaced with the existing app modal and then verified in Chromium/component tests. The temporary tab and service were closed. The full sequence is scripted Chromium acceptance plus screenshot review, not a claim that a person independently repeated all twelve workflows. Firefox, Edge and a newly packaged executable were not tested for Sprint 16.

## Measurements

Single local run: 1,000 small stamps sharing one image; 100 layers in ten groups. These are elapsed times, not frame-rate guarantees or a large-image stress claim.

| Check | Time |
| --- | ---: |
| Build 1,000 list rows | 2.02 ms |
| Pure search | 0.43 ms |
| Flatten 100 layers | 0.19 ms |
| Transform 100 objects | 1.39 ms |
| Build 1,000-object snap targets | 8.42 ms |
| 1,000 indexed snap queries | 10.84 ms total |
| Align 1,000 objects | 4.44 ms |
| Open Objects and choose visible-layer scope in Chromium | 656 ms |
| Browser search | 32 ms |
| Drag 100-member group through 12 automated pointer events | 580 ms including automation |

The DOM list contained fewer than twenty option elements. A React Profiler test observed zero list rerenders on position-only changes. Group normalization preserves metadata identity when membership/order is unchanged. No before/after speedup is claimed; these measurements establish the implemented baseline.

## Boundaries

Same-size refusal for unrepresentable shapes is intentional and atomic; same width/height remains available. Equal-gap targets are bounded adjacent pairs, not a combinatorial layout solver. Node guides expose existing coordinates/tolerance without introducing wall connections. Object groups remain nonnested and same-layer; layer nesting stops at five. Group scaling is uniform through Transform selection.

No known Critical/High defect concerning data loss, canonical draw order or editor hangs remains from this sprint. No external action, Windows package, push, merge, release, publication, deployment or upload was performed. Existing user data/distributions were not deleted; backwards compatibility is no longer required, as recorded in AGENTS and ADR 0010.

Final rerun: .sprint16.local/1790196214148/ passed the complete Chromium workflow again, now explicitly including Make same size after correcting path centerline/stroke-padding calculations. The final production build and scoped arrangement lint/tests also passed. The measurement table above retains the earlier baseline; the final run measured 664 ms browser list opening, 45 ms search and 527 ms for the automated group drag.

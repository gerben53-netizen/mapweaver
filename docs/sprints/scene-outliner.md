# Scene Outliner — delivery report

Completed 2026-09-28 on `develop`. Acceptance target: browse, find, reveal and reorganize an 80-object scene through one Layer → Group → Object hierarchy, preserving rendering, selection, history and saved relationships.

## Result

Scene consolidates the former Layers and Objects tabs; Properties and Map remain separate. Every object appears once. Concrete layers are top-level, object groups are level 1, grouped objects level 2 and ungrouped objects level 1. Layer headers have the strongest background/weight, a layer icon and active dot; groups have folders and intermediate weight; objects have dense 26 px rows with thumbnails or type icons. Keyboard focus has an outline distinct from selection/hover/active layer.

Scene is a full-height flex panel. Header/filter controls do not scroll. Its tree alone uses `flex:1; min-height:0; overflow-y:auto`; the Scene page and panel ancestors use hidden overflow. There is no 260 px nested Objects viewport. At 1280×720 the tree measures **439 px**, showing **16 complete rows**, versus the old compact viewport. A 960-pixel-high desktop shows roughly 26 rows. The inspector can still be resized.

Search, object-type filtering and All/Visible/Active layer scope retain matching ancestors. Search/type filtering opens required branches temporarily. Layer/group collapse state is editor UI state. Collapse all and Reveal selected are compact controls. Reveal clears filters, expands the selected object's layer/group and scrolls/focuses/highlights it; ordinary canvas selection does not force scrolling. Scene stays open while selection updates. Properties reads the same selection when opened. Ctrl/Meta/Shift toggles additional objects; layer activation never selects all children; chevrons only expand/collapse.

Direct eye/lock controls use stored flags. Inherited restrictions are disabled, subdued and carry parent/solo explanations. Existing layer-group inheritance remains effective. Stamp thumbnails lease the existing library cache lazily; no original-image fallback is decoded. Missing library references show a placeholder. Non-stamp icons distinguish Areas/Floors, Walls, Openings, Labels, Paths/Routes, Places, Compass, Legend and cartographic elements.

`sceneTree.ts` provides the pure projection/filter/traversal and transform-stable metadata selector. `sceneMove.ts` computes validated membership/order edits; `managementActions.ts` wraps each in one undo transaction. Object → Group, Object → Layer root, cross-layer Object moves and before/after sibling reordering work by native drag or context controls. Wall assemblies stay together across layers; unsafe opening-only grouping is rejected without mutation. No object geometry changes.

Frontmost objects appear first. Noncontiguous group members are collected under a group anchored at its frontmost member; this presentation never changes underlying paint order. F2, double-click, right-click and ••• support rename/actions. Up/Down, Left/Right, Home/End, Enter/Space and Shift+F10 provide tree navigation, activation and context actions. Browser field input and Ctrl+Z/Ctrl+Y remain available.

## Evidence

Local screenshots (ignored deliverables, not source assets):

- [Before: Layers](../../deliverables.local/Scene-Outliner/before-layers.png)
- [Before: small Objects viewport](../../deliverables.local/Scene-Outliner/before-objects.png)
- [After: 80 objects at 1280×720](../../deliverables.local/Scene-Outliner/after-80-1280.png)
- [After: search retains Layer + Group context](../../deliverables.local/Scene-Outliner/after-search-context.png)
- [After: 1000 objects at 1440×960](../../deliverables.local/Scene-Outliner/after-1000-1440.png)
- [Browser measurements and checks](../../deliverables.local/Scene-Outliner/results.json)

Chrome browser validation used an isolated temporary service/database and real Room Generator output named Bibliotheek, with 20 stamps in Boekenkasten, 15 in Meubilair and additional ungrouped objects to reach 80. The actual generator creates a closed wall path with its opening and floor, rather than four independent wall paths; this existing semantic model was preserved. Real cached library thumbnails were used. The user's running packaged service and data were not altered.

The eight required browser scenarios passed: full-height layout, exact hierarchy/uniqueness, visual types, contextual search, external selection plus Reveal, the three hierarchy drag destinations with undo/redo, inherited flags, and save/reopen. Save/reopen compared layer memberships, object groups and layer-tree relationships structurally. Additional 1000-object checks passed: bounded DOM, distant Reveal, Home/End, search and native sibling drag/undo. No browser page errors were recorded. Visual inspection confirmed the compact hierarchy and thumbnail/type treatments.

## Performance

Final local development-browser sample; timings include state population and two animation frames, therefore canvas work and scheduler variation as well as the Outliner. These are observations, not production latency guarantees.

| Objects | Population/render observation | Pure tree + filter | Logical tree rows |
| --- | ---: | ---: | ---: |
| 80 | 67 ms | 0.3 ms | 85 |
| 250 | 90 ms | 0.5 ms | 255 |
| 1000 | 277 ms | 0.8 ms | 1005 |

Initial unwindowed 1000-object observation was 1336 ms. That measurement justified a simple visible-traversal window above 250 tree nodes. It uses the same scroll container, fixed-height spacers and overscan; the measured 1000-object interaction had 34 mounted rows. Logical tree search and parent context remain complete. No general virtualization dependency was added.

## Validation

- `npx vitest run src/domain/sceneTree.test.ts src/app/SceneOutliner.test.tsx src/app/SceneThumbnail.test.tsx src/domain/grouping.test.ts src/store/management.test.ts src/app/LayerTreePanel.test.tsx src/app/ContextualInspector.test.tsx src/images/imageCache.test.ts`: **43 passed**, 8 files.
- `npm run typecheck`: passed. The final production build also reran both client and service TypeScript checks after subsequent changes.
- Scoped ESLint on App, SceneOutliner, SceneThumbnail, sceneTree, sceneMove, related new tests and touched editor/management/shortcut stores: passed.
- `npm run build`: passed, including service and eight bundled font-family/license checks. Vite retains its large-chunk advisory; no build errors.
- Targeted Chrome harness `.qa.local/scene-outliner-browser.mjs`: all scenarios above passed. No broad Playwright or unrelated full suite was run.

## Files and boundaries

Added: `src/domain/sceneTree.ts`, `sceneMove.ts`, `scene.fixture.ts`, `sceneTree.test.ts`; `src/app/SceneOutliner.tsx`, `SceneOutliner.module.css`, `SceneOutliner.test.tsx`, `SceneThumbnail.tsx`, `SceneThumbnail.test.tsx`; ADR-0049 and this report.

Updated: `src/app/App.tsx`, `App.module.css`; `src/store/managementActions.ts`, `editorStore.ts`, `shortcuts.ts`; README, inspector guide and AGENTS terminology.

Whole-group cross-layer dragging is deferred. Layer-group organization and map-wide paint remain in a secondary dialog. A project-only embedded stamp without its library thumbnail uses the missing placeholder in Scene while its canvas artwork remains available. Collapse/filter/focus are session UI state, not persisted project data. Interleaved group membership is represented structurally without pretending to change global z-order. The legacy flat Objects component remains for existing tests but is no longer a primary application tab.

No destructive data migration, format/schema change, external action, push, deployment or new Windows package. See [ADR-0049](../adr/0049-scene-outliner.md) for the complete state and command boundaries.

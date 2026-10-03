# Sprint 17 — Wall tool

24 September 2026. Wall functionality delivered on the existing path engine. No openings, room detection or later-sprint tools are included.

## Acceptance basis and architecture

The supplied Sprint 17 brief was checked against AGENTS, the foundational/storage/path/group ADRs, prior Sprint 14–16 reports, the current object/asset model, history, shared canvas/export painters and project format. Acceptance covers a discoverable persistent Wall workflow; exact editable centerlines; width/units/presets; solid and repeated texture walls; bounded cap/join geometry; explicit connections/extension; existing object/layer/group commands; atomic history; durable typed asset references; PNG; limits and measured browser workflows. Existing untracked user work was preserved. No repository reset, package creation or external action was performed.

[ADR 0011](../adr/0011-wall-path-specialization.md) records the design and limitations. [Format v6](../architecture/mapweaver-format-v6.md) records the persistent fields. Walls reuse Path nodes/handles, strokeWidth, opacity, cap and join. Their small validated wall settings hold an explicit unit reference, outline and texture flip. Presets store concrete styles; Custom is session-only. No persisted connection graph, tile objects, copied texture blobs or second path editor exists.

## Delivered

- Wall rail entry and context controls; Straight/Curved drawing, full-width live preview, continuing tool mode, Enter/double-click/close-first, Backspace/Escape, Done/Select/V, Shift angles and Alt bypass. Middle/Space pan and wheel zoom retain draft nodes. Empty extension commits create no history entry.
- Solid walls and typed fillPattern textures with scale/offset/flip; Simple wall, Thick stone and last custom style; positive thickness in px/cells/ft/m; explicit pixels-per-unit reference. Properties expose name, open/closed, caps/joins, opacity, outline, length, reverse, existing node editing and endpoint extension.
- Eight-screen-pixel endpoint/interior-node/T/grid/object-guide snapping; distinct endpoint circle, node square, T diamond and grid cross plus text. Hidden/locked targets, including inherited group flags, are excluded. Ordinary snapped drawing preserves separate objects. Continue/Extend preserves the existing ID/order and uses one undo entry when style, layer and editability match. T snapping does not split its target.
- Exact cubic solid/outline rendering; bounded miter, round and bevel joins; butt/round/square caps; thickness/outline-aware bounds and hits. Textures use a cached clipped adaptive ribbon with tangent mapping and sampled arc-length phase. Compatible separate endpoints get transient visual round junction patches. Editor and PNG share the same painter.
- Wall type in the object list; existing group/layer/visibility/lock/Solo/order/duplicate/clipboard/arrange/transform mechanisms. Uniform scaling includes thickness and outline. Bulk concrete style/texture updates validate the entire editable selection (maximum 100) and form one undo transaction.
- Format 6, local revisions/autosave, project restart, portable import/export and full backup restore preserve walls and texture references. Cross-project clipboard remaps conflicting image IDs and keeps original bytes. Unavailable textures have a safe editor placeholder/status; export refuses unreadable sources.

Important implementation files: domain/walls.ts, wallGeometry.ts, paths.ts and objectSnapping.ts; canvas/drawWall.ts, drawPath.ts, usePathDrawing.ts, PathPoints.ts and navigation; app/WallTools.tsx, WallFields.tsx, WallBulkProperties.tsx and shared Properties; editor/project stores, project format/archive, asset picker and export painter. README, AGENTS terminology, architecture, format, ADR and roadmap were updated.

## Validation

- **64 client tests passed in 10 directly relevant files**: walls, paths, drawing/navigation, arrangement, selection transforms, snapping, typed project assets, clipboard and export. They cover corrupted runtime input/limits; bounds/joins/caps; conversions; screen-space snapping; compatible visual patches; node edits/reversal; extension/no-op; cancel/undo/redo; atomic bulk changes; format dispatch; and texture bytes across project changes.
- **4 service tests passed**: wall/path/group SQLite persistence, rejected input/revisions, portable transfer, clean-dataset texture remapping and byte comparison, full backup extraction/validation and restored objects. The existing Area storage test also passed with the new canonical format version.
- Client and service TypeScript passed. Production client and service builds passed. ESLint passed across all changed implementation files and the Sprint 17 browser runner. No broad unrelated suite, package audit, Windows packaging, installer or installer/default-browser test was run.
- Reproducible isolated Chromium acceptance: `node tests/persistence/sprint17.mjs` after `npm run build`. Uses its own loopback port/data, authenticated writes, PID checks, service restart and graceful cleanup. Evidence baseline: `.sprint17.local/1790229570026/`. Browser checks passed for four-corner/open-L/curved/irregular walls; cancellation; T-style connection; Shift/Alt; wheel/both pan methods during a draft; explicit extension and undo/redo; grid/physical width; node edit/reverse/insertion/deletion; open/closed; texture picker; bulk style undo; groups/duplicate/hide/lock/list; transparent PNG 1×/2×; autosave/restart/portable export; and the 100-wall load. No uncaught browser errors or horizontal overflow at 1280×720. The final rerun additionally exercises the bulk texture picker.
- `full-preview.png`, `solid-joins.png`, `texture-corners.png`, `node-editing.png` and the 1× PNG were visually inspected. The first textured-curve review exposed overlapping tangent patches; common bisector boundaries corrected their appearance before final validation. No normal-corner holes were observed in the representative map.
- Additional **interactive in-app Chromium** pass at 1280×720: opened the persisted map, fitted it, drew a four-corner wall, verified continuing Wall mode and local save, undid/redid it, selected on wall thickness, entered the shared node editor, dragged a node and cancelled to restore geometry. Tab/viewport override and the isolated service were closed/reset. The complete scenario matrix is scripted Chromium plus visual review; it is not claimed as a separate human tester's full manual run. Firefox/Edge were not tested.

## Measurements

One local run; automation times include event delivery and are not FPS guarantees. 100 walls each contain ten segments; 50 share a small repeated texture. No before/after speedup claim.

| Check | Time |
| --- | ---: |
| Derive contours for 100 walls / 1,000 segments | 7.62 ms |
| Derive practical maximum 256-node wall | 3.49 ms |
| 30 snap queries among 100 walls at 25% / 100% / 400% | 47.94 / 54.60 / 40.88 ms total |
| Browser PNG with 50 textured + 50 solid walls | 465.87 ms, including dialog/download |
| Ten-event node drag among 100 walls at 25% / 100% / 400% | 728.96 / 723.26 / 718.54 ms, including automation |

The browser asserts a real change to the selected wall's displayed geometry at each zoom, then cancels the edit. Document and per-wall limits are centralized; no attempt is made to allocate whole-map offscreen textures for every wall.

## Boundaries

No global physical map scale is inferred: ft/m measurements use the explicitly editable per-wall scale reference. Changing grid size does not resize existing walls. Texture assets should be opaque and repeatable. Sharp/closed joins may show phase seams; cusps, self-crossings and extreme zoom can show patch overlap or fine raster seams. These same effects appear in editor and PNG. Self-crossing strokes are allowed, without claiming polygon topology or room inference. Custom presets are not persisted as a separate library. The shared texture spacing member is retained for generic paths but not used by wall repetition.

No known Critical/High issue involving wall data loss, canonical geometry, editor crashes or normal-corner gaps remains in the tested scope. No external actions and no Windows package were made. Later sprints remain queued.

Final validation: the last production build and scoped ESLint passed. The final 22-check Chromium run, including bulk texture replacement/undo, passed at .sprint17.local/1790230000470/. The measurements above retain the earlier baseline. All temporary test services and the interactive tab were closed. Total distinct focused tests: 64 client + 4 service = 68 passed.


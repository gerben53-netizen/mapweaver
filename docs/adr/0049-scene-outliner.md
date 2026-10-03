# ADR-0049 — Unified Scene Outliner

Accepted 2026-09-28. Extends ADR-0010. No project format, SQLite schema or asset-pack change.

## Projection and storage

Scene replaces the primary Layers and Objects tabs. Properties and Map remain separate. Every concrete Layer is visually top-level, Object groups are its children, grouped objects are grandchildren and ungrouped objects are direct children. `sceneTree` projects canonical `layers`, `layerTree`, `objectGroups` and `objects`; it never writes to them. Existing nested **layer groups** remain stored and continue to determine order and inherited flags. Their ancestor names appear in layer tooltips. The secondary **Layer organization and map paint** dialog retains the existing layer-group editor and map-wide paint controls.

Canonical object IDs paint back-to-front; the tree shows frontmost first. An interleaved object group is collected at its frontmost member, preserving order within the group and leaving actual render order untouched. A contiguous tree cannot express every interleaving between grouped and ungrouped members; opening Scene never normalizes that ordering.

## Commands and selection

`moveSceneObjects` computes new layer IDs and group memberships together, validates the result and returns one atomic change. The management action wraps it in one native history entry. Object-to-group, object-to-layer-root, cross-layer movement and sibling before/after insertion are supported. Cross-layer wall moves carry openings and attached labels. Moving a linked label without its owner is rejected; invalid opening/group combinations and locked/hidden sources or destinations are rejected before writes. Geometry is unchanged. Moving a whole object group across layers is deferred.

Scene uses existing editor selection. Clicking a member enters its existing group-edit scope, clicking a group selects its members and clicking a layer only activates it. Ctrl/Meta/Shift toggles additive selection. Scene remains open while selection updates; Properties uses the same selection when opened. Reveal selected explicitly clears filters, expands ancestors and scrolls/focuses the first selected object. Ordinary canvas selection only highlights rows. Collapse state and focus/filter/drag state remain UI state, outside saved documents.

## Rendering and input

`SceneOutliner` uses a full-height flex panel. Header and filters do not scroll. The tree is the sole primary `overflow-y:auto` container, with `flex:1; min-height:0`; its ancestors have no nested scrolling object viewport. Rows are 26 px. Layers have stronger headers, groups a folder icon and intermediate weight, objects a compact thumbnail/type icon. Direct visibility/lock controls retain their own stored flag; inherited restrictions are disabled, subdued and explained by tooltips.

Search and type/scope filtering retain required ancestors and temporarily expand matches without overwriting saved collapse choices. Keyboard arrows, Home/End, Enter/Space, F2 and Shift+F10 operate the visible tree. Focus has an outline distinct from selection and the active-layer dot. F2, double-click and context actions rename through existing undoable commands. Internal drag payloads expose before/after/into indicators; keyboard context controls provide equivalent object moves.

Thumbnails lease the existing library-thumbnail cache only when near the viewport. No full original is decoded as a fallback for a row. Missing library thumbnails show a missing-asset placeholder, including embedded project stamps whose library source is no longer available; their map artwork is unaffected.

Measured 1000-object full DOM population exceeded one second. Above 250 visible tree nodes, a flat traversal window renders viewport rows plus overscan with top/bottom spacers in the same scroll container. Search, collapse and Reveal recompute logical rows; keyboard focus scrolls to the logical index before focusing the mounted row. Smaller scenes render normally. A metadata selector retains references across transform-only changes so pointer drag previews do not rebuild the tree.

## Consequences

No destructive migration, new persisted expansion state, arbitrary nested object groups, renderer changes or asset duplication. Legacy internal inspector values `layers` and `objects` both resolve to Scene to avoid unrelated caller churn. The old flat browser component remains for existing tests but is no longer an application tab. UI terminology is Scene / Properties / Map.

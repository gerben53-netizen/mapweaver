# Toolbar Semantic Cleanup

Completed 28 September 2026, existing `develop` checkout. No CODEX.md was present; AGENTS.md and the relevant architecture decisions were read.

## Acceptance and result

The acceptance target was one canonical marker insertion action, no duplicate Area/pattern or Path/Route rail entries, descriptive tooltips, map-type filtering, preserved saved objects, and targeted validation. All are satisfied.

**Place Marker** is the only marker insertion entry. The redundant **Marker** item is removed from Map Elements. Map Elements now offers six decorations/text choices; opening it does not highlight as an active marker tool. Its trigger uses the existing folded-map icon, distinguishing a palette of elements from a Compass insertion action. No icon artwork system was redesigned.

## Complete primary tool inventory

B = Battlemap, R = Regional, W = World. All entries below are retained unless explicitly marked otherwise. Icons refer to existing `Icon` names. Menu children are text choices rather than additional rail icons. All stored objects continue through existing project-format 12, local service and portable archive handling.

| Tool | Icon | Maps | Interaction / unique intent | Creates or modifies / serialization | Properties | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Select | select | B/R/W | Select, drag and transform existing artwork | Existing object fields; selection stays transient | Contextual object inspector | Keep |
| Measure | measure | R/W | Click a measurement chain using map scale | Transient ruler points; no new object | Measurement readout | Move to Select and edit |
| Place asset | stamp | B/R/W | Browse stamps; repeat click placement or one drag | `stamp`, asset reference and transform | Stamp appearance/transform | Keep in Assets |
| Scatter | scatter | B/R/W | Distribute repeated stamps using brush/recipe | `scatter`, sources, seed, recipe and instances | Scatter source/recipe controls | Keep; not individual stamp placement |
| Area | area | B/R/W | Draw rectangle, ellipse, polygon or freehand geometry with initial appearance | `area`, polygons/holes, frame, fill and stroke | Area appearance, transform, points | Keep in Draw |
| Path | path | B/R/W | Draw a generic line; choose a specialization where supported | `path`, nodes/handles, stroke; optional typed route data | Path/route appearance and node editing | Keep one rail entry |
| River, under Path type | no extra icon | R/W | Directed watercourse with taper/source-mouth behavior | `pathKind: river`, `route.kind: river` | River widths, appearance and physical reference | Keep specialization |
| Road, under Path type | no extra icon | R/W | Road/trail with class, outline and markings | `pathKind: road`, typed route settings | Road class/width/outline/markings | Keep specialization |
| Border, under Path type | no extra icon | R/W | Boundary line, optionally closed or copied from an Area ring | `pathKind: border`, typed route settings | Border styles/widths | Keep specialization |
| Wall | wall | B | Draw structural wall centerlines with thickness and material | `pathKind: wall`, wall scale/alignment/material metadata | Wall material/thickness and path geometry | Move into Draw; keep distinct from generic Path |
| Opening | opening | B | Attach door/window to an existing wall | `opening`, wall ID and centerline position | Door/window style and dimensions | Move into Draw; keep |
| Texture Brush | brush | B | Paint local imported material variation | `map.texturePaint`, fill-pattern IDs and masks | Brush context; paint-layer controls | Move into Terrain and surface |
| Land / Water | landmass | R/W | Add/remove physical landmass topology | Native Landmass Areas and optional `map.landEditing` | Brush context, Area contour/land settings | Keep |
| Terrain Region | terrain | R/W | Draw a biome-classified region | Native Area with `land.role: terrain-region`, terrain metadata | Semantic terrain plus Area appearance/geometry | Keep; classification is not generic geometry |
| Terrain Brush | brush | R/W | Paint visual terrain detail without classifying a biome | `map.terrainPaint`, style/texture IDs and masks | Material/preset/paint controls | Keep; never visible beside Battlemap Texture Brush |
| Water Depth | waterDepth | R/W | Refine or restore shallow/deep water shading | `map.waterDepth` and masks; separate coastal-contour settings | Water brush/appearance controls | Keep; not coastline topology editing |
| Place Marker | place | B/R/W | Configure semantic location/symbol and optional linked name, then click | `place`, optional `marker`/illustration; linked native `label` | Marker type, style, name, label and metadata | Canonical marker action |
| Map Elements | map | B/R/W | Open insertion choices for decorations/text | No object until a child is placed | Child-specific | Keep palette; change misleading compass trigger icon |
| Compass | text menu | B/R/W | Place a north arrow or compass rose | `compass` | Compass preset/orientation/north label | Keep |
| Scale bar | text menu | B/R/W | Place a map-distance annotation | `scaleBar` | Distance/unit/style; unavailable-scale feedback | Keep; unlike transient Measure this is saved/exported |
| Title / Cartouche | text menu | B/R/W | Place framed title/subtitle | `title` | Carrier/preset/title/subtitle | Keep; unlike free Label it has title-carrier layout |
| Legend | text menu | B/R/W | Explain symbols using explicit entries | `legend` | Entries, symbols and style | Keep |
| Label | text menu | B/R/W | Place editable standalone text | `label`, text/style/optional owner linkage | Text, font, halo and link layout | Keep |
| List / Note | text menu | B/R/W | Place a structured note/index/list | `infoPanel` | Title/content/list and frame style | Keep |
| Apply Material, contextual | text action | B/R/W | Preview and replace complete fills of compatible selected Areas | Existing `area.fill` only | Primary Appearance / Pattern scale | Keep contextual; no drawing fallback |
| Marker, former Map Elements entry | formerly text menu | B/R/W | Identical wizard/placement to Place Marker | Identical `place` and linked `label` | Identical MarkerProperties | Remove duplicate UI only |
| Pattern fill, former rail entry | formerly pattern | B/R/W | Obsolete second Area-creation entry | Legacy internal names retained | Existing Areas unchanged | Already removed by preceding sprint; verified absent |
| Route / Landmass, former separate entries | former internal icons | R/W | Already consolidated in earlier intent sprint | Internal route mode / Landmass Areas remain | Existing editors retained | Verified absent; no further consolidation |

## Other canvas toolbar actions

These are operations/settings rather than competing creation tools, and remain unchanged:

| Entry | Context / unique responsibility | Storage |
| --- | --- | --- |
| Apply Material, Duplicate, Delete, Group/Ungroup, Properties | Selection actions: edit fill, copy/remove objects, organize selection, open inspector | Existing object/group model; inspector state transient |
| Show grid / Snap to grid | Battlemap or Hex context; visual reference versus magnetic alignment | Existing map grid settings |
| Snap → Objects / Guides | Align to existing artwork / show and use guides | Editor preferences/transient guides |
| Zoom out / Zoom indicator / Zoom in | Change/display viewport magnification | Viewport only |
| Fit / Fit selection | Frame whole map / selected bounds | Viewport only |
| Focus | Expand canvas by hiding surrounding UI | Editor state only |
| Map actions → Automatic labels | R/W: generate/update labels from existing named features | Native Labels with existing provenance |
| Map actions → Save as reusable prefab | Reuse a selected composition in the library | Existing prefab library format |
| Map actions → Detect rooms | B: derive room floors from existing walls | Native Area floors with historical wall references |
| Map actions → Keyboard help | Explain controls | No document data |

Global document controls (Undo/Redo, Projects, Save, Export PNG), navigation and Scene management are not duplicate drawing tools and were not redesigned. Stamp Palette repeats direct placement from a curated working list; it complements the full asset browser rather than adding an object model.

## Technical comparison: Marker / Place Marker

Before this change, `ToolRail`'s place button and `MapElementsMenu`'s `kind === 'place'` branch both set `markerWizard: true`. They shared MarkerWizard → `markerChoice` → `activeTool: 'place'` → AnnotationTools → `createMarkerBundle` → `addAnnotations`. Both opened the same MarkerProperties and serialized the same Place/Label fields. There was no functional distinction.

Only the menu entry/branch is removed. `MAP_ELEMENTS` retains its logical Place registry entry for naming/presets; `ElementKind`, IDs, marker registry, renderer, inspector and serialization are unchanged. Existing custom/legacy Places do not receive new marker defaults. New markers and legacy Places were checked for editing and persistence. No data migration or removal occurred.

## Path / Route conclusion

One Path rail entry was already canonical. Generic/River/Road/Border share nodes, handles, transforms and endpoint/node/segment snapping, but the specialization is meaningful: rivers render tapered ribbons, roads provide class/markings, borders have boundary styles. RouteFields exposes those differences; no routefinding graph exists. The world generator creates native River paths (`src/world/generate.ts`), and automatic labeling recognizes river path semantics (`src/domain/automaticLabels.ts`). Generic paths do not acquire those meanings just because they draw a line. Internal route mode remains for existing previews, continuation and edits; there is no duplicate Route toolbar button or shortcut.

## Area / Terrain Region / Land-Water conclusion

Generic Area draws a zone with appearance. Terrain Region draws the same geometry engine's Area with a semantic biome. Land / Water applies topology edits to canonical landmass geometry. Terrain Brush and Texture Brush paint independent visual coverage; Water Depth paints depth appearance. Apply Material changes complete existing Area fills. These are distinct operations despite shared engines, so no geometry or paint architecture was merged.

## Grouping, tooltips and keyboard

Five groups, separated by existing subtle dividers: **Select and edit**, **Assets**, **Draw**, **Terrain and surface**, **Map elements**. No additional visible headings or empty groups. Measure is near selection; Walls/Openings join drawing; texture paint joins surface work. `mapCapabilities` remains authoritative for the rail and now also filters Map Elements choices.

All rail icons and the six menu choices have action descriptions. Examples: “Place a settlement, landmark or map marker”; “Add or remove landmass geometry and shape coastlines”; “Insert a door or window into an existing wall”. Generic Area, biome drawing, terrain detail and local texture paint are explicitly distinguished. Simultaneously visible rail icons are unique; the shared brush icon is used only in mutually exclusive map contexts. The element palette is bounded to the available viewport height and remains scrollable.

No shortcuts were added/removed: the two marker entry points had no separate hotkeys. V selects; existing F/Shift+F, navigation, edit and history keys remain. Tests confirm M/R/P do not secretly activate removed tools. Keyboard activation and Escape/focus return for Map Elements remain intact.

## Validation and compatibility

- **47 tests passed in 7 files**: `toolbarSemantics.test.tsx`, `MapElements.test.tsx`, `map-context.test.tsx`, `toolIntent.test.tsx`, `markers.test.ts`, `ux-improvement.test.tsx`, `materialPicker.test.tsx`.
- Coverage includes one canonical marker entry, wizard launch without document mutation, nonduplicated active state/icons, tooltips, map-type filtering, all Path types, Area/biome semantics, retained material browser workflows, shortcut behavior, legacy Place parsing/edit/undo and new marker/linked-label round trips.
- TypeScript client/service checks via production build passed. Scoped ESLint on changed TS/TSX files passed. Client/service production build and bundled-font check passed; existing Vite >500 kB chunk advisory remains.
- Real headless Chrome with isolated service/database: before/after screenshots on B/R/W; removed-entry/capability/tooltip assertions; canonical wizard and pointer placement; actual Marker Properties name edit; existing legacy Place fixture; save/reopen and PNG export. No browser page errors. The regular user service/data were not used.
- No full unrelated suite, Windows package, external actions, destructive migration, format changes or object removal.

Browser harness: `.qa.local/toolbar-semantic-browser.mjs`. Evidence: `deliverables.local/Toolbar-Semantics/before-results.json` and `after-results.json`.

## Before / after screenshots

| Workspace | Before | After |
| --- | --- | --- |
| Battlemap | [Before](../../deliverables.local/Toolbar-Semantics/before-battlemap.png) | [After](../../deliverables.local/Toolbar-Semantics/after-battlemap.png) |
| Regional | [Before](../../deliverables.local/Toolbar-Semantics/before-regional-map.png) | [After](../../deliverables.local/Toolbar-Semantics/after-regional-map.png) |
| World | [Before](../../deliverables.local/Toolbar-Semantics/before-world-map.png) | [After](../../deliverables.local/Toolbar-Semantics/after-world-map.png) |

[Marker Properties after canonical placement/edit](../../deliverables.local/Toolbar-Semantics/after-marker-properties.png).

## Files changed

`src/app/ToolRail.tsx`, `MapElementsMenu.tsx`, `toolIntent.ts`, `editorUx.ts`; action descriptions in `src/domain/cartographicPresets.ts`; new `src/app/toolbarSemantics.test.tsx`; updated `toolIntent.test.tsx` and `ux-improvement.test.tsx`; README, ADR-0024/0039 follow-up notes and this report.

## Remaining considerations

Label, Title and List/Note all display text, but their framing/content models differ. Generic Paths and Walls share a path engine but wall thickness/opening relationships are not generic stroke styling. These are retained deliberately, not unresolved duplicate operations. A future usability study could revisit discoverability or icon recognition; no remaining equivalent primary actions were identified. No broader navigation redesign was attempted.

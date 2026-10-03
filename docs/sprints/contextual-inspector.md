# Contextual Inspector UX Redesign — 27 September 2026

Implemented on `develop` in the existing repository. Scope: right-side Properties hierarchy, density, contextual controls and resizing. No domain model, renderer, project format or asset taxonomy changes. Existing user data was not migrated, removed or rewritten for this sprint.

## Acceptance and result

The benchmark is a generated Bibliotheek floor, 40 × 30 ft, on a 50 px / 5-ft grid at desktop 1280 × 720. Material, pattern scale, world dimensions and relative rotation are visible and editable without scrolling at both the normal 320 px width and minimum 280 px width. Wall preset/thickness/transform and stamp world size/rotation also fit. Technical geometry no longer precedes creative controls. Widening to 520 px changes paired labels to inline rows rather than merely adding blank space.

## Information architecture

The sticky identity header shows the object name/type/layer and useful world dimensions. Generated Floor uses the room layer name; an Opening displays its actual width. Padded wall selection bounds are not presented as room dimensions. No selection is a short message; multi-selection shows its count and safe shared transformations, layer/arrangement and actions, with homogeneous wall/label controls only when appropriate.

Primary sections:

| Object | First controls |
|---|---|
| Floor / Area | Material, choose/replace pattern, pattern scale/color, opacity |
| Wall | Preset, physical thickness, material |
| Stamp | Asset identity, world width/height, position, rotation, flips |
| Text | Content, font, size, color, alignment |
| Path | Stroke, physical width, color |
| Road / Border | Class/style, captured-unit width, color; road outline |
| River | Preset, mouth width, smoothing, color, outline |
| Marker / Place | Name, type, prominence, visual style/icon, illustration chooser when applicable; world-size summary and Transform |
| Door / Window | Opening width, position, type/state; native atomic Apply |

Transform uses paired fields and short accessible Flip H/V buttons. Numeric single-object edits commit on Enter or blur; geometry retains uniform scaling and relative rotation. Enter followed by blur no longer risks a second relative transform. Pattern scale and river styling retain their native live gesture history and Escape cancellation.

Commands are grouped under Actions; geometry counts/nodes are under Geometry; pixels/IDs and less-used object metadata are under Advanced. Geometry opens while node editing is active. Ordinary battlemap floors omit irrelevant geographic controls; Regional/World Areas and Areas with land metadata keep a folded Terrain section. No semantic fields were deleted.

Existing detailed Area, Path and annotation editors remain secondary. Marker + linked label, opening drafts, bulk scale+rotation and detailed style forms retain Apply because they validate/commit related fields atomically. This prevents splitting a coupled operation into unintended undo steps. Apply a detailed draft before changing selection or using an independent live transform.

The inspector has a 320 px default, 280–520 px bounds, pointer capture and keyboard resizing, and optional localStorage width persistence outside project data. Sections remember expansion per object type during the session and lazily mount their editors. Layers, Objects, Properties and Map remain separate existing modes.

## Visual evidence

[All ten before/after pairs](../../deliverables.local/Contextual-Inspector/comparison.html). Images are local ignored deliverables, not source assets.

| Scenario | Before | After |
| Floor | [PNG](../../deliverables.local/Contextual-Inspector/before/01-floor.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/01-floor.png) |
| Wall | [PNG](../../deliverables.local/Contextual-Inspector/before/02-wall.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/02-wall.png) |
| Stamp | [PNG](../../deliverables.local/Contextual-Inspector/before/03-stamp.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/03-stamp.png) |
| Text | [PNG](../../deliverables.local/Contextual-Inspector/before/04-text.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/04-text.png) |
| Path | [PNG](../../deliverables.local/Contextual-Inspector/before/05-path.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/05-path.png) |
| Marker | [PNG](../../deliverables.local/Contextual-Inspector/before/06-marker.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/06-marker.png) |
| Multiple | [PNG](../../deliverables.local/Contextual-Inspector/before/07-multiple.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/07-multiple.png) |
| Empty | [PNG](../../deliverables.local/Contextual-Inspector/before/08-empty.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/08-empty.png) |
| Minimum | [PNG](../../deliverables.local/Contextual-Inspector/before/09-minimum.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/09-minimum.png) |
| Wide | [PNG](../../deliverables.local/Contextual-Inspector/before/10-wide.png) | [PNG](../../deliverables.local/Contextual-Inspector/after/10-wide.png) |

[Additional door](../../deliverables.local/Contextual-Inspector/after/11-door.png) · [Browser results](../../deliverables.local/Contextual-Inspector/after/results.json).

Both series use the same viewport, fixture and comparable 320/280/520 px widths. The before series captures the old Properties content after the navigation/resize scaffold had already been added; it is not a pristine screenshot of the old navigation. The min/wide before widths were forced to make content density comparable. The fixture uses simple local test images to isolate controls, not production artwork.

## Validation

- 42 relevant Vitest tests passed across `ObjectProperties.test.tsx`, `SelectionInspector.test.tsx`, `InspectorResize.test.tsx`, `ContextualInspector.test.tsx`, `scaleUx.test.tsx` and `RiverProperties.test.tsx`. The final contextual file has eight tests (rerun after the opening-summary adjustment); the other five files account for 34 passing tests. Coverage: contextual controls, physical size, Advanced/Actions, section mounting/preferences, width limits/persistence, empty/multi/locked selection, geometry undo/redo, text edits, wall/floor/opening invariance and live pattern/river edits.
- `npm run typecheck` passed; final `npm run build` also passed client/service TypeScript, production bundles and eight bundled font-family/license checks. The existing >500 kB chunk advisory remains.
- Scoped ESLint passed with no errors or warnings for all changed/new TypeScript implementation and test files. Last changes to ObjectProperties, OpeningProperties and their contextual tests were linted again.
- Isolated Chrome browser checks at 1280 × 720 used a disposable local service/database. Assertions verified viewport visibility and edits of the requested floor/wall/stamp controls; reversible pattern scale, material, size, rotation, text, marker and path edits; unchanged floor and opening width after a wall-thickness edit; working separate walls/scatter dialogs; door controls; mouse and keyboard resizing; persisted width; responsive paired-field bounds; four tabs and arrow-key navigation. Final objects matched the original fixture after undo. No page JavaScript errors.
- All requested before/after images were inspected. The normal/minimum width is usable; the wider transform layout is visibly different. Keyboard focus is outlined, controls retain accessible labels and disclosures expose expanded state.
- Selection-switch timing is recorded in the browser results: 20 switches with an animation frame each took 539 ms in the small fixture. This is an observation, not a large-map performance benchmark. Closed secondary editors are not mounted; no new broad subscription or object-model abstraction was introduced.
- No full test suite, broad lint/format pass, unrelated export/import checks or Windows packaging was run. No push, merge, publish, deploy or other external action was performed.

## Files

- `src/app/ObjectProperties.tsx`: contextual composition, identity, secondary sections and guarded fields.
- `InspectorQuickProperties.tsx`, `InspectorTransform.tsx`, `inspectorEdit.ts`: focused controls using existing native store/history operations.
- `InspectorSection.tsx`, `InspectorResize.tsx`, `inspectorWidth.ts`, `Inspector.module.css`: disclosure, width state/input and responsive compact layout.
- `App.tsx`, `App.module.css`: resizable panel and readable four-mode navigation.
- `AreaProperties.tsx`, `AreaPatternScale.tsx`, `PathProperties.tsx`, `RiverProperties.tsx`, `MarkerProperties.tsx`, `OpeningProperties.tsx`, `GroupControls.tsx`: reuse/split existing editors while preserving native operations.
- `ContextualInspector.test.tsx`, `InspectorResize.test.tsx`, `SelectionInspector.test.tsx`: new coverage and updated expectations.
- `docs/inspector.md`, `docs/room-generator.md`, this report and `README.md`: current editing instructions and evidence.

## Limits and compatibility

Ordinary stamps do not gain an unsupported asset-replacement operation; existing supported pattern, wall-set and illustrated-marker pickers are reused. Some rare detailed editors remain longer draft forms inside collapsed sections. Physical-unit-less maps and route-specific pixel styling retain explicit native values. The primary controls target desktop 1280 × 720; large-map stress performance and other browsers were not measured.

No destructive project migration, domain-model change, source-art change, backend change, new dependency or Windows package. The installed executable still needs an explicitly requested new package to include these source changes.

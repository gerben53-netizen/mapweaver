# Sprint 22 — Places, symbols, labels, legend and compass

24 September 2026. Completed within the documented limits and validation coverage. No Windows package or external action.

## Acceptance and implementation

The acceptance basis was the supplied Sprint 22 brief: semantic places and scale modes; repeated focus-safe placement; editable standalone/linked text; explicit overlap preview and bulk style; concrete legend and compass objects; shared object management, transactions, durable storage and PNG; bounded layout and a 500-place measurement. Preparation read AGENTS, the Sprint 20–21 requests/reports, architecture/roadmap and actual model, scale, asset, canvas, transaction, persistence and export code.

Delivered:

- Place tool with configurable type defaults, existing searchable/recent stamp picker, cartographic/world mode, label-position default, click/name/Enter placement and Escape cancellation. A completed place+label is one transaction; the tool stays active.
- Semantic place type/name, optional symbol, captured scale reference, size, rotation, opacity, anchor, note, tags and importance. World placement reuses applicable existing asset defaults; map scale changes preserve geometry.
- Separate plain-text Label objects with optional same-layer owner, explicit offset/anchor, independent dragging, position/reset controls and optional leader. Standalone labels and Add linked label work in the existing canvas. Owner copy/duplicate remaps dependent labels; label-only copies detach. Owner deletion lists children. Cross-layer moves keep links together; hidden/locked children block dependent movement.
- Multiline wrapping, four bundled Liberation Sans variants, size, alignment, tracking, line height, text/outline/halo colors, padding/opacity, rotation and uniform layout scaling. Text stays editable in format 12. No HTML interpretation or system-font reliance.
- Bulk label style as one command and deterministic Avoid overlaps with explicit Apply/Cancel. Preview objects remain editor state until committed.
- Legend snapshots with title, selected entries, text/type/symbol, order, columns, padding, background/outline, opacity and map size. Refresh from map is explicit and previewed; entries never change implicitly. Compass supports three vector styles and optional existing stamp artwork. The shared Sprint 20 scale-bar model is retained.
- Ordinary selection, groups/layers, list/type filters, transforms, arrange, hide/lock, clipboard, delete, undo, autosave/conflicts/recovery, portable asset remapping and full backup. Canvas and PNG share painters and immutable font advances. Missing fonts/images refuse export with a repair message.

Architecture: [ADR 0017](../adr/0017-places-labels-and-map-annotations.md), [format 12](../architecture/mapweaver-format-v12.md). SQLite remains schema 4. Existing user files, distributions and unrelated untracked work were preserved.

## Validation

**80 client tests in 10 focused files passed**: annotation model/strict validation, word/multiline layout/cache, unsupported-glyph fallback, links and repeated pointer finalization, world/cartographic sizing, bounds/transforms, grouping/arrangement/layer moves, clipboard/remapping, relationship deletion/locks, bulk style/history, deterministic preview limits, legend snapshot/asset references, compass, missing images, recovery, existing local save/conflict/session and archive/export behavior. Component coverage includes focus, Enter/Escape, shortcut isolation, repeated placement and Space navigation. Path/route tests cover the directly affected union and canonical-format migration.

**4 native service tests passed**: annotation and route/geography JSON through SQLite close/reopen, rejected invalid writes without revision loss, revision conflict, portable transfer, typed image references and byte preservation, and full backup extraction/validation/reopen. The annotation fixture includes a linked place/label plus a legend and compass sharing an actual PNG asset, so all new asset roles are exercised.

Client/service TypeScript, scoped ESLint and production client/service builds passed. Reproduction:

```powershell
npm test -- src/domain/annotations.test.ts src/app/annotationInteraction.test.tsx src/domain/selectionTransform.test.ts src/domain/arrange.test.ts src/projects/localSession.test.ts src/projects/recovery.test.ts src/projects/archive.test.ts src/export/export.test.ts
npm test -- src/domain/paths.test.ts src/domain/routes.test.ts
npm run test:service -- service/annotations.test.ts service/routes.test.ts service/routeAssets.test.ts service/geography.test.ts
npm run typecheck
npm run build
node tests/persistence/sprint22.mjs
node tests/persistence/annotations-render.mjs
```

Scoped ESLint covered the new annotation/renderer/UI/test files and changed shared model/store, asset-picker, canvas, object-management, persistence/export and service files. No whole unrelated test suite, global formatting, dependency upgrade or Windows package was run.

Development checks exposed and fixed a real interaction fault: reapplying an identical final drag sample restored the original linked-label offset. Reconciliation now derives offsets for explicitly edited labels, and a regression test repeats the same sample before commit. Other corrected issues were ambiguous test selectors, fixed-offset/float expectations in fixtures, current-format assertions, cramped Properties styling and leader-line render order. Failed attempts are not counted as passing acceptance.

## Browser and visual checks

The final isolated Chromium run passed **10 workflow checks at 1280 × 720**, with no uncaught browser errors or horizontal overflow:

- Ten named places using five built-in symbols, repeated placement, focused name input and Enter.
- Escape cancellation without inserting a partial object.
- Multiline wrapping/halo, independently dragged linked label, visible leader, atomic undo/redo.
- Overlap preview Cancel/Apply, explicit legend refresh, concrete compass style.
- Autosave, local-service restart and a **byte-identical PNG**, including the scale bar.
- 500 places plus 500 linked labels: real object selection, wheel zoom, geometry retention and PNG.

Evidence: `.sprint22.local/1790253520258/results.json`, `01-places.png`, `02-500-places.png`, `places.png`, `places-reopened.png` and `500-places.png`. Screenshots were opened and visually inspected. These are synthetic local test projects, not user projects.

The dedicated render fixture reports **maximum pixel-channel difference 0** between the editor annotation painter and actual PNG scene, loads all four bundled font variants, checks multiline/bold/italic/tracking/outline/halo, legend/rotated compass, missing-image refusal, and 2× output at 1400 × 1000. A deliberately blocked font request confirms refusal rather than fallback export. Its intentional font error is isolated from the clean normal-browser run. Evidence: `.sprint22.local/render/results.json` and `comparison.png`.

Additional direct agent-operated in-app browser check at 1280 × 720: reopened the ten-place map, activated Places, opened the existing symbol picker and verified Escape/focus restoration, placed Eastport with Enter, created a standalone Northern Sea label, edited multiline text/font size/italic/halo, dragged and undid, saved, exported with the scale-bar option, reloaded and visually confirmed both saved additions and text style. Browser error log was empty. Export UI confirmed “PNG download started”; the in-app download-event wait timed out, so downloaded-file verification relies on the successful scripted Chromium check above. Temporary viewport override/tab and owned service were closed afterward.

**Niet getest:** an independent human repeating the complete manual matrix, other OS/browser combinations, exhaustive accessibility audit, real power loss, installer/default-browser integration and a new portable Windows package.

## Measurements

Windows, AMD Ryzen 5 2600, Node 24.17.0, Chrome 153.0.8010.53. Synthetic dense fixture: **500 places and 500 labels**, with overlap preview for 50 labels among all 1,000 objects. These are elapsed timings including automation where applicable, not frame-rate guarantees.

| Operation | Elapsed |
| --- | ---: |
| Validate/save 500 places and labels | 85.7 ms |
| Preview overlap candidates for 50 labels | 51.9 ms |
| Browser open, Fit and selection | 966.8 ms |
| Wheel zoom out/back, including waits | 308.3 ms |
| PNG export including dialog/download | 433.3 ms |

The dense fixture deliberately overlaps labels; the heuristic is not an automatic cartographic generalization system and cannot guarantee collision-free results. Zoom does not modify saved geometry.

## Files and boundaries

Core additions: `src/domain/annotations.ts`, `fontMetrics.json`, `src/canvas/AnnotationPaint.tsx`, `drawAnnotation.ts`, `annotationFonts.ts`, `src/app/AnnotationTools.tsx`, `AnnotationProperties.tsx`, the four licensed `public/fonts` files and extraction script. Shared models, transforms/arrangement, asset references, editor/project management, canvas, picker, Properties/list, session/parser/archive, service portable remapping and PNG integrate them. New domain/component/service/browser/render tests and README/AGENTS/ADR/format/object-model/roadmap documentation accompany the implementation.

Limits and semantics are explicit in ADR 0017: one bundled family/four styles, ordinary left-to-right glyph layout, deterministic `?` fallback with original text retained, max-width text boxes, 2,000 labels, 2,048 characters/label, 64 legend entries, 100 selected overlap labels and 25 candidates. No arbitrary fonts, complex-script shaping, path text, automatic label/name synchronization, lore, new asset taxonomy, zoom generalization, GIS/VTT or prefab system. A changed map scale does not silently resize artwork. Compass orientation is independent of north metadata.

No known Critical/High defect in the exercised data, focus or PNG scope remains. This is implementation acceptance, not an exhaustive independent audit. No push, merge, publication, deployment, upload to an external service, cloud change or Windows package creation was performed.

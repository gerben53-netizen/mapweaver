# Sprint 20 — Regional and World map workspace

24 September 2026. Completed within the limits and validation coverage below.

## Acceptance basis

One existing canvas supports battlemap, regional-map and world-map. Old battlemaps retain pixels and grid semantics. Geographic maps have canonical physical scale and central unit conversion, an explicit preview for type/scale changes, planar local coordinates, measurement and optional editor/export scale bars. Landmass and terrain are semantic Area roles with holes, multipolygons, existing point/boolean/style editing, non-destructive contour previews, deterministic render-only rough coastline, and copied clipping against a landmass. Normal layers, history and all local persistence routes apply. No rivers, roads, political borders, places, labels, GIS, cloud or new Windows package.

## Delivered model and workflow

Format **10**, SQLite schema **4**. See [ADR 0015](../adr/0015-geographic-map-workspaces.md) and [format specification](../architecture/mapweaver-format-v10.md). `mapType` and `geography.widthKm` are canonical at persistence boundaries; pixels per distance and height are derived. Display units km/mi, north annotation, none/abstract projection, optional local origin and ruler/scale-bar/local-grid preferences are validated centrally. Type/scale edits show consequences before one undoable commit. Existing object positions/sizes are untouched. Changing pixel canvas dimensions retains physical width.

New Regional and World choices create ordinary editable layers: Background, Landmasses, Terrain, Routes, Borders, Places and Labels. These names have no reserved behavior. The initial active layer is Landmasses. Existing object/layer/group selection, ordering, visibility, locking and transformations remain available. Geographic context hides Wall/Opening/room creation and the battlemap grid controls, but it does not remove existing objects or their editable properties.

Landmass/Terrain activate the existing Area drawing engine; Polygon, Freehand, Rectangle, Ellipse, point editing, holes, multipolygons, fills/patterns and strokes remain available. Optional `Area.land` stores role, terrain category and coastline seed/parameters. Converting to/from ordinary Area, simplify/smooth and coastline changes have a visual before/after preview with explicit Apply/Cancel. Preview never enters history or autosave. Simplification reuses bounded RDP; smoothing retains node count and validates topology. Invalid results preserve the source. Rough coastline displaces only the rendered stroke, with a deterministic bounded sample cache.

Terrain clipping runs Intersection in the existing polygon-clipping worker and copies the result, including holes; it preserves its source landmass. There is no live clipping relationship. The existing Fill selected area with scatter action adds independent decorative objects without replacing terrain or storing duplicate images.

Measure uses map-coordinate points, live next-segment preview, total/last distance, Enter/Backspace/Escape and existing navigation. The editor scale bar stays readable in screen units. PNG optionally adds a full-map scale bar independent of viewport and editor visibility. Existing reserved asset world-size defaults now apply to newly placed stamps/scatter sources when scope matches, preserving aspect ratio; existing instances remain frozen. No asset-profile editor was added.

## Validation

**111 distinct client tests across 17 files and 4 native service tests across 3 files passed.** Client/service TypeScript (through `npm run build`), scoped ESLint and production builds passed. No new dependencies were installed.

Commands:

```powershell
npx vitest run src/domain/geography.test.ts src/domain/areas.test.ts src/domain/mapSettings.test.ts src/domain/placement.test.ts src/domain/scatter.test.ts src/projects/localSession.test.ts src/projects/archive.test.ts src/projects/sprint10-assets.test.ts src/projects/recovery.test.ts src/export/export.test.ts src/store/objectManagement.test.ts
npx vitest run src/canvas/MapCanvas.test.tsx src/canvas/useCanvasNavigation.test.tsx src/canvas/patternDrawing.test.tsx src/canvas/pathDrawing.test.tsx src/app/sprint10-workspaces.test.tsx
npx vitest run src/app/GeographicSettings.test.tsx
npx vitest run --config vitest.service.config.ts service/geography.test.ts service/scatter.test.ts service/areas.test.ts
npm run build
node tests/persistence/sprint20.mjs
node tests/persistence/geography-render.mjs
```

Scoped ESLint covered every changed implementation module plus the new tests/browser runners. Coverage includes migration/idempotence, scale conversion/miles, cumulative distance, extent/invalid input, world asset defaults/scope, deterministic coastline/no geometry mutation/sample budget, holes/intersection, role conversion/history, contour validation, global limits, portable transfer and scale-bar export options. Existing directly affected canvas, Area, placement, Scatter, archive, conflict, recovery, history and export tests pass. A form regression specifically keeps invalid numeric drafts editable without crashing or altering the map. The preview/cancel/commit test verifies one-step undo.

The native geography test saves all role/scale/origin/appearance data, rejects malformed updates and stale revisions, reopens SQLite, imports a portable project into a clean dataset, then creates/extracts/validates a full backup and reopens the restored document. Scatter/Area service roundtrips remain valid with format 10.

Initial checks exposed an incorrect test assumption about normalized hole winding, missing jsdom dialog methods in the new form fixture, ambiguous test selectors and clipped toolrail labels. The fixtures/selectors were corrected, selects received explicit accessible names, geographic controls received consistent spacing, and the geographic rail was widened to 72 px. Contour previews now include an original/proposed geometry illustration. An invalid numeric-draft render path was corrected and regression-tested. Earlier failures are not counted as passing acceptance.

## Browser and visual acceptance

The final Chromium run passed **11 workflow checks**, with no uncaught browser errors or horizontal overflow at 1280 × 720:

- Create Regional map, normal starting layers and contextual tools.
- Draw landmass, subtract an inland sea, create terrain and preview role metadata without saving.
- Clip terrain to the chosen landmass including its hole; retain the landmass.
- Apply seeded coastline and cancel smooth/confirm simplify previews.
- Measure a two-segment path totaling 400 km.
- Preview/cancel/apply/undo physical width changes without changing objects.
- Autosave, stop/restart/reopen and reproduce a **byte-identical PNG** with scale bar.
- Create World map and a freehand landmass using the same Area engine.
- Open/render/select/navigate/export four detailed landmasses and 50 terrain regions, totaling 10,000 nodes; wheel and both pan methods preserve geometry.
- Open a pre-Sprint-20 battlemap with unchanged geometry/grid and its original tool context.

Final evidence is local and ignored: `.sprint20.local/1790248772506/results.json`, `01-regional-measure.png`, `02-world-10000-nodes.png`, `03-battlemap.png`, `regional.png`, `regional-reopened.png`, `world.png` and `battlemap.png`. Screenshots and PNGs were opened and visually inspected. This is scripted real Chromium interaction plus agent visual inspection. **Niet getest:** a separate human-operated manual repetition of the entire workflow.

The independent pixel harness (`.sprint20.local/render/results.json`, `comparison.png`) confirms **zero channel difference** for editor coastline painter versus PNG, **zero channel difference** for the representative battlemap before/after v9 migration, hole alpha 0, scale-bar-off alpha 0 versus on alpha 255 at its background sample, and the full expected 1000 × 700 output for 2× export of a 500 × 350 map. No selection/ruler overlay is exported.

## Measurements and limits

Windows, AMD Ryzen 5 2600, Node 24.17, Chrome 153.0.8010.53. Final synthetic fixture: 4 landmasses × 500 nodes + 50 terrain regions × 160 nodes = **10,000 nodes**.

| Operation | Elapsed |
| --- | ---: |
| Validate and save fixture through local API | 180.9 ms |
| Browser open and Fit | 669.8 ms |
| Wheel zoom and both pan gestures after selection | 531.9 ms |
| PNG export including dialog/download | 387.7 ms |

Browser times include automation/event delivery. They are not per-frame latency or FPS claims. Source images were not part of this geometry benchmark; existing image/memory budgets still apply. Initial and final complete runs both passed; this table uses the final run.

Limits: 256 geographic Areas, 10,000 combined geographic nodes, existing 512 nodes/ring, 2,048 nodes/Area, 16 sources/4,096 nodes per boolean job, 1.5-second boolean-worker deadline, 4,096 render coastline samples/Area and 256 fixed measurement points. Existing map/image/document metadata limits remain active. Smooth retains node count; rough coastline never writes samples into saved geometry.

## Important files and boundaries

New core modules: `src/domain/geography.ts`, `landAreas.ts`, `src/canvas/useMeasure.ts`, `GeographicOverlay.tsx`, `drawGeography.ts`, `src/app/GeographicSettings.tsx`, `LandAreaProperties.tsx` and `Geography.module.css`. Existing model, Area worker/painter, map/placement logic, project/editor/session/format/archive, canvas/toolrail/Properties/export modules integrate the new fields and behavior. New domain/component/service/browser/render tests and README/ADR/format/object-model/roadmap documentation accompany them.

This is a planar creative workspace. North and projection are annotations; local grid/extent are fictional coordinates, not GIS. Coastline roughness affects the stroke only; its fill, hit shape and clipping stay canonical, so large roughness can visually depart from the fill edge. Terrain clipping is a snapshot, not a live relationship. Conservative Area topology rejects touching/self-crossing rings and overly complex results. Geographic world defaults require valid matching asset metadata; absent or inapplicable defaults retain native sizing. No existing object silently resizes.

**Niet getest:** the entire unrelated suite, global formatting, other browsers/operating systems, real power loss, installer/default-browser integration and a new portable package. No known Critical/High defect remains in the tested Sprint 20 scope; this is not an exhaustive independent audit.

No Windows package, push, commit, merge, publication, deployment, cloud change, data upload or system-service installation. Existing user data and distributions were preserved. Owned test services were stopped; evidence remains local. Sprints 21–22 remain unimplemented.

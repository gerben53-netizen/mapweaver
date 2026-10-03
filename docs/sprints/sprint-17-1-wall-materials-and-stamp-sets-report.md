# Sprint 17.1 — Wall materials and stamp sets

24 September 2026. Functional delivery and artistic review completed as described below. The separate Windows portable package was built and its bundled runtime/service smoke test passed; native launcher GUI acceptance remains manual.

## Acceptance and decisions

Acceptance was recorded before implementation: transparent strip/segment sets, three distinct usable examples, shared deterministic renderer, visual picker/import, Area contours, history/groups/layers/storage/export, bounded performance, visual matrix and separate portable Windows artifact. AGENTS, relevant architecture and Sprint 15–17 reports were read. The existing Sprint 18 openings/rooms were retained. No user dataset, existing local change or old distribution was reset or removed; no branch operations or external actions were performed.

[ADR 0013](../adr/0013-wall-material-sets.md), [format v8](../architecture/mapweaver-format-v8.md) and the [makers guide](../wall-sets/README.md) explain the contract. An immutable set definition and seed live on one semantic Wall. Component images are losslessly packed into one transparent atlas in the existing fillPattern asset register. The existing texture reference therefore carries every dependency through history, clipboard, project transfer and backup. SQLite schema 4 adds only immutable registrations with asset foreign keys; old projects are not destructively converted. This avoids a second asset/blob database.

## Delivered functionality

- Strip material follows arc length using a bounded adaptive centerline and adjoining image quads. Segment material places weighted variants with bounded overlap and seeded variation. Source scale remains proportional to nominal thickness; final pieces are cropped/overlapped, never stretched along the entire remaining wall.
- Transparent silhouettes protrude beyond nominal thickness. Shared painter, expanded conservative bounds, alpha-derived convex hit hulls and viewport culling cover them. The editor uses a bounded raster cache; export uses the full shared geometry and painter.
- Authored Masonry and Timber strips plus three Cave rock body variants, caps and joins. PNGs, editable source SVGs, manifests and standalone ZIPs are in `public/wall-sets/`. JSON Schema draft-07, a runnable minimal template ZIP and a makers guide are included. No external artwork purchase or generation service was used; provenance does not invent a third-party license.
- Wall's visual material picker supports installed sets and a local ZIP preview with explicit confirmation. Existing simple styles remain. New drawing uses the set's recommended pixel thickness; changing selected walls preserves geometry and thickness. Roughness is hidden where unsupported. New variation and property Apply are one undo action. Mixed selection applies only explicitly changed fields.
- Explicit node snaps retain a historical target ID for same-set T/X patches. Moving either wall apart disables the patch; there is no global crossing inference or live wall constraint. Different materials retain deterministic object/layer order.
- Area Properties creates closed boundary walls from outer contours and optional holes, including multipolygons, on the active editable layer. This is one atomic transaction, preserves the Area and visibly explains that it is a one-time copy.
- Material walls preserve selection, group movement/rotation/scaling, layer ownership/visibility/lock, duplicate, clipboard and undo. Existing doors/windows clip the complete body, material pieces and hits. Room floor behavior remains unchanged.
- Missing material-only image files can be opened as warned, editable pink fallbacks without replacing their references or manufacturing substitute bytes. Restore the atlas or replace the material before saving/exporting. Other missing asset types retain their existing strict behavior.

Important implementation files: `domain/wallSets.ts`, `wallMaterialGeometry.ts`, `boundaryWalls.ts`, `wallStylePatch.ts`; `canvas/drawWallMaterial.ts`, `materialCache.ts`, PathPaint/drawing/node integration; `app/WallSetPicker.tsx`, WallFields and BoundaryWalls; `service/wallSets.ts`, storage migration, backup validation and API routes; project parsing/session/assets and project-store commands. Existing documentation, AGENTS terminology and README were updated.

## Verification

- **78 distinct focused client tests passed** across the material/viewport-cache tests and directly affected wall, path, opening, selection transform, drawing, canvas, archive, asset and local-session tests. Covers deterministic serialization/movement/scale, complexity limits, malformed contracts/seeds, protrusion bounds/culling, bounded cache eviction, mixed properties, seed/history, Area atomic copy and unavailable-art repair.
- **23 focused service tests passed** across wall sets, existing walls/paths/groups/Areas/openings and storage. Covers all three real art packages, unsafe ZIP, missing files, invalid dimensions/future versions, preview cancellation, failed-write cleanup, immutable conflicts, delete protection, asset remapping/bytes, clean backup restore and schema upgrade preservation. Two old fixture assumptions about the current schema were updated to version 4; the migration test now reconstructs a genuine schema-1 database rather than leaving the new table behind.
- Client/service TypeScript, scoped ESLint and production client/service builds passed. Schema compilation and validation of all three examples plus the template passed with the existing Ajv toolchain. No broad unrelated test suite, package audit or cross-browser suite was run.
- `node tests/persistence/sprint17-1.mjs` drives real headless Chromium at 1280×720 against an isolated production service. Ten checks cover cancel/import/draw, seed undo, duplicate/group transforms, Area+hole undo/redo, layout, real PNG download, service restart, 18 material replacements and the 100-wall workload. No uncaught browser errors. Baseline evidence: `.sprint17-1.local/1790236601435/`.
- `node tests/persistence/wall-material-render.mjs` renders straight/S/sharp/closed/tight/open-end cases for all materials over light/dark backgrounds at 50%, 100%, 200%. Saved browser screenshots and PNGs: `.sprint17-1.local/visual/`. Pixel checks prove zero alpha in openings and their hit regions, ignored outer transparent margins and matching sampled editor/export colors. Representative light/dark images and the 200% `closeup-sharp-joins.png` and `closeup-cave-contours.png` were opened and visually inspected; this is agent visual review plus scripted Chromium, not an independent human acceptance claim.
- Portable demonstration: `public/examples/wall-materials.mapweaver`, with all material images embedded. It contains three materials on matching paths, explicit X joins, closed contours with doors and a Cave Area with a hole and copied boundary walls. Source Area remains present.

The first visual pass found outer-curve strip gaps and fine slice seams. Shared quad edges and bounded overlapping triangle rasterization fixed them. Hard nodes now terminate quads and use material patches, avoiding twisting a quad through an acute corner. Very tight reversals still have a documented overlap warning in Properties.

## Measured performance

Windows x64, AMD Ryzen 5 2600, 16 GiB RAM, Node 24.17.0, Chromium 153.0.8010.53. One local reproducible run; UI timing includes automation/event delivery. Workload: 100 material walls / 10,100 visible derived parts. Full-map PNG: 2,800 × 7,200. It is a synthetic throughput scenario, not a claim for arbitrary photographs or all graphics hardware.

| Measurement | Result |
| --- | ---: |
| Cached layout retrieval for all walls | 10.85 ms |
| Open and first fitted frames | 1,031.41 ms |
| Select one wall through Objects | 174.94 ms |
| Ten-event node edit and commit | 369.15 ms |
| Continuous wheel zoom, 60 frames | 59.49 fps |
| Wheel frame P95 | 19.90 ms |
| Middle-button pan, 30 delivered events | 506.60 ms |
| Full PNG export/download | 1,619.50 ms |
| Heap increase after 18 material swaps and forced GC | 1.78 MiB, including undo history |

The first uncached zoom run measured 12.48 fps. Scene/hit rasterization was the visible bottleneck. Bounded discrete-quality Konva caches and expanded-bound culling raised the same workload above the 30 fps target. Cache budget: 4,000,000 pixels total / 250,000 per wall, approximately 48 MiB for scene/hit/filter canvases. Cache entries clear on changes/unmount; weak geometry caches do not retain abandoned objects. Very long walls may use reduced editor preview detail. Export retains original artwork resolution and identical placements. The layout number is a cache-read measurement; geometry was already derived during validated fixture construction.

## Artistic acceptance and boundaries

The three sets are distinct, usable illustrated materials: chipped block edges and mortar, warm planks with grain/knots, and irregular faceted rock clusters. Transparent backgrounds, rotation-neutral treatment and visible silhouettes were inspected on light and dark floors. They are deliberately procedural/stylized artwork, not a claim of professional photorealistic art or a complete asset collection.

Tight bends shorter than the material thickness can fold/overlap; the editor gives a concrete reduce-thickness/widen-bend message. Tiny walls are dominated by caps. Sharp joins use patches rather than continuous masonry bond or carpentry simulation. Closed contours can have a phase discontinuity under their join patch. Convex alpha hulls can include small concave holes; selection bounds are conservative. Different materials do not blend seamlessly. An unsnapped geometric crossing is not a connection. These limits are visible/documented; essential rendering and custom import are not deferred to Sprint 23.

## Windows packaging

Explicitly requested by this brief, unlike earlier sprints. Target: `distribution.local/Mapweaver-Sprint17-1/Mapweaver.exe`, built through `node scripts/package-windows.mjs Mapweaver-Sprint17-1` after the production build. Previous packages remain untouched. Launcher source and its Open/Restart/Stop behavior are retained. Packaging completed successfully. `node tests/persistence/wall-material-package.mjs` verified 4,401 SHA-256 entries, the bundled Node runtime, production client and template route, embedded format-8 demonstration import, and exact material-object retention after graceful stop/start. Evidence: `.sprint17-1.local/package-1790237017436/results.json`. Checksums: `distribution.local/Mapweaver-Sprint17-1-SHA256SUMS.txt`. The final report was copied into the new package and checksums regenerated and verified afterward. No installer, system-service installation or default-browser GUI acceptance is claimed.

No push, merge, publication, deployment, cloud action or system-service installation was performed.

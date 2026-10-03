# Sprint 15 — Generic path engine

Date: 2026-09-23. Implementation and targeted validation completed. No known Critical/High issue remains from the checks below. This is not a claim of exhaustive independent security/quality review.

## Delivered

One canonical generic Path object supports open/closed mixed straight/cubic centerlines, absolute map nodes and relative controls. The pure bounded engine exposes segments, total/cumulative length, point/tangent by distance or fraction, nearest segment, curve/stroke bounds, adaptive sampling, exact cubic insertion, deletion, reversal, translation, proportional scale, rotation and reflection. bezier-js 6.1.4 supplies the underlying curve operations.

Path has a labeled tool, Straight/Curved context controls, width/color/texture and Done/Select. Drawing supports click/drag handles, live preview, Enter/double-click completion, first-node closure, Backspace, Escape, Shift angles, Alt bypass, middle/Space pan and wheel zoom. Nodes remain in map coordinates. The green cursor indicates grid snapping. Optional snapping to other paths was not implemented.

Edit path offers node/handle movement, nearest-segment insertion, bounded deletion, corner/smooth, coupled smooth handles, reset, opening/closing and reversing. Done/Enter is one history action; Escape restores the full session. Properties includes name, node count, length in pixels, all stroke settings and atomic Apply. Handles stay constant in screen size.

Solid, dashed and bounded square texture strokes share the editor/PNG painter. Paths participate in Shift selection, single-object transforms, group movement, copy/paste/duplicate/delete, ordering, layers/hide/lock, history, local autosave/conflicts, portable projects, typed asset retention and full backup/restore. Texture sources use fillPattern IDs. Missing editor images show a pink dashed placeholder; PNG refuses missing sources.

Format v4 centrally reads v1–v3 and upgrades in memory. SQLite schema 3 and backup container 2 are unchanged. New documents cannot be opened with older binaries. No serialized samples or editor state.

## Important files

- `src/domain/models.ts`, `paths.ts`: canonical types, geometry, validation, limits and cache.
- `src/canvas/usePathDrawing.ts`, `PathPoints.tsx`, `PathPaint.tsx`, `drawPath.ts`: drawing/editing/hit overlay and shared rendering.
- `src/app/PathTools.tsx`, `PathProperties.tsx`: tool and property forms; shell/selection components extended.
- `src/store/pathEditing.ts`, `objectEdits.ts`, `projectStore.ts`, `editorStore.ts`: sessions, original-snapshot transform previews and integration.
- `src/projects/format.ts`, archive/session/localSession and service/storage: v4 admission and texture reference remapping.
- `docs/adr/0008-generic-paths.md`, `docs/architecture/path-geometry.md`, `mapweaver-format-v4.md`, object/backup docs, AGENTS vocabulary, README and roadmap.
- Dedicated path unit/drawing/service tests and `tests/persistence/sprint15.mjs`, `path-performance.mjs`, `path-browser-performance.mjs`, `path-package-smoke.mjs`.

## Validation

| Check | Result |
|---|---|
| Targeted client Vitest: 11 files, 79 tests | Pass |
| Targeted native service: paths + directly affected areas, 2 tests | Pass |
| TypeScript client + service (production build includes both) | Pass |
| Scoped ESLint over changed source/tests/service and browser scripts | Pass |
| Production Vite client + service builds | Pass |
| Real Chromium 153.0.8010.53 desktop viewport, 1280 × 720 | Pass, workflow below |
| Screenshots and downloaded PNG opened and visually inspected | Pass |
| Additional visible in-app browser review, 1280 × 720 | Pass, directly observed actions below |
| Packaged Node/service creates and persists a v4 path | Pass |
| Local portable package: 4,279 SHA-256 checksums verified | Pass |

Client command:

```sh
npm test -- src/domain/paths.test.ts src/canvas/pathDrawing.test.tsx src/domain/areas.test.ts src/projects/localSession.test.ts src/projects/sprint10-assets.test.ts src/canvas/useCanvasNavigation.test.tsx src/canvas/canvasEditing.test.tsx src/canvas/MapCanvas.test.tsx src/canvas/MapCanvas.drop.test.tsx src/export/export.test.ts src/projects/archive.test.ts
npm run test:service -- service/paths.test.ts service/areas.test.ts
npm run build
```

Tests cover malformed/duplicate nodes, mutable-input cache invalidation, defaults/migration/portable roundtrip, mixed geometry, length/tangent/extrema/projection, split shape preservation, minimum deletion, closed reverse, transforms/relative handles, grid/Alt/Shift, drawing keys, pan/zoom preservation, complete edit history, copy/paste/layers/locks, autosave previews, style/placeholder/render counts and complexity limits. Native service tests verify reference rows, invalid-write retention, portable transfer, full verified archive extraction and reopening the restored SQLite dataset. Existing conflict tests were included through localSession; no new parallel conflict system was added.

Chromium workflow used scripted real pointer/keyboard interactions in headless Chrome at a desktop viewport, followed by direct visual inspection of the screenshots/PNG. It covered open straight, closed, mixed smooth/corner curves; node insertion/deletion and handle movement; Escape restore, one-step edit undo/redo; Shift/grid/Alt; solid/dashed/texture; whole-object move, proportional resize and rotation with undo; actual PNG download; service stop/restart/reopen and 1280 × 720 layout. A further step-by-step review was performed through the visible in-app browser UI at 1280 × 720. Directly observed: drawing an open three-node line, closing it through Properties, drawing a mixed smooth/corner curve, moving linked handles, inserting a fourth node without a length jump, deleting a node, Escape restoring all edits, moving/scaling/rotating with undo/redo, applying dashed settings and a local texture to the curve, Shift angles, Alt bypass, explicit Save, PNG download feedback, service restart and reopening all eight test objects. The native Chrome control connector was unavailable, so the visible pass used the in-app browser; standalone Chrome coverage is the automated desktop workflow above. No independent human test is claimed.

Final automated evidence (ignored local files; the later visible review deliberately added temporary test objects to the same owned dataset):

- `.sprint15.local/1790182939045/acceptance.json`
- `.sprint15.local/1790182939045/01-curve-handles.png`
- `.sprint15.local/1790182939045/02-three-strokes.png`
- `.sprint15.local/1790182939045/paths.png`
- `.sprint15.local/1790182939045/03-reopened.png`

Canvas and PNG match for the illustrated curves, dashed triangle and texture path; PNG has no editing handles. The final reopened screenshot was taken after waiting for canvas initialization and Fit. An earlier immediate post-open screenshot was blank because it preceded canvas initialization; it is not the final evidence. Manual UI verification also corrected two small labels: path rotation now says Rotate object, and the asset picker correctly describes local computer storage. During development the browser exposed a stray JSX whitespace node inside a Konva Group; it was removed and the final workflow passes without that renderer error. Three older canvas mocks lacked the existing Line primitive; their mock exports were updated and all 18 related tests now pass.

Visible review evidence is recorded in `.sprint15.local/headed-review.json` and `headed-review-project.json`. The Shift result has equal-magnitude X/Y deltas; the Alt start retains y=325 despite a 50-pixel grid. These match the observed diagonal and bypass behavior. All browser viewport overrides were reset and the temporary tab was closed.

## Measured bounds and performance

Final core measurement: `.sprint15.local/performance.json`. Windows x64, Node 24.17.0, one local run; no benchmark guarantee or pure frame-time claim.

| Case | Measured |
|---|---:|
| Create/validate 100 paths × 20 curved nodes | 198.09 ms total |
| 10,000 cached geometry reads | 2.80 ms |
| Create/validate maximum 256-node curved path | 27.54 ms, 2,551 samples |
| Long curved texture centerline | 17,096.34 map px |
| First layout of 1,425 texture tiles | 119.45 ms |

The first texture layout is measurable; unchanged redraws reuse its cache. No optimization outside the path engine was introduced.

Browser evidence: `.sprint15.local/performance-1790182848756/browser-performance.json`, 100 paths with 20 curved nodes each. Times include Playwright round trips and ten synthetic move events, **not** per-frame rendering times.

| Zoom | Select | Complete ten-event drag |
|---|---:|---:|
| 25% | 29.46 ms | 220.75 ms |
| 100% | 15.15 ms | 182.11 ms |
| 400% | 19.72 ms | 183.32 ms |

All three selected, moved, autosaved and restored on undo without browser errors. Central limits: 256 nodes/path, 8,192 adaptive samples/path, depth 12, 2,048 tiles/path, 20,000 nodes and 250,000 samples/document. Pathological cases are rejected before persistent admission/rendering.

## Local delivery and limitations

Local package: `distribution.local/Mapweaver-Sprint15/Mapweaver.exe`; checksum manifest `distribution.local/Mapweaver-Sprint15-SHA256SUMS.txt`. Prior packages remain unchanged. Save and stop an older running instance before starting the new one. Package smoke evidence: `.sprint15.local/package-1790183639586/results.json`. It ran the bundled Node/native service against an isolated dataset, verified v4 admission and the production client, and checked every package checksum. Default-browser launcher and installer acceptance were not rerun; their prior Sprint 13 limitations are unchanged.

Texture tiles are square and may overlap/show wedges at sharp turns or crossings; no specialized joins, walls, roads, doors or variable river width. Cap/join are meaningful for line strokes; texture strokes are repeated patches. Length is in map pixels because physical map scale does not exist. Projection and arc-distance inversion are bounded numerical approximations. Other-path-node snapping is optional and deferred. Multi-object rotation/scale remain outside the existing editor, while group translation and single-path rotation/scale work.

No broad unrelated suite, cross-browser/touch matrix or large backup benchmark was run. Owned test services on ports 47951/47952/47953/47954 were stopped; personal datasets and existing user services were not touched. No push, merge, release, upload, publication, deployment or cloud modification was performed; the Windows artifact was built locally only.

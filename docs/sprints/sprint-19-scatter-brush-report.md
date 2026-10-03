# Sprint 19 — Scatter brush

24 September 2026. Completed within the boundaries below. No Windows package was requested or created.

## Acceptance basis

The supplied Sprint 19 request: reproducible editable scatter, weighted shared stamp sources, distance-based painting and selected-object erasing, atomic strokes, exact-enough full-image Area containment including holes, explicit regeneration/default refresh/expansion, whole-object transformations, durable references and shared PNG output. Measure 5,000 instances, gestures at 25/100/400%, Area fill, restart and export. Preserve existing Wall/Area/Path/groups/layers, avoid external actions and do not build a Windows package.

Preparation inspected AGENTS, foundational/storage and geometry/group architecture, prior sprint prompts/reports, roadmap, reserved scale metadata, actual asset/selection/history/persistence/export code and current untracked repository. The existing data and distributions are retained. Sprint 18 and 17.1 are implemented prerequisites, not assumed future work.

## Model and implementation

See [ADR 0014](../adr/0014-deterministic-scatter.md) and [format 9](../architecture/mapweaver-format-v9.md). One scatter stores seed, weighted frozen-sized source references, settings, a bounded ordered recipe and stable instances. A similarity frame keeps whole-object transforms separate from recipe generation. Full-instance image rectangles stay within copied Area polygons and outside holes. Expand creates normal stamps and replaces membership atomically. Nonuniform scaling is refused.

New domain/worker/painter/picker/property modules; plural asset dependency support in admission, history, clipboard, service, archive and export; SQLite recent-set settings; shared reference remapping and warned missing-art repair. One Shape paints all instances; images are leased once per source. Worker previews remain outside project/history. Current asset defaults are used only when choosing a source or confirming recalculation.

## Validation and measurements

All targeted checks passed: 72 distinct client tests across 13 files, 10 service tests across 7 files, 14 real Chromium workflow checks, and the dedicated pixel comparison. TypeScript, scoped ESLint and production client/service builds passed. The last UI adjustments were followed by another client build and browser run.

Client command (71 passed together, followed by the added engine-1 golden-output regression with all 12 scatter tests passing):

```powershell
npx vitest run src/domain/scatter.test.ts src/canvas/scatterClient.test.ts src/projects/scatterAssets.test.ts src/domain/selectionTransform.test.ts src/domain/arrange.test.ts src/projects/localSession.test.ts src/projects/archive.test.ts src/projects/recovery.test.ts src/projects/sprint10-assets.test.ts src/export/export.test.ts src/domain/wallMaterials.test.ts src/canvas/MapCanvas.test.tsx src/store/objectManagement.test.ts
npx vitest run src/domain/scatter.test.ts
npx vitest run --config vitest.service.config.ts service/scatter.test.ts service/wallSets.test.ts service/openings.test.ts service/groups.test.ts service/paths.test.ts service/areas.test.ts service/walls.test.ts
npm run build
npm run build:client
node tests/persistence/sprint19.mjs
node tests/persistence/scatter-render.mjs
```

Client coverage includes deterministic output and distance sampling, weights, spacing, full-image hole containment, erasing, similarity transforms, history/expansion/group membership, source remapping, admission budgets, format validation, missing-image export refusal, scale defaults, falloff, ordering and worker cancellation. Service checks cover all-source references, invalid writes, revision conflicts, SQLite reopen, portable import/remapping, full backup restoration and persistent recent sets. Existing related Area/Path/Wall/opening/group and export tests also pass.

Browser acceptance used headless Chrome 153.0.8010.53 at 1280 × 720 with a disposable local service and synthetic stamps. It checked live preview without document mutation, weighted four-source painting, extension and exact undo/redo, selected erasing, wheel zoom and both pan methods, Escape cancellation, same/new seeds, whole-object scale/rotation/drag, source replacement and undo, Area holes, confirmed expansion/cancellation, byte-identical PNG after restart, and 5,000-instance paint/erase at 25/100/400%. Screenshots and exported PNGs were visually inspected. This was automated real-browser interaction plus image inspection, not an independent human manual acceptance session.

Final local evidence: `.sprint19.local/1790246788422/results.json`, `00-live-preview.png`, `01-painted-forest.png`, `02-area-hole.png`, `03-5000-instances.png`, `forest.png`, `forest-reopened.png` and `5000.png`. Pixel evidence is under `.sprint19.local/render/`. These generated fixtures/results remain local and ignored.

The shared editor/PNG painter has zero channel difference for both the base case and rotation 31°/scale 0.75/reflection; hole alpha is zero. Expansion to ordinary Konva stamps has tiny antialiased-edge differences (81 and 11 changed channels out of 840,000): maximum premultiplied RGB difference 1.906/255 and alpha difference 1/255. Raw RGB can differ more in nearly transparent pixels; expansion is visually equivalent within this measured tolerance, not claimed byte-identical.

Measured on Windows, AMD Ryzen 5 2600, Node 24.17 and the above Chromium, with synthetic images:

| Check | Elapsed |
| --- | ---: |
| Generate 5,000 instances | 54.4 ms |
| Open, fit and settle 5,000 instances | 826.7 ms |
| Erase at 25 / 100 / 400% | 1615 / 1482 / 1273 ms |
| Paint at 25 / 100 / 400% | 1494 / 1438 / 1237 ms |
| Export 5,000 instances | 401.6 ms |

Paint/erase timings include automation and autosave debounce/database polling; export includes dialog/download. These are end-to-end measurements, not brush frame latency or an FPS guarantee. Generation runs in a cancellable worker; rendering uses one Shape per scatter rather than a React component per instance.

During validation, whole-object gesture previews were corrected to use the original transform snapshot, erase previews now replace the selected rendering instead of duplicating it, and replacement sources regenerate explicitly with their own aspect-preserving dimensions and the same seed. Scoped lint issues and outdated test fixture assumptions were corrected. Source replacement and refresh remain undoable; restoring a missing original source may require reopening the project, while replacement is available directly.

## Important files

- `src/domain/scatter.ts`, `scatterSizing.ts`, `seededRandom.ts`: bounded deterministic generation, validation, source sizes and shared random function.
- `src/canvas/scatter.worker.ts`, `scatterClient.ts`, `useScatterDrawing.ts`, `ScatterPaint.tsx`, `drawScatter.ts`: cancellable generation, atomic gesture lifecycle and shared rendering.
- `src/app/ScatterPicker.tsx`, `ScatterTools.tsx`, `ScatterSourceSummary.tsx`; `src/store/scatterActions.ts`: weighted picker, controls, properties and explicit transactions.
- Existing model, selection, history, archive, session, service/storage and export modules now resolve every scatter source rather than a single asset.
- README, AGENTS vocabulary, ADR 0014, format-v9 documentation and roadmap were updated. Targeted domain, worker, asset, service and browser tests provide regression coverage.

## Boundaries

Image-rectangle containment and AABB collision are conservative, not pixel-alpha collision. No collision against other map objects. Random density is a target before mask/falloff/collision rejection; saturation is capped. Very complex masks/generation hit a bounded worker deadline and preserve the original document. Same seed and the same canonical polyline/settings/engine reproduce output; genuinely different input polylines can differ.

Existing map settings have no canonical physical scale, so reserved world-size asset defaults visibly fall back to native size. Grid defaults use current cell size while preserving aspect ratio. Existing instances never silently resize. Recent sets retain IDs/weights and can show unavailable sources after library changes.

No Windows package, push, merge, publication, deployment, upload, cloud change or system-service installation.

Not run: the entire unrelated test suite, a global format check, other browsers, installer/portable-package acceptance or actual power-loss testing. No known critical/high defect remains in the tested Sprint 19 scope; the documented geometry/resource limits and platform coverage still apply.

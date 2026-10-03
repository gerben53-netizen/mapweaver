# Premium Marble masonry integration

3 October 2026, develop. **Production status: PASS WITH NOTE.** Marmer is normal production content through the existing generic masonry engine. Non-blocking notes: low contrast on a similarly pale marble floor, loss of fine veins/joints at 50–75% canonical overview, and five near-opaque corner antialias pixels that contradict one supplier-report assertion. No artwork modification or engine repair was necessary.

## Component preflight

Input: Premium-Marble-Masonry-Wall-Component-Pack.zip. Existing committed scripts/export-masonry-wall-spec.mjs / Masonry-Wall-Production-Spec and the production pale-palace-stone@production-1 definition supplied the exact contract. No discrepancy in IDs, roles, canvases, physical dimensions, weights or anchors. Exactly six intended artwork/ PNGs; supplier context/proofs were not registered as content. Source ZIP and individual SHA-256 are in docs/wall-sets/marble-production-provenance.json. All six match the supplier hashes and are copied **byte-identical**, without crop, resize, recolor, sharpening, relighting, repainting or new artwork.

| IDs / filenames (.png) | Role | Canvas px | Nominal ft | Weight each |
| --- | --- | --- | --- | --- |
| block-large-1, block-large-2 | block-large | 384 × 128 | 1.5 × 0.5 | 1 |
| block-medium-1, block-medium-2 | block-medium | 256 × 128 | 1 × 0.5 | 1 |
| block-small-1, block-small-2 | block-small | 128 × 128 | 0.5 × 0.5 | 1 |

All six: 8-bit RGBA PNG, straight alpha, clean zero RGB at alpha zero, transparent gutters inside safeBounds, opaque coherent stone interior, +X horizontal overhead, full-canvas center anchor. Total decoded source pixels: 196,608. Visual source review shows one honed white/silver-veined stone top per canvas, no floor/background, vertical face or directional shadow. No canvas plate or white/black matte fringe observed on actual rendering. Bounds use inclusive right/bottom; supplier's exclusive bounds describe the same pixels.

**Exact alpha-report exception:** supplier claims zero partial-alpha pixels more than two pixels from transparent contour. Measured five alpha-249 pixels at distance 3 from zero-alpha: medium-1 (250,5), (5,122); small-1 (122,5), (122,122); small-2 (122,5). These are corner antialiasing, not deep interior transparency; all others lie within the two-pixel contour band. No correction is required for integration, and none was made. The current authoring specification requires contour antialiasing and safe bounds; it does not require identical DEV alpha patterns or a fixed two-pixel antialias width. Raw measurements and exception are retained in provenance/component-preflight.json rather than repeating the supplier's incorrect zero count.

## Material and architecture

One immutable definition **marble@production-1**, user-facing **Marmer**, generatorType masonry. Defaults identical to proven dressed pale stone: width 1 ft; Regularity 90%; Variation 20%; initial deterministic seed 1; reserved root organic/growth/overgrowth zero. Practical QA benchmark uses seed 17 before Randomize, and preserves the resulting changed seed through history/save/reload. Existing .5/1/2/3 ft Thin/Standard/Heavy/Massive presets and user controls remain available.

No material-specific geometry, corner/jamb rules, renderer, extra component role or scene-stone object. Registration is import plus registerGeneratedDefinition, data only. Existing normal picker already lists all production definitions and hides DEV choices except the exact saved selection. Bleke paleissteen definitions/PNGs, Living Root components, DEV fixtures, legacy/continuous walls and Campfire source/semantics are unchanged. Project format 12 remains unchanged; only the existing generated ID/revision references a new immutable pack. No migration or user-map rewrite.

## Real benchmark and geometry

Reused deliverables.local/Masonry-Generated-Walls/masonry-benchmark.mapweaver. Isolated proof copy preserves all source native IDs, nodes, widths, layer structure, independent T/cross walls and two passage attachments. Only generated material ID/revision/defaults/seed changed. 400 × 300 map px / 40 × 30 ft at 10 px/ft; 11 native Wall objects, two passages, no Area dependency or decorative stone stamps.

| Geometry | Actual Mapweaver assessment |
| --- | --- |
| Long straight | Dressed courses and white/gray marble; rhythm without a dominant dark repeating vein |
| Gently varied | 75% Regularity / 35% Variation proof remains coherent; default stays 90/20 |
| Broad curve / S curve | Tangent-following courses, localized veins rotate without artificial cross-block alignment; no grotesque stretch, broad gaps or broken rows in demonstrated radii |
| 90° corner | Existing square filler reflow works, without corner sprites |
| Free ends / passages | Small source fillers and existing opening-only clip terminate cleanly; no floating blocks or intrusion across the two passages |
| T / crossing | Independent native walls, ordinary overlap; no shared-course or global graph claim |
| Thin / Standard / Heavy / Massive | 1/2/4/6 staggered nominal half-foot courses; wider walls do not stretch a single stone band |

Inspecting long walls and Heavy/Massive reveals normal repeated masonry rhythm. Individual six-variant patterns can be found by close comparison, but no singular dark vein dominates. The 80 px/ft inspection comparison shows clear local crystalline/gray veining versus warmer pore-rich pale stone, with identical geometry, width, seed/settings and background. It is a real native Mapweaver render, not artist-side assembly. No Pale artwork was modified. Increased map resolution retains the **same physical 1-ft wall width and component footprints**; it does not enlarge stones in feet or rescale delivered PNGs.

## Zoom, floor contrast, context and shadows

Actual editor camera proofs 100%, 75% and 50% exist, with 75% explicitly asserted. At canonical 10 px/ft, .5-ft stones become 5 map px deep before camera zoom. Fine veins and individual joint detail fade at 50–75%; recognizable white silhouette, broad curve, course mass and passage gaps remain. Inspection zoom demonstrates material identity without claiming each 2–3 screen-pixel stone is independently identifiable as marble. Source scale and color were not changed.

Existing accepted Premium content only: natural wood context plus three Eldric PQA props (writing desk, reading chair, palace plant) with existing Stamp Soft Shadow; new floor and decorative context art were not generated. Closed native Marble perimeter is coherent with these props. Four additional actual rendered context cases use the existing core Premium repeat scale 200/1254:

| Floor | Contrast result |
| --- | --- |
| Paleisparket | Good white-wall separation against warm/taupe parquet |
| Lichte stenen vloer | Visible white contour, lower separation and reduced course detail than wood |
| Marmeren vloer | Weakest separation: white/gray wall and pale veined tiled floor have close value/material; readable perimeter at inspection, less reliable at low overview |
| Kernhout- en wortelvloer (darker) | Strong white-wall separation; useful contrast reference |

Low contrast is a **wall/floor combination**, compounded by the existing absence of a separate generated-wall contact-shadow pass. It is not an alpha failure, missing block or special Marble packing defect. Prefer a darker/contrasting floor for strong overview readability. No dark outline, new contact treatment, directional shadow or color correction was baked into sources. Stamp Soft Shadow remains exclusively the established stamp treatment; no generated-wall shadow feature was added. This is production-usable with the documented light-floor limitation, not a claim that every floor combination has equal contrast or that application-wide Premium certification is complete.

## Persistence, history, export and regression

Actual Wall Tool selector/real clicks validate Marble creation; Enter and double-click finish open, clicking start closes. Randomize through Properties and real Ctrl+Z/Ctrl+Y retain exact objects. Native API/history transactions exercise node position, curve handle, width, Regularity, Variation and opening placement/removal, with exact undo/redo. Autosave/reload retains stable ID/revision/seed/controls and gives byte-identical before/after PNGs. Editable archive roundtrip retains exact native objects. SQLite close/reopen and export/import ZIP transfer cover Marble, pale stone, Living Root and both DEV masonry fixtures.

PNG 1× and 2× use the existing final-quality renderer, distinct from .5-sample/map-pixel draft mode. No missing blocks, visible alpha halo or preview degradation observed. Map-edge test resizes a native scene to 800 × 200: raw exported pixels equal the corresponding crop of the unchanged 1600 × 400 export. Existing raster budgets/maximum edges remain; extreme reversing curves/acute corners and huge widths are outside this practical benchmark. T/cross objects do not have global coursing; short terminal fillers may source-crop and passage clipping is intentional.

Validation:

- 76 targeted client tests, nine files: masonryWalls, generatedWalls, walls, openings, continuousWallMaterial, wallMaterials, GeneratedWallFields, Campfire contract and windowLights — pass.
- 10 focused service generatedWalls tests: source bytes/hash/dimensions/alpha gutters, Marble/default inventory, all production/DEV recipes through SQLite reopen and ZIP transfer — pass.
- npm run typecheck — pass.
- Targeted ESLint on generatedWalls, masonryWalls.test, GeneratedWallFields.test and service/generatedWalls.test — pass.
- npm run build:service — pass before browser startup.
- Full npm run build — pass: immutable canonical Campfire guard, TypeScript/client Vite, TypeScript/service Vite, eight font families/licenses. This includes both client and service builds; no duplicate standalone client build necessary. Existing dynamic-import/chunk-size warnings only.
- Six dist/generated-walls/marble-production-1 PNGs byte-identical to registered source — pass.
- Isolated browser acceptance: 13 successful check groups, zero page errors; actual selector, camera proofs, native rendering, history, save/archive, four floors/comparison and clipping — pass.
- Diff whitespace review — pass. No full unrelated suite, Roll20 test, Windows executable/installer build or external action.

## Default content and Rough Stone implications

Default inventory now declares Marmer, advances libraryRevision and adds marble-production-provenance.json to installer attributions. Existing generated-walls public-directory allowlist and Vite copy already include all six PNGs; build output bytes confirmed. DEV fixtures stay hidden in normal new-wall choices and remain for saved projects/tests. Delivery permits inclusion, modification and distribution in Mapweaver/maps, with no additional attribution restrictions; AI artwork carries no exclusive-rights guarantee. No installer/package built.

Rough Stone remains data-driven through the same three roles/six-footprint contract. Keep coherent source coverage, clean transparent RGB, contour-local antialiasing and rotation-neutral material; supply measured pixel facts rather than relying solely on artwork-side claims. Localized motifs and width courses preserve identity better than enlarging stones. Evaluate future light material/floor combinations in-engine because authoring-neutral sources do not guarantee overview contrast. No Rough Stone pack built and no engine branch added.

## Evidence and changed files

All local evidence is ignored under **deliverables.local/Marble-Masonry-Integration/**:

- production-integration-report.md and component-preflight.json
- component-reference.png (source technical contact; not the in-engine benchmark)
- masonry-benchmark.mapweaver; benchmark-editor.png; closed-wall-editor.png
- editor-100-percent.png; editor-75-percent.png; editor-50-percent.png
- benchmark-1x.png; benchmark-2x.png; gently-varied-2x.png; straight-masonry-reference.png
- curve-closeup.png; corner-closeup.png; opening-end-closeup.png; heavy-massive-closeup.png (unmodified pixel crops of actual native 2× export)
- before-reload.png; after-reload.png (byte-identical)
- context.mapweaver; context-editor.png; context-1x.png; context-2x.png
- contrast-{wood-parquet,stone-pale,marble-neutral,wood-heartwood}-{1x,2x,editor}.png
- marble-versus-pale-inspection-1x.png / -2x.png (top pale stone, bottom Marble; same physical geometry)
- edge-full.png; map-edge-clipping.png; browser-results.json; performance-partial.json; service.log

Tracked: src/domain/marblePack.json; src/domain/generatedWalls.ts; six PNGs under public/generated-walls/marble-production-1/; docs/wall-sets/marble-production-provenance.json; docs/distribution/default-content.json; src/domain/masonryWalls.test.ts; src/app/GeneratedWallFields.test.tsx; service/generatedWalls.test.ts; this sprint report. Existing material definitions/artwork, user maps/library/databases and canonical Campfire directory are untouched. Initial worktree clean on develop. Own service/editor used new ignored data and nonstandard ports 48280/48281 after checking existing 5176 instance; own processes stopped, existing 5176 instance preserved.

One local commit required: **Sprint: Integrate Marble Masonry**, develop. Proofs/databases excluded from staging. No user data reset and nothing pushed, published or deployed.

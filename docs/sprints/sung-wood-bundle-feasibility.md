# Gezongen hout — bundle feasibility

## Acceptance before implementation

Audit and separate engine constraints from artwork; try minimal DEV components/defaults in the existing bundle; assess straight/curved/S/corner/open endpoints/openings/all four widths and a native open-wall room/corridor; compare Living Root and Refined Timber; validate determinism, history, local/portable persistence and PNG 1×/2×; measure generation/preview/cache/export; deliver a self-contained production specification after a demonstrated PASS. Do not retune other materials, add a strategy or produce Premium artwork.

## Bundle audit before code changes — 4 October 2026

The existing bundle is internally tagged `generatorType: living-root`. This is a strategy identifier, not a requirement that another material depict roots. Registered definitions and source artwork are data. `generatedWallGeometry.ts` dispatches this strategy after linear/rock/masonry; `drawGeneratedWall.ts` is shared by editor and PNG.

Engine-imposed: physical width selects 2–9 overlapping runs, longitudinal spacing is approximately half a wall width, local tangent following, seeded weighted selection with immediate-repeat avoidance, bounded component length/width, arc-length intervals split by native openings, endpoint inset/available-length restraint, one knot-role component at abrupt corners, real map/opening clipping, separate functional/visual bounds and bounded raster/cache budgets. Low Organic reduces coherent offset/rotation/spacing/length variation. Growth controls optional small/knot details; Overgrowth controls optional moss/leaves. Closed uninterrupted paths use periodic variation. Seed and recipe persist on a native Wall; temporary components never become stamps.

Artwork-imposed: bark, root fingers, interweaving drawings, jagged/coarse silhouette, strongly visible overlapping outlines, knots that depict tangled roots, moss/leaves detail and directional surface marks. Bundle requires long/medium/small/knot roles, but their technical names do not require root imagery. End components are optional. A smooth rounded architectural body and subtle join can occupy the same contracts.

Candidate A: register a separate `sung-wood@dev-1` definition using the existing bundle, Organic 0.08, Growth 0, Overgrowth 0, physical default width 1 ft. Use five DEV components: one long body, one medium body, one required small body, one rounded corner/join, one deliberate rounded endpoint. This is the minimum required role set plus one endpoint role. No branches in renderer, strategy changes, extra controls, Living Root edits or production artwork are proposed. The benchmark will determine whether forced multi-run overlap still gives unacceptable construction rhythm.

DEV artwork must be labelled DEVELOPMENT ONLY — NOT PRODUCTION ARTWORK. The exact 90° top-down fixtures illustrate smooth/guided wood, without planks, saw cuts, beams or coarse root fingers. They are technical feasibility shapes, not an art-direction quality approval.

## Result

**PASS — EXISTING BUNDLE.** No generator or renderer changes, metadata extensions, fifth strategy or new controls were necessary. Five independent smooth DEV components and restrained defaults are sufficient for this technical feasibility benchmark. Premium visual approval is explicitly outside this result.

## Actual Mapweaver proof and assessment

Isolated local campaign/database, service 48394 and client 48395, with 19 native editable Walls, three native openings and explanatory Labels; no Areas, scene stamps or decorative cover-ups. Existing instances were checked before starting; only this task’s child processes were stopped. Actual PNG renders and editor screenshots cover fit-to-map, 100%, 75%, 50%, straight/broad/tight/S curves, practical corner, endpoints, openings, every width and an independent open-wall chamber/corridor. Living Root production and Refined Timber production use identical comparison geometry and physical scale.

Root imagery is visibly coarse/wild, DEV grown wood smooth/rounded, and Timber manufactured. The initial DEV contrast outlined every overlapping body too strongly; softening artwork edge/grain contrast improved continuity without an engine edit. Curves follow tangents and width increases use multiple bodies. Sharp corners produce rounded local growth bulges and visible meeting runs; Massive endpoints show parallel rounded bodies. These are acceptable technical assembly behavior, not final Premium quality. Production must avoid contrast rims, repeated scallops, protruding fingers and obvious bundle seams; reintegrated artwork requires another visual review. No dedicated corner catalog is justified by this benchmark.

At both PNG 1× and 2×, 8,223 sampled points across center/inner wall bands had zero gaps; native passages remained transparent. This does not claim every outer silhouette pixel is continuous. Seed variation, exact undo/redo, local save/reopen, completed-edit autosave/reopen and portable archive roundtrip passed. Autosave verification polls persisted state and waits for queued saves to settle before reopening, rather than assuming a transient UI save flag means all writes are complete. Seven browser checks passed with zero page errors.

## Performance

On this machine’s headless Chrome, 19-wall benchmark: initial/final render 103.5 ms; average cached redraw 0.167 ms; live curve-edit previews 8.6–12.8 ms; PNG 1× 134.5 ms; PNG 2× 402.9 ms. Shared render statistics: 50 builds / 795 cache hits across the proof. Measurements are local snapshots, not cross-machine guarantees. Living Root/Timber code and production artwork are unchanged; their actual exports are included in the comparisons.

## Deliverables and production handoff

Ignored local evidence: `deliverables.local/Sung-Wood-Bundle-Feasibility/`, including actual PNG 1×/2×, editor zoom views, geometry/comparison crops, DEV contact sheet, editable `sung-wood-benchmark.mapweaver` and `browser-results.json`.

Self-contained external handoff: `deliverables.local/Sung-Wood-Wall-Production-Spec/` and the adjacent ZIP. It contains the component spec, per-component JSON, five byte-identical DEV reference PNGs, proof layout, actual benchmark and README-WORK. JSON records exact IDs/roles/filenames, canvas/physical/nominal dimensions, weights, measured reference alpha bounds, safe bounds, opaque continuity core, centered anchor, rotation/scaling/crop requirements and consumed bundle defaults. Exact canvas/filenames are required; exact DEV alpha masks are not. References explicitly say DO NOT COPY VISUAL STYLE. Recommend one first **Premium Gezongen Hout** pack; no style/color subdivisions.

## Validation and limits

89 tests / 8 targeted files passed: Sung Wood, Generated Walls, masonry, rock, linear, walls, openings and GeneratedWallFields. Typecheck, targeted ESLint, client build, service build and font-resource check passed. Full `npm run build` was executed and **blocked** by canonical Campfire contract provenance drift in `generate-schema.mjs`; the immutable contract and derived artifacts were not changed or regenerated. No contract/export semantics were altered. Therefore full-build DoD is pending Campfire owner review; the local wall feasibility and independent builds are complete.

Tracked scope: separate DEV definition, five PNGs/README, deterministic native fixture builder, two-line registry integration, focused regression tests and this report. No renderer changes, Premium artwork, user data, Windows package or remote action. DEV content stays hidden from the ordinary material chooser unless an existing benchmark wall references it.

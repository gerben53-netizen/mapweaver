# Organic Land Brush prototype — implementation report

2026-10-18 · branch `codex/elyra-v3-geographic-accuracy` · baseline audit `645fb9a` preserved.

## Outcome

Round remains unchanged. Land / Water now offers Organic Soft, Organic Rugged and Organic Fine with simple shape, diameter and Add/Remove controls. The prototype is technically validated; visual decision **ADJUST**, not production acceptance. Rounded terminal lobes remain, particularly in Fine. No merge is authorized by this result.

`organicLandFootprint.ts` generates bounded, deterministic 72-point radial contours. Soft uses broad low-frequency asymmetry; Rugged adds several smaller frequency bands; Fine restricts deviation with a different frequency distribution. Seeded orientation and world-position phase drift avoid identical successive stamps and abrupt orientation changes at turns. The current stroke uses one seed; the next completed gesture advances a transient deterministic seed sequence. Cancel does not advance it. The cursor and worker use the same seed.

The existing spacing, polygon-clipping engine, map clipping, validation, complexity budgets, worker, Area commit and history remain in use. Existing Round and legacy shapes retain seed 1 and their old footprint code. Old default Organic remains the default; this sprint does not silently promote a prototype.

## Controlled comparison

All five copies start from the exact existing V3 archive (`projects/base.mapweaver`, SHA-256 in `performance-results.json`): 37 Areas, 37 polygons, 674 nodes. The first four use the same three remove/add/remove polylines, diameter 60 map pixels, softness 0, irregularity .65, no smoothing, seeds 713–715. Every coordinate and processing time is recorded in the metrics. Coordinates are reference crop `(90,20)` transformed at 2.5 map pixels/reference pixel. No original audit file was changed.

Combined uses the same first three trajectories with Soft 85, Rugged 45 and Fine 24, then one additional Fine 24 correction (seed 716). It has four actions rather than three and is not an equal-action performance comparison. This deliberately larger soft bay and smaller local corrections avoid indiscriminate detail.

The controlled trajectories are replayed through the actual domain engine by `reproduction/build.mjs`, then imported into the real editor. They are **not five independently hand-drawn UI trajectories**. A separate real pointer gesture verifies controller/worker integration and UI undo/redo, then is undone before the final parity check. This distinction preserves identical comparison inputs without attributing script authoring to a human gesture.

Each variant has an actual editor screenshot, native Export PNG → Download PNG output, same-scale crop and editable archive. The extra `*-function.png` files are parity witnesses from the same native renderer, not substitutes for UI downloads. `reproduction/compare.mjs` checks the UI download hash against initial, archive-reopened and database-reloaded renders before creating the contact sheet. It only crops/labels, without altering map artwork.

## Integration and limits

The result is ordinary Area geometry: contour selection/editing and Local Contour Precision continue to operate. Protected landmark indices are transient precision state. Existing Land Add/Remove does not protect them and may invalidate them; this behavior is deliberately unchanged. Smooth/Roughen retains its existing circular influence semantics. New shapes concern Add/Remove footprints, not a new smoothing engine.

Geometry, not brush recipes, is persisted. No model, format, migration, serializer or export-engine change is necessary. Resetting the application resets the transient next-stroke seed, but never changes saved geometry. Equal results for sparse/dense samples are demonstrated for the same known polyline; missing turns between pointer events cannot be reconstructed.

All five Add strokes join a nearby island to the mainland: 37 → 36 Areas. This is expected union behavior but a geographic control limitation of the chosen strokes, not evidence of geographic accuracy. No automatic tracing or full Elyra reconstruction was performed. No instrumented pointer-to-pixel latency claim is made.

## Isolation

The existing isolated QA service on 127.0.0.1:49571 uses `.qa.local/land-precision/data`, never Primary Development. Prototype frontend: 127.0.0.1:49612; its API proxy uses the existing permitted QA origin 49572. Five distinct QA map identities are listed in `projects/*-validation.json`. Existing V3 source remains intact. No Campfire files, Primary data, packages, remote pushes or merges were changed/performed.

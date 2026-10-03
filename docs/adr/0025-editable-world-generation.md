# ADR-0025 — Editable offline world generation

Status: accepted for the first world-generator implementation, 2026-09-24.

## Decision

World-map creation offers a disposable Web Worker preview. Only explicit Create sends a normal format-12 document through the existing local project service. Cancel and preview never write a project. Existing maps are unchanged. No new dependency, service endpoint, cloud call or raster asset is introduced.

`src/world` owns parameters, validation, terrain generation, contour extraction and the wizard. Seed text is hashed with a 32-bit FNV-style hash over UTF-16 code units, then passed to the existing counter-based seeded PRNG. Generator `world-v1`, version `1`, promises identical document output for identical validated parameters. Algorithm changes require a new generator version.

The fixed 145 × 97 terrain field combines warped continent masks, layered value noise, elevation ridges and edge falloff. Water thresholds define land. Priority flooding resolves basins; steepest descending filled-height neighbours form acyclic drainage to ocean or lakes. Selected headwaters become native river Paths and can merge into existing generated rivers. Rivers terminate at emitted lakes; discarded basins do not produce unexplained river outlets. Climate uses latitude, elevation and seeded moisture, with preset offsets. Forests, deserts and broad elevation regions follow those fields.

Triangulated-cell contour tracing produces rings and holes. Shared grid-edge identities avoid float/vertex stitching ambiguity. Smoothing and simplification reduce vertices; native geometry validation remains authoritative. Biome and lake geometry is intersected with emitted land. Invalid, tiny or over-budget regions are omitted and counted in the preview.

## Native output and limits

- Ocean: ordinary editable map background colour.
- Land, biomes, mountains, forests, lakes: ordinary semantic Areas with solid fills.
- Rivers: ordinary river Paths.
- One Generated World layer group; top-to-bottom Rivers, Lakes, Forests, Mountains, Biomes, Land.
- Maximum 240 objects, 9,000 Area points, 40 rivers with fewer than 256 nodes each; all normal per-object geometry limits also apply.
- Canvas 512–4096 pixels per axis and at most 12 million pixels. World width in kilometres is explicit input; aspect ratio derives physical height.
- Worker cancellation and a 15-second timeout bound preview work.

## Persistence and compatibility

Format 12 gains optional `map.generation`: generatorId, generatorVersion, validated parameters, groupId, objectIds and layerIds. Maps without it remain valid. It is preserved by normal map settings and project serialization and shown as Generation source in geographic settings. Metadata records provenance, not a live constraint: manual edits are normal edits, and deleted/duplicated object IDs need not match the original generated ID list.

Post-creation replacement/regeneration is deferred. Original IDs provide a future ownership starting point, but no current action uses them to overwrite content. A future replacement design must account for manual modifications and stale IDs. Names never determine ownership.

## Consequences

Output works with ordinary selection, properties, layers, undo/redo, storage and PNG export. No generation-specific rendering is needed after creation. Mountains and forests are editable coloured terrain regions; automatic stamp/scatter styling, labels and settlements are not included. This is an approximate fantasy geography model, not tectonics, erosion or GIS. Continent count controls major centres, which can join or split at coastlines; water level is a height threshold, not a target percentage of ocean coverage.

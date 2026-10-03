# Campfire Contract Window Lights — sprint report

3 October 2026; branch develop. Canonical read-only source inspected: `../Campfire/packages/map-contract`, specifically README, source schema/types/index/validators and emitted schemas. Prior Mapweaver producer supported explicit format version 1; current canonical extension is **version 2**, README milestone R2.18.6.2. This is a transport version, not the map's authoring revision. Positive safe-integer revision (minimum 1) remains unchanged.

## Relevant contract diff

V1 schema and fixture bytes/semantics remain unchanged. V2 extends the schema with optional windows (maximum 16): stable id, wallId, nonzero geometry.start/end on the referenced wall in original pixel coordinates, transmitsExteriorLight boolean, optional exteriorLightTransmission 0–1 (default 1). Validator now admits explicit versions 1/2 and verifies window uniqueness, map bounds and collinearity/containment on referenced wall. Windows do not become doors or vision gaps. No authored color, intensity, range, side, day/night/environment or Pixi fields exist in this extension.

The byte-identical generated public source files and v2 JSON Schema are refreshed; SHA-256 provenance pins the current owner files. `scripts/sync-campfire-contract.mjs` reproducibly copies only into Mapweaver, never builds or writes Campfire. The drift check now distinguishes the two canonical schema copies. Final fingerprint comparison verified all 20 pinned Campfire files unchanged throughout the sprint. The earlier build drift is resolved by this explicit reviewed consumer update; validation was not disabled or weakened.

## Domain, UI and preview

Existing WindowObject receives optional `exteriorLight` inputs typed as Pick of canonical MapWindowV2. Existing wallId, attachment position, width and object ID remain its ownership/geometry source. Only transmission boolean/scalar are new stored inputs. Admission delegates to actual canonical validation. No competing opening entity or derived preview coordinates are persisted.

Select Window → Properties → Opening → Transmit exterior light, optionally Transmission, then Apply opening properties. Blank transmission preserves absence/default 1; explicit zero is valid. Show aperture preview enables an ephemeral separate map-clipped overlay. Origin, two wall-normal arrows and tint make the aperture/transmission visible. Gold and guide depth (1.5 × opening width) are diagnostic conventions, never authored color/range; Campfire chooses exterior side, environment, appearance and runtime lighting. No ray tracing/fog/token engine or baked illumination.

## Export and identity

Current serialization emits version 2, stable mapId and current campfireRevision. Windows retain native window IDs and reference deterministic aperture-chord wall IDs (`native-wall-id:window:window-id`). The chord endpoints use original map-pixel arc-length endpoints. Curved native aperture intervals explicitly become a straight transport chord, since the contract requires an aperture on one straight wall. Other wall portions retain existing adaptive subdivision. Parent chord blocksVision stays true; doors/passages retain their existing semantic rules. Material/Generated Wall artwork, editor viewport and preview/runtime state are absent from payloads. Ordering and package entry timestamps remain deterministic.

The chord counts toward the 80-line budget and the aperture toward 16 windows; native maps exceeding transport limits remain editable but export fails through the canonical validator. Hidden wall assemblies are omitted according to existing visible-export rules; truly dangling source attachments fail before projection. No Campfire-to-native importer existed, so none was introduced; canonical v1 validation/package assembly remain supported and v1 rejects v2 windows. Portable native map import/export continues to roundtrip the optional authored inputs.

## Persistence, history, deletion and compatibility

Existing JSON/SQLite/autosave/archive stores semantic inputs on the owned Window, without a database schema change. Optional format-12 addition is documented in ADR-0056 and docs/campfire-export.md. Apply is one history transaction; undo/redo restores original IDs/input. Deleting a Window removes its inputs; confirmed wall deletion cascades openings and undo restores them. Existing duplicate/relink/extension machinery retains ownership and remaps IDs where appropriate.

Old native windows remain byte-identical without new fields and authoring appearance remains unchanged. They export v2 transmitsExteriorLight false, not automatically enabled lights. No old maps are rewritten or reset, no batch migration, no invented visual defaults. Existing native parser's revision default 1 remains the prior policy. Contract test expected output now uses v2; canonical v1 fixture is unchanged. New focused inline fixtures cover valid v2, previous v1, missing revision, valid window, off-wall/dangling reference and invalid/optional inputs. Required revision is not made optional in the contract.

## Benchmark and local proofs

Ignored `deliverables.local/Campfire-Window-Lights/`:

- `window-light-benchmark.mapweaver`: isolated editable 400 × 300 px battlemap, canonical 50 px / 5 ft; neutral floor Area, native wall, one attached Window with transmission 0.65.
- `authoring-preview.png`: actual inspector/preview at fit zoom, origin/two-sided guide visible.
- `map-without-preview.png`: actual native PNG without overlay or baked Window Light.
- `map.json`: actual valid exported v2 contract and stable references.
- `campfire-window-light.zip`: native Campfire package with JSON and neutral PNG.
- `browser-results.json`: six browser acceptance checks, zero page errors.

Existing listeners were inspected; own isolated service/editor used nonstandard 48274/48275 and were stopped afterward. Existing application processes and the user's primary data directory were not changed. Browser acceptance covers inspector Apply/preview, real keyboard undo/redo, actual v2 ZIP export, autosave/service reopen, portable map roundtrip and cascade/undo. Proof images were visually inspected.

## Validation

47 tests pass across contract, Window Lights, OpeningProperties, openings, LightingControls, masonryWalls and generatedWalls. Coverage includes schema equivalence, v1/v2 admission, required/optional fields, pixel/viewport independence, invalid references, curved chord references, persistence, undo/redo and deterministic export. Previous Masonry/Living Root tests remain passing. Targeted ESLint on modified non-generated TS/TSX and check/sync scripts passes. Typecheck passes. Full `npm run build` passes, including canonical provenance check, TypeScript, production client/service build and eight-family font/license check. Existing chunk-size/dynamic-import warnings remain. Diff whitespace check passes. No full unrelated suite or Windows build was run.

## Masonry implications and scope boundary

The prompt's sequencing sentence “Masonry starts after this commit” is stale: Masonry was already committed as 1cd7ab0 before this request. Its implementation/artwork/definitions are unchanged. Masonry and Living Root retain native path IDs/centerlines/opening attachments; temporary renderer components never establish contract identity. Both respect the shared v2 aperture-chord export and budgets. No pending wall-engine blocker is introduced.

Tracked changes are the canonical derived v2 artifacts/provenance; check/sync tooling; Window model/admission; existing opening mutation validation; serializer/package/UI contract label; Window properties and preview component/store; focused tests; canonical export docs, ADR-0056 and this report. No user data reset, production artwork modification, runtime integration, push, deployment or Windows package.

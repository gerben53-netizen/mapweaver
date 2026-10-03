# Sprint B — Semantic world assets

Status: complete. Scope is optional semantic asset metadata, a curated starter pack, central query/selection and generator readiness. Terrain generation remains unchanged; automatic scatter belongs to Sprint C.

## Acceptance and implementation

- Optional version-1 generator metadata on stamps; normal assets remain valid without it. Validated enums, finite positive weights, ordered scale ranges, bounded rotation and spacing; explicit null clears metadata.
- Pack manifest schema 3 carries metadata; schema 1/2 remain accepted. Existing defaultSize and applicableMapTypes remain canonical.
- SQLite schema 8 adds optional JSON and a partial semantic-type index. Existing databases receive a pre-migration backup. No map-document format change.
- Asset Library's secondary Generator metadata section supports explicit Save/Discard, lifecycle flushing, revision conflicts and library history. Import review exposes the metadata; ZIP export/re-import preserves it, categories and collections without duplicate records.
- Local semantic query and world-wizard readiness expose installed families without placing objects.

## Taxonomy

Semantic types: mountain, hill, tree, forestCluster, snowMountain, volcano, rock, rockCluster, swampVegetation, marshCluster.

Roles: ridge, peak, foothill, isolatedFeature, forestInterior, forestEdge, forestCluster, sparseVegetation, rockScatter, swampInterior, swampEdge, landmark.

Biomes: temperate, alpine, snow, conifer, deciduous, tropical, arid, desert, volcanic, swamp, wetland, tundra, generic.

Themes: painterlyFantasy, parchment, darkFantasy, genericFantasy. The supplied artwork is genericFantasy only.

## Query and deterministic selection

POST /api/v1/library/generator-query queries indexed active stamps, with exact semantic type and applicable map type mandatory at every fallback level. The first nonempty pool wins: role+biome+theme, role+biome, biome, generic biome, type only, then empty. Requested roles use ANY matching role. Missing query filters are unconstrained. The result includes fallback level and library revision.

Selection compiles a stable ID-sorted cumulative-weight pool and uses the existing counter-based seeded RNG plus binary search. Preparation is O(n log n), draws O(log n). Input order does not affect results; duplicate IDs are rejected. Recreated library IDs constitute a different candidate set.

## Curated pack

24 original transparent PNG stamps at 640 × 480, with editable SVG sources, one muted oblique illustrative style, consistent light direction and CC0 provenance. Five mountains, three snow/alpine symbols, three hills, five woodland/tree symbols, two volcanoes, three rocks/cliff symbols and three swamp/marsh symbols cover all ten semantic types.

The standard ZIP contains images, mapweaver-assets.json and LICENSE.txt. Six collections and hierarchical World Map categories support browsing. Every stamp has complete generator metadata and world/regional applicability. A labeled catalog is a preview only, never stamp artwork. The reproducible builder is scripts/build-world-assets.mjs.

Defaults use existing physical dimensions for 280–900 km cartographic footprints. They are symbolic footprints, not literal tree sizes. Equal physical extent gives equal sizes on World and Regional maps. Adjust defaults for substantially different map scales. The [guide](../generator-assets.md) includes the actual schema example, bounds, pack layout and authoring instructions.

## Main changes

- src/domain/generatorAssets.ts and assetManifest.ts: metadata, validation, query fallback, weighted selection and manifest compatibility.
- service/generatorAssets.ts, storage.ts, library.ts, libraryPacks.ts, removedAssets.ts, archives.ts and app.ts: migration, persistence, indexed queries, backup validation and routes.
- src/library/GeneratorMetadataDetails.tsx, LibraryDetails.tsx and LibraryWorkspace.tsx: optional editor, pack review and download.
- src/world/GeneratorReadiness.tsx and WorldWizard.tsx: lazy installed-pack readiness.
- public/world-assets, scripts/build-world-assets.mjs and public/asset-templates/mapweaver-assets-v3.schema.json: curated resources and schema.
- Targeted domain, UI and service tests; tests/persistence/generator-assets.mjs; ADR 0028 and user documentation.

## Validation performed

- Frontend: `npx vitest run src/domain/generatorAssets.test.ts src/domain/library.test.ts src/library/GeneratorMetadataDetails.test.tsx src/library/LibraryDetails.test.tsx src/world/WorldWizard.test.tsx` — 20 passed. Covers invalid metadata, legacy manifests, fallback/map restrictions, deterministic weighted selection, optional editing, conflicts and lifecycle persistence.
- Service: `npm run test:service -- service/generatorAssets.test.ts service/library.test.ts service/storage.test.ts` — 36 passed; the generator file was then rerun after adding a fifth performance test, all 5 passed. Total 37 unique service tests. Covers complete bundled metadata, ZIP round trip, no duplicates, categories/collections, invalid edits, undo, schema migration backup and existing-library preservation.
- Performance: a 9,995-candidate indexed service lookup met its three-second bound; EXPLAIN confirmed the semantic index. A separate 10,000-candidate compile plus 10,000 weighted draws met its three-second bound. These are bounded regression checks, not claims about all hardware.
- `npm run typecheck` — passed.
- Scoped ESLint on 19 changed production/test/builder files — passed, repeated after final service-test changes.
- `npm run build` — passed, including client/service TypeScript, Vite and bundled font-license verification.
- `node tests/persistence/generator-assets.mjs` — passed using isolated local storage and headless Chrome at 1440 × 1000. UI metadata edit/save/reload persisted; all 24 stamps used the normal adoption/placement pipeline; readiness/query returned expected families. Browser reported no page errors.
- Visual inspection of catalog and editor screenshots confirmed transparent, coherent artwork and readable family differences. World and Regional PNGs at equal geography scale were byte-identical; 1×/2× transparent exports succeeded. A representative stamp's detached editor rendering and export crop differed in only one channel by one unit (mean absolute delta 0.00002315), within explicit alpha-rounding tolerance.
- Browser evidence: .qa.local/generator-assets-1790364172529 (ignored local screenshots, exports and results.json). No unrelated full suite or Windows packaging ran.

## Limitations and Sprint C handoff

This is a compact illustrated starter set, not a painterly library. Other supported themes have no matching bundled art yet. Bulk semantic editing is deferred because the existing arbitrary-metadata command is single-asset and safe mixed-value editing needs a separate review flow.

Sprint C should query the required semantic pool, inspect fallback level, compile selection once, resolve existing defaultSize, then apply scale/rotation/spacing hints. Freeze selected IDs and native editable output for reproducibility. Ridge alignment, forest clustering, collisions, density and readability limits remain explicitly unimplemented here. Nothing is automatically installed into the user's library.

No push, merge, publication, deployment, external service action or Windows package was performed. Only the requested local asset ZIP was produced. Personal library data was not used for validation.

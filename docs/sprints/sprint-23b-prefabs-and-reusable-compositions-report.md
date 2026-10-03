# Sprint 23B - Prefabs and reusable compositions

24 September 2026. The existing Sprint 23 asset library was present and extended; no second library was introduced. The repository has no HEAD commit and all source files are untracked. Existing files, prior Windows packages and user data were preserved.

## Delivered behavior

Selection, object group, full layer and recursive layer-group capture deduplicate objects and report effective hidden/locked counts. Hidden inclusion is explicit. Required relationships use bounded explicit closure; optional label/room/junction links can be detached explicitly. Empty/missing sources never capture the whole map. The dialog works on a snapshot and cancellation leaves the editor untouched.

Editable retains ordinary objects, internal relationships, layer order, groups and visibility/locks. Flattened uses the shared PNG renderer, transparent alpha crop with padding, and separate pixel versus map dimensions. Both are canonical searchable library records with inherited categories, tags, collections, favorites and defaults. Preview images share hash-addressed bytes. Library listings and metadata undo avoid copying full composition payloads.

Placement remaps IDs, resolves complete dependencies, applies one uniform anchor transform and validates the entire target before one editor-history mutation. Internal layers can be preserved or flattened onto the active layer with inherited flags baked into objects. Instances remain independent of the prefab definition. Native preserves stored composition dimensions; grid/world use the existing scale resolver and explicit missing-scale fallback.

## Files and format

- Core: `src/domain/prefabs.ts`, `prefabs.test.ts`, `src/library/PrefabCreate.tsx`, `PrefabPlacement.tsx`, `prefabRender.ts`.
- Integration: `LibraryWorkspace.tsx`, `LibraryDetails.tsx`, `MapCanvas.tsx`, editor store, storage API/remote library.
- Persistence: `service/storage.ts`, `library.ts`, `libraryPacks.ts`, `app.ts`, `archives.ts`; manifest contract in `src/domain/assetManifest.ts`.
- Tests: `service/prefabs.test.ts`, migration fixtures in storage/data-safety tests, `tests/persistence/sprint23b.mjs`, `prefab-package.mjs`, `scripts/validate-prefab-examples.mjs`.
- Documentation: [user guide](../prefabs.md), [ADR 0019](../adr/0019-reusable-compositions.md), README, AGENTS terminology, local-storage architecture and roadmap.
- Transferable examples: `public/examples/prefabs/house.mapweaver`, `house-editable.zip`, `house-flattened.zip`, with attribution README. The house includes material walls, door, window, floor, desk, label and a small outside scatter.

SQLite schema **5 -> 6** adds a versioned prefab payload to the canonical asset register and a prefab role. Existing populated databases get a consistent pre-migration SQLite snapshot; migration is transactional, checks foreign keys and preserves projects/assets. Project format remains **12**. Manifest **2** has explicit prefab entries and payload version **1**, documented in two public JSON schemas. Manifest-1 stamp/sidecar behavior remains supported. Full backups restore definitions, metadata and shared files; unknown versions, invalid relationships, cycles and absent/mismatched dependencies are refused before commit.

## Focused automated validation

- `npm test -- src/domain/prefabs.test.ts src/domain/selectionTransform.test.ts src/domain/placement.test.ts src/domain/library.test.ts src/projects/archive.test.ts src/store/management.test.ts`: **42 passed**, six files. Covers source closure/dedupe, baked transform normalization, relation/ID remapping, layer visibility/locking, one-step undo/redo, scale conversion, alpha crop, resolution-independent map size, invalid versions and limits.
- `npm run test:service -- service/prefabs.test.ts service/library.test.ts service/storage.test.ts service/data-safety.test.ts service/lifecycle.test.ts service/wallSets.test.ts`: five existing files passed; the new metadata-undo test initially used the wrong patch key (`name` instead of public `title`). After correcting that fixture, `npm run test:service -- service/prefabs.test.ts` passed all five prefab tests. Combined distinct result: **64 passed, one opt-in test skipped**. Checks dependency transfer, retained usage protection, rollback/shared bytes, backup/restore, migration and lifecycle busy handling.
- Scoped ESLint over the changed client/service modules and tests: passed. Full-repository lint/full regression suite were not run.
- `npm run build`: passed client and service TypeScript checks and both production builds.
- `node scripts/validate-prefab-examples.mjs`: both exported example packs pass manifest-2/prefab-1 JSON schemas; newer unknown versions fail.

No broad suite, installer installation, external service or optional >512 MiB backup stress run was performed.

## Browser and visual acceptance

The production client is exercised in installed headless Chrome against isolated local service data. Final extended run: **11 checks passed, zero page errors**, evidence `.sprint23b.local/1790261027939/`; baseline `.sprint23b.local/1790260105382/` remains available. Portable evidence is copied into [evidence/sprint23b](evidence/sprint23b/). Browser checks cover all source choices and cancellation, Editable/2x Flattened creation, rotated internal-layer placement and undo/redo, active-layer flattened placement, restart/reload, complete ZIP transfer to a clean library, byte-identical PNG before/after transfer and exact 2x physical scaling on a second map. Metadata edits leave existing instances unchanged. The final run also ungroups a placed house and changes only its door to open-right; the source/other copy and canonical definition remain unchanged. Escape cancels placement, and an empty source shows a concrete error with disabled preview.

Images inspected separately from test assertions: `library-1280.png`, `flattened-preview.png`, `placed-1600.png`, `combined.png`, `independent-door.png`. Door/window material cutouts remain clear. Preview alpha is transparent; PNG excludes editor overlays and grid. The selected copies deliberately overlap in the combined demonstration. These are visual inspections of browser captures, not native GUI acceptance or an independent human design review.

## Performance

Final run: Windows x64, AMD Ryzen 5 2600 six-core CPU, Node v24.17.0, Chrome 153.0.8010.53. Real browser commands include validation, rendering and service work; placement includes autosave polling.

| Composition | Ordinary objects | Rendered instances | Create/preview | Commit | Place + autosave | JS heap before / after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ordinary furniture | 1,000 | 1,000 | 1,049 ms | 130 ms | 1,665 ms | 12.5 / 69.6 MB |
| Scatter | 1 | 5,000 | 920 ms | 242 ms | 1,988 ms | 76.2 / 115.0 MB |

Small-house previews: Editable 428 ms, Flattened 2x 612 ms. Heap values are Chrome JS snapshots affected by GC, not peak process/RSS measurements or a leak proof. Existing scene rendering stays bounded; no general renderer rewrite. Full immutable composition payloads were removed from list/history materialization after inspecting the new 4 MiB-per-record cost.

## Limits and remaining acceptance

Limits: 2,000 ordinary objects, 128 layers, 512 image dependencies, 4 MiB prefab payload, 256 explicit closure additions, existing five-level layer tree, 1,000 manifest entries/128 MiB ZIP, 5,000 scatter instances/object and 10,000/project, 32M render pixels/16,384 edge/512 MiB estimated working memory. Placement also checks the existing 3 MiB editable metadata budget before mutation.

Only uniform prefab scaling is offered. The existing object-group model is nonnested and same-layer; cross-layer compositions use copied layer groups plus selection. Existing transforms are already baked, so there is no second parent matrix. Flattened cannot restore source objects; its shared ordinary stamp role has ordinary image placement semantics, while Prefabs preserves the composition anchor/map size. Labels retain the existing bundled-font/left-to-right limitations. Retained removed prefabs protect their image dependencies for recovery. Library history remains session scoped.

Concrete remaining acceptance: native Windows tray Open/Restart/Stop, copy-URL fallback, automatic default-browser launch and second **launcher** activation must be checked on an interactive Windows desktop. Service/API controls and a second service process are separate checks. Other browsers, independent human accessibility review and peak native/GPU memory measurement remain unperformed. No known critical data-loss issue is being deferred.

## Windows portable build

Target: `distribution.local/Mapweaver-Sprint23B/Mapweaver.exe`. This sprint explicitly requests packaging. The existing pipeline rebuilds the C# launcher and includes current production client/service, pinned Node runtime, native modules, fonts/licenses, examples and docs. Earlier packages are retained. The package was built successfully by `node scripts/package-windows.mjs Mapweaver-Sprint23B`. Build identity and exact executable hash are below.

No push, merge, publication, deployment, cloud action, system-service installation or real-dataset test was performed.

### Build identity

- Local build date (UTC): `2026-09-24T14:45:11.089513+00:00`.
- Local implementation SHA-256: `12d18585b7b637f87a32979349534b7d7753ed6c28be0dc652542c0c7c1c63a2` over 353 source/service/launcher/scripts/public/configuration files. No Git commit exists; this is explicitly an uncommitted local build. Reports/tests/generated output are excluded from this fingerprint.
- Newly compiled `Mapweaver.exe` SHA-256: `193b73bda59dd16549032bcda7d3b97770a3d3f35cb6d9b1a00b06f9ee1da84c`.
- Runtime: Node v24.17.0, Windows x64. Full package identity: `BUILD-IDENTITY.json`; per-file manifest: `distribution.local/Mapweaver-Sprint23B-SHA256SUMS.txt`.

### Packaged-runtime acceptance

`node tests/persistence/prefab-package.mjs` passed against a fresh isolated dataset: initial **4,452 package checksums**, PE executable presence, bundled Node/service health, production client, schemas/examples, dependency-complete import preview/review/commit, no preview writes, a second service process rejected on the same dataset, new prefab creation and placement through the packaged browser UI, project/library equality after graceful stop/restart. Evidence: `.sprint23b.local/package-1790261239100/` and [package results](evidence/sprint23b/package-results.json). The 119-character title screenshot at 1280 x 720 was inspected; cards truncate safely and the full title remains editable.

An initial harness attempt abruptly closed the browser before shutdown acknowledgement and hit the existing safe wait for that registered tab. The passing run keeps the browser open to flush/acknowledge Stop, then closes it and restarts. No safety timeout or lifecycle policy was weakened. No native launcher buttons were manually clicked; this does not prove tray/default-browser behavior.

Final report and screenshots were copied into the portable package; its full checksum manifest was regenerated and every file verified again. **Technical acceptance: passed. Captured browser/PNG visual acceptance: passed in the exercised scope. Native Windows interactive acceptance: outstanding for the explicit tray/default-browser/second-launcher checks above.**

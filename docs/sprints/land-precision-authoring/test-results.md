# Test results

17 October 2026. Validation used only .qa.local/land-precision/data with explicit QA profile, service 49571 / frontend 49572. Existing instances/ports were checked first; no Primary Development writes/imports or reference library imports.

| Check | Final result |
|---|---|
| P1 isolated initial check | 28 tests / 4 files passed before implementing Reference View |
| Final affected suites | 58 tests / 9 files passed, 11.38 s |
| Reused viewport/import/history suites | 30 tests / 3 files passed, 5.88 s |
| Total final targeted checks | **88/88 passed, 12 files** |
| npm run typecheck | Passed |
| npm run lint | Passed; historical frozen audit recipes explicitly scoped out, new sprint recipes checked |
| npm run build:client | Passed; usual chunk-size/dynamic-import warnings |
| npm run build | **Blocked at check:campfire-contract: canonical package.json fingerprint drift** |
| Artifact verifier | Passed: native PNG hashes, archive contents, exact unaffected geometry, protected coordinates, reference exclusion |
| Native UI undo/redo | Apply creates Smooth coast; Undo and Redo both usable and exercised |
| QA database save/reload + portable archive | Exact geometry and identical native PNG for Northreach and bridge |

Affected suite command:

```text
npx vitest run src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/app/ReferenceView.test.tsx src/app/LandBrushTools.test.tsx src/domain/landBrush.test.ts src/store/landBrushActions.test.ts src/domain/areas.test.ts src/projects/archive.test.ts
```

Additional reused-code command:

```text
npx vitest run src/canvas/viewport.test.ts src/imports/readImage.test.ts src/store/history.test.ts
```

Tests cover exact locality/tangents, protected cape, wraparound, invalid ranges/strengths, stale indices, topology validation, narrow bridge and unrelated polygons, newly introduced overlap, one transaction, undo/redo, ZIP persistence, UI preview/cancel purity, protection selection, independent reference pan/zoom, invalid image reporting, disposal and unchanged project data. Existing Area tests exercise drawing/freehand, point editing, booleans and archive/render-scene separation; Land brush tests cover Add/Remove/Smooth/Roughen. Existing topology limits remain unchanged.

Initial failures were not hidden: excessive paired-step weighting was found visually and fixed; a bending-reduction test now prevents that regression. Related existing Land history tests compared the monotonic Campfire revision and reused a stale pre-undo snapshot; fixture expectations now follow existing history semantics. Area tests reset their canonical layer tree with their layer IDs. No product history or contract validation was relaxed.

Full lint initially found 54 errors in old audit .mjs snapshots; these historical authoring recipes are not maintained application source and are excluded explicitly. Existing audit content was preserved. Application and new sprint reproduction scripts remain linted.

Full build stops before client/service bundling because canonical ../Campfire/packages/map-contract/package.json has SHA-256 2af57b2b3685b9525040b1b820fe3209fe806818250f853da362449f44c73177, while Mapweaver's pinned provenance expects c8dbe7eaf9df8368d93eecf13caad5053e5eff432f04c2e2ade79358d2b1bf5b. No contract, generated artifact or guard changed. Client bundling was separately verified; this is not represented as full-build success. Owner review/synchronization is needed outside this land-authoring sprint.

No broad test suite, Playwright suite, Windows package, push, merge or publication was run. Real interface checks used the in-app browser and ordinary editor controls. Native PNGs came from Export PNG → Download PNG, with an audit-only copy of the emitted Blob URL; they are not screenshots or external renders. See evidence/validation.json for exact hashes and archives.

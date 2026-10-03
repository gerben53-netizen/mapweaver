# Integrate Premium Core Interior Materials

3 October 2026. Nine supplied native production floors registered in the existing fill-pattern library and allowlisted installer defaults. No renderer, wall artwork, Soft Shadow or project-format changes.

Every source is 1254 × 1254 px, opaque, with an unchanged SHA-256 and a complete physical repeat tile of 20 × 20 ft. At the canonical 10 px/ft, use `200/1254 = 0.1594896331738437`. The existing Texture Brush reads `patternScale`; Area fills retain their established transforms and require that scale to be set explicitly. No upscale, crop, seam processing or newly generated artwork.

| Stable technical ID | Canonical name | Status | Visual finding |
| --- | --- | --- | --- |
| premium.floor.v1.wood-pale | Lichte houten vloer | PASS | Restrained plank detail; suitable light ground for Eldric's furniture. |
| premium.floor.v1.wood-natural | Natuurlijke houten vloer | PASS | Neutral timber; no dominant repeated knots or stains. |
| premium.floor.v1.wood-worn | Versleten houten vloer | PASS WITH NOTE | Deliberately darker, higher local contrast; prefer the lighter floors behind small detailed furniture. |
| premium.floor.v1.wood-heartwood | Kernhout- en wortelvloer | PASS | Continuous grown grain, without raised root silhouettes or conspicuous tile clusters. |
| premium.floor.v1.stone-pale | Lichte stenen vloer | PASS | Plausible subtle square joints; no objectionable whole-source tonal grid. |
| premium.floor.v1.stone-palace | Paleisstenen vloer | PASS | Fine regular joints soften at play zoom; source repeat does not become a large tonal grid. |
| premium.floor.v1.marble-neutral | Marmeren vloer | PASS WITH NOTE | Approximately 2-ft slab joints remain visible; this is the authored construction grid, not a 20-ft repeat grid or the game grid. |
| premium.floor.v1.earth-restrained | Rustige aarden vloer | PASS | Fine earth grain; no isolated recurring cracks or footprints. |
| premium.floor.v1.wood-parquet | Paleisparket | PASS WITH NOTE | Intentional herringbone is busier and darker than the old pale planks, but furniture contours remain readable at 75% and 50%. |

The technical IDs are carried in existing asset tags and provenance. Runtime library UUIDs remain managed by existing role/SHA-256 identity, retain their IDs on reimport and persist across reopening. There is no parallel material registry. Production manifest, unmodified image ZIP, distribution rights statement and source provenance are under `public/premium-core-interior-materials/`. The supplied rights statement permits Mapweaver redistribution, including installer content, without claiming exclusivity; its original qualifications are retained.

The current local library received nine KEEP assets under Materialen → Vloeren → Hout / Steen / Natuurlijke bodem. Twelve hash-verified legacy IDs from the production replacement mapping received REPLACE quality metadata. Their original images, IDs and historical project references remain resolvable. All 594 original asset image hashes and all 16 project records, including deleted project records, and their asset-reference rows were verified unchanged. Existing metadata changed only on the twelve specified legacy quality records. A SQLite backup was created before registration. Five accepted PQA stamps and production Living Root remain unchanged; Soft Shadow code/settings are retained.

Future fresh installations seed 86 library entries: 77 existing stamps and these nine floors. Existing libraries are still preserved rather than automatically reseeded. Development/rejected artwork, producer proof sheets and personal data are excluded from the bundled ZIP.

Real browser checks used an isolated database copy, with service/frontend ports 48262/48263 after checking existing instances. All nine were chosen through the normal library picker. Native Mapweaver exports cover 40 × 30 and 60 × 40 ft at 1×/2×; editor and 75%/50% screenshots, autosave, explicit save/reopen, byte-identical before/after reload PNGs and editable archives are retained locally. The renderer was not modified to conceal artwork repetition.

Both existing PQA projects were copied only in the isolated benchmark dataset. Each copy changes one floor's asset and repeat scale. Other objects, layers, wall definitions and effect settings are unchanged. Eldric uses Lichte houten vloer for a warm, light, restrained ground that separates furniture from Living Root. Paleisparket gives the Bibliotheek a more formal, darker herringbone ground and stronger furniture contrast, with the noted busier texture. Current before/after exports provide a controlled renderer comparison. Earlier exports are also retained, but are not pixel-identical to the current before renders (mean absolute RGBA-channel differences: Eldric 1.369/255; Bibliotheek 0.011/255); they are historical references, not the exact pixel baseline for this sprint.

Validation: 47 targeted domain/interaction tests and eight service/content/library tests passed. This includes the fixed terrain archive fixture (`campfireRevision: 1`) and two stale material-test expectations that now verify the required revision increase while preserving other map data. No production validation was weakened. Asset-pack validator: nine readable PNGs, no warnings/errors. Typecheck and targeted ESLint passed. Client production build, service production build and font-resource verification passed; existing chunk-size/dynamic-import warnings remain.

**Full production-build gate remains blocked:** `npm run build` fails at its initial canonical Campfire fingerprint check. Thirteen owner-side contract files differ from the pinned provenance, beginning with `generate-schema.mjs`; the complete hash comparison is in the local evidence. No canonical or derived contract file, fingerprint or guard was changed. The contract-dependent build verification awaits Campfire owner review and deliberate synchronization; it is not reported as passing. Independent material checks are complete.

Local deliverables: `deliverables.local/Premium-Core-Interior-Materials-Integration/`, including full runtime-ID and legacy mappings, source/proof preflight, native floor proofs, stone-grid evidence, benchmark copies/exports, persistence results and contract-drift evidence. No Windows package was built, no user map was rewritten/reset, no legacy texture was deleted, and nothing was pushed.

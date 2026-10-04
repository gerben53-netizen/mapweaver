# Stamp Importer Governance — sprint report

Completed 4 October 2026 on `develop`. Acceptance: one audited taxonomy registry; known aliases resolve; unknown categories require explicit mapping; no arbitrary stamp category creation; deterministic pack identities/revisions; transactional failures; unchanged existing image/map references; Dutch guides; isolated actual UI proof and focused validation.

## Before and after

Before: schema 1/2/3 manifests supplied free-form category paths. Review/commit could create arbitrary nodes with `createCategories`, or prepend a user-entered root. Type/hash determined image duplicates; display-name clashes only warned. There was no stable external asset/revision identity. Existing transaction + file journal already provided rollback. Quality/active state, local IDs and historical taxonomy aliases already existed from the quality audit.

After: `src/domain/stampTaxonomy.json` is the canonical registry from the audit's 27 leaf paths, with 10 parents, Dutch labels, stable external IDs, active state, aliases and normalized context tags. Import and mapping dropdown share it; only required reviewed nodes are materialized into the Asset Picker's existing category tree. Existing IDs for matching paths/object aliases are reused; the picker projects Dutch labels without rewriting historical rows. The registry is referenced by both Dutch guides; example/category-list tests prevent drift. No old DB taxonomy is mass-rewritten.

Known object aliases resolve deterministically; Palace/Library and audited location context become tags, never inferred categories. Unknown values require an explicit active-registry mapping before review/confirmation. Case/whitespace/alias normalization removes duplicate tags while preserving meaningful unknown context tags. Search supports raw and normalized aliases without imposing the tag length limit. Legacy entries without a category retain their explicitly chosen destination; they are not confused with unresolved values.

Normal stamp import ignores creation/prefix flags and reports category declarations as INFO. Import UI removes the category-creation/prefix controls and shows canonical mapping dropdowns, normalized tags, blocking category counts and errors/warnings. Existing separate category administration remains available without making those user-defined nodes canonical. Non-stamp material/prefab import behavior and renderers are outside this governance change.

## Identity, compatibility and transactions

Optional manifest pack ID/positive integer revision and stamp asset ID bind `(packId,assetId,revision)` to immutable image hash/type and a local asset reference. Conflicting same-revision pixels/type, duplicate asset IDs and stale unrecognized revisions fail. New revisions with changed pixels retain old references and create new local image records. Same-type/hash legacy images remain deduplicated. Naming is separate from identity. Semantic misuse of an identity across newer revisions remains a producer responsibility; image classification is not inferred.

SQLite schema 11 adds `pack_asset_revisions` only. Existing asset records, maps and image bytes remain untouched. Full backups retain bindings; general multi-pack library export remains legacy hash/path metadata. Top-level semanticClass/softShadowDefault map to existing quality metadata with explicit conflict checks. Metadata imports cannot reactivate REPLACE/REJECT/inactive assets. Previously explicitly removed legacy images keep their existing supported recovery path.

Review uses transaction rollback without image writes; final commit uses the existing transaction and owned-file journal. Tests prove failure leaves no partial nodes, identity bindings, assets, orphan files or changed library revision. Result reports imported/metadata-updated/existing-image counts, mappings and warnings; metadata updates are a subset of existing-image counts, not an exclusive total.

## Compatibility findings

Focused distribution testing exposed old bundled world/settlement category paths. Inspected those manifests and added explicit full-path aliases to the audit's mountains/forests/swamps/volcanoes/atlas-landmark categories, with context tags. No pack or artwork bytes were edited. New installs still import 77 stamps and nine floors once; existing/inactive content is not repopulated. The schema-1 regression fixture now removes the new binding table when constructing its genuine legacy DB; production migration remains additive.

## Validation

- 47 service tests: `stampGovernance`, `library`, `assetQualityAudit`, `eldricPqa`, `defaultContent`, `storage`: passed.
- 18 client tests: `src/domain/library`, `src/storage/libraryRepository`, `LibraryWorkspace.navigation`, `LibraryWorkspace.removal`, `stampPlacement`: passed.
- Total **65 focused tests passed**. Later added search-length/doc checks reran the seven governance tests successfully. No full unrelated suite.
- Typecheck, targeted ESLint, client build, service build and full `npm run build`: passed. Full build checks read-only Campfire provenance and font resources. Existing chunk-size/dynamic-import warnings remain.
- Real isolated browser: canonical import, legacy alias/context mapping, unknown category blocked then explicitly mapped, conflicting immutable ID blocked, resulting Asset Picker and location-named collection without taxonomy pollution: five checks passed, no page errors. Screenshots visually inspected. Two initial harness attempts used the wrong navigation role / failed to dismiss first-campaign onboarding; corrected the harness, not application behavior.
- Existing instances were checked before startup. Own disposable data and loopback ports 48390/48391; own processes closed afterward. No primary user database used.

## Deliverables and next phase

Dutch [user guide](../stamp-importer.md), [quick reference](../stamp-pack-quick-reference.md), [ADR-0059](../adr/0059-stamp-importer-governance.md) and asset-authoring crosslink. Three existing public JSON schemas expose optional identity/author fields; runtime performs additional file/category/conflict checks. Local ignored ZIP fixtures, UI screenshots and machine-readable browser result: `deliverables.local/stamp-importer-governance/`.

Future PQA authors should supply stable pack/asset IDs, deliberate revisions, canonical category IDs, flexible context tags, physical size, semantic class/shadow defaults and source rights/hash. Check mapping/review before confirmation. Replacement reconciliation and first-class Families/Variants are subsequent tasks; this sprint does not generate Premium art, delete stamps or execute the REPLACE backlog.

Tracked scope: shared taxonomy/domain parser, service governance/import/search/schema migration, small import UI changes, JSON schemas, focused tests, ADR and documentation. No Generated Wall/artwork/material renderer or Campfire files changed. No installer, data reset, map rewrite, push or external action. Exactly one local commit: `Sprint: Stamp Importer Governance`.

# ADR-0059 — Stamp importer governance

Accepted 4 October 2026. Scope: ordinary stamp packs, shared taxonomy and external pack identities; no wall/material renderer or Campfire change.

The audit's 27 reviewed object-category paths are the starting canon in `src/domain/stampTaxonomy.json`. Stable external IDs, Dutch labels, parents, active state, object aliases and context/tag aliases share one registry. Historical DB IDs remain intact when a reviewed path already exists. Only needed canonical paths may be created during stamp import. Pack category declarations/prefixes and creation flags cannot introduce arbitrary nodes. Unknown entry categories require explicit mapping to an active canonical ID, without filename guesses or automatic Diversen fallback. Legacy entries without category metadata retain explicit destination behavior.

Preview reports normalized tags, mappings, warnings and blocking errors. Existing transactional review/commit and file journal are retained. New mapping choices invalidate the reviewed signature. Registry nodes and identity bindings participate in the same rollback; original images and project references are never rewritten.

Optional external `pack: {id,revision}` and asset `id` bind `(packId,assetId,revision)` to a local asset ID/type/hash. SQLite schema 11 adds only `pack_asset_revisions`; no mass asset migration. Same identity/revision with different pixels/type is invalid. Newer changed pixels resolve to a separate local asset reference; older references remain available. Exact duplicates keep their existing identity. General library export remains interoperable legacy hash/path metadata, while full backups retain bindings. Cross-pack namespaces are intentional; semantic misuse of a revision is an authoring error rather than image-content inference.

The optional `semanticClass` / `softShadowDefault` author fields map into existing quality metadata. Existing inactive/REPLACE states cannot be promoted by importing metadata. Existing loose-image removal recovery remains supported. No destructive quality cleanup or user-map conversion is performed.

The normal importer has no arbitrary category-creation controls. Existing category administration remains separate and does not add to canonical pack categories. Future registry changes require deliberate repository review/tests. Family/variant support is a separate follow-up sprint using this import boundary.

Dutch user/author instructions: `docs/stamp-importer.md`, `docs/stamp-pack-quick-reference.md`. Runtime example/registry synchronization tests guard their manifest and category list. Source JSON schemas expose supported optional fields; runtime also validates identity conflicts, category resolution, referenced files and transactional state.

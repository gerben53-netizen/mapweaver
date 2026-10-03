# ADR 0028 — Semantic generator assets

Accepted for Sprint B, 25 September 2026.

SQLite schema 8 adds nullable `assets.generator` JSON and an expression index on semanticType for active stamps. Before migrating an existing database, a consistent `pre-generator-assets-*.sqlite3` backup is created. Existing IDs, blobs, category/collection memberships, sizing and projects are unchanged. The column check excludes non-stamp metadata; the shared runtime validator enforces the complete versioned contract. Full backup validation also checks generator metadata. Existing metadata revision triggers and row snapshots automatically cover editing and library undo/redo. Removal clears it; copying a stamp into the fill-pattern role clears it rather than transferring procedural meaning.

Asset manifest schema 3 carries an optional `generator` object, version 1, or explicit null for Overwrite clearing. The reader still accepts schemas 1/2, including prefabs. A schema-3 pack is the same standard image/manifest ZIP, not a new container. Export selects the lowest supported schema for the included features. Shared strict enums, positive bounded weights and bounded ranges are defined in `src/domain/generatorAssets.ts`. Map applicability continues to use the existing `applicableMapTypes`, not a duplicate field. Default physical size and procedural variation remain separate.

No metadata is added to placed stamps or project manifests: current rendering needs only already resolved transforms and images. Query results carry the current library revision and explicit fallback level. Candidate identity is existing asset ID, not a new semantic record. SQL narrows by active stamp/type before shared filtering; weighted selection compiles a sorted immutable weight table and uses the established seeded RNG. No filename/tag inference, global randomness, automatic replacement or scatter placement is added.

The curated pack ships as opt-in standard resources, with original SVG authoring files and raster stamps. It uses one coherent genericFantasy family. The generator can inspect readiness and query available families; Sprint C owns actual procedural placement and frozen recipe/output integration. Full field definitions, taxonomy, fallback order, bounds, physical size conventions and canonical example are in [the generator asset guide](../generator-assets.md).

Work stays in the provided checkout: no develop branch exists (unborn master, untracked existing repository files). No branch reset, commit, external action or Windows package is part of this sprint.

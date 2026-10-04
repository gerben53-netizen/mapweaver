# ADR-0060 — Stamp families and variants

Status: accepted, 2026-10-04.

A family is a stable semantic library item with immutable concrete image variants. The existing pack importer expands its shared authoring metadata into ordinary governed stamp entries; no second importer or renderer is introduced. SQLite schema 12 adds optional `assets.family`, `assets.familyMember` and `stamp_family_revisions`. Existing rows, documents and images are untouched.

The deterministic cover asset represents the family in library search, counts, palette and thumbnails. Other members are hidden from library results. The first cover remains stable across revisions. All members share physical width/height, centered anchor, category, semantic class, map applicability and shadow default; v1 requires identical PNG canvas dimensions. Variants have stable IDs, positive weights, optional labels and deprecation flags. Authoring must enforce compatible silhouettes and neutral lighting; pixels cannot prove semantic equivalence.

Placement samples an active weighted variant once. The native Stamp stores its concrete `assetId` plus `family: {family, variantId}` containing an immutable revision snapshot, shared physical/semantic/shadow/tag/applicability metadata and variant-to-image mapping. Embedded project pickers derive one family card from these snapshots, preserving physical placement defaults. Rendering reads only `assetId`. Variant changes preserve every other object property, enter existing history once and never change geometry. Duplicates retain the snapshot and exact selection.

All snapshot image references participate in the existing resource closure, clipboard, project save, portable archive, history retention and service ID remapping. This makes variant editing portable without depending on an installed library. Optional family metadata extends current project format 12; old single stamps remain unchanged. Library revision updates affect new placements only. Removed variants become deprecated retained references. A variant ID never changes its image; new artwork requires a new variant ID.

Family image bytes are adopted once on activation to make placement/history resource retention synchronous and portable. Only the cover/selected images are decoded for display; thumbnails remain lazy. All members count against existing project byte/pixel/asset limits. At most 64 retained variants per snapshot; large families require separate packs. Metadata budgets remain enforced.

V1 intentionally exposes variant controls only for a single selected family stamp. Shared metadata is changed through pack revisions, not ad-hoc cover editing; family component deletion is blocked to prevent unresolved historical images. Family ZIP export supports one pack/revision at a time. These restrictions keep identity and revision ownership explicit.

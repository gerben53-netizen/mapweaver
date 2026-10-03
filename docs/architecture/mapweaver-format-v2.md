# Mapweaver format v2

Historical read format. New writes use [v3](mapweaver-format-v3.md) since Sprint 14; the migration preserves rectangular pattern appearance. The original v2 contract below remains the compatibility reference.

Status: accepted in Sprint 10, 2026-09-23; see [ADR-0004](../adr/0004-typed-assets-workspaces.md). The [v1 specification](mapweaver-format-v1.md) remains the legacy read contract. All its model, validation, ZIP-security and image rules apply except the explicit differences below.

## Typed logical assets

`formatVersion` is 2. Every asset manifest requires `kind: "stamp" | "fillPattern"`. A stamp object's reference must resolve to a stamp; a patternFill object's reference must resolve to a fillPattern. Background references are type-neutral. Missing/unknown kinds and cross-type references are rejected before applying a document. Editor workspace, inspector, picker, chosen tools and recent choices are not serialized.

Multiple logical asset IDs can share one `assets/<safe-key>.<extension>` path. Safe keys use `[A-Za-z0-9_-]{1,80}`; extension matches MIME. Entries sharing a path must agree on hash, dimensions and MIME. New saves use SHA-256 as the safe key; migrated v1 paths are also valid. JSON manifests still exactly match model references. Only unique paths appear in the ZIP and count toward decoded pixel totals. Decode validates/decompresses each shared image once, reusing its Blob/thumbnail. No external image URLs.

Limits: 512 logical assets, 514 ZIP entries, 128 MiB compressed/unpacked, 96 million unique-path pixels, 4 MiB metadata. Individual image/map, preview, geometry, layers and object limits are unchanged. Increasing the logical count accommodates splitting all 256 legacy source assets without duplicating their pixels/bytes.

## Central v1 migration

`parseProject` first validates the original v1 structure, optional defaults and 256-asset limit. It then classifies each referenced asset by object use: stamp-only becomes stamp; pattern-only becomes fillPattern; background-only becomes stamp. Mixed usage keeps the original ID as stamp and creates a fillPattern ID with `-fill` (numeric suffix on collision, source prefix truncated to 65 characters). Only pattern assetId references change. Geometry, ordering, transparency, image bytes and paths remain unchanged. A second parse of canonical v2 is stable. Unknown future versions are rejected.

New explicit project exports always use v2. They cannot be opened by the older v1-only application; retain original backups if backward use is necessary. New code accepts earlier valid v1 archives, including shared stamp/pattern images. Optional kind in legacy TypeScript input interfaces only supports migration fixtures/boundaries; the v2 parser and new library writes require a valid kind.

## Local database schema 3

The assets table replaces unique contentHash with unique `[kind+contentHash]`, adds `kind` and `blobId`, and keeps existing categories/blobs. Blob records remain keyed by original ID. Cross-type copies share that key; deleting the last unreferenced logical item removes its blob. Project-owned images remain separately owned.

Upgrade reads all persisted recovery documents to infer library use. Stamp-only, pattern-only and mixed usage follow the same classification; unused library items default to stamp. For mixed use it creates a second logical record sharing the original blobId. Each recovery document independently uses the central v1 migration; recovery asset rows gain any necessary aliases while retaining source Blob data. Recovery rows may be structured-cloned separately by IndexedDB; library and ZIP data are deduplicated. An in-memory unpersisted old browser session cannot be inferred during upgrade; its old downloaded file remains loadable through v1 migration.

The upgrade is one Dexie transaction. Missing required recovery data aborts it; no source blobs are deleted. Reopening version 3 does not rerun it. Library deletion rechecks current/history/tool/clipboard usage and recovery references, including recovery contenthash matches conservatively. It never deletes project-owned assets or offers force-delete.


## Audit: editor admission limits

The archive format version and parser limits remain unchanged. To avoid creating unsavable new edits, editor mutations share the coordinate/object/layer/logical-asset limits with the parser. Referenced source images are budgeted by hash (96 million pixels; at most 124 MiB of source bytes, reserving 4 MiB for metadata). The completed history boundary rejects growth beyond 3 MiB of UTF-8 map/object/layer JSON, reserving 1 MiB for manifests/header within the 4 MiB archive JSON cap. Rejected edits restore the previous document, do not add history and show a message. Already valid larger files remain readable and may be reduced; these conservative editing thresholds are not a format migration.

## Sprint 12: transfer format, not primary storage

The ZIP representation remains v2 with unchanged validation. SQLite and managed files are now primary (ADR-0005). Normal Save/Open use the local service; `.mapweaver` is explicit import/export/transfer/backup. Import creates a new UUID project, maps asset IDs to the shared typed registry and deduplicates bytes. Image bytes and map/object geometry are preserved; IDs are intentionally not guaranteed across transfer. Background-only sources have the service type `background`; their portable kind remains type-neutral `stamp` for v2 compatibility. Legacy Dexie schema 3 above describes the retained migration source, not current primary storage. See [local storage](local-storage.md).

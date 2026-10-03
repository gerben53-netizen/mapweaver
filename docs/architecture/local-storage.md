# Local storage schema and API — Sprint 12

ADR-0005 supersedes the primary-storage portions of ADR-0001/0003. The user-supplied storage ADR originally numbered 0002 was filed as 0005 because 0002 already describes session history. No second canonical `docs/architecture/0002-…` is created.

## Schema version 3

`service/storage.ts` owns the explicit transactional migration. `schema_migrations(version PRIMARY KEY, name, appliedAt)` records applied versions. A newer version is refused before WAL configuration or schema changes. SQLite uses foreign keys, WAL, FULL synchronous mode and a 3-second busy timeout.

| Table | Fields / contract |
|---|---|
| projects | UUID id; name; formatVersion=2; fully parsed document JSON; revision; createdAt/modifiedAt/openedAt; nullable preview; deletedAt (schema 3), active/trash index |
| assets | UUID id; type stamp/fill-pattern/background; name; originalName; MIME; width/height; size; sha256; relative originalPath/previewPath; categoryId FK; JSON tags; createdAt/modifiedAt. Unique (type,sha256). |
| categories | id; name; unique normalizedName; createdAt. Uncategorized seeded once. |
| project_assets | projectId FK (cascade on project deletion); assetId FK (restrict); role; compound primary key. Asset-reference index supports deletion checks. |
| settings | key/value; currently the last successful server backup-generation time. This is not proof of a browser download reaching disk. |
| migration_items | idempotency key, canonical validated source-document digest, targetId, kind. Committed with the imported project. |

Additional indexes cover project modified time, asset category/type and hash. Objects are not separately normalized. Project JSON retains the portable model and immutable asset manifests, never UI viewport/tool/selection/history. Each update validates references, kinds, dimensions and stored bytes before committing project JSON plus its relations together. A revision mismatch is HTTP 409. Existing imported legacy IDs are mapped explicitly; normal creation/import use UUIDs. Category/tag metadata is independent of projects.

## Reserved asset sizing metadata

Schema migration 2 adds the following columns transactionally to existing and new asset registers. Existing asset IDs, image dimensions, hashes, files, project documents and references remain unchanged. The API returns these fields on list, detail, import and metadata-update responses; `aspectRatioLocked` is a JSON boolean (SQLite stores 0/1).

| Field | Allowed values | Default |
|---|---|---|
| sizingMode | native, grid, world | native |
| defaultWidth / defaultHeight | Positive finite numbers or null | null |
| sizingUnit | cells, ft, m or null | null |
| aspectRatioLocked | Boolean | true |
| sizingScope | battlemap, regional-map, world-map, any | any |

Null dimensions/unit mean no grid or physical size has been assigned. In native mode the existing natural pixel dimensions and placement behavior continue to apply. SQLite CHECK constraints protect the reserved fields. `AssetSizing` is shared by service and client API types. Normal metadata updates and duplicate imports retain stored sizing metadata.

These are reserved library fields: the current metadata PATCH route does not edit them, and the editor does not apply grid/world sizing yet. Their editing UI, interpretation and map-type profiles belong to Sprint 23. The `.mapweaver` project format remains version 2 and does not transfer these library defaults; it already preserves each placed object's actual transform. Full database backups include all sizing metadata and now declare schemaVersion 2 (backup formatVersion remains 1). Older schema-1 backups can still be restored to an empty directory and are upgraded on service startup. Older application builds reject schema 2; use the current build after upgrading.

## Managed files

```text
<application data>/
  mapweaver.sqlite3   (and SQLite-managed -wal/-shm while open)
  assets/originals/<sha256>.png|jpg|webp
  assets/previews/<sha256>.png
  backups/           (owned temporary SQLite snapshots)
  logs/              (reserved local directory; no image/path logging)
```

No BLOBs in SQLite. Different logical types share the same hash-named original. User filenames are metadata, never filesystem paths. Imports validate MIME, encoded dimensions, actual Sharp decoding, pixel limits and SHA-256. Atomic writes use exclusive temporary files, fsync, rename, then database registration. A failed registration can leave an orphan file but never intentionally registers an unfinished file. Startup/Storage integrity reports missing, damaged, orphaned and temporary files; it does not destroy them. Deleting unused asset metadata retains bytes conservatively. Previews are reproducible; missing previews are reported.

The default directory is platform-specific; only an explicit absolute `MAPWEAVER_DATA_DIR` overrides it. Roots and symlink/junction ancestors are rejected. Every controlled file read/write checks its relative path and symbolic-link containment. Database asset paths are relative. The service binds 127.0.0.1 only, default port 47831. It closes SQLite on SIGINT/SIGTERM. A stopped service is required for manual directory copying/restoration; a live database must use the backup endpoint.

## HTTP API `/api/v1`

Mutation requests require `X-Mapweaver: 1`; JSON has `Content-Type: application/json`. Images and ZIPs use binary request bodies. Errors return `{code,message}` without internal paths/SQL. Body limits are 4 MiB JSON, 20 MiB images and 128 MiB project archives. Image batches are sent sequentially, up to the existing 50-file UI limit.

| Method and route | Behavior |
|---|---|
| GET /storage | Display location, registered originals+DB bytes estimate, schema, integrity, lastBackup |
| POST /storage/open-folder | Open only the fixed validated application directory (Windows); no caller-selected paths |
| GET /projects | Metadata ordered by modification time |
| POST /projects | Parsed model; service generates UUID and revision 1 |
| GET /projects/:id | Parsed model and revision; validates required assets, records openedAt |
| PUT /projects/:id | `{document,revision}`; atomic update or REVISION_CONFLICT |
| PATCH /projects/:id | `{name,revision}`; safe rename |
| POST /projects/:id/duplicate | New UUID, shared asset references |
| DELETE /projects/:id | `{revision}`; delete only that project/relations; client confirmation |
| GET /projects/:id/export | Stored revision as portable .mapweaver |
| POST /projects/import | ZIP; validate all bytes, register typed assets, create new project. Optional X-Migration-Key for repeatable migration only. |
| GET /assets | Optional type/search/category/offset/limit; bounded 1–500 results per page |
| POST /assets | Binary raster; query type/name/filename/category; returns asset and added flag |
| GET /assets/:id | Metadata |
| GET /assets/:id/content or /preview | Controlled bytes, correct MIME, nosniff, private cache, hash ETag |
| PATCH /assets/:id | name/categoryId, optional tags (≤30, each ≤80 characters) |
| GET /assets/:id/usage | Names of referencing saved projects |
| DELETE /assets/:id | Blocks with number/names of referencing projects; no forced cascade |
| GET or POST /categories | List/create; normalized-name deduplication |
| POST /backup | Serialized safe SQLite snapshot + its referenced asset files; bounded ZIP with version/checksums, verified before response |

All project stamp/fill assets become shared library entries when imported. There is no retained library-versus-project ownership distinction requiring an “add embedded asset” endpoint. Background-only sources use the background service type and are excluded from stamp/fill project pickers. Optional project previews are placeholders; no inactive preview routes/buttons are advertised. On Windows, Open data folder invokes the absolute system Explorer executable with the validated application directory as its only argument, no shell. The route accepts no path/command parameter; other platforms expose the copyable location.

## Client and retained IndexedDB

`storage/api.ts` is the single HTTP boundary; UI never accesses SQLite or constructs managed file paths. `RemoteLibrary` adapts existing typed library consumers. Its in-memory image cache is capped at 128 MiB and reconstructible. `projects/localSession.ts` stores the active database revision and clean/dirty/saving/saved/conflict/error states. Autosave observes completed history changes, serializes requests, stores a pending recovery copy before PUT, and only clears it/marks clean if the captured model is still current.

| IndexedDB / table | Role after migration |
|---|---|
| mapweaver-library / assets | Frozen old per-browser metadata, only read for migration; normal library uses API |
| mapweaver-library / blobs | Frozen source images/shared blobs; retained until user independently verifies backup; never primary for new writes |
| mapweaver-library / categories | Legacy category source |
| mapweaver-library / recoveryProjects | Legacy project inventory; no new normal recovery writes here |
| mapweaver-library / projectAssets | Legacy embedded source bytes; retained unchanged |
| mapweaver-unsynced / pending | Per-tab/project temporary model+bytes plus original revision for unsuccessful or in-flight synchronization; explicitly recoverable and deleted only after confirmed current save |
| mapweaver-migration / state | Per-profile migration identity/checkpoints/report. SQLite idempotency and hashes make retry safe even if a local checkpoint was missed. |

Frozen legacy tables are a migration safety exception, not an authoritative source of current application data. Clearing them after successful independent verification cannot delete service data. Unsynced buffers are not replaceable until synchronized/exported. No Dexie cache/index is required for normal reads; deleting current browser storage rebuilds the UI from the service. Old schema-3 upgrade remains centrally validated for profiles still on schema 1/2; no old source images are deleted by it.

Migration is bound to browser profile **and origin**. See README for running the updated Vite client at the former origin while targeting the new service. The wizard copies one bounded item at a time, revalidates assets and exported project meaning, records ID mappings and retains old data. Category/name collisions retain the existing same-type/hash logical item; the mapping report identifies the chosen target. Missing sources stop verification, never silently mark migration complete.

## Sprint 13 lifecycle and data safety

Schema 3 adds project Trash. Deleted projects retain their asset relations; ordinary lists exclude them, `?trash=true` includes them, POST `/projects/:id/restore` restores, and DELETE with `{revision,permanent:true}` permanently deletes only a trashed project. Writes to trashed projects are refused. All mutations now also require `X-Mapweaver-Generation`, initialized from GET `/health`. Restore changes the persisted datasetGeneration, and late queued mutations are checked again immediately before execution.

Production main acquires a kernel-owned loopback lease derived from the canonical data-directory hash before opening SQLite; collisions fail closed. Restore journal recovery runs before opening storage. `/health` supplies a path-free data-directory fingerprint for the launcher. No untrusted caller can select a filesystem path.

POST `/backups` starts a job; GET `/operations/:id` reports byte/file progress; POST `/operations/:id/cancel` aborts before commit; GET `/operations/:id/download` streams a verified on-disk archive. POST `/restores` streams an uploaded ZIP (`application/x-mapweaver-backup`) into an owned operations directory and validates staging. POST `/restores/:id/commit` requires `{replace:true}`. Operation/health status remains available during maintenance; other requests are blocked. POST `/storage/integrity`, `/diagnostics`, and `/stop` provide local management. The old `/backup` endpoint also streams the validated archive for compatibility.

GET `/storage` now returns disk usage by database, originals, previews, backups/operations and logs. Sibling `<data-directory>.operations` holds generated staging/work directories and retained rollback datasets. No automatic recovery-point deletion. See [backup format and algorithm](backup-format.md).

## Current Sprint 20 interpretation

The historical Sprint 12 sections above describe their original version. Current project writes use format 10 and SQLite schema 4. Sprint 19 applies grid sizing to new scatter sources on battlemaps; Sprint 20 applies scope-matching world sizes (metres/feet) to new stamps and scatter sources on geographic maps through the central physical scale. Actual instance sizes remain frozen. Editing sizing profiles stays deferred. Map/Area role metadata lives in validated project JSON, without new SQLite tables. See ADR 0015 and mapweaver-format-v10.md.

## Current Sprint 23 library

SQLite schema 5 adds hierarchical categories, metadata, favorites, collections, retained asset removal and library revision triggers. The migration first creates a consistent SQLite recovery point and leaves immutable files intact. Current project format remains 12 with optional explicit battlemap grid physicalScale. See [ADR 0018](../adr/0018-advanced-asset-library.md) and the [library contract](../asset-library.md). Historical schema-3/4 sections above describe earlier releases.

## Current Sprint 23B compositions

SQLite schema **6** extends the same asset registry with versioned prefab definitions; project format stays **12**. The pre-migration SQLite snapshot and file-preserving transaction retain prior projects and library records. Definitions, previews and dependency images participate in library packs, usage protection and full backup/restore. See [ADR 0019](../adr/0019-reusable-compositions.md).

## Campaign organization (schema 7)

Campaigns and generic folder/map nodes are additive metadata above unchanged project-format-12 maps. `GET/POST /campaigns`, `GET /campaigns/:id`, `POST /campaigns/:id/command`, `POST /campaigns/:id/opened` and `PUT /campaigns/:id/preferences` manage this layer through the existing serialized, generation-checked mutation boundary. Contextual map creation/import takes `campaignId` and optional `parentId` query parameters. Existing map read/write/import/export APIs remain; successful-open acknowledgment is `POST /projects/:id/opened`, not a side effect of GET.

Pre-migration snapshots and transactional migration preserve existing map bytes/IDs. Full dataset backups retain the complete campaign model and validate node parentage/membership before restoring. One-map `.mapweaver` transfers intentionally exclude organization and are labeled accordingly. See [ADR-0022](../adr/0022-campaign-explorer.md).

# Sprint 23 — Advanced asset library and default scale

24 September 2026. Implemented locally, with the boundaries and exact validation scope below. No external publication, push, merge, deployment or system-service change.

## Acceptance and delivered behavior

The acceptance basis was the supplied Sprint 23 brief, AGENTS, the actual SQLite schema 4 / project format 12 implementation, architecture/roadmap and relevant prior reports. Existing untracked repository content and user data were preserved. No reset was performed. Sprint 21/22 objects remain integrated through their existing asset-reference model; prefabs were not added.

The complete primary workflow works: import the nested Eryndor collection with metadata and scale, search from a collapsed parent, select all matching results across pages, bulk-organize them, place a correctly sized new stamp, and export/reimport with semantic metadata, empty categories, collections and shared image bytes intact.

Delivered:

- Virtual category tree (maximum depth eight), stable IDs, breadcrumbs, counts, root/subcategory creation, rename, drag-and-drop and accessible Move dialog, safe deletion that reparents children/assets and blocks conflicts.
- Service-side normalized search over title/original filename/description/tags, stable ordering, 60-item pages, lazy cached thumbnails, grid/list/compact views and collapsible panels. All assets is scoped only by active type/filters. Parent categories always include descendants.
- Separate title/original name, description, tags, favorites, simple editable collections and provenance. Bulk move/tag/favorite/membership/role-copy/export/removal, full-result selection and usage protection. Role copies share bytes without borrowing another item's metadata.
- Blur/Enter autosave with explicit status, retained invalid/conflicting drafts, Escape/discard, lifecycle flush integration, and independent version-checked library history. Project Save/PNG and editor shortcuts follow workspace context.
- Native/grid/world defaults, aspect validation, applicable map types, visual size preview, explicit battlemap distance per cell, shared stamp/scatter resolver, selection-size capture and one-command reset preserving centre/rotation/mirrors. Existing geometry is never silently rescaled.
- Public version-1 JSON Schema, sidecars, collection manifests, plain images and ZIPs; strict path/hash/content/type/size validation; explicit sidecar-source conflicts and duplicate policies; category mapping/prefix; actual resolved-result preview followed by atomic commit and recoverable owned-file journal.
- Public ZIP/metadata export, empty categories and multi-role byte sharing, full backup/restore, migration recovery point, user/technical guide and complete original CC0 example ZIP. Wall sets retain the existing specialized format and importer.

## Important files and persistence

New core files: `src/domain/library.ts`, `assetManifest.ts`; `service/library.ts`, `libraryPacks.ts`; library details/history/default-action modules and their tests. Existing LibraryWorkspace, picker, remote repository/API, placement/scatter sizing, map settings/parser, project controls/shortcuts/lifecycle, service routes/storage/archive validation were integrated.

SQLite **schema 5** adds parent/order/timestamps to categories; description/favorite/provenance/applicable-map-types/retained-removal fields; collection/member tables; revision triggers. Before upgrading a populated database, `VACUUM INTO` creates `backups/pre-library-<UUID>.sqlite3`. Immutable originals/previews are not changed or removed. Existing flat categories become roots and IDs/defaults/references/project JSON remain intact. Full backup validation accepts only the exact application-owned triggers.

Project **format 12** gains the documented optional `grid.physicalScale` metadata; absence means unconfigured. Saved object transforms and image manifests stay concrete. Older application binaries are not supported readers of this extension. Full backups retain old reserved sizing values verbatim even if they predate the stricter new aspect rules; new edits/pack imports validate those rules.

Contracts and operation guide: [ADR 0018](../adr/0018-advanced-asset-library.md), [asset-library guide](../asset-library.md), `public/asset-templates/mapweaver-assets.schema.json`. Templates: sidecar + PNG, collection JSON and `eryndor-example.zip`. `scripts/asset-templates.mjs` regenerates and validates the structural schemas; service tests additionally validate the runtime contract and real pixels.

## Targeted tests and checks

**66 distinct client tests passed** across nine directly affected files: library rules/units and physical-scale persistence, placement, scatter, map settings, geography, reset selection, metadata autosave/conflict components, project archive and local session. This is cumulative focused validation, not a full-repository suite.

**61 distinct service tests passed**, with **one intentionally skipped opt-in test**, across library, storage, annotations, geography, data safety, lifecycle and wall-set files. Coverage includes nested search, cycle/depth rejection, category conflict safety, ID retention, all duplicate policies, explicit sidecar conflicts, unresolved-input refusal, dry-run review with no writes, shared-blob rollback, startup journal recovery, sequential undo/redo with stale-row refusal, collection membership/history, multi-role/empty-category/original-name export/import, migration recovery points and verified backup/restore.

The skipped existing test requires `MAPWEAVER_LARGE_TEST=1` and streams more than 512 MiB. It was not needed for these metadata changes and is not claimed as executed. Current 10,000-record browsing does not substitute for that test.

Client/service TypeScript, scoped ESLint and production client/service build passed. Reproduction commands:

```powershell
npm test -- src/domain/library.test.ts src/domain/placement.test.ts src/domain/scatter.test.ts src/domain/mapSettings.test.ts src/domain/geography.test.ts src/library/resetAssetSizes.test.ts src/library/LibraryDetails.test.tsx src/projects/archive.test.ts src/projects/localSession.test.ts
npm run test:service -- service/library.test.ts service/storage.test.ts service/annotations.test.ts service/geography.test.ts service/data-safety.test.ts service/lifecycle.test.ts service/wallSets.test.ts
npm run typecheck
npm run build
node scripts/asset-templates.mjs
node tests/persistence/sprint23.mjs
```

Scoped lint covers the changed library/domain/service/storage/lifecycle/UI modules and new tests, not every unrelated source file. Existing stale format-10 expectations in scatter/geography tests were updated to the actual canonical format 12. Historical backup fixtures were reconstructed as genuine old schemas rather than claiming old versions while retaining new tables. Failed initial attempts are not counted as passing acceptance.

The expanded backup checks caught and fixed a real integration issue: strict new aspect validation initially refused backup of older reserved sizing metadata. Backups now preserve that data under its original finite-value constraints; new profile editing and pack import remain strict. Browser checks also led to explicit select labels, improved textarea contrast, clipped-tree-title handling, and focus/scroll to resolved import results.

## Browser and visual acceptance

`tests/persistence/sprint23.mjs` passed **11 workflow checks** using the production app and an isolated local service in Chrome, at **1280 × 720** and **1600 × 1000**, with no uncaught page errors:

- Preview writes nothing before confirmation; nested import and collapsed-parent search.
- Title/description autosave; invalid input retained and restored by Escape.
- Grid/list/compact, long names, responsive layout and no horizontal overflow.
- Full-result bulk selection/move; selection of 1,000 matches across 17 pages.
- Category create/rename/delete, actual drag-and-drop reparenting and keyboard Move.
- Empty-filter recovery and duplicate import with actual resulting metadata.
- 2 × 1-cell profile places a 100 × 50-pixel stamp.
- A combined stamp/scatter/pattern/material-wall project produces **byte-identical PNG before and after shared metadata changes**, with unchanged stored objects.
- Measured large library browsing and bulk organization.

Evidence: `.sprint23.local/1790257503023/results.json`, the `01`–`07` PNG screenshots, and `before-metadata.png` / `after-metadata.png`. Earlier complete visual baseline: `.sprint23.local/1790256834128/`; its grid/list/compact, import/resolved-result and large-library screenshots were opened and visually inspected. This is automated Chromium plus agent visual inspection, not independent human acceptance or an exhaustive accessibility audit. Test services/tabs are closed afterwards.

## Reproducible measurements

Windows x64, Node 24.17.0, AMD Ryzen 5 2600. Fixture: **10,000 added records**, consisting of **1,000 real 32 × 16 PNG originals/previews** and **9,000 explicitly synthetic metadata-only rows** sharing a thumbnail; plus four workflow/example assets. There are 200 generated categories in 25 depth-eight branches, plus the workflow categories. Synthetic rows are not valid transferable image records; no claim is made that 10,000 original images fit in RAM. Fixture data lives only in the isolated ignored test directory.

| Operation | Elapsed |
| --- | ---: |
| Initial service query / 60 results | 116.8 ms |
| Category subtree query | 50.3 ms |
| Full-dataset search / all matching IDs | 113.5 ms |
| Atomic move of 1,000 assets | 671.9 ms |
| Browser library open | 410.8 ms |
| Browser search including 180 ms debounce | 430.5 ms |
| Next page + select all 1,000 + clear selection | 742.0 ms |
| Scroll event delivery including 100 ms wait | 452.8 ms |
| Scroll frame interval P95, one-second sample | 16.8 ms |
| Long tasks over 50 ms during that sample | 0 |

The result-query target of 500 ms was met on this machine. The 1,000-item write took longer and is reported as measured; this is not a guarantee for arbitrary disks or libraries. The page-plus-selection timing includes additional user actions, not only a server response. No general renderer refactor or original-image memory stress test was performed.

## Windows package

The Sprint 23 brief explicitly authorizes a separate portable package, consistent with the standing rule to package only when asked. The local Windows x64 runtime, compiler and licence inputs are available. Target: `distribution.local/Mapweaver-Sprint23/Mapweaver.exe`, built by the existing packaging script after the production build. Earlier packages are retained.

Package creation succeeded. `node tests/persistence/library-package.mjs` passed: all **4,437 SHA-256 checksums**, executable presence, bundled Node runtime/service startup, production client and schema/template routes, example ZIP preview/review/commit, no writes before confirmation, and unchanged asset metadata/default size/category tree after graceful service stop/restart. Evidence: `.sprint23.local/package-1790258109981/results.json`. The updated report is included in the package and its checksum manifest regenerated and verified afterwards. Native launcher Open/Restart/Stop GUI behavior is **not claimed as tested**; no installer or system-service installation is part of this delivery.

## Boundaries and remaining follow-ups

- Public packs are bounded to 1,000 entries / 128 MiB and one preview per running service, expiring after 15 minutes. Larger transfers use subsets or full backup.
- Library history retains ten service-session actions; it is not durable across restart. Removed asset metadata/bytes remain retained; full backups are the durable recovery path.
- Legacy reserved profiles that violate new aspect/range rules remain recoverable in full backup. Explicitly correct such a profile before public-pack transfer; no implicit rewrite of user data.
- Generic export refuses registered wall-set atlases. Use the original complete specialized ZIP or full backup; no lossy atlas-only export or second wall-set importer was added.
- Shift-click spans the current page; Select all results covers the entire filtered set. Advanced smart collections, arbitrary import-type plugins and prefabs remain outside this sprint.
- Follow-up acceptance: native tray/default-browser GUI checks, other browsers/OS combinations, independent human accessibility review, and the opt-in >512 MiB backup stress test. These are not represented as completed.
- Sprint 23B remains the separate prefab/composition task. No known critical data-loss or rendering regression remains in the exercised scope.

No push, merge, publication, deployment, cloud action, external-account change or system-service change was performed.

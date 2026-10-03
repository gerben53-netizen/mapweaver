# Asset removal and clean re-import recovery

24 September 2026. Focused bugfix; no pack/project/SQLite schema change.

## Acceptance result

Explicit library deletion is no longer blocked by clipboard, undo, redo, tool choices or previews. One accessible confirmation preflights the complete selection. Saved maps (including trashed maps), current unsaved map content, immutable wall sets and retained prefab definitions remain hard blockers with named dependencies. The whole selection is kept when blocked; there is no silent partial deletion or missing-asset conversion.

After successful removal the current library selection clears, results/counts update, pagination resets and focus returns to Search library. Category counts are refreshed. One live status summarizes the batch. Cancel and failed requests preserve selection and editor buffers.

## Root causes and implementation

- `src/library/LibraryWorkspace.tsx` previously combined current map, clipboard/history and tool references into repeated per-asset blocking strings. It now calls a typed service preflight and handles persistent blockers separately.
- `src/library/assetRemoval.ts` cleans transient references only after the atomic service commit. It removes dependent clipboard assemblies/labels, prunes group membership and detaches stale optional room/junction links. Unrelated clipboard content and its embedded assets remain usable.
- `src/store/history.ts` invalidates the current editor’s past/future stacks only when a snapshot references a removed asset. History stores full map snapshots; deleting isolated entries would leave unsafe restoration paths. Dirty state is recomputed against the unchanged clean baseline. No map objects are deleted by library cleanup.
- `src/projects/assets.ts`, `src/images/imageCache.ts` and `src/storage/api.ts` invalidate embedded/clipboard resources, thumbnail/image entries and byte-cache entries. In-flight byte loads cannot refill an invalidated cache.
- `src/library/libraryHistory.tsx` applies the same checks/cleanup when a library Undo/Redo action would remove assets, while retaining explicit full-library restoration semantics. The service rechecks persistent usage on reverse operations.
- `service/library.ts`, `service/app.ts` and `service/removedAssets.ts` implement typed usage/preflight and transactionally detach category/collection memberships, favorites, tags, provenance and sizing defaults. Recent scatter sets no longer block removal and affected recent sets are cleared. The legacy delete endpoint uses the same retained removal transaction.
- `service/libraryPacks.ts` and `service/storage.ts` previously treated tombstoned type/hash records as active duplicates. Preview now ignores removed rows. Commit intentionally revives their stable identity with fresh metadata even under Keep, preserving immutable shared bytes and active-asset duplicate rules. Collections with matching normalized names and descriptions are reused; category mapping retains the existing explicit options. Unrelated category/collection definitions survive.

No external actions or Windows packaging. The requested `develop` branch does not exist in this repository: its current `master` is unborn and project files are untracked. Existing workspace content was preserved; no branch/commit was fabricated.

## Validation

- `npm run test -- src/library/LibraryWorkspace.removal.test.tsx src/library/assetRemoval.test.ts src/store/history.test.ts`: 14 passing tests. Includes clipboard-only, undo-only, redo-only, unrelated history, dirty-state preservation, dependent labels/groups, unrelated paste, named persistent blockers, failed-request preservation and selection/focus reset.
- `npm run test:service -- service/library.test.ts service/prefabs.test.ts`: 22 passing tests. Includes batch atomicity, usage distinction/map integrity, metadata cleanup, library restoration, repeat re-import, category/collection identity, unchanged active duplicate policies, rollback on revival failure and prefab dependency protection.
- `npm run test:service -- service/scatter.test.ts -t 'persists bounded recent scatter sets'`: 1 passing test; unrelated scenario skipped.
- Scoped ESLint on changed TS/TSX/MJS sources and tests: passed.
- `npm run build`: client and service TypeScript checks plus both production bundles. No Windows package generated.
- `node tests/persistence/asset-removal.mjs`: real Chrome against an isolated loopback production service at 1280 × 720. Imports ZIP through the UI, places a stamp, verifies named map blocking, copies it, deletes its placement and saves, removes the library asset despite clipboard/history, checks reset/focus, verifies paste/undo cannot restore it, reimports the identical ZIP, checks one active record, category/collection identity, membership and empty usage. Four acceptance checks passed, no page errors. Local evidence: `.asset-removal.local/1790271837778/`; screenshots were visually inspected.

## Limitations and separately observed failure

- Full snapshot history cannot be safely pruned entry by entry. Only the affected current editor’s entire undo/redo stack is cleared; unrelated history remains intact. Library Undo restores library data but not discarded editor buffers.
- Persistent dependencies continue to block rather than introducing missing-asset placeholders. Retained prefab definitions also protect their dependencies. Bytes/tombstone identities remain retained; this is not physical file erasure.
- Cleanup targets the initiating editor. Already-open editors in another browser retain their own transient buffers; retained immutable bytes preserve readability. Service revision/usage checks still govern library writes.
- The broader invocation of `service/scatter.test.ts` exposed an unrelated existing assertion at line 19 expecting project format **10**; the current document encoder returns **12**. That assertion was not changed in this focused fix. The relevant scatter-preference test passes. The full unrelated suite was not run; no separate formatcheck was run.

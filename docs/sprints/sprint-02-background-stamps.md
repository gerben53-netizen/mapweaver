# Sprint 2 — Backgrounds and reusable stamps

## Acceptance scope

- Import validated PNG/JPEG/WebP backgrounds at their natural dimensions, confirm replacement, preserve the old map on failure and fit after success.
- Persist categorized stamp metadata, original blobs and thumbnails; support search, partial imports and exact duplicate detection.
- Drag stamps to valid map coordinates at any supported viewport, center them, bound their initial size and assign independent placement IDs.
- Preserve zoom, pan, fit and desktop layout. Keep project storage and object editing out of scope.

## Architecture and limits

Dexie database `mapweaver-library` uses schema version 1. Tables are `assets` (`id`, unique `contentHash`, `categoryId`, `name`, `createdAt` indexes), `blobs` (`id`) and `categories` (`id`, unique `normalizedName`). Future changes must add an explicit version and migration. Original and thumbnail Blobs are separate from metadata. A per-asset transaction commits metadata and blobs together; batches continue after individual failures.

File limits: 20 MiB, 50 files per import, 8,192 px per side, 24 million pixels total. Encoded dimensions are inspected before decoding; decoded dimensions are authoritative (including orientation). Small PNG thumbnails are at most 192 px. Original bytes are hashed with SHA-256. Category names are 1–80 characters.

Placed objects reference asset IDs, hold top-left map coordinates and independent transform fields. A new placement is centered at the converted drop coordinate. Initial dimensions are scaled by `min(1, map.width × 0.25 / image.width, map.height × 0.25 / image.height)`. The canvas clips content to the map bounds. Drop centers must be inside the map.

The map store is session-only and contains no image payloads. The background import service owns the current background Blob. Object URLs and decoded images belong to a reference-counted presentation cache, shared by repeated placements and released on unmount/replacement/failure. Search and pointer movement do not trigger image/database reloads.

Minimum zoom is 1% instead of Sprint 1's 10%, allowing the largest permitted background to fit in the minimum desktop workspace. The 400% maximum and pointer anchor behavior remain unchanged.

## Validation notes

The specified `docs/sprints/sprint-01-project-foundation.md` was absent at the start. Existing README, ADR, source and tests supplied the baseline; that missing document was not reconstructed.

Baseline: all 20 Sprint 1 tests passed before changes. New tests use isolated fake IndexedDB databases, not user data. Browser testing used generated local JPEG, transparent PNG/WebP, replacement PNG and damaged PNG fixtures.

Verified in the browser at 1280 × 720: background import/natural dimensions/fit, replacement confirmation and cancellation, partial stamp import, alpha transparency, search/category filtering, persistent library after reload, valid placement before and after zoom, and rejecting a drop outside the map. Map state correctly resets after reload.

The browser-control API cannot hold Space or the middle button through a drag. Those manual checks, including manual placement after pan, remain outstanding. Targeted navigation and actual canvas drop-handler integration tests cover both pan methods, cleanup and transformed drops at several pan/zoom values.

No push, merge, publication or deployment performed. No project autosave, export or object editing added.

Final validation: 61 tests across 10 files passed; TypeScript, ESLint and the production build passed. Browser console was clean after reload. The production JavaScript bundle is approximately 594 kB (186 kB gzip); Vite emits its non-blocking 500 kB chunk-size warning. No bundle-splitting architecture was added in this sprint.

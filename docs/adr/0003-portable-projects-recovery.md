# ADR-0003: Portable project v1 and local recovery

Status: accepted, 2026-09-23.

## Decision

Use the exact [Mapweaver v1 specification](../architecture/mapweaver-format-v1.md) for the first persistent format. A `.mapweaver` ZIP contains validated project JSON and each referenced original image once. fflate is the sole compression/decompression dependency. A bounded structural preflight and streamed output checks reject unsafe archives before document replacement. One parser owns version dispatch and future migrations.

Project-owned assets resolve before library assets. Loaded assets never silently enter the library; ID collisions during later library placement receive a fresh project asset ID. Runtime image URLs, editor state and history are excluded from files.

Upgrade the existing Dexie database additively from schema 1 to 2. Keep library tables intact and add independent recovery document/asset tables. Debounce completed history events for one second and atomically replace each recovery package. Retain five recent copies. Loading recovery requires explicit user choice; local copies are never presented as file-system links.

Use browser downloads rather than a File System Access API dependency. Mark clean only after the complete file is built and download initiated. The browser cannot reliably confirm final disk persistence. Recovery failures leave editing available and display a warning. New/open validate before a confirmed, synchronous working-state replacement.

## Consequences

Project files work independently of the original browser library. The documented validation limits are now part of format compatibility and require an explicit decision before expansion. Recovery is origin-scoped and subject to browser quota/eviction, so downloads remain necessary. Undo history remains session-only. Optional preview generation is deferred; valid bounded previews from other v1 files are accepted.

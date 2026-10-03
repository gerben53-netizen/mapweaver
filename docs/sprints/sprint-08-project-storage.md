# Sprint 8 — Portable projects and recovery

Reconstructed from the implementation and recorded validation, 2026-09-23; no new validation is claimed here.

Implemented format v1 using fflate, new/download/open, strict atomic validation, embedded assets independent of the library, history clean points, Dexie schema 2 and debounced recovery with five recent local copies. See the [format specification](../architecture/mapweaver-format-v1.md) and [ADR-0003](../adr/0003-portable-projects-recovery.md).

Eight targeted cases in `src/projects/archive.test.ts` and `src/projects/recovery.test.ts`, TypeScript, changed-scope ESLint and production build passed. No broad regression suite or external publication was performed. The bundle was 695.66 kB / 219.07 kB gzip with the existing size warning.

Manual checks confirmed new project, download, independently reopening that download on a separate clean local origin with an empty library, embedded background/stamp/pattern rendering, and rejecting a damaged file. Computer Use then stopped because it could not determine the browser URL confidently. Unsaved confirmation/cancellation and recovery after reload were not conclusively checked manually. These remain relevant to the release workflow. Optional preview generation is omitted.

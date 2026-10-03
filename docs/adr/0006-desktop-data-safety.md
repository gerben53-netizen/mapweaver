# ADR-0006 — Windows launcher, streaming backups and transactional restore

Status: accepted for Sprint 13 implementation, 23 September 2026.

Use an ordinary native .NET Framework Windows launcher plus the pinned Node 24.17.0 runtime and unchanged native better-sqlite3/Sharp modules. The browser remains freely selectable. Reject Electron as unnecessary and single-executable embedding as extra native-addon extraction/lifecycle complexity; bundling the runtime directory preserves the validated module layout. Windows Framework 4.x and x64 are required. The local compiler is the Windows Framework csc; optional installer configuration targets Inno Setup. No signing, installation or publication was performed.

Use yazl 3.3.1 and yauzl 3.4.0 for bounded streaming ZIP64 output and lazy central-directory input. Portable backup format 2 extends the manifest without changing .mapweaver project format 2. Accept Sprint 12 full backups. Restore uses same-volume staging, retained old dataset and a durable switch journal; Windows directory renames are individually atomic, with explicit crash recovery rather than a claim of atomic directory exchange. Clients carry datasetGeneration as well as project revision; replacing a dataset invalidates old tabs and recovery copies.

The program directory and user dataset stay separate. A kernel-owned loopback safety lease prevents concurrent production writers across ports. Hash collisions refuse startup safely. No automatic data-directory migration UI, automatic recovery-point deletion, cloud component or permanent service registration. See backup-format.md, local-storage.md and the Sprint 13 report for validation and limitations.

Sources consulted: [Node single-executable/native-addon constraints](https://nodejs.org/api/single-executable-applications.html), [yazl](https://github.com/thejoshwolfe/yazl), [yauzl](https://github.com/thejoshwolfe/yauzl). Package API behavior was also inspected in the installed pinned source.

# Startup, Projects UX and Windows package — 2026-09-24

## Result

Previously every launch opened Projects. Startup now opens the last successfully opened local project directly in the Map editor, with a neutral loading notice and no Projects-modal flash. New and imported projects open immediately and become the next startup target. Without a recent reference, existing projects appear in the picker; an empty installation offers New project and Import project file, with keyboard focus on New.

Projects remains available in the header. Open is the primary per-project action. Rename, Duplicate, Export and Move to Trash are under More actions. Trash, Refresh projects and Storage are under More. Native disclosure controls preserve keyboard access. Trashing the current project first saves outstanding changes or refuses if saving fails, clears the recent reference and returns to project selection. Trash retention and explicit restore remain available.

## Persistence and compatibility

The existing SQLite settings table stores a stable project ID, separate from project data. Successful create, load, import and save-as-copy acknowledge opening after document/asset validation and installation. Reading, exporting or merely duplicating a project does not change the reference. Renaming preserves the ID. A failed manual switch preserves the previous working document and recent reference.

Startup consumes its automatic-open reference before trying it; success restores it. Missing, trashed or corrupt targets fall back with a concise error and cannot form a repeated startup loop. Service and browser migration discovery failures expose the picker and maintenance controls. Compare-and-delete avoids clearing a different reference written by another browser. See [ADR-0021](../adr/0021-last-opened-project.md).

No project-format/schema change or destructive migration. Existing project validation/import remains in use; the shipped house project with embedded assets was imported, opened, saved, reopened and exported. An installation without the new preference selects a project once to establish it.

## Changed files

- `src/projects/startup.ts`: startup orchestration, recovery discovery and safe fallback.
- `src/projects/localSession.ts`: successful-open acknowledgment and editor activation.
- `src/app/ProjectControls.tsx` and `.module.css`: startup/picker/first-use state and management hierarchy.
- `service/startupProject.ts`, `service/app.ts`: persisted preference endpoints, acknowledgment, Trash invalidation and rejection of normal reads of trashed projects.
- `service/storage.ts`: type the existing `deletedAt` column.
- `src/projects/startup.test.ts`, `src/projects/recentSession.test.ts`, `service/startupProject.test.ts`: focused regression coverage.
- `tests/persistence/startup-package.mjs`: isolated native-package acceptance script.
- `README.md`, ADR-0021 and this report: behavior and technical decisions.

## Validation

- `npm run test -- src/projects/startup.test.ts src/projects/recentSession.test.ts`: **13 passed**. Valid/absent/missing/corrupt references, concurrent claim, service/migration errors, create, manual switch, failed switch, import and preference-write warning.
- `npm run test:service -- service/startupProject.test.ts`: **2 passed**. Successful-open persistence, non-mutating reads, rename/duplicate stability, Trash invalidation, compare-and-clear and invalid references.
- `npm run typecheck`: **passed**, client and service.
- Scoped ESLint over all changed TypeScript files and the package acceptance script: **passed**.
- `npm run build`: **passed**, client and service production output.
- `node tests/persistence/startup-package.mjs`: actual packaged `Mapweaver.exe` supervisor and bundled runtime, isolated SQLite/data directory, fresh Chrome contexts. First-use keyboard flow, create/import, direct automatic reopen without picker flash, manual Projects, rename/duplicate/switch/Trash, save, autosave, PNG download, Asset Library, normal supervisor stop/relaunch, missing/corrupt/trashed fallback and preservation after failed manual switch were checked.
- Screenshots at 1280 × 720 inspected for first-use/Projects/editor layout and the reopened house with its assets. The saved added layer survives relaunch.
- **4,485 SHA-256 entries verified** against the new package. Native executable has the expected Windows executable signature.
- **14 previous package folders preserved; 8 previous checksum manifests unchanged.** No old package was overwritten or removed.

No unrelated full test suite was run. The repository has no existing `develop` branch or commits; its existing untracked working tree was retained without branch/reset/commit operations.

## Windows package

Commands:

```powershell
npm run build
node scripts/package-windows.mjs Mapweaver-StartupUX-20260924
node tests/persistence/startup-package.mjs
```

Executable:

`C:/Users/gerbe/Documents/ChatGPT/Mapweaver/distribution.local/Mapweaver-StartupUX-20260924/Mapweaver.exe`

Checksums:

`C:/Users/gerbe/Documents/ChatGPT/Mapweaver/distribution.local/Mapweaver-StartupUX-20260924-SHA256SUMS.txt`

The portable directory includes the Node 24.17.0 runtime, native dependencies, production client/service, launcher, shortcut helper, licenses and documentation. Keep the complete directory together. Final test evidence is under `.startup-ux.local/package-1790266376816/`; it is isolated test data, not production data or a packaged dependency. The package contains README and ADR-0021; this post-validation report remains in the repository.

## Limits

Native launcher startup and graceful stop/relaunch were automated with `--test --no-browser`; the actual packaged client was driven in Chrome. Tray menu clicks, default-browser launching and shortcut installation were not manually exercised. Startup metadata is shared per local dataset: simultaneous launches can leave the second window at the picker while the first consumes the automatic-open attempt. If saving the preference fails, the open map remains usable with a warning and the next startup may require selection.

No pushes, merges, uploads, deployments, publication or other external actions were performed.

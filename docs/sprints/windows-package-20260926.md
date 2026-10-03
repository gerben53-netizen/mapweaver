# Windows package refresh — 26 September 2026

Built `distribution.local/Mapweaver-20260926/Mapweaver.exe` from the current source, with Node 24.17.0, production client/service, native SQLite/image dependencies and bundled fonts. Keep the complete folder together. Portable transfer archive: `Mapweaver-20260926-Windows-x64.zip` (85,208,036 bytes), with sibling SHA-256 file and per-file checksum manifest.

Validation:
- `npm run package:windows -- Mapweaver-20260926`: passed client/service TypeScript and production builds; font resource/license validation passed. Vite emitted its existing advisory for chunks larger than 500 kB.
- Actual compiled launcher started with `--test --no-browser` in an isolated dataset. Its bundled service imported the native Velanth archive (537 objects), displayed and saved it in production Chrome, stopped gracefully, restarted with the same current project and stopped again. No browser page errors.
- All 4,718 package file hashes verified. All 4,718 ZIP entries decompressed and matched the same hashes.
- Broad unrelated unit/browser suites were not run. Installer compilation, signing and installation were not performed.

Explicit user-authorized cleanup removed 17 obsolete package directories (3 distribution builds and 14 historical launcher/package test copies), 5 old archive/checksum files and the obsolete `launcher.local/Mapweaver.exe`. Freed 3,184,316,558 bytes. Before recursive deletion, each resolved path was checked to remain inside the repository; expected package identity/content and absence of reparse points were verified. No running old Mapweaver launcher was found during deletion.

Current production build directories, source, historical test evidence/data, the user's application data/library/projects and the Velanth deliverables remain. No external actions were performed. Evidence and exact removed-path list: `.qa.local/windows-20260926/` (`results.json`, `zip-validation.json`, `cleanup-removed.json`, `packaged-editor.png`).

README, portable guide and optional installer source default now refer to the current package. No installer binary is claimed. Application version remains 1.0.0; the distribution folder identifies this build date.

# ADR-0054 — Per-user Windows installer and deliberate default content

Status: accepted, 3 October 2026.

Reuse the existing C# supervisor/browser and pinned Node x64 runtime. Inno Setup 6.7.3 creates a per-user Windows 10/11 installer under `%LOCALAPPDATA%\Programs\Mapweaver`; datasets remain under `%LOCALAPPDATA%\Mapweaver`. No updater, permanent Windows service, firewall exception or competing launcher is introduced.

`docs/distribution/default-content.json` is the packaging allowlist. Package only the client, one service bundle, production dependencies, deliberate public resources and notices. Vite's service output also contains copied public resources; those copies must not be packaged. Exclude private databases, developer fixtures/templates/demos and local production intermediates. Keep Living Root dev-1 resources solely for existing saved revision references; release selection offers production-1 for new walls.

A fresh installed dataset imports the two accepted bundled stamp packs through the existing validator/importer. Record `installed-default-content` in the existing settings table; no schema bump. A `pending` receipt allows idempotent retry after interrupted initial import. Preserve existing datasets without automatic reseeding, and do not resurrect deleted/inactive library assets on reinstall or upgrade. Receipts participate in normal database backup/restore. Installed built-in terrain/generator/font resources remain independent of the mutable stamp library.

Use `package.json.version` for setup names, install registration, executable attributes and service diagnostics. Upgrades and uninstall require the supervisor's confirmed safe stop; Inno's automatic process termination is disabled. Uninstall has no user-data deletion rule. Optional clean reset remains a deliberate manual action after backup.

Validate installer operations with a separate test AppId, data/install directories, nonstandard port and owned native launcher. A host-isolated test is not certification on a pristine VM or every Windows release. Generated setup/runtime/test output remains ignored, while source, inventory, tests and Dutch installation guide are tracked.

# Windows Installer and Installation Guide

Delivered on 3 October 2026, Windows 11 x64 host (10.0.26200). Target: Windows 10/11 x64. Uses the existing C# launcher and local-only Node 24.17.0 service, with Inno Setup 6.7.3. The official compiler download's Authenticode signature was verified (Pyrsys B.V.); the Mapweaver installer itself is unsigned.

## Delivery

- Installer: `distribution.local/Mapweaver-Setup-1.0.0.exe`, 124,012,822 bytes.
- SHA-256: `637432e5dfbfc8262b6e3ec9cc08e7affa59656798b8ef4080ba54a0fa643d1c`, adjacent `.sha256` file.
- Dutch user guide: `INSTALLATIE.md`, also included in the installed program and linked from Start Menu.
- Build: `npm run package:installer`; prerequisite/compiler setup is in `docs/distribution/README.md`.
- Canonical inventory: `docs/distribution/default-content.json`; architecture: ADR-0054.

Application defaults to `%LOCALAPPDATA%\Programs\Mapweaver`. User maps/campaigns, SQLite schema 10, imported originals/previews, library metadata, settings, backups and logs remain separately in `%LOCALAPPDATA%\Mapweaver`. Browser-origin recovery/preferences remain separate and are documented. No personal dataset was reset, copied into distribution, or migrated to another directory.

## Content and scope

The inventory intentionally packages 46 Painterly World stamps, 31 settlement/landmark stamps, 32 terrain materials, production Living Root's 28 components, eight curated font families plus Liberation Sans, notices and existing editor/runtime tools. Fresh installed datasets get the two stamp packs via the validated existing importer. Receipts prevent reimport after deletion and safely resume interrupted first initialization. Existing datasets are preserved without reseeding.

The audit's historical hash/classification inventory was compared with the two default packs: no matching REPLACE/REJECT/inactive entries. The user's private library is never a packaging source. Development data, QA fixtures, templates, demos, old Engraved assets, repository source and developer docs are excluded. Dev-1 Living Root PNGs are a deliberate compatibility-only exception, required to resolve existing saved revision references; release UI does not offer them for new walls. No artwork, renderer, quality classification, Campfire contract or schema was changed.

The first packaging trial revealed Vite's duplicate full-public copy inside dist-service. The final package copies only main.js there; its client resources follow the explicit inventory. The overinclusive trial was retained under ignored `.installer.local/initial-overinclusive-build`, never delivered as the final installer.

Optional content uses existing image/ZIP/wall-set/map imports. Custom font-file import is not supported; the guide explicitly says so. Extra World brush textures and arbitrary generator-component directories are not promised as generic plugin imports. The guide distinguishes standard, pack-imported and personal assets, existing removal UX, local backups, safe shutdown, updates and uninstall.

## Validation

Host-isolated installer test evidence: `.installer.local/validation-1791034123185/results.json`, installation logs, installed-editor.png and export.png. The test uses a separate AppId/Start Menu group, a repository-local install/data directory and port 48173. The normal port was checked read-only first; no personal instance was running. No competing standard-port instance was launched.

1. Fresh install passed: native launcher, bundled Node/native modules, service health, editor and 77 standard library assets; schema 10.
2. A native map with a bundled production stamp, enabled soft shadow, simple wall and open production Living Root wall was created and loaded in the installed editor. PNG download passed (800 × 600), and was visually inspected. The recorded document was used for persistence comparisons. After the full cycle, only guide text and the font-family inventory were corrected in the final installer; runtime and installer lifecycle logic remained byte-identical.
3. Upgrade passed: the prior OpenWallFix service build was run against a populated synthetic schema-9 dataset; installation safely stopped that owned prior service. The new service migrated to schema 10, preserving the complete map document and imported personal asset ID.
4. Uninstall passed: program removed, SQLite/assets retained. Reinstall passed: the same map and personal asset were reused; no reseeding. Final test uninstall removed the test registry entry and the owned service stopped.
5. Inno logs confirm Start Menu application, Stop and guide shortcuts and per-user uninstall registration. Optional Desktop is unchecked by default. No firewall rule or permanent Windows service is installed.

Targeted service validation: 36 tests across defaultContent, library and storage. A pre-existing migration test's schema-1 reconstruction incorrectly retained schema-9/10 columns; it now removes patternScale/quality while preserving its original assertions. The corrected migration and default-content tests passed; library tests passed. Frontend: 21 tests across GeneratedWallFields, openWalls and mapEffects passed, including a release-only regression that hides development choices and preserves saved legacy selections. No unrelated full suite was run.

`npm run typecheck`, `npm run lint`, production client/service build, immutable Campfire provenance, packaged font/license verification and sprint diff whitespace check passed. Existing Vite chunk-size/dynamic-import warnings remain.

An initial installer harness closed its browser before shutdown acknowledgement and correctly hit the existing safety timeout. Only that saved, isolated QA instance was recovered through the authenticated existing release-tabs action after timeout and no active storage work; no writer was killed. The corrected harness keeps the browser open until confirmed stop. The final complete test cycle passed.

## Limitations and Git

Validation was on this Windows 11 host with isolated installation/data/registration, not a pristine VM or a separate Windows 10 computer. This release is unsigned; SmartScreen behavior depends on Windows reputation/security settings. Hardware figures are recommendations. Commercial compiler licensing must be reviewed before commercial release authoring; font/Node notices and generated-art provenance are shipped. No automatic updater, cloud connection or publication was introduced.

One local commit on `develop`: `Sprint: Windows Installer and Installation Guide`. The resulting hash is reported in the delivery response and ignored `.installer.local/completion.json`; generated installer/runtime/test data is excluded from Git. No remote or push, deployment, user-data reset, or Campfire-directory change occurred.

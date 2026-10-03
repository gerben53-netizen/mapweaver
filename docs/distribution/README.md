# Windows release packaging

The existing C# launcher and loopback Node service are retained. Inno Setup 6.7.3 provides a per-user Windows 10/11 x64 installer, Start Menu entries, optional Desktop shortcut and registered uninstall. No second launcher, updater or firewall rule is introduced. See [official portable compiler notes](https://jrsoftware.org/ishelp/topic_technotes.htm).

`default-content.json` is the canonical content allowlist and first-install stamp-pack inventory. It is copied into the package and consumed by the service. Fresh datasets receive 77 bundled stamps through the existing validated pack importer. A receipt in existing SQLite settings prevents resurrection after deletion; interrupted first installs resume idempotently. Existing libraries are never reseeded. Built-in terrain, fonts and generators remain renderer resources. `living-root-dev-1` is retained only for saved-wall compatibility and hidden from new release choices; no private REPLACE/REJECT/inactive library is copied. The registry and rendering behavior remain unchanged.

Build on Windows x64 with Node 24.17.0 and native dependencies from `npm ci`. Install Inno Setup 6.7.3 or use its official `/PORTABLE=1 /CURRENTUSER` mode. Set `INNO_SETUP_ISCC` to `ISCC.exe`; the local fallback is `.installer.local/tools/inno/ISCC.exe`. Run:

```
npm run package:installer
```

This builds the release client/service, curated package, launcher and installer, then writes SHA-256 checksums. Output: `distribution.local/Mapweaver-Setup-<version>.exe`. Existing output is never overwritten. Release version is exclusively `package.json.version`; increment it before the next release (and update the lockfile root version). Service diagnostics, executable version attributes and installer version are derived from it. The fourth Windows file-version component is zero.

Only production runtime dependencies are bundled; their JavaScript/native files are necessary runtime components, not the repository's development node_modules. Developer docs, fixtures, templates, demos, private libraries and local outputs are excluded. Artwork attribution/provenance and original font/Node notices are included. The installer output is unsigned. No signing/publishing service is configured.

This compiler run uses Inno's non-commercial mode. Review [the publisher's licensing terms](https://jrsoftware.org/isinfo.php) before commercial release authoring. Artwork distribution relies on the accepted generated-asset usage notes and supplied Living Root provenance; no exclusivity or independent third-party clearance is claimed.

Application default: `%LOCALAPPDATA%\Programs\Mapweaver`. Persistent user data: `%LOCALAPPDATA%\Mapweaver`; browser recovery/preferences remain browser-origin storage. Upgrades request a confirmed safe stop through the existing launcher. Automatic process termination is disabled. Uninstall removes only registered application files and preserves data; no user-data delete directive exists. Schema 10 is retained and existing migration backups are used.

Optional installer tests must use a distinct AppId, install directory, Start Menu group, data directory and nonstandard API port. Check existing instances/ports first, and never stop a user's running instance. Keep all generated test evidence under `.installer.local`.

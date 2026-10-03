# Portable Windows guide

Keep the entire Mapweaver package folder together (latest build: `Mapweaver-OpenWallFix-20260929`). Run `Mapweaver.exe`; the package includes Node 24.17.0 x64, native modules, client, service and the embedded M icon. Stop an older package before upgrading. Personal data stays in `%LOCALAPPDATA%\Mapweaver`, outside the program directory. An explicit `MAPWEAVER_DATA_DIR` must be absolute, outside this package, and pass the service's existing junction/symlink checks.

Right-click the notification-area M icon to Open, Restart, Stop, Keep running or inspect Diagnostics. Double-click opens the local URL with your standard browser. A second launch routes to the existing supervisor even if its launcher environment requests another port for the same datamap. A different datamap needs an explicit free API port and free writer-lease port; there is no automatic fallback.

Closing the browser intentionally leaves Mapweaver running. Stop is explicit. Save conflicts and nonresponding tabs require attention; no timeout kills a database writer. Wait finishes active work; Cancel is offered only for known safely cancellable storage jobs. Critical restore replacement must finish or roll back. The browser shows a blocking shutdown message and instructions for restarting. Uncommitted property-form drafts retain the existing rule: apply them before saving.

`--debug` opens a status window with the same tray menu for local diagnosis. `--no-browser` suppresses browser opening. `--status` queries an existing supervisor. `--stop --wait` waits up to two minutes for supervisor exit and returns failure on timeout/abandonment. Ordinary `--stop` acknowledges the request immediately. No terminal window appears during normal operation.

Build with `npm run build`, then `node scripts/package-windows.mjs Mapweaver-20260926`. Existing outputs are never overwritten. The sibling SHA256SUMS manifest covers package files. Inno Setup uses the same output by default, configurable through `PackageDir`; its uninstall precondition requests a confirmed safe stop. Installer compilation/install/uninstall has not been validated for this hotfix. Do not remove program files while Mapweaver is running.

The OS can hide notification icons in overflow or terminate applications during logoff, forced shutdown or power loss. Mapweaver requests safe shutdown on available session-ending signals; it cannot promise unlimited flush time from Windows. No permanent service, administrator elevation, signing, telemetry, publication or automatic update is introduced.

See [troubleshooting](troubleshooting.md) and the [Sprint 13.1 evidence and limitations](sprints/sprint-13-1-portable-lifecycle-controls-report.md).


After a stop timeout, **Resolve blocked browser waits** (tray) or **Resolve closed or crashed tabs** (browser) is an explicit recovery action. It requires confirmation that other tabs are closed and their work preserved, warns that unsynced edits were not saved and may be lost, and is refused while service writes/streams/storage jobs remain active. It releases only the browser wait barrier, never kills a writer, cancels a critical restore, deletes pending recovery buffers or labels unsynced work saved. The browser route retains its own session for a final flush. This is not an automatic stale-tab expiry.





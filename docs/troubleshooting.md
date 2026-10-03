# Windows launch and storage troubleshooting

Double-click Mapweaver.exe in the portable package. It starts the bundled Node runtime hidden, waits for the service healthcheck, then opens the default browser. Repeating this reopens the existing instance. Open the displayed URL manually in Chrome, Edge or Firefox if your default browser cannot start. No npm, Node installation, administrator rights or Windows service registration is required. Windows .NET Framework 4.x is required for the small native launcher.

Use the Mapweaver tray menu → Stop, Project → Storage → Stop Mapweaver, or `Mapweaver.exe --stop`. Closing browser tabs leaves the tray and service running; idle auto-exit has been removed. Restart uses the same drain and starts a new service only after the old process exits.

If the icon seems absent, check Windows notification overflow. Start Mapweaver.exe again: a healthy supervisor receives Open through its protected pipe. Use `--debug` for the local supervisor status/menu window, or `--status` from a diagnostic terminal. The application does not change Windows taskbar settings.

If stop times out, no writer is killed. Choose Keep Mapweaver running, resolve saves/conflicts and finish or safely cancel operations, then retry Stop. Every registered tab must acknowledge the flush or leave cleanly. A suspended/crashed tab can remain a barrier; the application does not assume that its unacknowledged work is saved. Keep data and recovery buffers intact. After the timeout, use the explicitly confirmed browser-wait recovery described below rather than deleting locks or forcing the writer closed.

If the service crashes, the tray stays in an error state; use Restart or copy the local Diagnostics text. If the supervisor itself crashes, the writer lease remains held by Node. A new launcher refuses to take over that live service. Open its existing local URL, use Storage → Stop, then retry Restart. The browser decision controls remain available if active work requires a decision. Never delete a live lock or kill unrelated Node processes.

Browser opening uses Windows ShellExecute with a typed local URL, after health and identity checks. A failure keeps the service alive and shows a selectable/copyable URL; Open can retry. Browser window titles and private browser state are never inspected. No custom browser executable is assumed.

A conflicting port or a data directory already owned by another process fails safely. Close the correct instance or explicitly configure MAPWEAVER_PORT; the launcher never silently picks another port or data directory. A rare safety-port hash collision also refuses startup. Healthcheck failures and missing native SQLite/Sharp dependencies show a launch error. Keep the package's runtime, node_modules, dist and dist-service together; do not copy only Mapweaver.exe.

Program upgrades: stop Mapweaver and replace/extract the **whole program package**. User data is under %LOCALAPPDATA%\Mapweaver, never the program directory. Older builds cannot open newer schemas. Portable uninstall: stop Mapweaver and remove only its program directory/shortcuts; user data and sibling recovery points remain. Installer configuration also preserves data by default and tells the user where to find the documented removal procedure. Do not delete data unless independently backed up and explicitly intended.

Diagnostics ZIP contains application/schema/OS/runtime versions, health, counts, space totals and integrity status. No project names, documents, images, user paths, database or browser data. The ZIP also includes bounded, allowlisted lifecycle events and optional numeric exit codes. The tray diagnostic view remains available if the service has crashed. Logs contain no request or personal data; no telemetry or upload occurs.

If a restore cannot roll back because files are locked or inaccessible, stop other tools accessing the directories and retain all recovery material. Do not repeatedly overwrite the data directory. Check permissions/free space and seek local technical help using the diagnostics package.


After a stop timeout, **Resolve blocked browser waits** (tray) or **Resolve closed or crashed tabs** (browser) is an explicit recovery action. It requires confirmation that other tabs are closed and their work preserved, warns that unsynced edits were not saved and may be lost, and is refused while service writes/streams/storage jobs remain active. It releases only the browser wait barrier, never kills a writer, cancels a critical restore, deletes pending recovery buffers or labels unsynced work saved. The browser route retains its own session for a final flush. This is not an automatic stale-tab expiry.

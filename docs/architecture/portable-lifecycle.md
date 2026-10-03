# Portable lifecycle and IPC

## Ownership

`Mapweaver.exe` is a persistent .NET Framework WinForms `ApplicationContext` and `NotifyIcon`. It owns the tray, default-browser request, diagnostic view, user-scoped lifetime mutex and named pipes. Its child, the bundled Node runtime, alone owns SQLite, asset streams, maintenance jobs and the pre-existing kernel-owned loopback writer lease. That lease, keyed by canonical datamap, still prevents two production writers across API ports. No second writer lock or stale lock-file deletion was added. The supervisor mutex controls UI/process orchestration only.

The previous launcher released its mutex and exited after starting Node. That caused the invisible background lifetime. It also used a persistent dataset generation alone, allowing an old tab to write after a normal restart. The hotfix adds an independent runtime instance UUID, with no change to project v4, database schema 3 or backup format 2.

## Local protocols

The supervisor mutex is `Local\Mapweaver-<current-user SID>-<datamap SHA256>`. Discovery uses that same base name as a named pipe. It returns a newly generated supervisor UUID; commands use a separate `<base>-<supervisor UUID>` pipe, and must repeat that UUID in the message. Both have a protected ACL allowing the current user only and denying network logons. Discovery sends no paths/tokens. Named endpoints disappear when owned handles close; a dead generation cannot receive a command for its successor. Messages are bounded to 160 printable ASCII bytes; reads/writes time out after two seconds and connection attempts after five. Only Open, Stop, Restart and Status are accepted.

The supervisor's random control token is inherited by its child through the process environment. `/lifecycle/control` requires this token plus current runtime instance and the existing Host/Origin/Fetch Metadata/custom-header defenses. Health exposes application identity, datamap fingerprint, PID, supervisor UUID, runtime UUID, dataset generation and sanitized lifecycle status, never the token. Health must match the supervisor's actual child PID and identity before management. A foreign occupied port refuses startup. `ShellExecute` receives a validated loopback URL as a typed argument, never an interpolated shell command.

Browser sessions register using a random per-tab ID and poll every 500 ms. Every production mutation carries `X-Mapweaver-Instance`, independently of `X-Mapweaver-Generation` for restored datasets. Current-instance browser Stop needs a registered client. Browser wait/keep decisions use the same registered-session route, not the supervisor secret. Existing project revision checks still apply.

## Shutdown states

1. **running → stopping-requested:** stop admits no new mutations or long exports/imports. Requests already accepted, pending queue entries, streams and running/ready storage jobs remain accounted for. Cancellation of existing safe jobs stays available. Browser-local import/export/storage work is reported separately.
2. Active-work decisions hold the transition until Wait, Cancel or Keep. Completed work cannot race past an unanswered dialog. Cancel uses existing `Jobs.cancel`, which refuses critical restore replacement. Keep returns to running.
3. **flushing:** registered tabs freeze mouse/keyboard editing, finish the current gesture, bypass the autosave debounce and save dirty state. Only an unacknowledged registered client's project PUT remains admitted. After an actual clean save, the tab acknowledges this stop ticket. Save errors/conflicts are not acknowledged.
4. **closing:** after all clients acknowledge/leave and work/requests/queued writes drain, a short response-delivery grace period precedes SQLite WAL checkpoint and database close. Then Fastify closes HTTP/streams, Node releases its lease and exits. The supervisor observes child exit before disposing the tray/pipes/mutex or starting exactly one replacement.
5. **error:** a two-minute timeout pauses shutdown and leaves the writer alive. Keep or retry is explicit. No automatic kill, data-directory switch, forced restore cancellation or lock removal occurs.

Clean page departure sends a keepalive unregister. Suspended/crashed tabs are deliberately not expired or assumed saved. Such tabs can block Stop indefinitely until resolved; this conservative limitation is visible. After acknowledged shutdown a tab remains frozen, even if a new service appears at the same URL. Explicit reload starts a new client connection.

## Crashes, OS limits and diagnostics

An unexpected nonzero child exit leaves a visible error supervisor with Restart and Diagnostics. Events that cannot reach the crashed service remain in the supervisor queue and are forwarded after a healthy restart. A supervisor crash does not kill its child or steal its writer lease: a new supervisor refuses unsafe adoption, explains browser Stop recovery and retains its own error UI. The service can complete its browser-driven shutdown without the missing supervisor. No automatic takeover token is persisted.

Windows session-ending notifications request the same drain; Node SIGINT/SIGTERM do likewise. The implementation does not block Windows indefinitely. Windows forced termination, power loss, crashed browsers and logoff time limits cannot guarantee browser flush; SQLite/recovery guarantees remain those of the existing storage architecture. These native OS cases require further manual acceptance.

`logs/lifecycle.jsonl` is bounded and contains only timestamps, allowlisted event names and optional numeric exit codes. Diagnostics reread and sanitize those fields; forged extra fields/private paths are discarded. This log is included in the existing diagnostics ZIP. The supervisor also keeps at most 256 sanitized events in memory, available in its copyable diagnostic view when Node is unavailable. No project names, map bytes, secrets, browser titles or absolute personal paths enter these logs.

WinForms, drawing/icon support, mutex security and named pipes use installed framework assemblies. No new npm, GUI runtime, permanent Windows service, cloud dependency or account is needed. The embedded icon is a simple native vector-drawn M. No external icon/image asset was downloaded.


After a stop timeout, **Resolve blocked browser waits** (tray) or **Resolve closed or crashed tabs** (browser) is an explicit recovery action. It requires confirmation that other tabs are closed and their work preserved, warns that unsynced edits were not saved and may be lost, and is refused while service writes/streams/storage jobs remain active. It releases only the browser wait barrier, never kills a writer, cancels a critical restore, deletes pending recovery buffers or labels unsynced work saved. The browser route retains its own session for a final flush. This is not an automatic stale-tab expiry.

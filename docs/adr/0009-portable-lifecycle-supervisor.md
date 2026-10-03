# ADR-0009 — Portable Windows lifecycle supervisor

Status: implemented for Sprint 13.1; native manual acceptance remains open.
Date: 2026-09-23.

The .NET Framework launcher remains alive as a WinForms notification-area supervisor. Node remains the sole owner of SQLite/files and the existing per-datamap writer lease. A separate user-scoped lifetime mutex prevents duplicate supervisors; it does not replace writer exclusion. Discovery and generation-specific named pipes with explicit user ACLs route repeated launches. Supervisor-to-service HTTP control additionally uses a random inherited launch token and runtime instance UUID.

Shutdown is a service-owned drain/decision/browser-flush/checkpoint/close state machine shared by tray and browser actions. Timeout never kills a writer. Restart waits for complete child exit before starting a successor. Persistent dataset generation and runtime instance generation are distinct, so normal restart cannot silently reauthorize an old browser tab. No project, asset, SQLite-schema or backup-format migration is introduced.

Reject Electron, a permanent Windows service and a parallel database lock as unnecessary for this hotfix. Reject automatic orphan takeover or stale-tab expiry because unconfirmed work must not be represented as saved. Explicitly releasing browser waits is allowed only after timeout, without active service work and with a clear unsaved-work warning/confirmation. It retains recovery buffers.

See [lifecycle protocol and limits](../architecture/portable-lifecycle.md), [portable guide](../portable-windows.md) and [validation report](../sprints/sprint-13-1-portable-lifecycle-controls-report.md). Native notification-area visibility, default-browser success and OS logoff behavior require further manual Windows validation; the code and portable smoke tests do not certify them.

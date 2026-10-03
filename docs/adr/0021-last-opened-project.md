# ADR-0021 — Reopen the last successful local project

Accepted 2026-09-24.

The local service's existing SQLite `settings` table stores `lastOpenedProject`, a stable project ID. It is a dataset preference, shared across browsers, not part of a project document. No project-format or database-schema migration is required.

Reading a project does not update this preference. The client acknowledges opening only after validation, required asset loading and installation of the document succeed. Create, import and save-as-separate-project use the same acknowledgment. A failed manual switch leaves the previous document and preference intact. Failure to persist the preference reports a warning without discarding the successfully opened document.

Startup lists projects once and checks existing browser migration/recovery state. It consumes the stored automatic-open reference before attempting loading, then restores it through the normal successful-open acknowledgment. Compare-and-delete prevents an older tab from erasing a different, newer reference. A crashed or invalid automatic load therefore cannot repeat indefinitely. A simultaneous second startup may show the picker while the first is opening. If preference persistence is unavailable, the next launch may require manual selection.

Missing, trashed or invalid projects fall back to the picker with an error. Service or browser migration failures also fall back; maintenance and recovery remain available. A transient unavailable service can be retried after recovery. Renaming retains the ID; duplicating alone does not change the preference; opening the duplicate does. Trashing the referenced project clears it, and normal project reads reject trashed projects. Trash retention and explicit restore remain unchanged.

The Projects surface is initially absent, avoiding a modal flash during automatic opening. With no saved active projects it prioritizes New and Import. Project maintenance and per-project management remain in keyboard-accessible native disclosure controls.

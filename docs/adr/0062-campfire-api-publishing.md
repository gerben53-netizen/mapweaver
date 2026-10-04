# ADR-0062 — Campfire API publishing

Status: accepted implementation, 2026-10-04.

Mapweaver's loopback Node service is the HTTP client for Campfire Map Integration API V1. It sends bearer-only requests over HTTPS, or numeric loopback HTTP for local development. Redirects are rejected; cookies and machine confirmation are never used. Existing local origin, instance and dataset protections apply to the publishing routes. No Campfire source, CORS or contract change is required.

There is no existing portable native secret vault. The smallest defensible mechanism is a service-memory-only token, entered through a password field and cleared from that field after configuration. Restart requires re-entry. SQLite settings retain only connection URL/name/ID and bounded receipt/fingerprint/idempotency metadata. Tokens never enter SQLite, backups, project documents, portable archives or application logs. Memory inspection, a compromised local account/service/browser and malicious same-origin application code remain outside this mechanism's protection; no hard-coded encryption key is introduced.

Discovery selects the newest mutually supported canonical version among versions the serializer can produce. Schema SHA-256 must match both the received artifact and Mapweaver's existing derived canonical artifact. The canonical semantic validator is reused, not copied or replaced by an API schema. Lower versions refuse unsupported window/explicit sky-exposure semantics rather than silently dropping them. A new canonical schema requires a deliberate supported-contract update.

Manual and API transports share `prepareCampfire`: stable identity/revision, canonical serialization, original-resolution opaque PNG, no visual grid/scale bar, initially closed door artwork and excluded lighting/ceiling previews. API publication saves the local map first so the existing revision mechanism is authoritative. Local rendering never carries Campfire gameplay/runtime state.

The service validates canonical payload, decoded image, discovered input/grid/lighting limits and exact multipart body bytes, then posts exactly contract JSON plus primary image. Campfire remains responsible for managed output normalization, review and confirmation. Unknown remote error details, receipts' private plan bodies and tokens are not relayed/logged; only safe status/receipt metadata and mapped codes are returned.

Retry metadata is recorded before network I/O. Unchanged content can reuse the key after uncertain delivery; changed content, explicit replacement or expired/cancelled plans receive a new key. READY_FOR_REVIEW is not import success. User-triggered status checks handle CONFIRMED, EXPIRED and CANCELLED. No automatic retry/status loop or unattended publishing is added.

This adds an optional external publishing destination; ordinary local editing and file export remain independent of Campfire. No project format or storage schema migration is needed: safe settings use the existing settings table.

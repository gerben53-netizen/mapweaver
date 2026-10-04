# Campfire API Client and Map Publishing

Date: 2026-10-04. Branch: develop. Handoff: Map Integration API — V1 supplied by the user. Exact discovery/receipt fields were verified read-only against Campfire's existing API implementation. Campfire source and packages/map-contract were not changed.

## Acceptance and implementation

The sprint adds optional connection configuration, discovery-only testing, canonical version negotiation/validation, two-file HTTP publication, explicit DM-review messaging, user-triggered status checks, safe retry identity and Dutch error handling. Manual export remains available. There is no machine confirm, cookie authentication, CORS workaround, unattended publication, gameplay/runtime upload or Windows package.

`service/campfirePublishing.ts` is the narrow service-side HTTP client, registered behind existing local origin/instance/dataset guards. Remote URLs require HTTPS; HTTP is restricted to numeric loopback. Redirects/cookies are rejected. A service-local concurrency guard prevents overlapping uploads/status writes; dataset replacement cannot redirect receipt writes into a different SQLite store.

The token is **service-memory-only**. The password input is cleared after successful configuration, and restart requires re-entry. Existing settings persist only name/base URL/connection reference and up to 100 safe per-map receipt/fingerprint/key records. No token, image, private plan body or authorization header is persisted/logged. ADR-0062 records the decision and limits: compromised local accounts, process memory or same-origin application code are not protected by a portable secret vault. No hard-coded encryption is used.

Discovery selects the newest mutually supported serializer version (currently 1–3), verifies the received SHA-256 and exact hash parity with existing canonical derived schemas, and reads capabilities and advertised limits. An unknown/inconsistent schema stops dependent publication. The existing canonical semantic validator remains authoritative. Older versions refuse unsupported window/explicit sky-exposure data instead of silently omitting it.

`prepareCampfire` is shared by manual ZIP export and API publication: same identity/revision, canonical contract, primary original-resolution PNG, initially closed door artwork, excluded visual grid/scale bar/lighting/ceiling overlay. API publication saves the local project first through the existing stable revision mechanism, then freezes its snapshot. JSON and actual decoded image are validated again by the service. Input byte/dimension/pixel/grid/light limits and the entire encoded multipart body use discovery; Campfire owns managed output/thumbnail normalization and final resource validation.

Multipart has exactly two files: `contract` (application/json) and `image` (matching MIME). There is no API ZIP/asset/archive transfer. Safe retry metadata is recorded before network upload: unchanged bytes can reuse a key after uncertain delivery; changed content, explicit replacement and expired/cancelled plans get new keys. Revision conflicts never change map identity.

READY_FOR_REVIEW explicitly means **not imported**. Only an interactive Campaign-DM in Campfire can confirm. Status checks return safe receipt metadata for READY_FOR_REVIEW, CONFIRMED, EXPIRED and CANCELLED. Credential/scope failures clear the in-memory credential and mark the connection for attention; no automatic retry loop is used. Known machine errors map to Dutch messages without relaying private remote text.

## Validation

- **42 client tests passed**: canonical contract/identity and manual/API parity, selected versions and refusal of data loss, window lights, ceiling semantics, connection/password handling, actual publishing-dialog action and pending/confirmed messaging.
- **25 service tests passed**: existing revision/SQLite identity regression plus 24 publishing tests. Tests use real network HTTP and parsed multipart bytes against an isolated mock Campfire, exact JSON/image equality, schema/hash/version selection, byte/grid/image/light limits, image decoding/MIME/dimensions, idempotency (including lost response), status lifecycle, mandatory error cases, credential invalidation and secret-free persistence.
- One service integration check exercises local Fastify routes to that network server, including foreign-origin rejection, safe connection responses and absence of a confirm route. Nonempty v3 ceiling/window/door/light data survives the actual multipart transport unchanged.
- Typecheck and targeted ESLint passed. Full production build passed, including client/service builds, canonical read-only provenance check and font resource verification. Existing Vite chunk-size/dynamic-import advisory warnings remain.
- Diff check passed. No broad suite, Windows build or production browser session was run.

QA uses temporary disposable SQLite directories, generated test PNGs, fake high-entropy credentials, and an OS-assigned loopback mock port. The Fastify route test uses injection with a nonstandard QA Host port; it does not bind a listener. No normal Mapweaver Dev instance, user database or live Campfire credential was used.

## Limits and handoff

A real Campfire DM-review/confirmation smoke and deployed HTTPS reverse proxy were **not tested**: no isolated Campfire runtime/test identity/credential was provisioned for this task. Network transport and UI behavior are tested against the mock; actual server-side review/confirmation remain Campfire-owned. Service-memory-only credentials intentionally require re-entry after restart. Exact schema parity requires updating supported canonical artifacts when Campfire changes them. Resource guards include existing local decode/transfer safety ceilings; oversized local inputs are rejected even if a future server advertises larger limits.

Dutch user guide: `docs/campfire-api-publishing.md`. Architecture: `docs/adr/0062-campfire-api-publishing.md`. README links the new action. Main code: service client/routes, publishing state/messages, publishing dialog/tests, shared package preparation and version-aware existing serializer/tests. No project format/schema migration, dependency addition, artwork change or canonical contract edit.

The sprint ends in exactly one local commit: `Sprint: Campfire API Client and Map Publishing`. No credentials/user data are committed or reset. Nothing is pushed, deployed or published externally.

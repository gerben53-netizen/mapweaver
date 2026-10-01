# Campfire Map Contract v1 export — 2026-10-01

Implemented stable project UUID as mapId, persisted monotonic export revision, native wall/opening IDs and UUID point-light authoring with ambient settings and a separate editor preview. The pure serializer uses original image-pixel coordinates and canonical public types/validators; file transport builds a complete ZIP with map.json and map.png through the existing renderer. The image excludes semantic illumination, includes physical artwork/shadows, and uses closed default door artwork.

The exact mapping, mutation dependencies, derived line IDs, format-12 optional fields, immutable provenance and API boundary are documented in docs/campfire-export.md and ADR-0052. AGENTS.md already contains the immutable rule and was not changed.

Validation:

- 41 frontend tests passed across contract serialization/package, lighting UI, existing history, native project archives, open wall drawing and PNG export.
- 2 service tests passed: Campfire identity/revision/light persistence in SQLite and the existing independent open/closed generated-wall archive/reopen regression.
- TypeScript, scoped ESLint, production client/service build and font resource checks passed. Existing large-chunk and ineffective-dynamic-import warnings remain.
- Real isolated Chrome workflow: reopen an existing native map, configure ambient/radius/intensity/color, duplicate/delete a light, drag its preview handle, save/reopen and export using the actual UI. Map/wall/door/light IDs and export revision survive; duplicate light ID differs. The actual map duplicate endpoint creates a new mapId and revision 1. Downloaded ZIP has the expected two files and validates with the canonical shape/semantic validator. Its 800×600 PNG is byte-identical to the existing unlit renderer output. Export does not change revision. No page errors.
- Screenshot, ZIP, extracted contract JSON/PNG and browser results: deliverables.local/Campfire-Contract-Export/.
- Full canonical package file inventory and SHA-256 matched the initial snapshot. No Campfire file was written, formatted or generated.

V1 constraints are enforced rather than silently approximating a different protocol: hex grid and visible grid-origin offsets need owner-approved canonical support; scale must be explicitly configured; oversized geometry, duplicate IDs and resource bounds block export. Curves use the existing 0.25-pixel adaptive line subdivision and count toward 80 wall lines. Windows/passages are transparent gaps rather than interactive doors. No API client, credentials, runtime state, Windows package or unrelated suite was introduced.

Git: commit only the files used by this sprint on develop. Existing unrelated untracked files stay untouched. No remote is configured, so no push can be performed.

# Canonical PQA integration fixture

`eldric-bibliotheek-mapweaver-assets.zip` is the byte-identical validated five-component production pack used by `service/eldricPqa.test.ts`. It is deliberately tracked: category mapping, quality/provenance metadata, world-scale defaults, real image payload preservation, duplicate identity and library transfer are tested together. No test assertions were relaxed.

This is an asset-pack fixture, not a user database or campaign. Its historical replacement UUIDs are asset provenance. The local deliverable remains preserved separately; tests must not depend on `deliverables.local`.

# Asset and terrain texture authoring kit

Subsequent implementation: [Premium Terrain](../premium-terrain.md) adds a bundled image-backed brush library. The custom brush-pack import limitation recorded in this report remains; the ordinary fill-pattern authoring contract is unchanged.

Delivered 26 September 2026. Scope: document the actual import contract, provide complete human-editable examples and expose existing validation without introducing another package format. Acceptance: authorable stamp/fill/generator packs, exact fields/limits/versioning, real examples, safe local validator, drift tests and explicit unsupported-capability boundaries.

## Delivered

- [Authoring kit](../asset-authoring/README.md): package format, stamps, fills, terrain surfaces/brush boundaries, generator taxonomy/fallback, image preparation, provenance/licensing, validation, troubleshooting and audit discrepancies.
- Four complete template folders, with images, manifests, README and license: minimal stamp, fill pattern, terrain Area fill, and two-symbol generator-ready world pack.
- Five ready-to-import example ZIPs, including an unchanged real Painterly entry; four match template contents exactly.
- `npm run validate-asset-pack -- path/to/pack.zip`: current preview plus transactional review in a disposable isolated library; JSON results and exit codes. No active library mutation, service startup, external actions or new dependencies.
- Maintainer builder and runtime tests. Existing README and library guide link to the kit; stale prefab-future wording corrected.

No runtime schema, stored data, map rendering, UI or generator behavior changed. Current files were preserved; repository inspection found no CODEX.md. Current branch has untracked source rather than a commit baseline, so no reset or broad cleanup was performed.

## Verified

- `npm run test:service -- service/assetAuthoring.test.ts`: **23 passed**. Covers all four templates, five ZIPs, decoded images/hashes, exact ZIP/template consistency, deduplicating repeat import, metadata/membership preservation across export/re-import, invalid paths/references/versions/map types/sizes/checksums/generator scale/semantics, duplicate ZIP/file roles, fallback behavior, vocabulary/field documentation and inline size examples. CLI success, invalid-pack and usage exit codes are exercised.
- `npx tsc -p tsconfig.service.json`: passed.
- Targeted ESLint on the validator, builder and tests: passed.
- Manual CLI invocation on the generator-ready ZIP: valid, two 640 × 480 images, no warnings/errors.
- All local links in the 16 authoring Markdown files resolve. Five example ZIPs are present; complete kit is approximately 540 kB.

The first test pass exposed a test-query mistake (default library query lists stamps, not fill patterns); the test now requests the correct role. Lint found unsafe direct throws in cleanup finally blocks; guarded cleanup functions retain path verification without those constructs. Final checks above pass.

Not run: full unrelated suite, browser/UI session, production application build, Windows packaging or installer checks. This change adds documentation and isolated validation tooling; actual image decoding and import/export are exercised through the service. Human aesthetic review and a destination library's existing metadata conflicts remain author responsibilities.

## Discrepancies and limits

See [audit findings](../asset-authoring/discrepancies.md). Most consequential: **custom Terrain Brush images/presets cannot currently be packaged**. The tool uses built-in procedural styles. The requested brush-pack acceptance criterion therefore remains unsupported by the product; the terrain example is honestly labeled Area fill only. Implementing that missing capability would require a separate feature sprint, contrary to this task's instruction to document current behavior.

Other documented boundaries: JSON Schema alone cannot validate image bytes/semantic relationships; a nested manifest can silently trigger image-only import; arbitrary notices are not retained on export; world scatter is stricter than the shared fallback query. Tiny surface fixtures are instructional, not premium texture art.

No push, merge, release, deployment, upload, cloud modification, Windows executable or Windows ZIP was performed/created.

Quickstart for authors: copy a template, replace artwork/metadata, update or omit hashes, ZIP folder contents, validate, preview/review/import, inspect scale and appearance, then export/re-import in a test library before distribution.

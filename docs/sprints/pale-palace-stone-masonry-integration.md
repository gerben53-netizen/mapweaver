# Pale / Palace Stone masonry production integration

3 October 2026. Status: **PASS WITH NOTE**. Native Mapweaver rendering accepted; pale limestone has restrained contrast and joins become subtle at 50–75% zoom, especially on similarly pale backgrounds. This is not an enlargement of physical stones or a full application-wide Premium certification.

## Contract and registration

Source: Premium-Pale-Palace-Stone-Production-Artwork.zip. Existing Masonry-Wall-Production-Spec is authoritative. Only artwork/ contains production inputs; artist-side proofs and context props were not registered. Six PNGs were copied byte-identical, with no crop, rescale, relight, sharpen or recolor. SHA-256 matches every supplied value. 8-bit RGBA readable; opaque interiors exceed 85% of each full canvas, transparent pixels have RGB zero, antialiasing stays at silhouette and all nontransparent pixels lie inside safeBounds. +X horizontal; whole-canvas center anchor; arbitrary rotation. Detailed measured bounds/hashes in docs/wall-sets/pale-palace-stone-production-provenance.json (right/bottom inclusive, equivalent to supplier's exclusive bounds).

| IDs / filenames (.png) | Role | Pixels | Nominal ft | Weight each |
| --- | --- | --- | --- | --- |
| block-large-1, block-large-2 | block-large | 384 × 128 | 1.5 × 0.5 | 1 |
| block-medium-1, block-medium-2 | block-medium | 256 × 128 | 1 × 0.5 | 1 |
| block-small-1, block-small-2 | block-small | 128 × 128 | 0.5 × 0.5 | 1 |

One immutable material: **pale-palace-stone@production-1**, displayed as **Bleke paleissteen**. Shared generatorType masonry, standard width 1 ft, Regularity .9, Variation .2; native initial deterministic seed 1, QA seed 17. Root organic/growth/overgrowth remain reserved zero fields. Width presets .5/1/2/3 ft unchanged. All controls remain editable. DEV Rough/Dressed and old Living Root fixtures remain registered and resolvable, hidden from new normal choices in every build; the exact saved DEV choice remains visible when editing it.

No masonry placement, renderer, opening geometry, project format, identity or Campfire export implementation changed. Current v2 contract baseline verifies. Future Marble/Rough use the same six roles, canvases, physical footprints and data registration; no material-name branch. Existing DEV and production placements match exactly after stripping image URLs at equal settings.

## Actual in-engine benchmark

Reused the existing editable deliverables.local/Masonry-Generated-Walls/masonry-benchmark.mapweaver, preserving its native object IDs, path geometry, widths, independent T/crossing arrangement and two passages. Changed only generated material/revision/defaults/seed on the isolated proof copy. Output under deliverables.local/Pale-Palace-Stone-Masonry-Integration/:

- masonry-benchmark.mapweaver: 400 × 300 map px / 40 × 30 ft, 11 native walls, two passages, no Areas or decorative stone stamps.
- benchmark-editor.png, closed-wall-editor.png: actual editor and real open/closed wall-tool interaction.
- editor-100-percent.png, editor-75-percent.png, editor-50-percent.png: actual camera zooms 1/.75/.5, no physical resizing.
- benchmark-1x.png (400 × 300), benchmark-2x.png (800 × 600): shared final-quality native export.
- curve-closeup.png, corner-closeup.png, opening-end-closeup.png, heavy-massive-closeup.png: pixel crops of the actual 2× export; no replacement compositing.
- gently-varied-2x.png: actual native walls at 75% Regularity / 35% Variation, restored before history/save checks.
- map-edge-clipping.png: actual 100 × 80 map-bound export; raw pixels checked identical to cropping the same 400 × 300 native export, proving no paint beyond the resized bounds.
- context-editor.png / context.mapweaver: actual editor fit scene and editable archive with embedded existing assets.
- browser-results.json: final successful isolated browser assertions, no page errors.
- straight-masonry-reference.png: native high-resolution longer straight-wall reference for repetition.
- component-reference.png: unchanged source PNG contact/technical reference, not the in-engine proof.
- component-preflight.json: exact input metrics/hashes.
- before-reload.png and after-reload.png: byte-identical native exports.
- context-1x.png / context-2x.png: existing Premium natural wood floor at 200/1254 pattern scale, three accepted Eldric PQA props (writing desk, reading chair, palace plant), ordinary closed production masonry wall. Props use existing Stamp Soft Shadow, not baked shadows. No new artwork.

| Geometry | Assessment |
| --- | --- |
| Long straight / gently irregular settings | Constructed dressed stone rhythm; expected repeated block vocabulary, no dominant repeated chip/vein motif or source canvas plates |
| Broad curve / S curve | Native tangent-following rows; no grotesque stretch or conspicuous broken/gapped courses in demonstrated radii |
| 90-degree corner | Existing square filler repacking; convincing regular turn without dedicated corner art |
| Free ends / two passage jambs | Intentional short fillers and clean opening-only clipping; no floating blocks or stones spanning passages |
| Independent T / crossing | Normal overlap preserved, no graph/fusion or shared coursing claim |
| Thin / Standard / Heavy / Massive | 1/2/4/6 half-foot courses; source stones not stretched into one wide band |

Repetition is most detectable as ordinary coursing on long/wide walls; six muted variants have no conspicuous short-cycle mineral motif in these proofs. 1× native scale is 10 px/ft, so fine pores/chips vanish normally. At 100% the restrained seams remain visible; at 75/50% the coherent pale silhouette, curve and aperture survive while individual joints fade. Do not enlarge nominal footprints to compensate. Context has good pale-wall versus warm-wood separation; similar pale floors have lower contrast.

There is currently **no separate generated-wall contact-shadow pass** in paintWall/paintGeneratedWall; Stamp Soft Shadow is stamp-specific. Preserve that architecture. No new wall shadow or baked PNG shadow added. Source transparency/coverage produces subtle joins, not painted mortar/floor. Tight reversing/acute corners and very large widths remain outside this practical benchmark; short fillers may source-crop at residual ends and opening clipping is intentional. Final surface sampling is up to two samples/map pixel under existing budgets; draft sampling remains .5. Actual PNG export uses final mode, with no missing blocks/halo observed.

## Interaction, persistence and validation

Actual selector and pointer clicks verify Enter/double-click open completion and clicking start closure. Properties Randomize commits seed; real Ctrl+Z/Ctrl+Y restores exact native objects. Autosave/reload retains IDs, production reference, seed and controls and gives byte-identical PNG; portable .mapweaver encode/decode retains exact objects. Additional native history transactions cover nodes, curve handles, width, Regularity, Variation and opening placement/removal through undo/redo. SQLite close/reopen and ZIP transfer tests cover production stone, Living Root and both DEV masonry definitions.

- 74 targeted client tests in nine files: pass (masonryWalls, generatedWalls, walls, openings, continuousWallMaterial, wallMaterials, GeneratedWallFields, contract, windowLights).
- Seven focused service generatedWalls tests: pass, including production byte hashes/dimensions/alpha and SQLite reopen/transfer.
- npm run typecheck: pass.
- Targeted ESLint on changed TS/TSX files including service tests: pass.
- npm run build: pass, including canonical read-only contract fingerprint guard, client TypeScript/Vite, service TypeScript/Vite and font-license checks. Existing dynamic import/chunk-size warnings only.
- Diff whitespace check: pass.
- Isolated browser acceptance: pass; real selector/pointer/history, exact save/reload PNG/archive, context render and explicit map-edge clipping. Proof-camera percentages checked; earlier QA-only nested-history and fit-pointer harness issues were corrected without changing application code.
- No full unrelated suite, Windows installer/executable build, remote push or other external action.

Default-content inventory now declares the production material, retains DEV compatibility resources and includes provenance/license for future installer attribution. Existing generated-walls public-directory allowlist and Vite copy include all six production PNGs; build output contains byte-identical copies. Supplier permits incorporation, modification, distribution in Mapweaver and exported maps, with no extra attribution/restrictions; AI artwork carries no exclusive-rights guarantee.

Primary user data/maps are untouched. Own browser services used new ignored datasets and nonstandard ports after checking existing 5176 instance; existing instance remained untouched. Campfire directory, current serializer, Living Root artwork and DEV assets unchanged. No schema migration, no user-library import, no reset. Tracked changes: new pack/six PNGs/provenance, shared data registration, normal picker fixture filtering, default inventory, focused tests and this report. Exactly one local commit requested: Sprint: Integrate Pale Palace Stone Masonry, branch develop; proofs and databases excluded from Git.

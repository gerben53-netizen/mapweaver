# Gezongen hout: production integration assessment

Date: 2026-10-04. Branch: develop. **Production status: FAIL ARTWORK.**

Five supplied components are technically integrated as `sung-wood@production-1`, name **Gezongen hout**, through the existing overlapping bundle (`generatorType: living-root`). This technical strategy name does not imply Living Root visual styling. The supplied revision is reference-only: it resolves saved benchmark walls but is not offered for new normal authoring. Production promotion and the all-pass sprint Definition of Done are **not achieved**.

## Acceptance boundary and source

Acceptance requires exact component metadata/pixels, native editable walls, correct coverage/openings, persistence/history/export, and convincing grown-wood appearance on curves, hard corners and every physical width at play zoom. Technical validity alone is insufficient for production approval.

Source: user-supplied `Premium-Sung-Wood-Generated-Wall-Component-Pack.zip`. Only its five artwork PNGs are registered; supplier proofs remain local QA evidence. No image was generated, cropped, repainted, rescaled or alpha-modified. SHA-256 and all authoring metadata are pinned in `sung-wood-production-provenance.json`.

The production specification was an existing **ignored local handoff**, not a tracked repository file. Its JSON hash matches the supplier's authoritative specification hash. Both specification JSON and handoff ZIP hashes are preserved in provenance; no component values were guessed. Supplier generation notes are provenance, not application instructions or a guarantee of exclusive rights.

## Component preflight

| Exact component ID | Bundle role | Canvas px | Nominal feet | Nonzero alpha bounds (exclusive right/bottom) |
| --- | --- | --- | --- | --- |
| grown-body-long-1 | root-long | 480 × 160 | 3 × 1 | 15,50–465,108 |
| grown-body-medium-1 | root-medium | 320 × 160 | 2 × 1 | 8,51–312,108 |
| grown-body-small-1 | root-small | 160 × 160 | 1 × 1 | 9,46–151,114 |
| grown-join-1 | knot | 160 × 160 | 1 × 1 | 19,44–141,118 |
| grown-end-1 | root-end | 320 × 160 | 2 × 1 | 15,53–305,112 |

All five pass: RGBA 8-bit/sRGB decoding, exact dimensions, weight 1, centered anchors, +X authoring, whole-canvas scale 160 px/ft, specified safe bounds, opaque continuity cores, zero RGB under fully transparent pixels, and byte-identical source hashes. Scaling and rotation remain the existing world-space bundle behavior; alpha bounds never determine physical size. No moss/leaves or additional roles were invented.

Defaults remain width **1 ft**, Organic **0.08**, Growth **0**, Overgrowth **0**. Living Root and all Timber packs/defaults are unchanged.

## Actual rendering assessment

The real Mapweaver renderer produced a 19-wall benchmark with three manual openings and no covering Areas/stamps, at 30 map px/ft. Widths: 0.5, 1, 2 and 3 ft. Native open chamber/corridor paths remain independent. The Eryndorian context uses an existing Premium pale-stone floor and three existing accepted PQA props with native soft shadows, positioned without hiding wall defects.

| Check | Result |
| --- | --- |
| Long straight / broad curve | Functional coverage passes; restrained grown grain is distinguishable from manufactured Timber. |
| Tight / S curve | Functional coverage passes; stepped/scalloped silhouette remains visible at inspection scale and needs further quality work. |
| 90-degree hard corner | **Fails production appearance:** crossing/protruding straight bodies and oval knot produce a conspicuous plus/star-like join rather than a continuous grown corner. Visible in actual context. |
| Endpoints / Heavy and Massive | **Fails production appearance:** especially 3 ft, separate parallel finger-like ends reveal bundle runs. Width is not reduced to hide this. |
| Manual doors / passages | Native cuts remain open; raster checks find no blocked passage. |
| Overlap seams / repetition | No transparent center-band gaps; repeated short-body overlaps and layered silhouettes remain apparent in detailed proofs. A coverage pass is not a seamless-artwork claim. |
| Living Root comparison | Existing production remains unchanged and functionally green; its wild/root-heavy appearance differs from supplied restrained wood. |
| Refined Timber comparison | Existing production remains unchanged and functionally green; manufactured beam appearance differs from supplied grain. |
| Play zoom 100 / 75 / 50 percent | Actual editor proofs exist. Reduced zoom softens grain/repetition, but does not establish production approval for failed corners and Massive endpoints. |
| PNG 1× / 2× | Successful actual renderer exports, including context and comparisons. |

Classification is FAIL ARTWORK: exact supplied artwork with existing bundle placement does not meet the requested visual acceptance. No generic geometry, coverage, deterministic-state or persistence defect was demonstrated. This does **not** prove that artwork-only revision can solve every issue. A follow-up must explicitly choose compatible component artwork/coverage or an independently scoped bundle-placement improvement. This sprint does not redesign the engine, retune other materials or paint over joins.

## Functional validation and limits

Eight isolated browser checks passed with zero page errors: native wall/opening invariants, real zoom/export comparisons, raster coverage, seed/history, SQLite save/reopen, completed-edit autosave/reopen, portable archive roundtrip and context rendering. For each export scale, 8,223 center/inner-band samples had zero missing coverage; passage samples had zero blocked pixels. Randomize undo/redo restores exact state. Save/reload preserves IDs, recipes and openings.

Curve preview was rendered through the real renderer; deterministic geometry, width/control variation and opening placement were checked in focused domain tests. These are not a claim that every physical mouse/keyboard editing gesture was manually exercised. The benchmark uses isolated disposable SQLite data; no user project/library was modified.

Measured on this machine: initial benchmark rendering 161.5 ms, cached redraw about 0.37 ms, curve previews 14.3–16.2 ms, PNG exports about 120 ms / 310 ms (1× / 2×). These observations are not general performance guarantees.

Validation:

- 122 focused Vitest tests passed across production metadata/geometry, Sung Wood development behavior, Generated Walls, masonry, rock, linear, wall/opening behavior, Generated Wall controls, Campfire export and window lights.
- 28 focused service Generated Wall tests passed, including all five source hashes/alpha constraints and saved recipe resolution.
- ESLint on changed TypeScript/test files passed; TypeScript check passed; complete production client/service build passed.
- Canonical Campfire contract provenance check passed against the read-only source. Contract files were not changed or regenerated.
- Build emitted existing chunk-size/dynamic-import advisory warnings; no build failure. No full test suite, Windows packaging or external action was performed.

## Distribution and evidence

The distribution inventory records supplied bytes as **reference compatibility content only** and adds attribution/provenance. Approved built-in production content and library revision are unchanged. The optional catalog visibility metadata controls authoring availability, not rendering or serialized wall recipes; existing saved reference walls can still resolve. No installer/executable was built.

Ignored local evidence: `deliverables.local/Sung-Wood-Integration/` contains `browser-results.json`, preflight evidence, `sung-wood-benchmark.mapweaver`, actual benchmark/context PNG 1×/2×, editor zoom screenshots, and detailed crops (`hard-corner.png`, `heavy-massive.png`, `overlap-seams.png`, curves/comparisons). The benchmark requires this reference component revision; it is not a newly approved default material.

Tracked changes: five original PNGs and their reference README; `src/domain/sungWoodProductionPack.json`; registry/visibility helper in `generatedWalls.ts`; `WallFields.tsx` reference labeling; production provenance and this report; distribution compatibility/attribution inventory; focused domain, service and Campfire regression tests. Bundle geometry and rendering implementations, other material artwork, Campfire contract, user data and Windows packages remain unchanged.

Exactly one local commit is required: `Sprint: Integrate Sung Wood`. No push.

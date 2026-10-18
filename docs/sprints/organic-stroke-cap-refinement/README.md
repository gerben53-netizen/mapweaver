# Organic Stroke Cap Refinement

Acceptance recorded before implementation, 2026-10-18. Existing branch `codex/elyra-v3-geographic-accuracy`, baseline `95db985`. Preserve earlier audits and the unrelated untracked ZIP. No Primary Development/Campfire changes, merge, push or package.

One targeted iteration: arc-distance cap influence over .6 brush diameter, longitudinal scale .45→1 via smoothstep, short-gesture strength smoothstep(length / .12 diameter). Preserve transverse width, individual organic profile and every footprint outside the cap zones; standalone dab unchanged. Local tangent supplies the axis, with symmetric start/end influence. No new samples, boolean engine, renderer, preset or file format.

Evaluate valid deterministic Add/Remove for Soft/Rugged/Fine, short/click, straight/curved/sharp/repeated paths, directions, bounds, narrow links, history and archives. Repeat five controlled Northreach trials with actual UI exports and storage/export parity, Round byte-identity, normal-scale and detail visual assessment. Measure before/after geometry and native export costs. Run relevant tests, typecheck, lint, full build and contract verification. Finish with GO/ADJUST/REJECT; no second correction iteration if visual acceptance fails. Separate code and report commits per explicit sprint protocol.

## Result — REJECT

**Reject this cap policy for production.** It makes the broad caps more compact, but exposes repeated small teeth at short-stroke cap transitions. These are visible at normal map scale. Technical validity is not visual acceptance. The single permitted correction iteration is complete; no second tuning pass or continuous-envelope implementation follows.

[Implementation](implementation-report.md) · [Architecture](architecture-decisions.md) · [Tests](test-results.md) · [Visual assessment](visual-quality-assessment.md) · [Measurements](performance-results.json) · [Visual overview](index.html).

Five before/after native comparisons: [Round](comparison/round-before-after.png), [Soft](comparison/soft-before-after.png), [Rugged](comparison/rugged-before-after.png), [Fine](comparison/fine-before-after.png), [Combined](comparison/combined-before-after.png). [Contact sheet](comparison/contact-sheet.png) uses equal 400×430 map-pixel crops, previous refinement above and this cap iteration below.

`native-exports/` contains the five actual UI PNG downloads and separate function-render parity witnesses. Five editable archives are in `projects/`. `screenshots/` shows the actual editor at 95% zoom. Required `details/` plots show actual computed geometry before/after and are explicitly labelled **diagnostic**, not native exports.

**115 tests passed in 15 suites**, plus 8 store tests rerun after strengthening cap-aware Remove history/archive coverage. Typecheck, lint, full client/service build, font checks and Campfire provenance check pass. All five UI downloads match archive/database reload renders; the Round PNG is byte-identical to the previous baseline. A separate actual Rugged pointer gesture supports undo/redo and final restored native PNG equality.

## Runtime and reproduction

The existing QA service at 49571 retains dataKey `1a47f496f096b09fd18a16c1e28cba66347bebd6ec41242cd0d5bce7c9e0ed4f`, profile QA, `.qa.local/land-precision/data`. Frontend 49616 uses the existing accepted QA origin 49572 through its proxy. Primary Development was neither started nor modified. Existing QA maps and prior evidence remain intact; this sprint imports five separate QA maps.

`node docs/sprints/organic-stroke-cap-refinement/reproduction/build.mjs` regenerates fixtures from the unchanged V3 archive and baseline source read from Git `95db985`. It overwrites this sprint's fixture archives/metrics, so run before final UI evidence, not casually over it. Baseline code is materialized only under ignored `.qa.local/organic-cap/`; organic profile source is asserted unchanged from that commit.

Start the frontend only against that QA service: `npx vite --config docs/sprints/organic-stroke-cap-refinement/reproduction/vite.config.mjs`. Load each variant, run archive/export parity, and download through the real Export PNG dialog to `native-exports/<variant>.png`. After the separate UI undo/redo check, save the restored Combined UI download as `combined-restored.png`. Then `node docs/sprints/organic-stroke-cap-refinement/reproduction/compare.mjs` verifies all hashes and generates crop-only sheets and pixel counts. No external rendering substitutes for these native exports.

No merge, push, Windows package, Campfire or Primary change. Prototype code is retained on the existing local branch solely as the reviewed, rejected experiment; it is not a production promotion.

Code commit: `e6d4d91` (`Sprint: Organic stroke cap prototype`). Test commit: `67259d2` (`Sprint: Organic stroke cap regression tests`). The separate evidence commit follows these in local history. All are retained for review; no production GO is implied.

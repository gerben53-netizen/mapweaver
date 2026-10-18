# Organic Land Brush prototype

Scope/acceptance before implementation, 18 October 2026: preserve Round and legacy shapes exactly; add three distinct deterministic Organic Soft/Rugged/Fine footprints using existing Land Add/Remove, validation and native Areas. Use path-distance sampling, stable spatial variation and one seed per gesture. No new boolean engine, project format or landmark semantics.

Reuse codex/elyra-v3-geographic-accuracy at 645fb9a. Keep all previous audits and the unrelated untracked audit ZIP. Separate local implementation and evidence commits per this sprint's explicit protocol. No merge/push/package, Campfire or Primary writes.

Acceptance: deterministic valid footprints across sizes/seeds; sampling-speed independence on the same polyline; overlapping strokes and narrow bridges remain valid; native history/archive/editability; faithful cursor/preview; five matched Northreach trials with real editor screenshots, UI PNG downloads, archives, comparable crops, measured geometry/export costs and a critical GO/ADJUST/REJECT assessment. Complete targeted tests, typecheck, lint, full build and contract check. Visual acceptance is separate from test success.

## Result

**ADJUST.** Technical checks pass; Rugged has modest visual benefit, but round terminal lobes have not disappeared. Prototype results are complete for review; definitive production acceptance and merge remain withheld. See [visual assessment](visual-quality-assessment.md), [implementation report](implementation-report.md), [architecture](architecture-decisions.md), [tests](test-results.md) and [measurements](performance-results.json).

Open [the evidence overview](index.html). Full native UI exports: [Round](comparison/round.png), [Soft](comparison/organic-soft.png), [Rugged](comparison/organic-rugged.png), [Fine](comparison/organic-fine.png), [Combined](comparison/combined.png). [Contact sheet](comparison/contact-sheet.png) uses identical unscaled crops, not repainted maps. The five corresponding `projects/*.mapweaver` files remain editable. `screenshots/` contains actual editor captures; `*-function.png` files are additional render-parity witnesses.

| Variant | Actions | Areas | Nodes (net added) | Geometry ms | Native render ms |
|---|---:|---:|---:|---:|---:|
| Round | 3 | 36 | 713 (+39) | 65.55 | 77.8 |
| Soft | 3 | 36 | 696 (+22) | 36.88 | 43.8 |
| Rugged | 3 | 36 | 717 (+43) | 40.30 | 55.1 |
| Fine | 3 | 36 | 697 (+23) | 41.22 | 53.2 |
| Combined | 4 | 36 | 710 (+36) | 45.08 | 60.8 (repeat after UI undo/redo) |

Geometry: one cold ordered Node/Vite SSR run, not statistically comparable speed rankings. Native timing measures the native render function in the real browser; it excludes human dialog interaction. Drawing latency is not instrumented. All 16 controlled operations were valid, none rejected. All five actual UI PNG downloads are exact matches after archive and database reload.

## Reproduction and safety

`reproduction/build.mjs` rebuilds fixtures from the frozen V3 archive; it overwrites this sprint's fixture archives/metrics, so do not run it casually over finalized UI proof. `reproduction/vite.config.mjs` serves the actual App and restricts proof writes to this sprint folder. It requires the isolated QA backend at 49571; do not substitute Primary Development. Frontend: `npx vite --config docs/sprints/organic-land-brush-prototype/reproduction/vite.config.mjs`, port 49612. Use Load buttons, Archive / export parity, then actual Export PNG → Download PNG. Run `node docs/sprints/organic-land-brush-prototype/reproduction/compare.mjs` only after the five UI downloads are saved at the specified paths.

The equal-input fixtures are domain replays imported into the real editor, not five manually drawn gestures. Separate pointer/worker/undo/redo verification is recorded in the test report. Old audit `645fb9a`, existing V3 geometry, Campfire and Primary Development remain untouched. No merge, push or Windows package.

Implementation commit: `f13821a` (`Sprint: Organic land brush prototype`). Evidence is recorded in the immediately following separate local validation commit; see Git history for its immutable hash.

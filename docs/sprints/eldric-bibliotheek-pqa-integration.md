# Eldric & Openbare Bibliotheek — PQA integration

Completed 3 October 2026. Five supplied production PNGs were integrated through the existing manifest/import infrastructure, without changing artwork, renderer, shadow implementation, schema or taxonomy.

The full local report, manifest, stable native IDs, preflight, replacement mappings and proofs are in `deliverables.local/eldric-pqa-integration/sprint-report.md`. The portable import pack is `eldric-bibliotheek-mapweaver-assets.zip` in that directory. Source artwork is local user content and is not bundled into application builds.

Fidelity outcome: **PASS WITH GAPS**. The five new assets work at their required world footprints. Existing straight/curved library shelves have simpler repeated book-spine rendering, and the existing parquet floor does not represent a grown trunk floor. These existing resources remain unchanged.

Two native benchmark projects were added: **PQA benchmark — Eldrics werkkamer** (40 × 30 ft) and **PQA benchmark — Openbare Bibliotheek** (45 × 32 ft). Both use production Living Root, a passage and existing Stamp Soft Shadow. Save/reload produces identical PNG bytes; autosave and 1×/2× export were exercised. All existing asset metadata, image bytes, maps, references and categories were preserved with a backup before registration.

Five historical REPLACE entries are covered by three replacement concepts; two concepts fill missing roles. The old artwork remains REPLACE and resolvable. The current historical backlog has no independent resolved/covered state, so `replacement-coverage.json` records evidence and the required future relationship rather than introducing a new canonical status or relabelling rejected artwork as KEEP.

Validation: pack validator without warnings/errors, 49 scoped service/frontend tests, typecheck, scoped ESLint and production build. Editor proofs are captured only after image loading and checked against the intended project ID. Own QA instances use isolated data and nonstandard ports, and are closed afterward. No Windows package or external action.

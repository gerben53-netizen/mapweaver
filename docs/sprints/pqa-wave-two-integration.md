# PQA Premium Stamp Families — Wave 2

Integrated on 2026-10-04. Production status: **PASS WITH NOTE** for the
deliberately small scholarly/gift props; the other families pass production QA.

The supplied pack reused `pqa-reconciled-stamps@1`, already owned by Wave 1.
Wave 2 is an independent canonical pack, `pqa-premium-stamps-wave-02@1`.
Only the pack ID changed: all 22 family IDs, 69 variant IDs and accepted PNG bytes
remain intact. Source hashes, canvases and authoring direction are recorded in
`public/pqa-premium-stamps/provenance.json`.

The production importer validates the bundled pack before committing it. Normal
Primary Development startup adds missing production content through the existing
default-content mechanism. Receipts use each pack's own revision. Old receipts
for unchanged, fully present packs are adopted without rewriting asset metadata.
Wave 1 and legacy lifecycle classifications are preserved.

## Acceptance

- Real isolated import: 69 variants; exact re-import skips all 69. Duplicate
  family/variant and immutable metadata conflicts are rejected.
- Normal Primary Development: 22 Wave-2 cover cards alongside five Wave-1 cards,
  rather than 69 independent picker entries. All 43 existing category records
  remain unchanged; contextual words remain tags.
- All 22 families exercised automatic placement, explicit selection, another
  variant, one-step undo/redo, duplicate and copy/paste. Transform and Soft Shadow
  overrides remain intact. Concrete variants survive pan/zoom, save/reload,
  project reopen and native PNG 1×/2× export.
- Editable repetition benchmark: 264 automatic placements. Separate native
  catalog contains all 69 concrete variants; Premium context contains all 22
  families with existing wooden floor and marble walls.
- All 658 pre-existing asset rows and 23 project documents/revisions are unchanged.
  Opening the Primary editor updates only the opened-at timestamp of its current
  project; no authoring data changes. Original
  file hashes also match. Thirty legacy mapping references remain resolvable.

Visual proofs use native 1× renders plus 75%/50% viewing copies. Very small props
lose fine detail at play zoom: a one-foot object is only five pixels wide at 50%
and canonical 10 px/ft. This is not a change to its authored footprint.

## Validation and evidence

Focused importer/default-content/governance/family service tests, client
family/placement/archive/export tests, typecheck, targeted ESLint and full
client/service build. Full production-pack test fixtures have explicit 60-second
deadlines rather than the five-second unit-test default.

Detailed per-family decisions, source reconciliation, backup, importer results,
Primary picker screenshot, native editable archives and PNG proofs are ignored
local evidence in `deliverables.local/PQA-Wave-02-Integration/`.
QA uses its own data directory and ports; normal Primary Development stays
available through `npm run dev`. No installer, push, new artwork, existing-map
migration or Campfire-contract change is part of this sprint.

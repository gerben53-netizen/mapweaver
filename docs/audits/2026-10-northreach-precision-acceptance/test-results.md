# Checks and integration

## Integration

At audit start, develop and codex/land-precision-authoring both pointed to e7e25e0d32bf39c7039671ea5efb5cf58efd1734. The earlier explicitly authorized merge was a local fast-forward. No further merge was needed. This audit branch is codex/northreach-precision-acceptance from that exact develop head. The pre-existing untracked map-types ZIP was preserved. No remote push, Primary write or Campfire change.

The integrated sprint's complete build/typecheck/lint and both 88-test runs are recorded in ../../sprints/land-precision-authoring/test-results.md. All were green before integration. This audit reran the following checks on the integrated code:

- `npm run check:campfire-contract`: PASS, canonical read-only source and all pinned artifacts.
- Relevant Vitest: **88 passed / 0 failed / 0 non-loaded suites / 12 files, 13.18 seconds**, normal concurrency with process-local TEMP/TMP under ignored .qa.local/northreach-precision-acceptance/test-temp.
- `npm run build` and `npm run typecheck`: PASS. Full `npm run lint`: PASS after typing the new audit-only TSX harness (initial lint reported explicit any annotations and one unused ID; no product source/config changes). Build retains the existing chunk-size/dynamic-import warnings.
- Audit reproduction verifier: PASS, 3 local edits, exact protected/outside geometry, 35 unchanged other Areas, zero pairwise overlap, valid topology, Undo/Redo, Cancel equality, native archive validation and database/archive PNG parity.

Exact Vitest command:

```text
npx vitest run src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/app/ReferenceView.test.tsx src/app/LandBrushTools.test.tsx src/domain/landBrush.test.ts src/store/landBrushActions.test.ts src/domain/areas.test.ts src/projects/archive.test.ts src/canvas/viewport.test.ts src/imports/readImage.test.ts src/store/history.test.ts
```

The real UI was used for all geometry operations. Harness calls to native export, history, database and archive functions are explicitly distinguished from user-facing UI in README. Screenshots document original, preview and applied states. The loaded reference remains editor-only, and archive contains zero image assets; the map has no reference background or render substitute. Full export equals the last stage's PNG and both reopened renders byte-for-byte (SHA-256 a85158eaba13008ec0da0f33b6cb3624a83422a819a655380ac18ec7ea737120).

No broad full test suite, Playwright suite, Windows packaging, renderer changes or new geometry implementation. No uncommitted product files. All additions belong to this audit directory only. The original audit files are unchanged in Git.

The audit frontend intentionally disables file watching. After extending its proof controls, its cached module did not contain the new handler until the audit frontend alone was restarted. This was audit tooling behavior; the QA service and user datasets were not restarted.

All three accepted intermediate stages also pass an independent archive encode/decode → native-render check: exact objects and exact per-stage PNG hash. See stage-roundtrips.json and comparison/*-after.mapweaver. No intermediate database replacement was needed.

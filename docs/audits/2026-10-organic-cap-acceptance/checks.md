# Checks — 18 October 2026

| Check | Result |
|---|---|
| 30-case acceptance matrix | 29 operations complete; Rugged T05 unexpectedly rejected before and after |
| Raw masks retained | 27 synthetic before/after input+mask witnesses, including failed Rugged T05 |
| Actual UI PNG export | 8/8 atlas downloads verified; 6 historical Northreach originals replayed and reused |
| Archive/database roundtrip | 8/8 exact PNG and object parity |
| Round | Exact nine-case geometry; byte-identical before/after atlas PNG |
| Relevant Vitest regression suite | 115 passed, 0 failed, 0 unloaded suites; 15 suites; 24.96 s |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, including client, service, font checks and Campfire provenance check |
| Product/source diff | No changes to src, package.json or package-lock.json |
| Primary Development / Campfire | Unchanged; QA-only imports, canonical contract read-only |
| Independent artistic acceptance | Not performed; internal Codex assessment below 4/5 bar |
| Empirical CBR/CTC calibration | Not achieved; documented method limitations prohibit GO |

Build retains the pre-existing large-chunk and mixed static/dynamic-import warnings; they do not fail the build. No broad unrelated suite, new browser drawing gesture, restart of Primary Development, package creation, merge or push was performed.

Vitest command (TEMP/TMP set to the existing isolated `.qa.local/organic-brush/test-temp`):

```powershell
npx vitest run src/domain/organicStrokeCaps.test.ts src/domain/organicLandFootprint.test.ts src/domain/landBrush.test.ts src/canvas/LandBrushController.test.tsx src/store/landBrushActions.test.ts src/app/LandBrushTools.test.tsx src/domain/hexLandShape.test.ts src/domain/hexGrid.test.ts src/app/HexGridSettings.test.tsx src/canvas/landBrushClient.test.ts src/domain/landPrecision.test.ts src/store/landPrecision.test.ts src/app/LandPrecision.test.tsx src/projects/archive.test.ts src/store/history.test.ts
```

Measurement recipe:

```powershell
node docs/audits/2026-10-organic-cap-acceptance/reproduction/measure.mjs
```

Use a fresh output directory when repeating the recipe: it builds the initial atlas archives, while the committed archives are the subsequent UI-imported roundtrip snapshots. Open the supplied proof frontend, load each variant, run Archive / export parity, then use the real Export PNG → Download PNG. Only after all actual UI downloads are saved should `reproduction/finalize.mjs` be run. It asserts download hashes, archive/database parity and Round byte equality before producing crops and tables.

The passing unit/regression tests and valid atlas container do not erase the failed T05 case. Its mask is a diagnostic capture, not a successfully created native Area or UI-exported shape.

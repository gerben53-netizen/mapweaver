# Living Root production artwork integration

Completed 29 September 2026, using the user-supplied Premium-Living-Root-Production-Artwork.zip.

## Acceptance

Replace the active development artwork with the supplied 28 PNGs, preserve component IDs and functional metadata, rebuild the same Generated Wall benchmark and validate geometry, editing, storage and export. No unrelated renderer changes or Windows package.

## Changes

- Added `public/generated-walls/living-root-production-1/`: 28 exact, unmodified supplier PNGs.
- Added `src/domain/livingRootProductionPack.json`. Component IDs/order, roles, nominal dimensions, weights and defaults exactly match dev-1. Only revision and image paths differ.
- `src/domain/generatedWalls.ts` registers both immutable revisions and defaults new Living Root styles to production-1. Existing dev-1 maps retain their original imagery; no user data migration/reset.
- `src/app/WallFields.tsx` identifies the old selector option as Living Root (development). To update a selected existing development wall, select Living Root in Material / Generator; its native geometry remains independently editable.
- Extended domain/service tests, README, ADR-0051 and the authoring guide. Supplier provenance and hashes are recorded in `docs/wall-sets/living-root-production-provenance.json`.

The existing development source and fixture builder remain separate, so running the fixture builder cannot overwrite production art. No source pixels were cropped, rescaled, redrawn or recolored.

## Validation

- **28/28 assets:** exact expected filenames, canvas sizes (22 at 480×160 and six at 160×160), 8-bit alpha, opaque content, fully transparent two-pixel gutter. Source/public/build PNG SHA-256 hashes match. One revision uses 1,843,200 decoded pixels; both use 3,686,400, below the shared budget.
- **41 targeted tests passed:** `npx vitest run src/domain/generatedWalls.test.ts src/domain/walls.test.ts src/domain/openings.test.ts src/canvas/openWalls.test.tsx src/canvas/pathDrawing.test.tsx src/app/GeneratedWallFields.test.tsx`.
- **4 service tests passed:** `npm run test:service -- service/generatedWalls.test.ts service/openWalls.test.ts`. Covers SQLite reopen, ZIP transfer, production PNG dimensions/alpha and retained development images.
- New regression test proves identical component selection and layout between revisions, after excluding only image references. Separate cache keys isolate the revisions.
- Scoped ESLint passed for all changed TS/TSX files.
- `npm run build` passed, including TypeScript checks for client/service and font verification. Existing Vite large-chunk warning remains. No separate redundant typecheck run.
- Isolated Chrome benchmark passed: actual Wall Tool creation, Randomize and keyboard undo/redo, autosave/reload with byte-identical PNG, native project archive roundtrip, no page errors. Owned browser/service processes closed.
- The rebuilt 40×30-ft benchmark includes eight independent native Walls, two linked passages, straight/curved/corner/T arrangements, Heavy and Massive. Actual renderer matrix adds all four width presets across Clean/Natural/Ancient/Overgrown. Editor and PNG images were visually inspected.
- PNG 1×: 1400×1050; 2×: 2800×2100. All 6,720 sampled doorway pixels remain clear. 432 colored pixels beyond nominal thickness confirm visible protrusions. Mean channel difference between 1× and reduced 2×: 0.326/255.
- Measured on this workstation: initial eight-wall draw 30 ms, cached canvas redraw 0.11 ms, curved preview median 9.5 ms (range 8.3–38.2), PNG 1× 45.8 ms and 2× 162.6 ms. These timings exclude browser/driver image-transfer overhead and are not cross-device guarantees.

## Artifacts

`deliverables.local/Living-Root-Production/` contains:

- `benchmark-1x.png`, `benchmark-2x.png`, `benchmark-editor.png`, `normal-play-zoom.png`;
- `clean-root-reference.png`, `preset-width-matrix.png` (rows Clean/Natural/Ancient/Overgrown; columns Thin/Standard/Heavy/Massive);
- `before-reload.png`, `after-reload.png`, `living-root-benchmark.mapweaver`;
- `artwork-validation.json`, `browser-results.json`, `pixel-results.json` and retained supplier delivery notes/proofs.

The browser benchmark is `.qa.local/production-walls-browser.mjs`; pixel assertions are `.qa.local/production-walls-pixels.mjs`. Storage used a new isolated `.qa.local/production-walls-*` directory.

## Visual assessment and boundaries

The actual renderer now shows textured, distinct woody roots, natural branching and separate moss/leaves. Clean works without vegetation; the measured door gaps remain clear. Existing dense overlap produces a closely woven appearance, particularly in Heavy/Massive. This integration deliberately preserves the generator arrangement, width calibration and source footprints; it does not retune those behaviors or claim a separate external art-quality certification.

The supplier describes AI-generated art and no third-party stock. This is recorded provenance, not an independent legal or exclusivity assessment. No external actions, deployment, push, user data deletion or Windows executable/package creation occurred.

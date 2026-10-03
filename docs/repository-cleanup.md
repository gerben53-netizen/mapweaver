# Repository cleanup and local Git baseline

Existing Git root: `C:/Users/gerbe/Documents/ChatGPT/Mapweaver`. Branch: `develop`. Previous HEAD: `c73e67b`. No history rewrite, remote creation or push. The user explicitly authorized the current canonical codebase in one baseline.

## Root classification

A (tracked): src, service, scripts, tests, launcher, public, docs, root configuration/package files, AGENTS, README and license documentation. Public resources include two documented sample map documents, not user campaigns. Runtime packs, fonts, artwork and canonical fixtures remain tracked. The linked Campfire source is immutable; derived artifacts remain provenance-verified.

B (ignored): node_modules, .npm-cache, dist, dist-service, build metadata, coverage, test-results, playwright-report and generated logs. .git is existing Git metadata. The root .sprint13-large-result.local file is generated performance evidence.

C (ignored/preserved): local source artwork, database/map copies, campaign data, current deliverables and mixed QA workspaces. C is conservative: generated evidence mixed with data must not be deleted as a whole.

D: none. No deletion or directory move was performed. The actual user library remains untouched; no schema downgrade, reset or recreation.

## Every root .local directory

The detailed inventory is retained in `.repository-cleanup.local/inventory.json`, including filenames, extensions, counts and references. Run `node scripts/repository-audit.mjs` to refresh it.

### `.asset-explorer.local`

C — ignored/preserved; source or persistent evidence. .asset-explorer.local. Sprint/tool evidence workspace; see samples and references.

12 files; 436033 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/asset-explorer-package.mjs`.

Other references: `docs/sprints/asset-explorer-report.md`.

### `.asset-removal.local`

C — ignored/preserved; source or persistent evidence. .asset-removal.local. Sprint/tool evidence workspace; see samples and references.

22 files; 738212 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/asset-removal.mjs`.

Other references: `docs/sprints/asset-removal-recovery.md`.

### `.audit.local`

C — ignored/preserved; source or persistent evidence. .audit.local. Sprint/tool evidence workspace; see samples and references.

987 files; 1103711504 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `scripts/audit-fixtures.mjs`, `tests/e2e/additional.spec.mjs`, `tests/e2e/helpers.mjs`, `tests/e2e/imports.spec.mjs`, `tests/e2e/performance.spec.mjs`, `tests/e2e/release.spec.mjs`, `tests/e2e/smoke.spec.mjs`, `tests/persistence/acceptance.mjs`, `tests/persistence/sprint13.mjs`, `tests/persistence/sprint14.mjs`, `tests/persistence/sprint15.mjs`.

Other references: `docs/release/BASELINE.md`, `docs/release/FULL-AUDIT-REPORT.md`, `docs/release/RELEASE-READINESS.md`, `docs/release/TEST-REPORT.md`, `docs/release/UX-ACCESSIBILITY-AND-PERFORMANCE-REPORT.md`, `playwright.config.mjs`, `vite.config.ts`, `README.md`.

### `.campaign.local`

C — ignored/preserved; source or persistent evidence. .campaign.local. Sprint/tool evidence workspace; see samples and references.

29 files; 1812146 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/campaign-explorer.mjs`.

Other references: `docs/sprints/campaign-explorer-report.md`.

### `.cartography.local`

C — ignored/preserved; source or persistent evidence. .cartography.local. Sprint/tool evidence workspace; see samples and references.

33 files; 3422406 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/cartographic-elements.mjs`.

Other references: `docs/sprints/cartographic-elements-report.md`.

### `.font-tools.local`

B — ignored/preserved; generated evidence. .font-tools.local. Sprint/tool evidence workspace; see samples and references.

710 files; 17964954 bytes. Reproducibility: Creator not identified; retain conservatively. Unique source/user content: not proven unique; retained regardless.

Creator/script/test: not identified; retained conservatively.

Other references: none found.

### `.fonts.local`

B — ignored/preserved; generated evidence. .fonts.local. Sprint/tool evidence workspace; see samples and references.

7 files; 1713227 bytes. Reproducibility: Referenced harness/tool can regenerate evidence with documented prerequisites. Unique source/user content: not proven unique; retained regardless.

Creator/script/test: `tests/persistence/fonts.mjs`.

Other references: none found.

### `.map-context.local`

C — ignored/preserved; source or persistent evidence. .map-context.local. Sprint/tool evidence workspace; see samples and references.

12 files; 1009986 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/map-context-labels.mjs`.

Other references: none found.

### `.qa.local`

C — ignored/preserved; source or persistent evidence. .qa.local. Sprint/tool evidence workspace; see samples and references.

13475 files; 3259868883 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `scripts/build-bathymetry-benchmark.mjs`, `scripts/build-coastal-benchmark.mjs`, `scripts/build-water-depth-benchmark.mjs`, `scripts/package-painterly-assets.mjs`, `scripts/package-settlement-assets.mjs`, `scripts/package-terrain-textures.mjs`, `scripts/package-world-hierarchy.mjs`, `scripts/proof-eldric-editor.mjs`, `scripts/qa-asset-quality.mjs`, `scripts/qa-eldric-pqa.mjs`, `scripts/repository-audit.mjs`, `scripts/smoke-geography-package.mjs`, `scripts/validate-additional-terrain-benchmark.mjs`, `scripts/validate-additional-terrain-ui.mjs`, `scripts/validate-bathymetry.mjs`, `scripts/validate-cartography-personality.mjs`, `scripts/validate-coastal-contours.mjs`, `scripts/validate-geography-benchmark.mjs`, `scripts/validate-hex-grid.mjs`, `scripts/validate-hex-land.mjs`, `scripts/validate-hierarchy-benchmark.mjs`, `scripts/validate-library-navigation.mjs`, `scripts/validate-new-map-themes.mjs`, `scripts/validate-painterly-benchmark.mjs`, `scripts/validate-premium-terrain-ui.mjs`, `scripts/validate-settlement-benchmark.mjs`, `scripts/validate-settlement-interactions.mjs`, `scripts/validate-terrain-texture-benchmark.mjs`, `scripts/validate-tool-intent.mjs`, `scripts/validate-water-depth.mjs`, `tests/persistence/automatic-labels.mjs`, `tests/persistence/generator-assets.mjs`, `tests/persistence/land-brush.mjs`, `tests/persistence/map-effects.mjs`, `tests/persistence/pattern-world-scale.mjs`, `tests/persistence/river-styling.mjs`, `tests/persistence/terrain-paint.mjs`, `tests/persistence/terrain-rendering.mjs`, `tests/persistence/world-scatter.mjs`, `tests/persistence/world-stamp-sizing.mjs`, `tests/persistence/world-themes.mjs`.

Other references: `docs/release/TEST-REPORT.md`, `docs/sprints/area-material-interaction.md`, `docs/sprints/automatic-labels-report.md`, `docs/sprints/battlemap-texture-brush.md`, `docs/sprints/brush-base-surface.md`, `docs/sprints/generated-walls.md`, `docs/sprints/generator-scatter-report.md`, `docs/sprints/geography-terrain-finish.md`, `docs/sprints/illustrated-settlements.md`, `docs/sprints/land-water-brush-report.md`, `docs/sprints/library-navigation.md`, `docs/sprints/living-root-production-artwork.md`, `docs/sprints/map-effects-report.md`, `docs/sprints/open-wall-paths.md`, `docs/sprints/pattern-world-scale-ux.md`, `docs/sprints/premium-terrain-textures.md`, `docs/sprints/reference-atlas-validation.md`, `docs/sprints/river-styling-report.md`, `docs/sprints/room-generator.md`, `docs/sprints/room-wall-controls.md`, `docs/sprints/scatter-rotation-control.md`, `docs/sprints/scene-outliner.md`, `docs/sprints/semantic-world-assets-report.md`, `docs/sprints/sprint-09-png-release.md`, `docs/sprints/stamp-palette-direct-placement.md`, `docs/sprints/stamp-soft-shadow.md`, `docs/sprints/terrain-paint-report.md`, `docs/sprints/terrain-rendering-report.md`, `docs/sprints/toolbar-semantic-cleanup.md`, `docs/sprints/wall-materials-organic.md`, `docs/sprints/windows-package-20260926.md`, `docs/sprints/world-asset-hierarchy.md`, `docs/sprints/world-asset-quality.md`, `docs/sprints/world-stamp-sizing-investigation.md`, `docs/sprints/world-themes-report.md`, `public/world-assets-painterly/README.md`, `vite.config.ts`.

### `.repository-cleanup.local`

B — ignored/preserved; generated evidence. .repository-cleanup.local. Sprint/tool evidence workspace; see samples and references.

0 files; 0 bytes. Reproducibility: Referenced harness/tool can regenerate evidence with documented prerequisites. Unique source/user content: not proven unique; retained regardless.

Creator/script/test: `scripts/repository-audit.mjs`.

Other references: none found.

### `.smart-markers.local`

C — ignored/preserved; source or persistent evidence. .smart-markers.local. Sprint/tool evidence workspace; see samples and references.

28 files; 1481024 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/smart-markers.mjs`.

Other references: `docs/sprints/smart-markers-windows-report.md`.

### `.sprint12.local`

C — ignored/preserved; source or persistent evidence. .sprint12.local. Sprint/tool evidence workspace; see samples and references.

30 files; 2699556 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/acceptance.mjs`, `tests/persistence/migration-conflict.mjs`, `tests/persistence/outage.mjs`.

Other references: `docs/sprints/sprint-12-persistent-storage-migration-report.md`, `vite.config.ts`, `README.md`.

### `.sprint13-1.local`

C — ignored/preserved; source or persistent evidence. .sprint13-1.local. Sprint/tool evidence workspace; see samples and references.

42 files; 1416461 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/lifecycle-browser-open.mjs`, `tests/persistence/lifecycle-browser.mjs`, `tests/persistence/lifecycle.mjs`.

Other references: `docs/sprints/sprint-13-1-portable-lifecycle-controls-report.md`.

### `.sprint13.local`

C — ignored/preserved; source or persistent evidence. .sprint13.local. Sprint/tool evidence workspace; see samples and references.

106 files; 2541026 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/sprint13.mjs`.

Other references: none found.

### `.sprint14.local`

C — ignored/preserved; source or persistent evidence. .sprint14.local. Sprint/tool evidence workspace; see samples and references.

23 files; 3970630 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/area-render.mjs`, `tests/persistence/sprint14.mjs`.

Other references: `docs/sprints/sprint-14-freeform-areas-and-masks-report.md`, `README.md`.

### `.sprint15.local`

C — ignored/preserved; source or persistent evidence. .sprint15.local. Sprint/tool evidence workspace; see samples and references.

89 files; 11892891 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/path-browser-performance.mjs`, `tests/persistence/path-package-smoke.mjs`, `tests/persistence/path-performance.mjs`, `tests/persistence/sprint15.mjs`.

Other references: `docs/sprints/sprint-15-generic-path-engine-report.md`, `README.md`.

### `.sprint16.local`

C — ignored/preserved; source or persistent evidence. .sprint16.local. Sprint/tool evidence workspace; see samples and references.

61 files; 3156660 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/sprint16.mjs`.

Other references: `docs/sprints/sprint-16-advanced-object-and-layer-management-report.md`.

### `.sprint17-1.local`

C — ignored/preserved; source or persistent evidence. .sprint17-1.local. Sprint/tool evidence workspace; see samples and references.

118 files; 136784558 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/sprint17-1.mjs`, `tests/persistence/wall-material-package.mjs`, `tests/persistence/wall-material-render.mjs`.

Other references: `docs/sprints/sprint-17-1-wall-materials-and-stamp-sets-report.md`.

### `.sprint17.local`

C — ignored/preserved; source or persistent evidence. .sprint17.local. Sprint/tool evidence workspace; see samples and references.

65 files; 3819462 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/sprint17.mjs`.

Other references: `docs/sprints/sprint-17-wall-tool-report.md`.

### `.sprint18.local`

C — ignored/preserved; source or persistent evidence. .sprint18.local. Sprint/tool evidence workspace; see samples and references.

40 files; 1741625 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/opening-render.mjs`, `tests/persistence/sprint18.mjs`.

Other references: `docs/sprints/sprint-18-doors-windows-rooms-report.md`.

### `.sprint19.local`

C — ignored/preserved; source or persistent evidence. .sprint19.local. Sprint/tool evidence workspace; see samples and references.

70 files; 19471941 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/scatter-render.mjs`, `tests/persistence/sprint19.mjs`.

Other references: `docs/sprints/sprint-19-scatter-brush-report.md`.

### `.sprint20.local`

C — ignored/preserved; source or persistent evidence. .sprint20.local. Sprint/tool evidence workspace; see samples and references.

45 files; 4524013 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/geography-render.mjs`, `tests/persistence/sprint20.mjs`.

Other references: `docs/sprints/sprint-20-map-workspace-report.md`.

### `.sprint21.local`

C — ignored/preserved; source or persistent evidence. .sprint21.local. Sprint/tool evidence workspace; see samples and references.

42 files; 5854628 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/routes-render.mjs`, `tests/persistence/sprint21.mjs`.

Other references: `docs/sprints/sprint-21-rivers-roads-borders-report.md`.

### `.sprint22.local`

C — ignored/preserved; source or persistent evidence. .sprint22.local. Sprint/tool evidence workspace; see samples and references.

47 files; 9500223 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/annotations-render.mjs`, `tests/persistence/sprint22.mjs`.

Other references: `docs/sprints/sprint-22-places-symbols-labels-report.md`.

### `.sprint23.local`

C — ignored/preserved; source or persistent evidence. .sprint23.local. Sprint/tool evidence workspace; see samples and references.

8105 files; 56073376 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/library-package.mjs`, `tests/persistence/sprint23.mjs`.

Other references: `docs/sprints/sprint-23-advanced-asset-library-report.md`.

### `.sprint23b.local`

C — ignored/preserved; source or persistent evidence. .sprint23b.local. Sprint/tool evidence workspace; see samples and references.

359 files; 66420704 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/prefab-package.mjs`, `tests/persistence/sprint23b.mjs`.

Other references: `docs/sprints/sprint-23b-prefabs-and-reusable-compositions-report.md`.

### `.startup-ux.local`

C — ignored/preserved; source or persistent evidence. .startup-ux.local. Sprint/tool evidence workspace; see samples and references.

28 files; 1535049 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/startup-package.mjs`.

Other references: `docs/sprints/startup-projects-windows-report.md`.

### `.title-banners.local`

C — ignored/preserved; source or persistent evidence. .title-banners.local. Sprint/tool evidence workspace; see samples and references.

25 files; 1872250 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/title-banners.mjs`.

Other references: none found.

### `.ux-improvement.local`

C — ignored/preserved; source or persistent evidence. .ux-improvement.local. Sprint/tool evidence workspace; see samples and references.

36 files; 2096053 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/ux-improvement.mjs`.

Other references: `docs/sprints/ux-improvement-sprint-report.md`.

### `.ux-selection.local`

C — ignored/preserved; source or persistent evidence. .ux-selection.local. Sprint/tool evidence workspace; see samples and references.

51 files; 2719057 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/ux-selection.mjs`.

Other references: none found.

### `.visual-hierarchy.local`

C — ignored/preserved; source or persistent evidence. .visual-hierarchy.local. Sprint/tool evidence workspace; see samples and references.

66 files; 2839887 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/visual-hierarchy.mjs`.

Other references: none found.

### `.world-generation.local`

C — ignored/preserved; source or persistent evidence. .world-generation.local. Sprint/tool evidence workspace; see samples and references.

42 files; 4771316 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `tests/persistence/world-generation.mjs`.

Other references: none found.

### `asset-production.local`

C — ignored/preserved; source or persistent evidence. Original user sprite sheets/metadata plus extracted/build outputs.

555 files; 170059377 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `scripts/repository-audit.mjs`.

Other references: none found.

### `deliverables.local`

C — ignored/preserved; source or persistent evidence. Current delivered packs, maps, specifications and proofs.

970 files; 1124170256 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `scripts/additional-terrain-comparisons.mjs`, `scripts/bathymetry-comparisons.mjs`, `scripts/build-additional-terrain-benchmark.mjs`, `scripts/build-bathymetry-benchmark.mjs`, `scripts/build-coastal-benchmark.mjs`, `scripts/build-geography-benchmark.mjs`, `scripts/build-hierarchy-benchmark.mjs`, `scripts/build-settlement-benchmark.mjs`, `scripts/build-terrain-texture-benchmark.mjs`, `scripts/build-water-depth-benchmark.mjs`, `scripts/cartography-personality-comparisons.mjs`, `scripts/coastal-contour-comparisons.mjs`, `scripts/contact-asset-contexts.mjs`, `scripts/geography-comparison-crops.mjs`, `scripts/hierarchy-comparisons.mjs`, `scripts/plan-asset-quality-audit.mjs`, `scripts/prepare-eldric-pqa.mjs`, `scripts/proof-eldric-editor.mjs`, `scripts/qa-asset-quality.mjs`, `scripts/qa-eldric-pqa.mjs`, `scripts/register-eldric-pqa.ts`, `scripts/remap-painterly-benchmark.mjs`, `scripts/repository-audit.mjs`, `scripts/settlement-comparisons.mjs`, `scripts/smoke-geography-package.mjs`, `scripts/terrain-texture-comparisons.mjs`, `scripts/validate-additional-terrain-benchmark.mjs`, `scripts/validate-additional-terrain-ui.mjs`, `scripts/validate-bathymetry.mjs`, `scripts/validate-cartography-personality.mjs`, `scripts/validate-coastal-contours.mjs`, `scripts/validate-geography-benchmark.mjs`, `scripts/validate-hex-grid.mjs`, `scripts/validate-hex-land.mjs`, `scripts/validate-hierarchy-benchmark.mjs`, `scripts/validate-library-navigation.mjs`, `scripts/validate-new-map-themes.mjs`, `scripts/validate-painterly-benchmark.mjs`, `scripts/validate-premium-terrain-ui.mjs`, `scripts/validate-settlement-benchmark.mjs`, `scripts/validate-settlement-interactions.mjs`, `scripts/validate-terrain-texture-benchmark.mjs`, `scripts/validate-tool-intent.mjs`, `scripts/validate-water-depth.mjs`, `scripts/wall-material-fixtures.mjs`, `scripts/water-depth-comparisons.mjs`, `service/eldricPqa.test.ts`.

Other references: `docs/sprints/additional-terrain-textures.md`, `docs/sprints/area-material-interaction.md`, `docs/sprints/asset-library-quality-taxonomy-audit.md`, `docs/sprints/bathymetry-refinement.md`, `docs/sprints/battlemap-texture-brush.md`, `docs/sprints/brush-base-surface.md`, `docs/sprints/coastal-contours.md`, `docs/sprints/contextual-inspector.md`, `docs/sprints/eldric-bibliotheek-pqa-integration.md`, `docs/sprints/game-cartography-personality.md`, `docs/sprints/generated-walls.md`, `docs/sprints/geography-terrain-finish.md`, `docs/sprints/hex-grid.md`, `docs/sprints/hex-land.md`, `docs/sprints/illustrated-settlements.md`, `docs/sprints/library-navigation.md`, `docs/sprints/living-root-production-artwork.md`, `docs/sprints/new-map-themes.md`, `docs/sprints/open-wall-classification-fix.md`, `docs/sprints/open-wall-paths.md`, `docs/sprints/premium-terrain-textures.md`, `docs/sprints/reference-atlas-validation.md`, `docs/sprints/room-generator.md`, `docs/sprints/room-wall-controls.md`, `docs/sprints/scatter-rotation-control.md`, `docs/sprints/scene-outliner.md`, `docs/sprints/stamp-palette-direct-placement.md`, `docs/sprints/stamp-soft-shadow.md`, `docs/sprints/tool-consolidation.md`, `docs/sprints/toolbar-semantic-cleanup.md`, `docs/sprints/wall-materials-organic.md`, `docs/sprints/water-depth.md`, `docs/sprints/world-asset-hierarchy.md`, `docs/sprints/world-asset-quality.md`, `docs/sprints/campfire-map-contract-export.md`.

### `distribution.local`

C — ignored/preserved; source or persistent evidence. Portable Windows distribution output.

45648 files; 5574882823 bytes. Reproducibility: Partial: preserve source/user inputs; do not assume reproducible. Unique source/user content: source paths, databases or map documents detected; preserved conservatively.

Creator/script/test: `scripts/package-checksums.mjs`, `scripts/package-windows.mjs`, `scripts/repository-audit.mjs`, `scripts/smoke-geography-package.mjs`, `tests/persistence/asset-explorer-package.mjs`, `tests/persistence/library-package.mjs`, `tests/persistence/lifecycle-browser-open.mjs`, `tests/persistence/lifecycle.mjs`, `tests/persistence/path-package-smoke.mjs`, `tests/persistence/prefab-package.mjs`, `tests/persistence/smart-markers.mjs`, `tests/persistence/sprint13.mjs`, `tests/persistence/startup-package.mjs`, `tests/persistence/wall-material-package.mjs`.

Other references: `docs/sprints/asset-explorer-report.md`, `docs/sprints/evidence/asset-explorer/results.json`, `docs/sprints/geography-terrain-finish.md`, `docs/sprints/open-wall-classification-fix.md`, `docs/sprints/smart-markers-windows-report.md`, `docs/sprints/sprint-13-1-portable-lifecycle-controls-report.md`, `docs/sprints/sprint-14-freeform-areas-and-masks-report.md`, `docs/sprints/sprint-15-generic-path-engine-report.md`, `docs/sprints/sprint-17-1-wall-materials-and-stamp-sets-report.md`, `docs/sprints/sprint-23-advanced-asset-library-report.md`, `docs/sprints/sprint-23b-prefabs-and-reusable-compositions-report.md`, `docs/sprints/startup-projects-windows-report.md`, `docs/sprints/windows-package-20260926.md`, `launcher/installer.iss`, `README.md`.

### `launcher.local`

B — ignored/preserved; generated evidence. Compiled launcher/runtime staging.

0 files; 0 bytes. Reproducibility: Referenced harness/tool can regenerate evidence with documented prerequisites. Unique source/user content: not proven unique; retained regardless.

Creator/script/test: `scripts/repository-audit.mjs`.

Other references: `docs/sprints/windows-package-20260926.md`, `launcher/build.ps1`.

## Decisions and checks

The existing `*.local` rule remains. Explicit ignores additionally protect local workspaces, dependencies/build outputs, caches, SQLite files, logs, environment secrets and OS/editor noise. Ignore does not authorize deletion. Current deliverables, packages and original asset-production sources remain intact. Historical documentation screenshots under docs/sprints/evidence remain canonical report evidence; temporary browser evidence is ignored.

The largest candidate is the 18.96 MB terrain download ZIP. Bundled assets also occur inside downloadable packs intentionally: UI download links and pack-validation tests require those archives. No Git LFS is needed. ZIP inspection found no database or .env entries. Two sample map documents are canonical examples. No executable or user database is included.

The staged baseline has 1,363 changed/new files, approximately 111.6 MB before Git compression. Thirteen identical binary groups were reviewed: authoring templates share images with runtime examples, wall previews share material images, development wall revisions retain their existing footprints, and two historical proof images are identical. These are retained to preserve references and revision behavior. `git diff --cached --check` also reports pre-existing whitespace in imported source, historical reports and original third-party licenses; no broad formatting or license rewrite was performed. This check is recorded as findings, not a pass.

The PQA pack was copied byte-identically into tests/fixtures/eldric-pqa. Its test now uses that tracked fixture instead of a generated local deliverable. Assertions were not weakened. Specialized benchmark/authoring tools still require documented private source artwork and prior deliverables; normal builds and unit tests do not.

Heuristic scans of candidate text found no recognized service key, private key or suspicious literal credential. Values are never printed; this is not a guarantee against every possible secret. The Campfire guide now uses a configurable sibling path. Five historical sprint reports retain old evidence paths deliberately. Configuration uses explicit shell environment variables, without dotenv consumption; no unnecessary .env.example was added.

Full lint initially reported 12 existing QA-script errors. Unused bindings were removed and intentionally swallowed startup/shutdown errors documented without changing execution/assertions. No product behavior, UI, renderer, schema or data was changed. A read-only primary-database inspection could not open its WAL state under the sandbox; no escalation or data modification was attempted, and no database validation is claimed. Storage code remains at schema 10.

## Validation

- Service: 6 test files / 29 tests passed (PQA, asset quality, library and all three bundled production asset packs).
- Frontend/domain/export: 4 files / 49 tests passed (Campfire export, generated walls, terrain paint, archive).
- npm run typecheck: passed.
- npm run lint: passed after the behavior-preserving QA cleanup.
- npm run build: passed; existing dynamic-import/chunk-size warnings remain. Font resources/licenses and read-only contract provenance verified.
- No application instance, browser suite, Windows package or unrelated full test suite was started.

## Baseline and deferred work

Commit subject: `Baseline: Mapweaver before sprint-level Git workflow`. The resulting hash, staged size review, contract hash comparison and clean-tree result are recorded after commit in ignored `.repository-cleanup.local/completion.json` and the delivery response; a tracked report cannot contain its own commit hash without a second commit.

Deferred: deleting/consolidating historical datasets or packages, regenerating optional benchmarks, and bundle optimization. Original authoring inputs remain protected. No external action was performed.

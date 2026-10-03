# Illustrated Settlements & Landmarks — delivery

26 September 2026. Implemented on the existing unborn `develop` checkout, preserving existing work. `AGENTS.md` and the sprint prompt were read; `CODEX.md` does not exist in this repository. No subagents, dependencies or Windows package were added.

## Acceptance and implementation

- One semantic Place supports Symbol and Illustrated. Missing mode and all legacy custom imagery remain unchanged. Format-12 optional mode plus ordinary stamp assetId; exact constraints in ADR-0044.
- Wizard and Properties have explicit mode, semantic preview filtering, theme/family filtering, paged imported candidates, manual override, current-image indication and editable world width. Symbol remains default; painterly theme recommends illustration without conversion. Explicit image selection validates content and adopts an ordinary shared project resource.
- Identity, importance, notes/tags, selection, layers and linked labels remain existing Place behavior. No paired Stamp. Undo restores mode/artwork and label edits atomically. Automatic labels skip existing linked names.
- New illustrated sizes use 2.5% of physical map width, type factor and existing prominence; capital > city > town > village. Existing geometry never changes because of viewport/theme/map-scale changes. Width and aspect are captured in ordinary map bounds.
- `marker:`, `theme:` and `style:` metadata use existing portable tags. Shared package/parser and metadata update validate recognized marker tags; unrelated historical tags remain accepted. No SQL/schema migration. External authoring guide and actual standard ZIP supplied.

## Curated family

| Family | Variants |
| --- | ---: |
| Capital | 3 |
| City | 4 |
| Town | 4 |
| Village | 3 |
| Fortress/castle | 4 |
| Harbor/port | 3 |
| Ruin | 3 |
| Tower | 2 |
| Temple/shrine | 2 |
| Landmark | 3 |
| Total | 31 |

All images are separate generated transparent PNGs, at most 384px on the longest edge, consistent northwest light and restrained earthy colors. Temperate, arid and northern variants; no baked names or square terrain bases. Reviewed the complete neutral-ground catalog and actual 1× map-scale comparisons. The family is more detailed in large previews; fine detail merges into silhouettes at small world-map size, intentionally.

Sources: `public/settlement-assets-painterly/assets/`; standard ZIP `public/settlement-assets-painterly/mapweaver-settlements-painterly.zip`; catalog `catalog.png`; exact prompts `prompts.json`; SHA-256 source/output provenance `provenance.json`. Built-in imagegen, one call per asset, no CLI fallback or third-party stock. All consumed image files are in the project. Packaging script: `scripts/package-settlement-assets.mjs`.

## Benchmark and interaction evidence

`deliverables.local/Illustrated-Markers/` contains before/after editable `.mapweaver` files, actual 1×/2× exports, editor screenshots, four paired detail crops (Symbol left, Illustrated right), composition/source hash and validation JSON. Both copies share map scale, terrain, six painterly scenery stamps and eight semantic Places: capital, city, town, village, castle, harbor, ruin and landmark. Only the explicit visual representation/bounds and dependent label offsets change. Original Coastal-Contours source file hash was verified unchanged.

Normal headless installed Chrome, isolated local service/data, 1600×1100 comparison viewport:

| Measurement | Symbol | Illustrated |
| --- | ---: | ---: |
| Objects / Places | 29 / 8 | 29 / 8 |
| Image cache entries | 6 | 14 |
| Open (includes fixed image readiness wait) | 4.33s | 3.38s |
| Save | .30s | .37s |
| Reload | 3.17s | 3.06s |
| Pan median / p95, two animation frames | 33.4 / 34.2ms | 33.3 / 33.5ms |
| New canvases during warm pan | 0 | 0 |
| PNG 1× | 172ms | 213ms |
| PNG 2× | 477ms | 492ms |
| Editor/export differing pixels, 1× / 2× | 0 / 0 | 0 / 0 |

Saved/reloaded snapshots matched exactly. No software-rendering flags or relaxed pixel tolerance were used for this benchmark.

Separate actual browser interaction at 1280×720: open wizard, select City/Illustrated/Arid city, name Copperhaven, click canvas, verify a selected Place plus one linked name in Settlements, edit width to 600km, Apply, switch to Symbol, Apply and undo. Portable encode/decode preserved object data with 15 embedded resources (3,151,312-byte archive), independent of library references. No browser errors. Dialog/panels scroll at this desktop size; controls do not overlap.

Stress case adds 240 ordinary illustrated Places with linked labels, for 249 Places / 511 objects total. Cache stays at 15 source images / 255 leases and creates no canvases during pan. Last run median 46.2ms / p95 81ms per two-frame update (30 measured samples after five warmups). This is bounded source reuse and usable interaction, not a 60fps guarantee. Earlier run median 44.9ms / p95 57.9ms demonstrates timing variability; no claimed speedup.

Reproduce with `scripts/build-settlement-benchmark.mjs`, `scripts/validate-settlement-benchmark.mjs`, `scripts/validate-settlement-interactions.mjs`, `scripts/settlement-comparisons.mjs`. Browser scripts use fresh `.qa.local/illustrated-markers/validation/data-*` and stop their helper processes.

## Validation

- 36 client tests passed: illustratedMarkers domain/UI, existing markers domain/UI, automaticLabels and imageCache.
- 30 service tests passed: illustratedAssets, assetAuthoring and generatorAssets. Includes pack reimport deduplication and metadata portability, all 31 hashes/alpha/dimensions and family coverage; existing authoring/generator behavior retained.
- `node scripts/validate-asset-pack.mjs public/settlement-assets-painterly/mapweaver-settlements-painterly.zip`: valid, 31 assets, no warnings/errors.
- `npm run typecheck`: client and service passed.
- Scoped ESLint on all changed code, tests and new validation scripts: passed.
- `npm run build`: client/service production builds and all 8 font resource/license checks passed. Existing chunk-size advisories remain.
- Targeted browser comparison and interaction/stress checks passed as above. Full unrelated suite and Windows package build were not run.

## Limits

No automatic placement, civilization-specific library or silent upgrade of old markers. Imported theme/family filtering is page-local (60 candidates); bundled candidates are always loaded. Cancelling after choosing a bundled image can retain it in the local Library, but does not create map objects. Native image resolution bounds extreme close-up detail. Existing heavier Velanth-map accelerated-Canvas differences reported in the prior hierarchy sprint were not reworked here; this sprint's complete before/after benchmark is exact at both scales. No critical new known defect.

Important files: `src/domain/illustratedMarkers.ts`, `annotations.ts`, `markers.ts`, `markerRegistry.ts`, `assetManifest.ts`; `src/library/illustratedMarkers.ts`; `src/app/IllustratedMarkerPicker.tsx`, `MarkerWizard.tsx`, `MarkerProperties.tsx`, `MarkerFields.tsx`, `Markers.module.css`; the marker asset-admission check in `src/store/projectStore.ts`; `service/library.ts`; focused tests, ADR-0044 and authoring/user guides. Existing renderer and portable container paths are reused.

No push, merge, publication, deployment or other external repository action. No Windows executable/package created. Image generation used the explicitly requested built-in artwork capability; the application itself has no external image/service dependency.

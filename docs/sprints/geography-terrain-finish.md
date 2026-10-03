# Geography & Terrain Finish

26 September 2026. Local implementation and controlled Velanth benchmark.

## Scope and acceptance

The sprint adds connected ridge/drainage generation and optional non-destructive
relief, material transitions, coast falloff and ocean depth. Required gates are
native editability, old-map compatibility, both brushes, save/reload, 1x/2x pixel
parity, bounded rendering costs, focused tests and a verified Windows package.
Final measurements and packaged smoke results are appended below.

## Implemented geography

New-world previews use **world-v1 algorithm version 2**. Version 1 remains callable
for exact historical generation. Version 2 adds multiscale coast asymmetry rather
than changing existing user polygons. Ridge extraction links cross-slope highland
maxima through short highland corridors, builds a spanning forest, takes each
component's principal diameter and retains its longer secondary branches. Smooth
points, hierarchy and foothill width are reusable historical metadata. Scatter
uses connected ridge tangents with existing semantic roles, spacing, exclusions,
seed selection and asset rotation policies; forest distance rules are retained.

The existing priority-flood drainage field remains the authority. Rivers now form
explicit directed reaches split at confluences, with source/mouth cells, downstream
ID, tributary IDs and Strahler order. Source tributaries are narrower and downstream
reaches widen using accumulated tributary discharge. This uses existing native
river start/end widths, with matching endpoint coordinates; no new live path
constraint or custom width-profile format is required. Subcell valley fitting and
bounded handles soften axis-aligned drainage. Candidate node offsets are constrained
to descend along the filled surface. Rivers remain independently editable Paths.

Lakes are valid terminal sinks. Automated lake outlets are not implemented. Network
metadata is historical: manual river edits do not automatically reroute neighbours
or recalculate their width. No in-place geographic regeneration/refinement action
was added; generator improvements apply to new maps, preserving manual contours.

## Visual finish and controls

**Map > Geography & terrain finish** exposes relief enabled/strength/light direction/
softness/contrast and selectable transition, coast and ocean presets. Apply is one
undo step; Remove returns to legacy appearance. Explicit theme application supplies
Painterly soft relief, restrained Parchment wash, stronger Dark Fantasy and disabled
Minimal Political defaults through the existing per-field ownership system.

- Relief derives directional shading from elevation and current terrain semantics.
  Northwest lighting is default; palette/light values remain direct settings.
  Bilinear height sampling and bounded diffusion prevent hard biome-shaped plateaus.
- Material edges use map-anchored multiscale noise and distinct snow, forest,
  desert and swamp responses, plus a generic fallback. Their alpha masks replace
  uniform feathering on opted-in semantic terrain; geometry and imported Fill
  Pattern mapping remain intact.
- Coast falloff combines shoreline, near-shore, shallow and offshore bands. Coast
  distance, local variation and rocky/highland semantics narrow/darken high coasts.
- Ocean depth combines coast-distance shelf/mid/deep influence and low-frequency
  material variation. Small islands remain native land over the water pass.

Terrain Brush masks are unchanged and remain editable. Land/Water changes update
current semantic coverage; neither tool erases the optional finish settings.
Editor and export share the implementation and the same land clipping. Cache
rasters are disposable, longest side at most 768 px; two maps are retained with
backing-store disposal. Existing terrain Area caches retain their 16M-pixel limit.
Finish rasters are not serialized. See [ADR-0036](../adr/0036-geography-terrain-finish.md).

## Controlled Velanth copy

`deliverables.local/Velanth-GeographyFinish/Velanth-GeographyFinish.mapweaver`:
**538 objects, 421 stamps, 15 embedded source images (640 x 480)**. The original has
537 objects; splitting one confluence increases 16 generated rivers to 17 reaches.
Three authored rivers are retained. The derived network has 5 major ridges and 10
secondary ridges. Labels, markers, title, compass, scale bar, frame, effects, stamps,
terrain paint and all land/biome polygons are structurally unchanged. Original
Engraved artwork is deliberately retained to isolate geography/terrain improvements.
This is not the previous asset-swap copy and does not compound its renderer issue.

The copy is built by `scripts/build-geography-benchmark.mjs`, which validates the
portable document and asserts invariants. The original SHA-256 remains
`36900eaa6b90f5b8fc619712bd6dd720b4d9838a4115aecbcc2ecdb19e51b4fd`.
No user dataset was modified; browser validation uses `.qa.local/geography-finish`.

## Evidence and remaining visual limits

Full maps: [baseline](../../deliverables.local/Velanth-GeographyFinish/baseline-1x.png)
and [GeographyFinish](../../deliverables.local/Velanth-GeographyFinish/after-1x.png).
Both 2x exports and editor screenshots are included. Crops use identical 1x map
coordinates without rescaling:

| Comparison | x, y | width x height |
| --- | --- | --- |
| [Ridge/relief](../../deliverables.local/Velanth-GeographyFinish/ridge-comparison.png) | 680, 560 | 620 x 440 |
| [Drainage](../../deliverables.local/Velanth-GeographyFinish/drainage-comparison.png) | 1140, 825 | 650 x 360 |
| [Biome edges](../../deliverables.local/Velanth-GeographyFinish/biome-comparison.png) | 1420, 540 | 460 x 390 |
| [Coast/ocean](../../deliverables.local/Velanth-GeographyFinish/coast-comparison.png) | 225, 815 | 650 x 530 |

The finish is more layered and geographic, especially the coast-depth relationship
and river bends. It is not a reference-atlas match. Original triangle/tree artwork,
existing hand-authored coast silhouettes, straight labels and simple cartography
remain obvious. Preserving land geometry intentionally retains the benchmark's
capsule-like southern island; new-world version-2 contour changes are separately
tested. Coarse source elevation cannot supply erosion-scale geological detail.
The bounded visual raster is a soft finish, not an editable high-resolution DEM.

## Changed components

- `src/world/geographyNetwork.ts`, generator/model/worker: version-2 ridge and
  drainage graph, validated provenance, subcell river geometry and reach widths.
- `src/world/scatterWorld.ts`, `styleWorld.ts`: ridge alignment and preservation of
  generated confluence widths when applying the existing world style.
- `src/domain/geographyFinish.ts`: presets, validators and pure finish calculations.
- `src/canvas/drawGeographyFinish.ts`, Area/Water/Map render components and export
  scene/render: shared bounded surfaces, material alpha masks and matching clipping.
- `src/app/GeographyFinishSettings.tsx`, Map settings and theme integration: explicit
  controls with atomic apply/undo and existing override tracking.
- Map model, settings admission and project parser: optional format-12 settings.
- Four focused test files, benchmark/crop/package-smoke scripts, README, glossary,
  ADR and this report. No dependency or storage schema migration was introduced.

## Validation protocol

56 distinct targeted Vitest tests passed across generator, ridge/drainage, scatter,
world themes, finish math/validation, controls, history/ZIP and both brush action
suites. TypeScript and production builds include service admission and font checks.
Scoped ESLint covers changed product/test files. No unrelated full suite was run.

The browser runner opens baseline and copy with an isolated local service in Chrome
at 1600 x 1100. It compares editor artwork with normal PNG export at 1x and 2x,
saves and compares the stored document, reloads and explicitly reopens the map,
and compares the entire snapshot. Five warmup updates precede 40 measured updates;
each waits two animation frames. Timings are not direct pointer latency or 60-fps
claims. Open/reload timings include the harness's settle waits and explicit loading.

The first parity check exposed an extra editor-only land clip on the relief layer.
Export now uses the same clip; both scales subsequently matched exactly in ordinary
Chrome, without disabling GPU canvas or relaxing the comparison threshold.

Reproduction:

```powershell
npm test -- src/world/geographyNetwork.test.ts src/domain/geographyFinish.test.ts src/world/generate.test.ts src/world/scatterWorld.test.ts src/domain/worldThemes.test.ts src/store/geographyFinishActions.test.ts src/app/GeographyFinishSettings.test.tsx src/store/terrainPaintActions.test.ts src/store/landBrushActions.test.ts
npm run typecheck
npm run build
node scripts/build-geography-benchmark.mjs
node scripts/validate-geography-benchmark.mjs
node scripts/geography-comparison-crops.mjs
node scripts/package-windows.mjs Mapweaver-GeographyFinish-20260926
node scripts/smoke-geography-package.mjs
```

The existing validated `distribution.local/Mapweaver-20260926` is preserved. The new
package is `distribution.local/Mapweaver-GeographyFinish-20260926`, with
`Mapweaver.exe` at its root. Keep its complete folder together; it includes Node,
native modules, client/service, assets and fonts. No installer or signing is added.
The smoke test starts the real executable with an isolated data directory, suppresses
browser auto-opening, drives the packaged frontend and requests a safe supervised
stop while the saved browser session can still acknowledge the flush.

No push, merge, release, upload, deployment, cloud change or external image generation
was performed. No old package was deleted. The repository has no committed develop
branch, so its existing checkout and unrelated work were retained.

Next sprint: combine the separately validated painterly assets with this finish in
another copy, then improve continuous mountain/forest placement and illustrated
settlement/cartographic integration. Resolve the prior asset family's GPU-dependent
2x sampling discrepancy before treating that combined map as pixel-verified.

## Final results

All required implementation and local-delivery gates passed for this benchmark.
The same geography is visibly more layered, with a coast-depth relationship and
less angular rivers; this is a noticeable improvement, not the final atlas target.

| Measurement | Original Velanth | GeographyFinish |
| --- | --- | --- |
| Objects / images | 537 / 15 | 538 / 15 |
| Viewport median / p95 | 78.9 / 85.4 ms | 78.1 / 81.7 ms |
| 1x PNG | 1.218 s | 2.051 s |
| 2x PNG | 1.852 s | 2.595 s |
| Import/open including settle | 6.722 s | 6.728 s |
| Reload + explicit reopen including settle | 7.215 s | 10.173 s |
| Editor/export differing pixels, 1x / 2x | 0 / 0 | 0 / 0 |
| Save/reopen full snapshot | Identical | Identical |

No new canvases were allocated during warmed viewport measurements. Finish adds
roughly 0.74-0.83 seconds to export and cache rebuilding contributes to reopening
cost; it does not regress warmed panning. These headless timings remain too high
to claim 60-fps interaction. The old 131 ms reference used a different protocol.

56 distinct targeted tests passed. Scoped ESLint, TypeScript and production build
passed. The existing Vite chunk-size warning remains. Crop generation emitted a
Fontconfig cache-directory warning but produced inspected, readable comparison PNGs.
No unrelated full-suite, installer, signing or external publishing was performed.

### Windows delivery and smoke

- Package: `C:/Users/gerbe/Documents/ChatGPT/Mapweaver/distribution.local/Mapweaver-GeographyFinish-20260926`
- Executable: `C:/Users/gerbe/Documents/ChatGPT/Mapweaver/distribution.local/Mapweaver-GeographyFinish-20260926/Mapweaver.exe`
- ZIP: `distribution.local/Mapweaver-GeographyFinish-20260926.zip`
- Manifest: `distribution.local/Mapweaver-GeographyFinish-20260926-SHA256SUMS.txt`
- Included example: `examples/Velanth-GeographyFinish.mapweaver` inside the package.

The actual Windows executable started its packaged runtime/service. The packaged
frontend imported the benchmark, displayed stored relief settings, rendered the
map, performed real pointer strokes with Terrain Brush and Land/Water Brush, and
autosaved both. Undo restored map/object/layer/group state exactly. Explicit save
and browser reload reopened the last campaign/map. Both PNG downloads decoded at
2400 x 1600 and 4800 x 3200 with **zero pixel differences** from the validated
development exports. No browser/font/resource errors were reported. The final
supervised stop returned exit code 0. Evidence: `packaged-smoke.json`,
`packaged-export-comparison.json`, `packaged-editor.png`, `packaged-reopened.png`.

The first test-harness attempt closed headless Chrome before requesting Stop, which
left an unacknowledged client and triggered the existing conservative timeout.
Only the identified, idle test service/supervisor were terminated after stored data
had been verified; user processes/data were untouched. The corrected harness keeps
the tab open until the normal supervised stop completes, and that full rerun passed.
No lifecycle product changes were made as part of this terrain sprint.

Package files are verified against the generated SHA-256 manifest; the independent
file count, executable/manifest/ZIP hashes and archive-entry check are recorded in
`deliverables.local/Velanth-GeographyFinish/package-integrity.json`. The previous
validated package and original Velanth archive remain in place.

# Sprint F — World visual themes

Status: complete, 26 September 2026.

Acceptance: five stable, distinct themes composing terrain/water/coast/river/effect/frame/font/element presets; semantic geometry and text preserved; per-field manual overrides retained or explicitly reset; one undo operation; previews; world/regional applicability; generator choice and deterministic semantic asset selection/remapping; optional persisted theme ownership with unknown-theme fallback; targeted tests, browser screenshots, 1x/2x parity and measured performance. No automatic labeling, external actions or Windows packaging.

Approach: direct visual values remain authoritative for rendering. Compact fingerprints record the last theme-managed values so existing property editors automatically create overrides without UI-specific interception. Existing annotations are opt-in. Asset substitution uses semantic metadata and exact theme/type applicability, preserves transforms, and reports unavailable families. No filename inference or geography regeneration.

## Delivered

- Five built-in themes: Painterly Fantasy, Classic Parchment, Dark Fantasy, Minimal Political, Elven / Elegant Fantasy. [Exact preset, font, family and effect mappings](../world-visual-themes.md#exact-preset-composition) and the eleven terrain palette mappings are centralized in `src/domain/worldThemes.ts`.
- Map → Visual theme: five sample cards with descriptions; Apply/Cancel; preserve overrides or reset; explicit adoption of existing labels/elements; optional semantic asset replacement. Only World/Regional maps expose the picker. Choosing a card never changes the map.
- Pure theme application changes paint values and derived label/path bounds, preserving geographic geometry, physical scale, text, IDs, layers/groups, marker identities and generation provenance. The whole committed change is one undo/redo operation.
- Optional format-12 `map.theme` stores active ID and compact field fingerprints, not theme definitions. Optional terrain `color` uses the shared terrain painter. Existing maps remain Custom and visually untouched. Unknown theme IDs retain direct appearance and display Custom; malformed ownership is rejected. Archive and local-service round trips are covered. See [ADR 0032](../adr/0032-world-visual-themes.md).
- New labels, marker labels, titles, compasses, legends, scale bars and info panels use appropriate theme defaults; matched defaults become managed. Fields changed through existing editors remain overrides on normal switches; Reset replaces visual fields. World defaults do not leak into battlemaps after a map-type change.
- Generator Visual style filters compatible semantic asset families before scatter selection and uses the same theme application and scene painter for preview. The old generator style remains available. Minimal Political starts with scatter off; on existing maps, managed semantic stamps become translucent without deletion.
- Existing stamp replacement requires exact semantic type, compatible roles/biome, target family and map applicability. Stable weighted selection based on object ID retains all placement transforms. Missing families keep current artwork and report the gap. Preparation is budget checked and rejects stale document changes before a single atomic commit. Stamp appearance remains managed when image replacement is disabled.
- Export now shares decoded image leases with the editor and rejects a changed project context. This fixes the observed 1× fractional-alpha sampling difference without altering document opacity, geometry or styles.

## Validation

83 targeted Vitest tests passed across 11 files:

```text
src/domain/worldThemes.test.ts
src/app/WorldThemePicker.test.tsx
src/world/WorldWizard.test.tsx
src/projects/applyTheme.test.ts
src/export/export.test.ts
src/app/terrainAppearance.test.tsx
src/domain/annotations.test.ts
src/domain/decorations.test.ts
src/domain/markers.test.ts
src/domain/mapEffects.test.ts
src/world/scatterWorld.test.ts
```

Coverage includes all registry references, applicability, semantic/text/geometry preservation, normal overrides versus reset, annotation adoption, hidden/locked content, imported patterns, removed optional styles, deterministic remapping, no-replacement switches, one-step history, unavailable themes, ZIP round trip, themed generator families, cancellation, and rejection of asynchronous stale/failing library lookups.

`npm run typecheck` passed during implementation. The final `npm run build` passed both client and service TypeScript checks, both production builds and bundled font/license verification. Scoped ESLint passed for all 29 changed/new TypeScript/TSX/MJS files. Vite retains its advisory for two bundles above 500 kB (approximately 515/517 kB); there were no build errors. The full unrelated test suite and Windows packaging were not run.

`node tests/persistence/world-themes.mjs` passed in Chrome against an isolated local service/data directory. The script exercises actual theme UI selection/cancel, all five applications, geography comparisons, Undo/Redo, local save/reload, asset replacements, a real generator worker and themed creation (41 terrain stamps). No browser page errors occurred.

For the same 131-object world map, the editor scene was compared with PNG output at 1× and 2× for every theme: **all ten comparisons had zero differing channels**. Artifacts include before/after editor screenshots and PNGs. The terrain symbol variants in this isolated fixture are deterministic QA artwork; they are not newly bundled production packs.

Measured on this host, pure style application to a 611-object stress map with eight semantic QA assets took 15.6–39.5 ms across the five themes. Full UI Apply on the 131-object map, including local resource lookup/adoption and interaction waits, took 262–427 ms. These are bounded sample measurements, not guarantees for every map/library size.

Evidence: [machine-readable results](../../.qa.local/world-themes-1790392380652/results.json), [before / Custom](../../.qa.local/world-themes-1790392380652/before-custom.png), [picker](../../.qa.local/world-themes-1790392380652/theme-picker.png), [generator preview](../../.qa.local/world-themes-1790392380652/generator-theme-preview.png).

| Theme | Browser screenshot | PNG 1× | PNG 2× |
| --- | --- | --- | --- |
| Painterly Fantasy | [Editor](../../.qa.local/world-themes-1790392380652/world.painterlyFantasy-editor.png) | [1×](../../.qa.local/world-themes-1790392380652/world.painterlyFantasy-1x.png) | [2×](../../.qa.local/world-themes-1790392380652/world.painterlyFantasy-2x.png) |
| Classic Parchment | [Editor](../../.qa.local/world-themes-1790392380652/world.classicParchment-editor.png) | [1×](../../.qa.local/world-themes-1790392380652/world.classicParchment-1x.png) | [2×](../../.qa.local/world-themes-1790392380652/world.classicParchment-2x.png) |
| Dark Fantasy | [Editor](../../.qa.local/world-themes-1790392380652/world.darkFantasy-editor.png) | [1×](../../.qa.local/world-themes-1790392380652/world.darkFantasy-1x.png) | [2×](../../.qa.local/world-themes-1790392380652/world.darkFantasy-2x.png) |
| Minimal Political | [Editor](../../.qa.local/world-themes-1790392380652/world.minimalPolitical-editor.png) | [1×](../../.qa.local/world-themes-1790392380652/world.minimalPolitical-1x.png) | [2×](../../.qa.local/world-themes-1790392380652/world.minimalPolitical-2x.png) |
| Elven / Elegant Fantasy | [Editor](../../.qa.local/world-themes-1790392380652/world.elvenElegant-editor.png) | [1×](../../.qa.local/world-themes-1790392380652/world.elvenElegant-1x.png) | [2×](../../.qa.local/world-themes-1790392380652/world.elvenElegant-2x.png) |

Visual inspection confirmed distinct palettes, water/coast treatments, typography, title carriers, frames, readable labels and restrained effects. The sample's geography/text remained identical; themes are preset substitutions, not global filters.

## Principal files

- Domain: `worldThemes.ts`, `applyWorldTheme.ts`, terrain/model/map validation, annotations, markers, decorations and cartographic defaults.
- UI: `WorldThemePicker.tsx` / CSS Module; integration in Map Settings, element insertion and Terrain Properties.
- Store/storage: annotation default ownership registration, `projects/applyTheme.ts`, `projects/format.ts`. No database schema change or new service API.
- Generator: `themeWorld.ts`, `WorldWizard.tsx`, map-aware `scatterResources.ts`.
- Rendering: shared terrain color in `drawArea.ts`; decoded-source reuse/context guard in `export/render.ts`.
- Tests: theme domain/UI/async cases, wizard extensions, `tests/fixtures/worldThemes.ts` and `tests/persistence/world-themes.mjs`.
- Documentation: README, changelog, AGENTS terminology, theme guide, ADR 0032 and this report.

## Limitations and Sprint G handoff

Themes ship no additional production asset packs. Painterly/Parchment/Dark remapping requires compatible local metadata; absent resources remain unchanged with a warning. Elven uses the available generic family. Assets lacking semantic metadata, imported Fill Patterns and textured rivers are intentionally retained. First application initializes semantic visual styles; subsequent field ownership is what distinguishes manual overrides. Preview cards are samples, not live full-map previews.

Authoritative river width/taper and smoothing are retained even for Minimal Political. The current map remains editable; no theme editor, automatic labeling, or geographic regeneration was added. Returning a property exactly to its last managed value resumes theme ownership. Existing old application binaries are not guaranteed to understand new optional format-12 fields.

Sprint G can consume `themeText` defaults for region, city, water, marker, title and legend roles. Create ordinary labels with stable owner IDs, preserve user text/placement, and register matching defaults through the existing annotation insertion path. Automatic placement, collision handling and label identity belong to that sprint, not theme application.

The repository had no existing `develop` ref; its current checkout and existing work were retained. No push, merge, release, upload, deployment, external service change or Windows package was performed. QA data/artifacts remain in the ignored local evidence folder.

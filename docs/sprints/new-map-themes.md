# New Map Wizard & Rich Theme Preview — delivery

2026-09-26. Implemented on the existing `develop` checkout; existing user work retained.

## Creation flow

Before: a flat name/type/dimensions/background form, separate Generate button, and no visual theme until later. Theme cards were handcrafted schematic SVGs.

After: one scrollable New Map form with **Basics → Size → Visual theme → Starting point**. Blank uses **Create map**. World generation uses **Continue to world preview**, followed by the existing editable geography preview and **Create generated map**. This deliberate second step avoids committing unseen generated content. The primary footer remains reachable at 1280 × 720.

Defaults: **Painterly Fantasy** for World and Regional; **neutral customizable canvas** for Battlemap. World/Regional themes are filtered out for Battlemap. Switching map types resets the draft theme and starting point; it never changes an existing map.

Blank maps are fully themed before the first persistence request. The World wizard receives the selected theme and initializes its asset family before candidate filtering and scatter. Changing the generator theme discards the previous result and requires regeneration. Same seed/geography parameters retain the same land, river nodes, biomes and provenance across all five themes.

## Preview implementation and theme audit

One 800 × 500 canonical native map contains a rounded peninsula, offshore island, wooded region, uplands, grassland, winding river, mountain range, forest clusters, settlement, region/water/city labels and compass. Coastlines and semantic content are identical across themes. Only presentation and sample artwork vary.

The shared `ThemeCards` calls the actual theme application and export renderer, including terrain palettes/procedural materials, river presets, fonts, water appearance, Water Depth, coastal contours, geography finish, vignette/fog and frame. Painterly uses the real bundled raster mountains, forest and illustrated city. Other examples use existing engraved terrain assets and a Symbol settlement; Minimal intentionally de-emphasizes terrain stamps. Dark has its own palette, cold mist, pale Spectral labels, river styling and ornamental frame. Parchment uses warm paper, restrained ink and IM Fell English; Elven uses cream/jade, Cormorant Garamond and its refined frame.

The existing Visual Theme dialog uses the same component. Preserve overrides, reset, labels/elements adoption and compatible semantic stamp replacement are unchanged and covered by existing tests.

Current scope gaps are explicit:

- Separate Parchment/Dark stamp families are not bundled. Their previews retain engraved stamps and disclose this; generation still needs compatible library assets.
- Current themes do not automatically author premium terrain brush masks or generate settlements. The illustrated city demonstrates available artwork, not automatic settlement generation.
- Title/cartouche presets remain theme-controlled but are omitted from the compact scene; compass and frame are represented.
- The miniature is illustrative geography, not a preview of the user's generated seed or installed asset collection.

## Performance and lifecycle

Cards render only when visible. Jobs run serially, yielding between renders, and cache one PNG promise per theme/scene-version fingerprint. Reopening either picker reuses the same images. Roots/output canvases are disposed after rendering; no continually active editor canvases are created. Cache resets with the application load/deployment and consumes current local artwork and renderer definitions; running sessions do not poll for changed asset files.

Initial Chrome development measurements: approximately **0.7–2.1 s per preview**, including resource preparation; cached calls **0–0.1 ms** and identical promises. First-time rendering can briefly occupy the main thread. Lazy loading and reuse bound that cost; no animation-time cost is added to the editor. See the final measurement JSON for the latest run.

## Validation

- **32 targeted tests, 7 files, passed**: new-map defaults/filtering, all five themed blank archive roundtrips, canonical geography/semantic identity, missing image fallback, generator geography determinism, theme handoff before worker candidate selection, keyboard selection, existing override/reset/asset-replacement behavior.
- **TypeScript client/service check passed**; final production build also checks both.
- **Scoped ESLint passed** for changed TypeScript, tests and the browser validation script.
- **Production build passed**, including font resource/license validation. Existing large-chunk advisory remains.
- **Real Chrome browser, isolated local service and fresh QA database:** all five cards rendered; World selection, arrows/Space, blank creation, save/reopen equality, generated creation, and reused existing theme dialog succeeded at **1280 × 720**. Generated example contained 75 editable objects. No browser errors.
- Optional images deliberately blocked: native terrain/text/Symbol fallback rendered with a readable warning.
- No full unrelated suite, installer or Windows package was run.

Exact test command:

```text
npm test -- src/projects/newMap.test.ts src/world/themePreviewScene.test.ts src/app/NewMapWizard.test.tsx src/app/WorldThemePicker.test.tsx src/domain/worldThemes.test.ts src/projects/applyTheme.test.ts src/world/WorldWizard.theme.test.tsx
```

Browser reproduction: `node scripts/validate-new-map-themes.mjs` after building the local service.

## Artifacts

All screenshots are local in `deliverables.local/New-Map-Themes/`:

- `theme-comparison.png` — all five cards.
- `world.*.png` — five full-resolution miniature renders.
- `world.*-selected-1280.png` / `world.*-card.png` — every selected theme and card.
- `new-map-world-1280.png` — creation layout.
- `existing-theme-dialog-1280.png` — shared existing picker.
- `generated-preview-1280.png` — generation with selected theme.
- `missing-assets-fallback.png` — degraded resource handling.
- `validation.json` — final timing, persistence and browser results.

## Main changes

New `NewMapWizard`, `ThemeCards`, `newMapSnapshot`, `themePreviewScene` and cached `themePreview`; integration in `ProjectControls`, `localSession`, `WorldWizard`, `WorldThemePicker` and central theme availability/default helpers. Added focused tests and browser validation script. Updated theme documentation and ADR 0045. No service contract or persistent schema change.

No external push, merge, release, deployment, upload or cloud changes. No Windows package created.

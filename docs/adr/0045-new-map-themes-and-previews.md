# ADR 0045 — Theme-aware map creation and shared miniature previews

Accepted, 2026-09-26.

## Decision

New Map is one scrollable form with Basics, Size, Visual theme and Starting point. World and Regional default to `world.painterlyFantasy`; Battlemap retains its neutral customizable background. Availability comes from the existing theme registry's map-type lists. This is a creation default only: opening existing documents never applies a theme.

`newMapSnapshot` prepares the complete initial snapshot through `applyWorldTheme` before the project is persisted or opened. World generation receives the selection through `initialThemeId`, initializes the semantic asset family from it, and uses the existing `themeWorldAssets` before the scatter worker. The existing disposable generation preview remains a second step; it permits reviewing geography before committing. A theme change in that step invalidates its old result. Geometry generation has no theme input.

`ThemeCards` is shared by New Map and the existing Visual Theme dialog. Native button radios support roving focus, arrows, Home/End and Enter/Space. Previews are requested when visible, rendered serially through `exportScene`/`buildScene`, and retained as PNG data URLs. No live editor stage or animation loop is created. The temporary root and output canvas are destroyed after rendering. Existing painters retain their bounded internal caches.

`themePreviewScene` is a small native document: a peninsula, island, three semantic terrain regions, river, three mountain stamps, five forest stamps, settlement, region/water/settlement labels and compass. The renderer supplies water depth, coastal contours, geography finish, effects and frame. Every theme starts with the same contours, river nodes, positions and text. Theme application is the existing pure application function, not a second style engine.

The session cache key fingerprints the complete theme definition and explicit preview-scene version. A deployment/page reload rebuilds the cache from current renderer code, bundled images and fonts; no preview PNG is checked into the product. Changing canonical scene composition requires advancing `THEME_PREVIEW_VERSION`. Asset replacements are consumed on the next application load, not hot-polled while an installed application remains open.

## Resource boundaries

Previews read bundled public files only and never modify the user's library, project, selection or history. Painterly uses the bundled painterly mountain/forest and illustrated city; other samples retain the bundled engraved terrain stamps and native Symbol marker. Separate Parchment/Dark stamp packs are not currently bundled, which is disclosed beneath those selections. Real generation still requires compatible library assets and reports absent families. Missing optional preview images leave native terrain, labels and Symbol settlement available with a warning.

Premium terrain brush masks and settlement-family selection are not automatically governed by current themes. The sample demonstrates existing procedural terrain materials, not a promise of automatically painted masks or generated settlements. Compass/frame defaults are represented; title/cartouche defaults remain in the existing registry but are omitted from the compact scene.

## Persistence

No schema, stable theme ID, theme ownership rule, generator version or existing-map apply semantics changes. Existing format-12 direct render values and optional `map.theme` remain authoritative. Preserve-overrides, reset, annotation adoption and compatible asset replacement retain their behavior.

# ADR-0026 — Curated local map fonts

Accepted 24 September 2026.

## Decision

Bundle eight original, pinned, unmodified OFL-1.1 font families alongside existing Liberation Sans. The Google Fonts upstream snapshot, copyright, Reserved Font Name notices, variants and binary hashes are recorded in `public/fonts/manifest.json`, `src/fonts/library.json` and `THIRD_PARTY_FONTS.md`. Original licenses accompany every family. No runtime download, system-font enumeration, font upload or third-party font service is added.

Use original variable TTF files where upstream supplies them, without duplicate static files or modified/subset font binaries. Expose Regular 400 and Bold 700, plus real italic counterparts only where bundled. Marcellus SC has Regular only; IM FELL English has Regular and Italic; Cinzel and Roboto Condensed expose Regular/Bold. Unsupported bold/italic combinations resolve to an available variant rather than synthetic faces.

The central registry owns stable IDs, family aliases, category, fallback, variants, resource paths and creation defaults. Properties share one grouped preview picker with ordinary focusable buttons, pressed state, arrow/Home/End navigation and Escape. Marker labels also remain independently editable Label objects. No favorites, recents or search are necessary for nine entries including the legacy font.

## Rendering and layout

Preserve the existing glyph-by-glyph renderer and its deterministic advance tables. `scripts/curated-font-metrics.py` extracts cmap/hmtx advances and vertical metrics using FontTools 4.66.0. Variable instances are calculated in memory at exposed weights; distributed fonts are never rewritten. Both server validation and browser layout use the checked-in metrics. The original Liberation Sans metrics and baseline remain unchanged.

Bundled fonts use per-family vertical metrics for new text baselines and per-glyph advances for wrapping, title fitting, legend rows and label bounds. Existing carrier/layout and geometry transformations remain authoritative. Browser tests compare measured glyph widths with the tables for every exposed variant. Complex-script shaping/kerning and unsupported glyph fallback (`?`) retain the previous renderer's limitations.

A shared FontFace preload promise completes before application rendering, presets and PNG export. Font loads have a five-second deadline. Missing resources use visible fallback text instead of failing export; startup reports affected families and warns that export also uses fallback. Fallback cannot promise identical typography if application resources are damaged. Restore the fonts folder to recover the intended appearance. No font requests leave the local origin.

## Persistence and compatibility

Format 12 `TextStyle.font` accepts registered IDs and bounded safe legacy/system family strings. Existing `liberation-sans` styles are unchanged. Raw legacy strings remain stored verbatim; known family aliases resolve through the registry, other safe names/stacks are used by canvas with a Liberation Sans/generic fallback. Legacy/system layout uses the existing Liberation advances, so arbitrary system-font metric fidelity is not guaranteed; choosing a bundled family gives deterministic layout.

Legend and Scale bar gain optional `font` fields. Missing fields preserve their prior Liberation Sans appearance. No migration writes new defaults into saved objects. New-object defaults alone use Source Sans 3 on battlemaps, EB Garamond/Cormorant Garamond on regional labels/titles, Cinzel on world labels/titles, Spectral for readable map panels/legends, IM FELL English for parchment/scroll cases and Roboto Condensed for scale bars. Water semantic labels explicitly use Cormorant Garamond Italic when chosen.

Map, layer, history, project archive and service schemas are otherwise unchanged. Font edits use normal draft/Apply and undo/redo. Fonts are internal application resources, not project assets.

## Distribution

Vite copies `public/fonts` into `dist/fonts`, including original licenses, the source manifest and readable notices. The production build verifies pinned binary hashes and license/notice presence. Windows packaging runs the same check before creating output and copies the root font notice; its existing recursive `dist` copy carries all font resources. This decision does not authorize creating a new Windows package.

# Curated font library — delivery report

## Acceptance and result

Delivered a compact offline font library, shared accessible visual picker, new-object defaults, backward-compatible saved styles, native text metrics, reliable font-loading/export barrier, original licenses and build/package resource checks. No font uploads, remote runtime font service or system-font browser was added.

## Fonts and licensing

All eight requested candidates were verified against Google Fonts upstream revision `23e54b51ddffbc7713c583748e3bd86f62b1fa4a`; none were omitted. All use SIL OFL 1.1. Exact family source URLs, copyright/author statements, original filenames and license locations are in [THIRD_PARTY_FONTS.md](../../THIRD_PARTY_FONTS.md); the source manifest records binary SHA-256 hashes. Marcellus and Source Reserved Font Names are retained in their original notices. Original binaries are unmodified and keep their upstream filenames; the internal CSS aliases do not rename or modify the font binaries.

| Family | Exposed variants |
|---|---|
| Cinzel | Regular, Bold |
| Marcellus SC | Regular |
| Cormorant Garamond | Regular, Bold, Italic, Bold Italic |
| EB Garamond | Regular, Bold, Italic, Bold Italic |
| Spectral | Regular, Bold, Italic, Bold Italic |
| IM FELL English | Regular, Italic |
| Source Sans 3 | Regular, Bold, Italic, Bold Italic |
| Roboto Condensed | Regular, Bold |

Regular/Italic are weight 400; Bold/Bold Italic are 700. Variable originals are used where appropriate, without duplicate static copies. Existing Liberation Sans's four variants and original license remain. The complete font resource directory, including existing fonts and notices, is about 7.2 MB uncompressed.

## Architecture and integration

- `src/fonts/{registry.ts,library.json,metrics.json,vertical.json}` centralize IDs, family names, categories, variants, fallbacks, source metadata, creation defaults and deterministic glyph/vertical metrics.
- `src/app/FontPicker.tsx` and CSS Module provide category groups, family names, real font samples, pressed selection state, Tab/arrows/Home/End/Enter/Escape. Existing choices appear under System / Legacy; selecting a bundled font normalizes unsupported bold/italic flags.
- Shared TextFields integration covers Label, Title/Cartouche/banner, Info/List/Note. Legend, Scale bar and Marker Properties also use the same picker. Marker labels remain ordinary linked Label objects.
- `annotations.ts`, `decorations.ts` and `cartographicPresets.ts` add only creation defaults and optional font fields for legends/scale bars. Existing saved styles are not migrated. Source Sans 3 serves new battlemap text; regional/world text uses EB Garamond/Cormorant/Cinzel; readable panels use Spectral, parchment/scroll cases IM FELL English, and scale bars Roboto Condensed.
- `annotationFonts.ts` loads every exposed local face through one shared promise with a five-second limit. `main.tsx` waits before rendering; the existing PNG and preview entry points use the same barrier. Missing files produce a visible startup warning and usable fallback text, including export.
- `drawAnnotation.ts` and `drawCartography.ts` use the registry for the exact intended family/variant and font-specific baseline. Width, wrapping and title fitting use metrics extracted from the same original font files. Legacy Liberation layout stays unchanged.
- `scripts/curated-font-metrics.py` reproduces checked-in metrics using FontTools 4.66.0; variable instances exist in memory only. No runtime dependency was added.
- `scripts/check-font-resources.mjs`, the build command and Windows package script verify resource hashes and licensing before distribution. Vite's public copy and the package's existing recursive dist copy include all originals and notices. The root notice is also copied to the package root.

Persistence remains format 12: TextStyle.font retains a stable registry ID or safe legacy family string, and Legend/Scale bar have optional font values. Missing fields retain old appearance. See [ADR 0026](../adr/0026-curated-font-library.md).

## Validation

- Targeted unit/component tests: **50 passed** (49 across registry, picker, annotations, decorations, title banners, cartographic labels and markers; one additional font persistence/undo/redo regression).
- Checks cover registration, variant resources, original-file hashes, licenses/notices, packaging guard, actual font-specific widths, supported variants, legacy values, safe family validation, grouped preview/selection/keyboard behavior and JSON round-trip with undo/redo.
- Scoped ESLint: **passed** for all changed/new TypeScript modules and tests.
- Production build: **passed**, including client and service TypeScript checks and resource verification for all eight new families. Windows packaging script syntax checked; no executable built.
- `node tests/persistence/fonts.mjs`: **passed** in real Chrome against an isolated local Vite instance. Font requests delayed by 350 ms; ordinary PNG export waited for loaded faces (about 721 ms for this run). All exposed variants' browser-measured W advances matched checked-in metrics within 0.1 px at 60 px size.
- Visual matrix covers Cinzel, Cormorant Garamond, EB Garamond, Source Sans 3 and IM FELL English across labels, titles, ribbon banners and legends, including bold/italic availability, halo, rotation and opacity. PNG inspected. Keyboard navigation/selection/Escape verified in the real shared picker. A fresh page with every TTF request blocked still exported a PNG and reported missing families.
- Evidence: [browser results](evidence/fonts/results.json), [PNG matrix](evidence/fonts/fonts-export.png), [browser render](evidence/fonts/fonts-render.png).
- Full unrelated suite, cross-OS visual comparisons and Windows packaging were not run. Consistency is supported by pinned files, shared metric tables and browser font/metric checks, not a claim of testing every operating system.

## Limitations

The existing renderer places individual glyphs; complex-script shaping, kerning and font uploads remain out of scope. Unsupported glyphs retain the existing question-mark fallback. System/legacy font names are preserved, but their layout uses legacy metrics and availability remains machine-dependent. Use bundled fonts for predictable results. Damaged font resources cause a visible warning and degraded typography rather than a failed export. No favorites, recents or large font browser were added.

Repository has an unborn master and no existing develop branch; existing untracked work was preserved. Read-only upstream font retrieval was performed to fulfill the licensing/resource request. No pushes, releases, uploads, deployments or cloud changes were performed. **No Windows package was created.**

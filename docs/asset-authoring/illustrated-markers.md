# Illustrated settlement and landmark assets

Use an ordinary `stamp` in asset manifest schema 1, 2 or 3. No new schema keys are needed. Required for automatic semantic recommendations: at least one explicit `marker:<type>` tag. Unknown marker types are rejected by both the package validator and library metadata editor.

Registered types: `capital`, `city`, `town`, `village`, `fort`, `ruin`, `temple`, `harbor`, `cave`, `dungeon`, `tower`, `camp`, `landmark`, `gate`, `mine`, `bridge`, `poi`, `objective`, `entrance`, `exit`, `warning`, `custom`. Multiple marker tags are supported. A city of major importance is `city` with marker prominence Major, not a second asset type.

Optional `theme:<slug>` and `style:<slug>` classify visual families; slugs use lowercase ASCII letters/numbers/hyphens, start with a letter and contain 1–60 characters. On assets with marker tags, theme/style slugs are validated. Namespaced tags are case-sensitive; ordinary tags retain their existing behavior. The bundled family uses `theme:painterly-fantasy` and `style:painterly`. Do not substitute terrain generator semantic types: Places are semantic markers, not generated terrain stamps.

```json
{"schemaVersion":3,"assets":[{"file":"assets/city.png","type":"stamp","title":"Stone city","tags":["marker:city","marker:capital","theme:painterly-fantasy","style:painterly"],"applicableMapTypes":["world-map","regional-map"],"defaultSize":{"mode":"world","width":220000,"unit":"m","lockAspectRatio":true}}]}
```

`applicableMapTypes` is a strict candidate filter; empty/missing means any map type. Type filters recommend compatible artwork. Manual override includes other stamps without changing their logical role. Theme/family filters operate on the displayed page of imported assets; use the next library page for larger collections. The bundled catalog is always available locally. Library images with identical bytes take precedence over duplicate bundled previews, preserving edited library metadata.

Use transparent PNG/WebP, restrained detail and a clear silhouette, no labels or badges, no square terrain bases. The bundled atlas family uses consistent northwest light and muted gouache/ink. Keep source resolution proportionate: the curated family is 384px on its longest edge. Test at actual map size and on land and water; a large source preview is not sufficient.

Package world-size defaults apply to ordinary Library stamp placement. Smart Marker defaults instead derive an exaggerated atlas width from map width, semantic type and prominence; users can set exact width in km. This avoids claiming settlement symbols are literal geographic footprints. Already placed objects never resize after package metadata updates.

Validate using `node scripts/validate-asset-pack.mjs your-pack.zip`. Import through Asset Library. The actual 31-image example is `public/settlement-assets-painterly/mapweaver-settlements-painterly.zip`, with catalog, exact imagegen prompts, SHA-256 provenance and usage note. Existing library exports preserve all supported tags, sizes and map types; extra README/provenance files are not automatically re-exported by the library.

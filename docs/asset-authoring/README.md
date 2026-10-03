# Make a Mapweaver asset pack

This kit describes the runtime shipped in this repository, checked on 26 September 2026. No code or Codex assistance is needed to author a pack. An image editor, UTF-8 text editor and ZIP tool are sufficient; Mapweaver's import preview validates the result. The optional developer CLI needs the repository and its npm dependencies.

Throughout this kit, **REQUIRED** means enforced by the importer, **OPTIONAL** means supported but unnecessary, and **RECOMMENDED** means a quality guideline, not a validation rule. A successful validation does not certify visual quality or redistribution rights.

## Choose a starting point

| Goal | Guide | Complete editable template |
| --- | --- | --- |
| Place an individual object | [Stamps](stamps.md) | [Minimal stamp](templates/minimal-stamp-pack/mapweaver-assets.json) |
| Repeat a surface inside an Area | [Fill patterns](fill-patterns.md) | [Minimal fill](templates/minimal-fill-pattern-pack/mapweaver-assets.json) |
| Supply a terrain surface image | [Terrain textures](terrain-textures.md) | [Terrain Area fill](templates/minimal-terrain-texture-pack/mapweaver-assets.json) |
| Supply world generator symbols | [Generator metadata](generator-metadata.md) | [Mountain and forest](templates/generator-ready-world-pack/mapweaver-assets.json) |

**Current limitation:** Terrain Brush offers classic procedural textures and a bundled premium painterly registry ([guide](../premium-terrain.md)). No asset ZIP can install a brush image or brush preset. The terrain template is a valid **Area fill pattern**, not a brush extension. Satisfying brush-image import requires a future product change; this kit does not invent a package format for it.

Ready-to-import ZIPs are in [examples](examples/README.md). Each template contains real images and a complete manifest. They are small instructional examples, not a production art collection.

## Start to finish without Codex

1. Read [image preparation](image-preparation.md); prepare your original PNG, JPEG or WebP images.
2. Choose simple descriptive filenames, preferably lower-case ASCII with hyphens. Keep image paths below 240 characters. See [package format](package-format.md) for enforced restrictions.
3. Copy a complete template folder somewhere you can edit it. Keep `mapweaver-assets.json` directly inside it and images under `images/` or `assets/`.
4. Replace its images. Edit the JSON in a plain text editor: no comments, trailing commas or smart quotation marks. Save UTF-8 without a byte-order mark.
5. Set each `file` to the exact relative path, including case and extension. Change the title, description, tags, source and license to describe **your** artwork, not the template's.
6. Set `categoryPath` and update collection member paths/types. Parent category declarations are unnecessary; explicit category definitions preserve empty folders and ordering.
7. Set the intended map types and default size. For generator stamps, use schema 3 and add only the supported [generator fields](generator-metadata.md).
8. **OPTIONAL:** compute SHA-256 after the final image edit, following [validation](validation.md). Replace the template's digest or omit `sha256`; never leave an old digest.
9. Check your JSON fields against [package format](package-format.md). Use a local JSON editor/schema checker if available; final validation must include actual images.
10. ZIP the **contents** of the folder, not the outer folder. Opening the ZIP must show `mapweaver-assets.json` at its root. The examples below create a new ZIP outside the source folder.
11. **OPTIONAL:** run `npm run validate-asset-pack -- path/to/pack.zip` from an installed repository. Otherwise proceed to Mapweaver's preview, which runs the same import checks.
12. In **Asset library → Import assets**, choose the ZIP, preview, inspect every error/warning, permit the intended category creation/mapping, choose a duplicate policy, review resolved changes and confirm import.
13. Verify category, collection, metadata and applicability in the library. Place a stamp on a map with a known physical scale, or fill an Area and inspect repeats at 0.5, 1 and 2. Compare visible artwork with its full image bounds.
14. Fix any errors using [troubleshooting](troubleshooting.md), create a new ZIP and preview again. Before distributing, export the imported selection and re-import it in a separate test library. Compare metadata and placement; retain original notices separately because arbitrary ZIP extras are not re-exported.

PowerShell, from the copied template folder:

```powershell
Compress-Archive -Path .\mapweaver-assets.json,.\images,.\README.md,.\LICENSE.txt -DestinationPath ..\my-pack.zip
```

Use `assets` instead of `images` if that is your chosen folder. Alternatively select these entries in Explorer and compress them. On Linux/macOS:

```sh
zip -0 -r ../my-pack.zip mapweaver-assets.json images README.md LICENSE.txt
```

Stored ZIP compression (`-0`) avoids the importer's 200× expansion-ratio limit for unusually uniform images. Normal deflate ZIP compression is also supported.

## Reference

- [Package format, all envelope fields, categories and collections](package-format.md)
- [Image preparation and quality checklists](image-preparation.md)
- [Licensing and source records](licensing.md)
- [Checksums, validator and regression tests](validation.md)
- [Errors and visual troubleshooting](troubleshooting.md)
- [Audited discrepancies and scope](discrepancies.md)

The [runtime parser](../../src/domain/assetManifest.ts) link is intentionally not needed to follow this guide; developer source references are listed in the validation guide.

## Illustrated Smart Marker assets

See [illustrated marker authoring](illustrated-markers.md) for validated `marker:`, `theme:` and `style:` tags in the existing stamp schema.

# Validation and checksums

**REQUIRED:** a usable pack must pass the real importer, including image decoding, semantic checks, exact paths, checksums if present and import review. Standalone JSON Schema validation is helpful but insufficient. **OPTIONAL:** use the CLI below; a non-developer can use Mapweaver's Import assets preview and review instead, without installing Node.

## Local command

From the repository, after `npm install` (Node ≥22.12):

```sh
npm run validate-asset-pack -- docs/asset-authoring/examples/minimal-stamp-pack.zip
```

The command accepts exactly one ZIP path and reports JSON with `valid`, decoded asset count, warnings, errors and entry file/type/dimensions. Exit 0 means valid; exit 1 means invalid or invocation failure. Warnings do not cause a failure. The first malformed structural field may stop parsing; correct it and run again. Image errors are collected per entry.

It bundles the current TypeScript validator with existing Vite, invokes **the actual `previewPack` and `commitPack(..., true)` transactional review** in an isolated temporary SQLite library, then closes/removes that library and temporary bundle. It does not start a service, open a port, import into the user's library or change pack bytes. No dependency or separate schema implementation is added.

This checks exact references, generator metadata, checksum/decoder rules, ZIP safety and category creation using normal runtime code. It cannot predict duplicate/title/category conflicts in your actual populated library, assess art quality, or certify permissions. Missing root manifests retain the runtime's image-only fallback, so also inspect the ZIP root and resulting metadata. For real-library conflicts, preview in the destination library.

## SHA-256

`sha256` is **OPTIONAL**, exactly 64 lowercase hexadecimal digits, calculated over the **raw original file bytes** (including metadata). Changing pixel data, EXIF metadata or compression changes the hash. Mapweaver always computes a digest on import; if supplied, it must match. Uppercase strings and null are invalid. **RECOMMENDED:** include digests in distributed packs and recalculate only after the final image edit.

PowerShell:

```powershell
(Get-FileHash -LiteralPath '.\images\chair.png' -Algorithm SHA256).Hash.ToLowerInvariant()
```

Linux:

```sh
sha256sum images/chair.png
```

macOS:

```sh
shasum -a 256 images/chair.png
```

Optional Python:

```sh
python -c "import hashlib,pathlib; print(hashlib.sha256(pathlib.Path('images/chair.png').read_bytes()).hexdigest())"
```

Copy only the 64-digit digest into the entry, not the filename/output padding. Remove the field if you choose not to maintain it. SHA-256 detects changed bytes, not author identity or visual similarity.

## Maintainer drift checks

```sh
npm run test:service -- service/assetAuthoring.test.ts
```

Tests exercise all template folders and all shipped example ZIPs through the runtime decoder/preview and transactional review; import/export/re-import checks cover the templates. Negative cases exercise unsafe paths, missing images, future schema, invalid collections, generator values, sizing and bad checksums. Documentation field/taxonomy checks and exact inline size examples are also tested.

Rebuild the small distributable examples after deliberately changing their source templates/artwork:

```sh
node scripts/build-asset-authoring-examples.mjs
```

This script is for maintainers and rewrites the authoring templates/examples only. It is not needed by pack authors and does not create a Windows package.

Runtime authorities: [manifest parser](../../src/domain/assetManifest.ts), [metadata and size validators](../../src/domain/library.ts), [generator validator](../../src/domain/generatorAssets.ts), [ZIP preview/import/export](../../service/libraryPacks.ts), [decoder](../../service/storage.ts), [image limits](../../src/imports/limits.ts). Structural editor schemas: [v1](../../public/asset-templates/mapweaver-assets.schema.json), [v2](../../public/asset-templates/mapweaver-assets-v2.schema.json), [v3](../../public/asset-templates/mapweaver-assets-v3.schema.json). These local schemas need no external service.

# Troubleshooting

**REQUIRED:** resolve import errors before committing; one error blocks the reviewed batch. **OPTIONAL:** run the CLI repeatedly while editing. **RECOMMENDED:** keep the original ZIP and test in an isolated library before publishing.

## Actual runtime errors

| Error or symptom | Fix |
| --- | --- |
| `Unsafe relative asset path.` | Use forward slashes and relative paths; remove traversal, reserved device names, forbidden characters, trailing dots/spaces and excessive path length. |
| `Windows-normalized ZIP paths collide.` | Remove duplicate entries, including case/NFKC-equivalent names. |
| `Unsafe ZIP entry.` | Use stored/deflate, unencrypted regular files; remove symlinks and keep entry count ≤2,002. |
| `Pack exceeds 128 MiB.` / `ZIP expansion limit exceeded.` | Split the pack, reduce files, or use stored compression for high-ratio entries. Check per-file 20 MiB and 200× expansion limits. |
| `Missing exact path: images/chair.png` | Match `file` to the ZIP entry exactly, including case and folder. |
| `Unsupported asset manifest schemaVersion; expected 1, 2 or 3.` | Choose a supported version; generator requires 3. Do not use a project format version. |
| `Generator metadata requires a stamp in manifest schema 3.` | Use schema 3 and stamp role, or remove generator metadata from fills/prefabs. |
| `Invalid applicable map types.` | Use exact map IDs or empty array; do not combine `any` with named types. |
| `Unknown size unit.` / `Size unit does not match mode.` | Use cells for grid, ft/m for world. Kilometres must be expressed in metres. |
| `Enter both dimensions, or one with aspect lock.` | Add missing dimensions or enable aspect lock with one positive dimension. |
| `Locked dimensions conflict with source aspect ratio (0.1% tolerance).` | Omit one locked dimension or correct ratio, including alpha margins. |
| `Invalid SHA-256.` / `SHA-256 does not match image.` | Recompute lowercase raw-file hash after editing, or omit optional hash. |
| `duplicate entry for the same role.` (prefixed by file) | Remove repeated file/type entry. Same image in stamp and fillPattern is allowed. |
| `Invalid generator semantic type or version.` | Use taxonomy exactly; no custom types or display labels. |
| `Invalid generator metadata fields.` | Remove unsupported fields/aliases; also inspect nested scale/rotation. |
| `Generator scale must be an ordered range within 0.01–100.` | Fix bounds and min ≤ max. This is generator variation, not image dimensions. |
| `Collection references a missing asset entry.` | Update member file/type after renames; include matching manifest entry. |
| `A category path already exists. Explicitly allow existing path mapping or choose a new prefix.` | Deliberately approve mapping in import or choose a new namespace. |
| `Sidecar conflicts with collection manifest. Choose which metadata to use and preview again.` | Remove conflicting duplicate metadata or select precedence in import. |
| `No supported images or categories found.` | Check manifest/images, spelling/extensions and empty manifest content. |
| `Original filename must not contain a path.` | Put only the filename in originalName; folders belong in file. |
| `The image exceeds 8,192 pixels per side or 24 million pixels in total.` | Resize the source; source dimensions, not intended placement size, exceed limits. |
| Import succeeds but all metadata disappears | Check ZIP root. A nested manifest is ignored and image-only fallback can run. |
| Re-import creates another item | Image bytes changed or it is a prefab. Ordinary dedup is role + hash, not title. |
| Preview expired / library changed | Preview and review again; tokens expire after 15 minutes or a replacement preview, and revisions protect against stale changes. |

## Visual problems — RECOMMENDED checks

- **Too small/large stamp:** inspect its full image bounds, default mode, applicability and map physical scale. At 50 px/5 ft, 20 ft is 200 px. Native mode may shrink to one quarter of map extent. Current instance size is separate from library defaults.
- **Tiny visible art inside correct dimensions:** crop invisible borders, then update hashes and size defaults. This changes image identity on import; existing placed assets are not silently replaced.
- **Obvious tiling:** preview 3 × 3, fix edge/corner continuity and remove strong localized lighting. Test several scales before increasing resolution.
- **Terrain too noisy:** lower contrast/frequency in an Area texture, or adjust built-in brush texture scale/strength. Imported fills do not become brush styles.
- **Wrong light/perspective or inconsistent family:** correct source artwork; generator metadata cannot repair it. Disable rotation for upright directional symbols.
- **Asset missing from picker:** verify active role, category/search/favorite/collection and map applicability; try Show assets for all map types deliberately.
- **Generator never uses asset:** check schema 3 stamp metadata, exact semantic/theme/biome compatibility, size and spacing. Read generation warnings. A valid pack alone does not guarantee every generator uses every role.

Full quality checklists are in [image preparation](image-preparation.md), [terrain textures](terrain-textures.md) and [generator metadata](generator-metadata.md).

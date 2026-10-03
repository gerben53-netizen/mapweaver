# Asset package format

**REQUIRED** rules below describe runtime acceptance. **OPTIONAL** fields may be omitted. **RECOMMENDED** naming and organization conventions are identified separately. Asset ZIPs are distinct from `.mapweaver` projects (`project.json`), complete service backups and specialized wall-set ZIPs.

## Layout and paths

```text
mapweaver-assets.json
images/
  chair.png
README.md
LICENSE.txt
notices/
  sources.txt
```

For manifest-driven import, **REQUIRED:** the exact case-sensitive name `mapweaver-assets.json` is at the ZIP root. Images may be nested anywhere and are referenced with exact forward-slash relative paths. A path has at most 240 JavaScript string code units. Empty segments, `.`/`..`, backslashes, `< > : " | ? *`, control characters below U+0020, segments ending in a dot/space, and Windows device names (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`, also with extensions) are refused. These rules also exclude absolute/drive paths. Unicode filenames are allowed; **RECOMMENDED:** simple ASCII names avoid cross-platform surprises.

ZIP paths must be unique after Unicode NFKC normalization and lowercasing. Directory entries are checked too, count toward the entry limit, and otherwise skipped. Symlinks, encrypted entries and compression other than stored/deflate are rejected. Extra safe files such as notices are ignored, but still consume ZIP limits. They are **not stored or re-exported**. A `.mapweaver.json` file is a metadata sidecar, not an ignored extra.

Without a root manifest, the importer scans `.png`, `.jpg`, `.jpeg`, `.webp` paths case-insensitively and assigns the selected stamp/fill-pattern role with native defaults. Consequently, accidentally nesting the manifest may import images **without their metadata**, instead of producing an error. With a root manifest, unlisted images are ignored except entries introduced by sidecars.

**OPTIONAL sidecars:** `images/chair.mapweaver.json` uses the same manifest envelope with exactly one asset, `file: "images/chair.png"`. Basename and exact path must agree. Conflicting sidecar/root metadata blocks preview until the user explicitly chooses sidecar or collection precedence. Avoid shipping duplicate metadata sources unless needed.

## Enforced archive limits

| Quantity | Limit |
| --- | --- |
| ZIP input size / total expanded files | 128 MiB each |
| Individual expanded file, including JSON or notices | 20 MiB |
| ZIP entries including directories/extras | 2,002 |
| Expansion ratio per file | 200× compressed size; denominator at least one byte |
| Asset entries | 1,000 per manifest and final merged import |
| Category definitions | 2,000 |
| Collections | 200 in `collections` |
| Members per collection | 1,000 |
| Images | 20 MiB, 8,192 px per edge, 24,000,000 pixels total |

The older direct-image import helper has a separate 50-image batch limit; the library package importer accepts up to 1,000 entries. ZIP export checks 128 MiB expanded content and 1,000 assets (including prefab dependencies). Split oversized libraries into packs or use backups.

## Root manifest

| Field | Requirement and type | Meaning, omission and example |
| --- | --- | --- |
| `schemaVersion` | REQUIRED integer: `1`, `2`, `3` | Use 1 for ordinary stamps/fills, 2 when including prefabs, 3 for generator metadata. 3 can also contain ordinary entries and prefabs. Future versions are rejected. |
| `assets` | REQUIRED array, ≤1,000 | Each entry below. Empty is allowed by parser; import needs at least one asset or declared category. |
| `collection` | OPTIONAL object | `{ "title": "Study furniture", "description": "Small desks" }`; creates one collection containing all entries. No independent package ID/version/name fields exist. |
| `categories` | OPTIONAL array, ≤2,000 | `{ "path": ["Furniture", "Desks"], "sortOrder": 0 }` entries; declares ordering or empty categories. Omitted means asset paths alone create categories. |
| `collections` | OPTIONAL array, ≤200 | Named subsets with exact file/type member references; omitted means none. |

`collection.title` and each `collections[].title` are required nonblank strings ≤120; description is optional, default empty, ≤4,000. Container fields should be omitted, not set to null. Unknown envelope/entry/category/collection/member fields produce warnings and are discarded. Nested generator fields are stricter: unknown fields reject the pack. Do not rely on misspellings being detected as errors at the envelope level.

## Asset entry: every supported field

| Field | Requirement/type/limit | Omission and behavior |
| --- | --- | --- |
| `file` | REQUIRED safe relative string ≤240 | Exact image path, e.g. `images/chair.png`; cannot be a URL. |
| `type` | REQUIRED `stamp`, `fillPattern`, `prefab` | Exact casing. `terrainTexture`, `background`, `fill-pattern` are not manifest roles. |
| `title` | OPTIONAL nonblank string ≤120 | Derived from filename: remove last extension, replace underscores with spaces, trim; numeric prefixes stay. Derived title must also fit. |
| `originalName` | OPTIONAL nonblank string ≤255; no `/` or `\` | Defaults to image basename; preserves source filename when exports use hash paths. |
| `description` | OPTIONAL string ≤4,000 | Empty by default. Plain text, not HTML. |
| `categoryPath` | OPTIONAL array of ≤8 nonblank names ≤80 each | Omitted uses selected import destination for new assets. `[]` explicitly means root/Uncategorized without a prefix. |
| `tags` | OPTIONAL array ≤30 strings, each nonblank ≤80 | Empty by default; normalized duplicates collapse, retaining the last spelling. |
| `defaultSize` | OPTIONAL object | Defaults to native + aspect lock on for new assets. [Exact modes](stamps.md). Fill patterns only accept native; it is not a pattern-scale setting. Prefabs use composition size. |
| `applicableMapTypes` | OPTIONAL array ≤3 | Values `battlemap`, `regional-map`, `world-map`; default empty means any. Duplicates collapse. String `"any"` and `["any"]` also normalize to empty; do not mix `any` with other types. |
| `sha256` | OPTIONAL string, exactly 64 lowercase hex digits | Hash of raw file bytes, checked if supplied; always computed on import. No null. |
| `author` | OPTIONAL string ≤240 | Empty by default; free text. |
| `source` | OPTIONAL string ≤1,000 | Empty by default; free text, URLs not fetched. |
| `license` | OPTIONAL string ≤1,000 | Empty by default; free text, no license-ID validation. |
| `favorite` | OPTIONAL boolean | False by default. Author recommendation: omit personal preference. No null. |
| `generator` | OPTIONAL object or null, schema 3 stamps only | [Generator contract](generator-metadata.md). Missing means no new procedural metadata; null explicitly clears it under overwrite. |
| `prefab` | REQUIRED for `type: prefab`, forbidden otherwise | Schema 2/3 composition payload; see below. |

Strings are trimmed after length validation. Limits use JavaScript UTF-16 string length, so some characters count as two. Required/nonblank strings reject all U+0000–U+001F controls and DEL. Optional description/provenance strings permit tab and LF, but not other controls (including CR) or DEL. Tags and category matching use NFKC + trim + case-insensitive normalization.

For legacy optional `title`, `description`, `author`, `source`, `license`, `categoryPath`, `tags`, `defaultSize`, `applicableMapTypes`, null is treated as **absent**. An empty title is invalid; empty description/provenance strings and empty tags are explicit values. Booleans, hashes, originalName and individual size dimensions do not accept null. Missing fields never clear an existing item during duplicate handling.

## Categories and collections

Asset category paths create their parents; no explicit root declarations are needed. `categories[].path` follows the same eight-level/name rules. `sortOrder` is REQUIRED, a nonnegative safe integer (≤9,007,199,254,740,991); it applies when creating the leaf. Existing mapped category order is retained. The importer requires explicit user permission to create or reuse category paths. A prefix plus the manifest path must still fit eight levels. Normalized matching siblings are reused, not renamed silently. Empty categories survive when explicitly declared. `Uncategorized` is a reserved local node, not an external ID to put in the manifest.

Collections group items independently of category or image role. Each member has REQUIRED `file` and `type`, matching an entry in this manifest. The same file can occur once per role (`stamp` and `fillPattern` are separate logical items). Duplicate identical file/type asset entries are errors; repeated collection memberships collapse during import. Same normalized collection title **and same description** reuse a collection and add members; otherwise a new collection is made. Renaming files requires changing every member reference and sidecar path. Local database UUIDs are neither required nor accepted as overwrite authorization.

Exact complete collection examples are in [the generator template](templates/generator-ready-world-pack/mapweaver-assets.json) and [stamp template](templates/minimal-stamp-pack/mapweaver-assets.json).

## Duplicate policy and transfer

Ordinary assets deduplicate by **role + SHA-256 of image bytes**, not title or filename. Same bytes in different roles intentionally yield separate logical items; identical bytes under multiple filenames in one role converge. Different images with the same title remain separate and can produce an ambiguity warning. Re-importing a changed image creates a new asset identity, even if its filename stays the same. Existing placements are not replaced.

- **Keep existing:** retain metadata; collections may gain membership.
- **Fill only missing fields:** fill absent/empty values, native sizing or Uncategorized; do not replace populated values.
- **Overwrite present fields:** change explicitly supplied metadata; omitted/null-normalized fields do not clear it. Explicit empty tags/text/path can clear those fields.

Retained removed assets are revived using the same role/hash identity with fresh metadata. Prefabs do not use ordinary image-hash deduplication; importing the same prefab again may create another composition.

Export writes schema 3 if any generator metadata is present, otherwise 2 for prefabs, otherwise 1. It preserves supported metadata and images, not arbitrary input JSON fields, comments, notices or folder layout. Exported filenames are commonly hash-based and `originalName` preserves provenance. Re-exported JSON need not be byte-for-byte identical.

## Prefabs and specialized resources

**RECOMMENDED:** author compositions in Mapweaver using **Save as reusable prefab** and export them; do not construct project object graphs by hand. A prefab entry still references a real preview image via `file`. Its REQUIRED `prefab` object contains `formatVersion: 1`, `mode: "editable" | "flattened"`, `bounds`, `visibleBounds` (x/y/positive width/height), `anchor` (x/y), `sourceMap`, `document`, `renderScale: 1 | 2`. Unknown prefab fields reject. Coordinates must be finite within ±1e9; metadata ≤4 MiB; ≤2,000 objects, 128 layers, 512 image dependencies. The embedded document must pass the current project parser, have objects and no background or external object relationships. Flattened contains exactly one ordinary stamp. `sourceMap` is validated as a map with no background.

Every dependency must have an image entry with matching role, hash, MIME and decoded dimensions; recursive prefab dependencies are unsupported. Export automatically closes dependencies, still within the 1,000-entry pack limit. Native size uses stored bounds, not preview pixels; placement scales compositions uniformly. See [prefab workflow](../prefabs.md) and [prefab schema](../../public/asset-templates/prefab-v1.schema.json) for the complete embedded composition contract. Wall sets require their specialized original ZIP or a backup; a loose atlas cannot preserve a wall-set registration. Background images transfer with projects.

## Illustrated Smart Marker assets

See [illustrated marker authoring](illustrated-markers.md) for validated `marker:`, `theme:` and `style:` tags in the existing stamp schema.

## Recommended fill-pattern scale

A `fillPattern` entry may include `patternScale` (for example `0.75`) (finite 0.01–100). The Battlemap Texture Brush uses it when choosing the material from Library; existing strokes and Area settings are unchanged. Omit it for native scale 1. Stamp/prefab entries may not contain this field. See ADR-0047.


## Non-destructive quality audit metadata

An optional `quality` object is supported in manifest versions 1, 2 and 3. It contains required `classification` (`KEEP`, `FIX`, `REPLACE`, `REJECT`, `DUPLICATE`), `reason` (1–4,000 characters), `semanticClass` (lowercase letters/underscores, or null) and `softShadowDefault` (boolean or null). The metadata round-trips through library export/import. REPLACE, REJECT and DUPLICATE remain resolvable by ID for existing maps but are excluded from new-placement search, palettes and generator candidates. An omitted field does not silently reactivate an audited existing image. This is independent of Trash/deletion and never changes existing objects.

False `softShadowDefault` applies an off override only to newly placed stamps (for example rugs). True leaves the map-wide contact-shadow setting in control. Unknown values stay null rather than inventing semantic or scale metadata.

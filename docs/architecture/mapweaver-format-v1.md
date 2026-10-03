# Mapweaver format v1

Status: legacy read format, superseded for writing by [v2](mapweaver-format-v2.md) in Sprint 10. Accepted for Sprint 8, 2026-09-23. This document defines the first portable format; future changes require an explicit version/migration decision.

## Container

A `.mapweaver` file is a single-disk ZIP (stored or deflate entries, no encryption or ZIP64). Required `project.json` is UTF-8 JSON. Every referenced image is embedded exactly once as `assets/<id>.png`, `.jpg` or `.webp`. Optional `preview.png` is an unreferenced UI preview, never map output. No directories, duplicate names, absolute paths, backslashes, traversal components, unlisted assets or arbitrary extra entries are accepted. ZIP central/local names, methods, flags, sizes and CRC are checked. Original asset bytes and transparency are retained. SHA-256 is over those original bytes.

## JSON schema

All fields below are required unless explicitly optional. Unknown fields are rejected rather than silently dropped. No editor status, URLs, blobs or history is permitted.

- `formatVersion`: integer 1. Future versions are rejected; `parseProject` is the single version/migration entry point.
- `id`: project identifier; `name`: trimmed nonempty 1–120 character name.
- `createdAt`, `modifiedAt`: canonical ISO-8601 UTC strings (`Date.toISOString()`), modified >= created.
- `map`: `width`, `height` (whole map pixels), `backgroundColor` (#RRGGBB), optional `background` (default null) and optional `grid`.
- `background`: null or `{id,name,width,height}`. ID references an asset and dimensions match its decoded dimensions. Its natural display dimensions are independent of map size.
- `grid`: optional fields `visible` (true), `snapEnabled` (false), `cellSize` (50), `offsetX/Y` (0), `color` (#58645c), `opacity` (0.35), `renderAboveObjects` (false). Defaults apply only to absent optional fields. Cell size 4–1024, offsets finite, opacity 0–1. Valid values are preserved, not silently normalized.
- `layers`: nonempty ordered array, front to back. Each `{id,name,visible,locked,objectIds}` has a nonempty name (<=120); objectIds are back to front. Unique layer IDs. Each object belongs to exactly one layer, no dangling or repeated membership.
- `objects`: array with unique IDs. Common required fields: `kind`, `id`, `assetId`, `x`, `y`, `width`, `height`, `opacity`. Optional `locked` defaults false. Positions may be outside the map; width/height positive; opacity 0–1.
- Stamp: `kind: "stamp"`, required `rotation` (0 <= value <360), `scaleX/Y` (+1 or -1).
- Pattern: `kind: "patternFill"`, required `mode` (repeat/stretch), `patternScale` (0.01–100), `patternRotation` (0 <= value <360), `patternOffsetX/Y` finite. Width/height >=8. Optional adapter fields `rotation/scaleX/scaleY` default 0/1/1 and accept only those values. No whole-pattern rotation/flips.
- `assets`: unique-ID array of `{id,fileName,mimeType,width,height,hash,path}`. fileName is nonempty <=255 characters, display metadata only. MIME is image/png, image/jpeg or image/webp; extension/path must match. Hash is lowercase 64-character SHA-256 hex. Manifest IDs equal the set of background/object asset references: no missing or unused entries. Encoded image type, dimensions, full decoding and hash are verified before replacement.

IDs use `[A-Za-z0-9_-]{1,80}`. Strings reject control characters. Geometry/offset numeric fields are finite, with absolute value <=1,000,000,000; dimensions positive. Colors are six-digit case-insensitive hex and are preserved as supplied.

## Central limits

`src/projects/limits.ts`: archive <=128 MiB, actual total unpacked <=128 MiB, <=258 entries (256 assets + JSON + preview), JSON <=4 MiB, image <=20 MiB, preview <=1 MiB and longest decoded side <=512. Compression expansion ratio <=1000 (with 1 KiB compressed floor). Map/image dimensions <=8192 per side and <=24,000,000 pixels each; total decoded image budget <=96,000,000 pixels. <=10,000 objects, <=256 layers, <=256 assets. Limits are checked before allocating/decompressing declared entries, during streamed output, and after decoding. Malformed archives are never applied partially.

## Save/open/recovery

Save builds an explicit validated document and deduplicated asset package before ZIP construction. Missing/unreadable references are listed together. Safe download names strip filesystem punctuation and reserved device names, then add `.mapweaver`. Download start marks the captured clean point only if the working model still matches; newer edits remain dirty. Preview generation is optional and omitted in this implementation.

Open fully prepares validated model and blobs before replacing the working context. New/open clear selection, clipboard, tool state and history, mark clean and fit. Recovery resume requires an explicit choice and remains marked unsaved relative to a downloaded backup.

Dexie schema 2 retains existing library tables and adds `recoveryProjects` (id/name/modifiedAt/savedAt/document) and `projectAssets` keyed by [projectId+assetId] (manifest/blob). An atomic transaction replaces a recovery document and its assets. At most five local copies are retained. Recovery is debounced after committed changes, including undo/redo; previews are excluded. These rows are local copies, never file-system links. Deleting one removes only its own document/assets. Library tables are untouched.

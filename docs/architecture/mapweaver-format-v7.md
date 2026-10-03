# Mapweaver format v7

Current writes use `formatVersion: 7`. Older binaries cannot open these documents. Existing root fields, ordered layers, groups, assets and ZIP limits are inherited from [v6](mapweaver-format-v6.md). Current readers retain v1–v6 input support. SQLite schema 3 and full-backup container 2 are unchanged.

## Door and window

Both have `id`, optional `name`, `visible`, `locked`, optional stamp `assetId`, `opacity`, `wallId`, `position` (normalized complete centerline arc length), `openingWidth` (4–4,096 map px), `unit` (`px|cells|ft|m`), `pixelsPerUnit` (>0, ≤1,000,000; exactly 1 for px), `side` (1 or −1), and `flip` (boolean).

`kind: door` additionally has `doorType: single|double|passage` and `status: closed|open-left|open-right`. `kind: window` has `windowType: simple|wide`. New objects default to single/closed or simple, side 1, no flip, opacity 1 and a 70-pixel width; scale metadata starts from the wall reference. No image is required.

The shared adapters require `x`, `y`, `width`, `height`, `rotation: 0`, `scaleX: 1`, `scaleY: 1`. Bounds are centered on the derived wall point with radius `openingWidth + wall.strokeWidth + wall.wall.outline.width`. Readers reject mismatches; these fields are never used to compute wall attachment. Cuts and sampled points are not serialized.

Exactly one existing Wall must match `wallId`. The opening and wall must belong to the same concrete layer. A maximum of 64 intervals/wall is allowed. Every interval fits entirely inside one segment and has at least 0.01 px separation from neighbors. An object group containing an opening must also contain its wall. Core orphan relationships are rejected, never repaired by dropping objects. Symbol manifests/bytes use the ordinary stamp asset path, kind and hash validation.

## Room provenance

Area optionally has `roomSource: { wallIds: string[], fingerprint: string, seed: { x, y } }`. IDs are unique, 1–256 entries; fingerprint is 1–8 lowercase hex digits; seed is finite within the existing coordinate limit. These are historical source IDs, not live topology. All normal Area fields and bounds validation still apply. Copying an assembly remaps source IDs that are included in the copy; ordinary floor copies retain historical provenance.

See [ADR 0012](../adr/0012-linked-openings-and-room-floors.md) for relationship edits, cutout semantics, face detection and failure handling. Portable project manifests include used symbol assets; full backup/restore reuses the same admission parser and asset-reference checks.

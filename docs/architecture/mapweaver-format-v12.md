# Mapweaver project format 12

Format 12 extends [format 11](mapweaver-format-v11.md) with four ordinary object kinds. Canonical architecture and behavior: [ADR 0017](../adr/0017-places-labels-and-map-annotations.md). ZIP members, image manifests, SQLite schema 4, revision protocol and backups are unchanged. Current writers emit 12; older supported readers migrate centrally. Older binaries must reject version 12.

All four kinds store `id`, `name`, `x`, `y`, `width`, `height`, `rotation`, `scaleX`, `scaleY`, `opacity` and optional `visible`/`locked`. Layer/order/group membership uses the existing collections. Coordinates and dimensions have the existing finite geometry limits; mirror signs are ±1; opacity 0–1 and rotation 0–<360.

- `place`: `placeType`, `sizeMode: cartographic | world`, `pixelsPerKm` captured sizing reference, normalized `anchor`, `note`, `tags`, `importance` (0–5), optional stamp `assetId`.
- `label`: `text`, concrete `style`, optional `ownerId`, `offset`, normalized `anchor`, default-position `preset: above | below | left | right | center`, `leader`, uniform `layoutScale`. No image asset. Text style includes `font: liberation-sans`, `size`, `bold`, `italic`, `letterSpacing`, `lineHeight`, `align`, `color`, `strokeColor`, `strokeWidth`, `background`, `backgroundOpacity`, `padding`, `maxWidth`.
- `legend`: `title`, ordered `entries`, `columns`, `padding`, `background`, `outline`, `layoutScale`. Each entry has `id`, `text`, `placeType`, `color` and optional stamp `assetId`. Entry IDs are unique within the legend. Entries are snapshots, never live queries.
- `compass`: `compassStyle: arrow | rose | cross`, `color`, optional stamp `assetId`.

Only place/compass may have top-level asset IDs. Legend references come from its entries. Every image reference participates in required manifest/type checking, project resource budgets, clipboard retention, portable ID remapping and backup transfer. Font files are immutable application resources pinned by this format, not arbitrary imported assets or external URLs.

Labels refer only to non-label owners in the same layer. The label anchor equals `(owner.x + owner.width/2, owner.y + owner.height/2) + offset`. Loading verifies the stored bounds and this equation within floating-point tolerance. No dangling owner, label chain/cycle, wrong asset kind, unknown font, invalid style or additional field is admitted. Optional owner/asset/visibility/lock fields may be absent. Text accepts newline and printable plain text; no DOM/HTML interpretation occurs.

Dimensions for a label equal the bundled-font layout multiplied by `layoutScale`. Saved text and explicit line/layout parameters remain editable. Renderer caches, decoded images, preview candidates, selected-object link overlays and picker state are never serialized. Unsupported glyphs use the documented `?` rendering fallback; missing font files refuse PNG. Font advance changes need a new format decision to avoid invalidating saved layout bounds.

See ADR 0017 for exact limits and transformation/clipboard/deletion policy. Basic types and runtime validation are in `src/domain/annotations.ts`; the shared parser in `src/projects/format.ts` is used by both browser and local service.

Sprint 23 adds optional `map.grid.physicalScale: {distancePerCell: number, unit: "ft" | "m"}` to the current format. Distance must be finite and 0.000001–1,000,000. Absence means unconfigured. This metadata affects only explicit new world-size placement; existing transforms remain concrete. Older application versions are not supported readers of this extension. SQLite library metadata is separate (schema 5); project image manifests are unchanged.


UX follow-up (ADR 0020): no new label fields or format change. New labels store explicit map-type presets in the existing TextStyle. `backgroundOpacity: 0` means text without a rectangle; positive values preserve intentional/legacy boxes. `strokeColor`/`strokeWidth` are the glyph halo, independent of the box. Existing stored styles are never defaulted again according to current map type. Font metrics and old legend defaults remain unchanged.


## Terrain appearance extension

The current reader accepts optional `Area.land.appearance` and `map.water`, each with `version: 1`. Existing documents without them preserve their original appearance. Terrain stores a registry `style`, `patternScale`, `textureOpacity`, `feather`, `blend`, `coast` and `coastScale`. Water stores `style`, `patternScale`, `textureOpacity` and `vignette`. The shared validators reject unknown versions/presets/fields and nonfinite or out-of-range values. Original Area fill/geometry remain present. Scratch pixels and procedural tiles are never serialized or included in image manifests. Older binaries are not supported readers of this extension. Exact bounds and rendering contract: [ADR 0027](../adr/0027-terrain-appearance.md).

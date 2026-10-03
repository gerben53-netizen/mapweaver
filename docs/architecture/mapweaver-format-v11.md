# Mapweaver project format 11

Format 11 retains the v10 map/geography/Area data, canonical layers/groups, asset manifests and ZIP layout. All newly saved documents use 11. The central parser still accepts its earlier supported formats; routes are accepted only in 11. Older application binaries cannot open this format. SQLite schema remains 4.

`kind: "path"` now permits `pathKind: "river" | "road" | "border"`. Existing `nodes`, `closed`, `stroke`, `strokeWidth`, opacity, cap/join and derived bounds retain their meaning. No samples, preview, connection graph or rasterized contour is stored.

Every specialized route contains a `route` object with:

| Field | Meaning |
| --- | --- |
| `kind` | Same literal as pathKind; discriminates the type-specific settings |
| `preset` | Concrete style's origin, 1–40 alphanumeric/spaces/hyphens; no live preset reference |
| `unit` | px, km or mi |
| `pixelsPerUnit` | Positive frozen scale reference, 1e-9–1e9; exactly 1 for px |

River-only fields: `startWidth`, `endWidth` in map pixels (.1–1024); `startFactor`, `endFactor` (0–4); `bank: {color, width}`. Effective endpoint widths are the products. Their maximum must be .1–1024. Zero at one endpoint permits a tapered source. Rivers must be open and use a solid or texture stroke. Direction is first node → last node. `strokeWidth` remains the shared base width; river painting/bounds use the explicit profile.

Road-only fields: `roadClass: trail | road | major`, `outline: {color, width}` and `marking: {color, width, dash, gap}`. Marking width zero disables it; it cannot exceed road width. Solid, dashed and texture strokes are allowed.

Border-only fields: `style: solid | dashed | dotted | double`, `dash`, `gap`, `halo: {color, width}`. The base stroke must be solid and supplies color; the Border renderer owns its dash pattern. Double lines lie one strokeWidth on each side of the centerline. Halos do not erase underlying map content. Open and closed borders are valid.

Colors are six-digit hex. Outline/bank/halo/marking width is 0–128 map pixels. Dash/gap is .1–10000 map pixels. Unknown keys, mismatched discriminants, invalid numbers, illegal combinations, incorrect bounds and missing/wrong-type asset manifests are rejected. Existing image/JSON/document and Path limits still apply, plus the bounded junction budget described in ADR 0016.

Textures remain `fillPattern` IDs in `stroke`, using the same asset usage, import remapping, clipboard retention and history ownership. They are map-aligned repeating patterns clipped by the contour/stroke. Scale and offset have effect; shared generic-path spacing is retained in the schema but not used to stamp route tiles. Missing artwork is a pink editor fallback; PNG refuses missing required sources through the existing asset validation.

Optional node `junction` references remain advisory, not required relationships. Only exact surviving same-kind endpoint connections can receive visual patches. They do not force routes to move together and do not make crossing roads/rivers connected. Group copies remap internal junction IDs.

Unit conversion, nonuniform width scaling, reversal, splitting and explicit type/Area conversion are specified in [ADR 0016](../adr/0016-geographic-route-paths.md). Each complete operation uses one history command; UI preview and active selection are not file data.

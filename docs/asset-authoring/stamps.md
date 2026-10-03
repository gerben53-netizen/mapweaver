# Stamps and placement sizes

**REQUIRED:** a stamp entry has `file` and `type: "stamp"`, and references a decodable PNG/JPEG/WebP. Transparency is **RECOMMENDED** for isolated symbols, not enforced. See [image preparation](image-preparation.md) for limits. Optional library metadata does not change pixels or previously placed objects.

## Exact defaultSize contract

`defaultSize` is **OPTIONAL**. If supplied, `mode` and boolean `lockAspectRatio` are **REQUIRED**. `width`/`height`, when supplied, must be finite positive numbers ≤1,000,000. Null, zero, negative values and numeric strings are invalid. Unknown size fields warn and are discarded.

| Mode | Units | Dimensions and behavior |
| --- | --- | --- |
| `native` | Omit unit; runtime tolerates known units but discards them | Dimensions are unnecessary, validated if present, then discarded. Natural image pixels, uniformly shrunk if needed to fit within 25% of map width and height; never upscaled. |
| `grid` | REQUIRED `cells` | Battlemap grid cell size multiplies width/height. No suitable grid or incompatible map type gives native fallback with a reason. |
| `world` | REQUIRED `ft` or `m` | Physical map scale converts width/height to logical pixels. `feet`, `meters`, `km` are invalid in this field. |

For grid/world, locked aspect requires at least one dimension; missing dimension is derived from source image aspect. Unlocked requires both dimensions. If both are supplied with lock on, width/height must match decoded source aspect within 0.1%. One dimension with lock on is **RECOMMENDED** to avoid accidental mismatch. Source aspect includes transparent margins. Resolved dimensions must remain positive and ≤1e9 map pixels.

New ordinary assets without a size use `{ "mode": "native", "lockAspectRatio": true }`. `defaultSize` is not camera zoom, current object dimensions, pattern scale or image resampling. Changes affect future placements only unless the user explicitly resets an existing stamp to its asset default.

## Worked examples

These are exact `defaultSize` objects to place inside a stamp entry, not complete manifests:

```json
{"mode":"native","lockAspectRatio":true}
```

```json
{"mode":"grid","width":2,"height":1,"unit":"cells","lockAspectRatio":false}
```

At 50 px/cell, the grid example is 100 × 50 logical pixels, regardless of viewport zoom.

```json
{"mode":"world","width":20,"unit":"ft","lockAspectRatio":true}
```

At 5 ft/cell and 50 px/cell, the world example is `20 / 5 × 50 = 200 px` wide (four squares). A 1774 × 818 source gives approximately 92.22 px height. At 100 px/cell it becomes 400 px wide. Large alpha borders make the visible bookcase narrower than that full-image footprint.

```json
{"mode":"world","width":600000,"unit":"m","lockAspectRatio":true}
```

On a 6,000 km-wide, 3,000 px world map, this symbolic mountain footprint is 300 px wide. Regional/World sizes are cartographic symbol footprints; they need not describe a literal single mountain's physical base. For metres/feet conversion, 1 ft = 0.3048 m. Battlemaps require an explicit physical distance per cell; Regional/World maps require geographic scale. Without physical scale, Mapweaver explains native fallback rather than assuming one.

**RECOMMENDED furniture widths**, not validation constraints: chair 2.5 ft; desk 5–6 ft; bookcase 5–10 ft depending on model. A broad curved bookcase may deliberately be 20 ft. At 50 px per 5 ft cell, those recommendations are 25, 50–60 and 50–100 px respectively. Choose dimensions appropriate to the represented object.

## Applicability

**OPTIONAL:** `applicableMapTypes` controls picker filtering and whether size defaults apply: `battlemap`, `regional-map`, `world-map`. Omission, `[]`, `"any"`, and `["any"]` mean universal for new assets; `[]` is recommended canonical spelling. Example: `["regional-map","world-map"]`. Do not use display names such as `World map`.

The ordinary picker defaults to the current map type, while **Show assets for all map types** deliberately removes that filter. Existing objects remain visible. Forcing an incompatible default onto another map gives a native-size fallback. Specialized browsers can have separate filtering; applicability does not alter image bytes.

Complete example: [minimal stamp manifest](templates/minimal-stamp-pack/mapweaver-assets.json).

# Making wall sets

For the new continuous Wall Material mode, use the [production instruction](CREATE-WALL-MATERIAL-PACK.md) and [continuous manifest template](continuous-template/wall-set.json). The remainder of this guide documents legacy strip/segment sets, which remain supported unchanged.

Choose **Wall → Choose wall set**. The three cards show authored top-down Masonry, Timber and Cave rock. The first use previews/imports that local package. **Import wall set** accepts your own ZIP; inspect the preview and then confirm **Import and use wall set**. Cancel writes nothing. Existing walls retain their centerlines and thickness when replacing material in Properties; press **Apply path properties** to commit. The drawing tool uses the set's recommended map-pixel thickness. Properties use explicit Apply, so typing several values or selecting New variation creates one history step. A mixed selection only changes fields you actually edit.

The examples are intentionally illustrated procedural artwork, authored in `scripts/create-wall-examples.mjs`: actual irregular alpha silhouettes, block joints, grain/knots and fractured rock clusters. They are not photographs or a professional asset collection. No third-party artwork or inferred third-party license is included. The manifest accurately records project authorship and that no separate artwork license has been specified.

## Files

- Versioned contract: [wall-set-v1.schema.json](wall-set-v1.schema.json), JSON Schema draft-07.
- Editable minimal package: [template/wall-set.json](template/wall-set.json), with sample PNGs. Replace attribution when substituting your artwork; do not claim permission you do not have.
- Ready-to-import packages in `public/wall-sets/`: `masonry.zip`, `timber.zip`, `cave-rock.zip`, `template.zip`. Served locally at `/wall-sets/…` and included in the portable application.
- Editable demonstration: `public/examples/wall-materials.mapweaver`. Use **Projects → Import project**. It includes all required material images; no external library download is needed.

A ZIP contains `wall-set.json` at its root and **only** referenced `assets/name.png` / `assets/name.webp` files. No folder entries, scripts, SVG files, external downloads or additional files. Source SVGs accompany the repository examples for editing but are deliberately excluded from the import ZIPs. File names use ASCII letters, digits, hyphen and underscore. ZIP64, duplicate entries, encrypted archives, traversal and malformed lengths/checksums are rejected by the existing bounded ZIP reader.

## Source-space contract

Images face along **positive X**, with positive Y downward. All source dimensions, anchors, overlap and repeat distances use source pixels. `anchor.y` is the centerline through a component; `anchor.x` is the placement point within segment/cap/join images. Strip bodies start their repeating section at x=0; the strip's X anchor is not used for phase. Caps are drawn at the open endpoints, with the start cap rotated 180°. Joins are patches centered on the node. Make patches neutral to rotation; avoid directional cast shadows.

Scale is `map thickness / nominalWidthPx` for both axes. Thus a 60-pixel core drawn at thickness 30 is scaled by 0.5; a 128-pixel source repeat occupies 64 map pixels. Uniform object/group scale scales the centerline and thickness once. No physical metre/foot scale is inferred. `defaultThickness` is a suggested width in map pixels, not a database resize instruction.

| Field | Meaning and range |
| --- | --- |
| `schemaVersion` | Exactly 1; future versions are refused. |
| `id`, `version` | Stable identity (1–80 ASCII identifier characters) and immutable revision name (1–40, also allowing dots). Change version when any manifest/art changes. |
| `title`, `description` | Nonempty name ≤120 and description ≤500 characters. |
| `renderingMode` | `strip` or `segments`. |
| `nominalWidthPx` | Solid core width, 8–1,024. Keep alpha opaque across this core; the fallback underlay uses only 65% of nominal thickness. |
| `defaultThickness` | 1–1,024 map pixels. |
| `repeatLengthPx` | 8–2,048 source pixels. |
| `overlapPx` | 0–75% of repeat length. Segment spacing is repeat minus overlap. Strip slices are contiguous; strip examples use zero. |
| `coreColor` | Six-digit hex, matching the darkest/base tone inside the core, never an outside outline. |
| `roughnessLimits` | `max` 0–1, `default` 0–max, `maxProtrusionPx` 0–nominal width. Alpha may extend at most half nominal width plus protrusion above/below anchor.y. Zero max hides roughness. |
| `bodyVariants` | 1–16 entries; Cave rock supplies three. Each has `file`, integer `width`/`height` 8–2,048, `anchor` inside that image, weight 0.01–100, rotation 0–15 degrees and scaleVariation 0–0.15. |
| `cap`, `join` | Optional entries of the same shape. Fallback: cap uses first body, join uses cap then first body. Supply deliberate artwork for convincing results. Closed loops have no endpoint caps. |
| `author`, `source`, `license` | Known provenance, ≤120 characters each, or an explicit unknown/unspecified value. Source is text only and is never fetched. |

All fields in the schema are required except caps/joins. There are no implicit numeric defaults. Runtime validation additionally checks relational constraints (anchors inside images, default ≤ max, overlap ≤ repeat ×0.75, actual decoded dimensions/alpha and alpha extents, and an opaque central 65% core across each placement interval). Strip bodies must cover repeatLengthPx and use rotation=0 / scaleVariation=0; each source slice bends with the path. Segment variation only uses explicitly allowed rotation/scale and stored roughness; no random mirroring is applied. The source centerline never jitters. A stored seed chooses repeatable variants and bounded jitter; New variation is explicit, and duplicate retains the seed.

## Artwork checklist

1. Draw at a strict 90° top-down angle. Remove floors, grid, labels and perspective; use genuine transparent pixels around the material.
2. Keep the core opaque and edges irregular inside the declared protrusion. Match the core color. Avoid semitransparent shaded margins at overlaps: they cause dark bands.
3. Make strip ends repeat and align grain/mortar at x=0 and repeatLengthPx. Segment silhouettes should overlap naturally by overlapPx; do not bake black end lines across rock clusters.
4. Design symmetric caps and compact corner patches. No large shadow that changes meaning after rotation. Test both light and dark floors.
5. Check straight, diagonal, L, sharp corner, S curve, closed loop, short end, T/X and an opening at 50%, 100%, 200%. Tight reversals can overlap; the editor warns when the bend is too small for its thickness. Widen the curve or reduce thickness.
6. ZIP the manifest and PNG/WebP components. Preview, confirm, draw a test wall, save, reload and export PNG.

For a legacy organic/living wood set, use `segments`, several root/bark silhouettes, small permitted rotation and bounded overlap. Keep its world-specific name exclusively in manifest metadata. No product code change, special material enum or world-specific engine branch is needed.

## Storage, bounds and limits

Import packs validated components into one lossless alpha PNG atlas in the existing fill-pattern asset register. The immutable definition stores source rectangles and compact alpha hulls, not a second image database. Its digest identifies the exact manifest and source bytes. Reimporting identical data reuses the registration; changing data under the same id/version is rejected. Used atlases cannot be destructively deleted through the library. Existing wall objects embed their definition and reference the atlas, so portable projects, history/clipboard and full backups retain dependencies. Missing image bytes leave a pink editable fallback and a Properties warning; PNG refuses missing required art rather than silently exporting the wrong material.

Limits: compressed package 32 MiB, existing ZIP output budget 128 MiB, individual image 20 MiB, 1,000 immutable registered revisions, 16 megapixels combined/packed, atlas ≤8,192 each axis, ≤4,096 derived parts/wall, existing path limits 256 nodes / 8,192 samples and project metadata budgets. Limit errors are actionable and do not partially change the project. Geometry and layout use weak caches. Editor raster caches use discrete quality levels, at most 250,000 pixels per wall and 4,000,000 total cached pixels (approximately 48 MiB for the three Konva canvases). PNG never uses that reduced preview cache.

Bounds conservatively include protrusions/caps and allowed rotation; alpha-derived convex hit hulls ignore large empty image margins but may include small concave holes. Culling uses those expanded bounds. Strip mapping shares vertices at smooth seams, splits at hard nodes and uses bounded material patches. It is not an architectural union operation. Explicitly snap a wall node to another wall for a junction; crossing two unrelated interiors alone creates no connection. Junction annotations are retained historical snap references, not live constraints: moving walls apart stops their junction. Same-set patches share the material; different sets keep layer/object draw order and are not promised seamless blending.

Area Properties → **Create boundary walls** copies selected outer contours and/or holes to closed walls on the active editable layer, all in one undo action. The Area is unchanged. There is no inward/outward offset, live synchronization or automatic floor generation in this action.

Sprint 23 may expose these registrations in a broader library UI. It should reuse this contract and central asset IDs, not invent another image store. See [ADR 0013](../adr/0013-wall-material-sets.md).

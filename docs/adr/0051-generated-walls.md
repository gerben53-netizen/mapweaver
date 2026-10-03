# ADR-0051 — Generated Living Root walls

Accepted 2026-09-28. Additive to ADR-0011/0012/0013/0050; no legacy wall conversion.

## Representation

A native Wall path may opt into `wall.renderingMode: "generated"` and `wall.generated: { id, revision, seed, organic, growth, overgrowth }`. The existing nominal stroke width, physical scale reference, nodes/handles, opening attachments, layer membership and transforms remain canonical. A generated wall uses a solid placeholder stroke contract internally and cannot also own a texture/Wall Material. Persisted project format 12 admits these optional fields; missing fields retain exact legacy rendering.

The immutable registered definition contains `id`, `revision`, `name`, `renderingMode`, `generatorType: "living-root"`, `components`, and defaults for width/organic/growth/overgrowth. Each component has exactly `id`, `role`, `image`, `nominalLengthFt`, `nominalWidthFt`, `weight`. Admission bounds numbers, roles, identifiers and local PNG resource paths; required roles are long/medium/small root and knot. Root-end, moss and leaves are optional. No executable pack logic, URLs, asset-layer stamps or persistent placements.

This first implementation bundles a transparent PNG development pack (`living-root@dev-1`) through `livingRootPack.json`. Registration is data-driven through `registerGeneratedDefinition`; definitions/revisions cannot be overwritten during a session. To ship another component pack, register its data in both client/service builds and bundle its immutable PNG paths. This sprint does not add a ZIP pack-management UI. The existing Wall Material import workflow remains intact. Published revisions must retain their artwork and generation algorithm; replacements require a new revision. Generated project transfers reference bundled revisions, whereas user-owned existing Wall Material assets retain their usual archive ownership.

## Generation

A pure function samples existing arc-length/tangent helpers. Physical width selects 2–9 primary runs, with Thin/Standard/Heavy/Massive defaults of 0.5/1/2/3 feet and 2/3/5/7 runs. Direction is left-to-right in source artwork. Seeded weighted choice avoids immediately repeating primary components. Coherent longitudinal offsets, mild scale/rotation and spacing variation implement Organic. Growth adds smaller roots/knots; Overgrowth adds optional moss/leaves. Clean has zero Overgrowth and remains composed of visible roots.

Curves use local tangents and overlap. Sharp corners get one bounded knot. Separate walls at T-junctions/crossings use ordinary z-order and overlap; no graph. Opening intervals split generation, with tapered root-end components, followed by wide opening-only clipping to remove rotated overscan. The nominal wall envelope never clips generated artwork. Outside-aligned walls offset run centers outward while retaining their existing functional geometry. Closed uninterrupted loops use periodic variation.

## Rendering, editing and limits

Geometry, selection and snapping retain existing nominal bounds. A separate visual-bounds calculation encloses rotated components and controls surface allocation. No nominal Shape cache crops overscan. The editor and PNG call the same renderer, clipped only by real map bounds and attached openings. Draw drafts and path-edit sessions use a half-resolution preview; finished walls and 1×/2× PNG use a shared final surface at up to two samples per map pixel.

The cache key contains nodes/handles, closed state, width, physical reference, alignment, generator revision/parameters/seed, openings and quality mode. Names, selection, unrelated objects, opacity and zoom do not regenerate component placement. Opacity is applied once when drawing the composed surface.

Admission conservatively caps a wall at 12,000 components, including allowance for 64 openings. Surface allocation is capped at 4,194,304 pixels and 4096 per edge; at most 128 retained surfaces / 16,777,216 retained pixels. Component loading is sequential and bounded to 2048 pixels per edge / 16,777,216 decoded pixels total. Existing export memory admission includes the wall cache allowance. Very large walls receive reduced raster detail; splitting walls preserves maximum detail.

## UX and persistence

Wall Tool and Properties expose Living Root, Width, Organic, Growth, Overgrowth, presets and Randomize variation. Existing history transactions, autosave, SQLite documents and `.mapweaver` serialization store only the native wall and small recipe. Reopening regenerates deterministically. No production data is migrated, removed or reset.

The bundled line-art PNGs are development fixtures, not claimed production artwork. They prove component visibility, overlap, path following, open passages and uncropped protrusions. Production art can replace them only under a new immutable pack revision.

## Production artwork integration — 29 September 2026

The user-supplied Premium-Living-Root-Production-Artwork.zip supplies 28 production PNGs. `living-root@production-1` is the default for newly selected Generated Living Root walls. Component order, IDs, roles, nominal lengths/widths, weights and pack defaults are identical to dev-1. Only the revision and resource paths change. The original dev-1 definition/images remain immutable and loadable; saved projects are not rewritten. The selector labels the older choice Living Root (development).

Production bytes are copied unchanged to `public/generated-walls/living-root-production-1/` and are registered in the shared client/service registry through `livingRootProductionPack.json`. No renderer, cache algorithm, project format or persistence schema change is needed. Both revisions together consume 3,686,400 decoded source pixels, below the shared source-image budget. Provenance and per-image SHA-256 hashes are recorded in `docs/wall-sets/living-root-production-provenance.json`.

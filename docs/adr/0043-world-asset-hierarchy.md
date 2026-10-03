# ADR 0043 — World asset hierarchy and composition

Accepted 26 September 2026. Extends ADR-0028/0029 without replacing existing images or placed stamps.

## Authorable metadata

Manifest 3 / generator version 1 gains optional `hierarchy` (`hero`, `primary`, `support`, `detail`), optional `ridgeAxis` (finite −90…90 degrees in image coordinates, positive clockwise) and optional `lighting` (`northwest`, `neutral`, `other`). These fields live in the existing JSON metadata column and shared strict validator; no database migration or new package format. Library metadata editing, undo/redo and ZIP export carry them. Missing metadata remains missing, never inferred from filenames, categories or titles. Existing defaultSize and map applicability remain authoritative.

The painterly package keeps all original 42 image files byte-for-byte and adds four smaller transparent sources. Hierarchy is explicitly authored in the manifest; `hierarchy.json` is packaging input, not runtime inference. Importing with Keep leaves installed metadata unchanged. An explicit Overwrite updates metadata on existing image identities; service tests assert ID/hash preservation. Saved projects use their native transforms/images and do not consult library hierarchy at load.

## Placement engine

A matching family with at least one explicit tier enables world-scatter engine 2. Otherwise engine 1 takes its existing route. In a mixed family, unspecified assets act as primary only. Engine-2 provenance adds required `hierarchy` per placement; engine 1 records stay valid unchanged. Native StampObjects remain the rendering/editing authority; historical provenance never regenerates a loaded map.

Tier choice uses an independent seeded channel per logical terrain cell, before density acceptance. Heroes run first, with at most two mountain/volcanic heroes together, one forest hero and one swamp hero per map. Each hero source appears at most once. Increasing nonzero density does not raise these limits or hero probability. Primary/support/detail acceptance at Low/Medium/High is respectively .55/.65/.75, .25/.6/.95 and .1/.5/1, combined with existing terrain strengths/patches and collision safety. Existing 180 mountain, 240 forest, 120 detail and 128-source caps remain. Primary may use at most 45% of a category budget and support at most 40%, reserving room for sparse/detail at the cap; an unavailable tier does not force noisy filler.

Forest-mask distance 1 uses sparse detail trees; distance 2 uses support edge clusters; distance 3–4 mixes support/primary medium clusters; deeper forest favors primary canopy with support/detail gaps and rare heroes. Snow/cold forest requests its compatible biome. Foothill candidates use hills/support and rocks/detail. Snow support uses foothill art. Exact semantic type, map applicability, compatible biome and theme remain hard constraints; unavailable tiers skip with notes rather than substituting a hero into a common slot.

For ridges, prefer authored axes within 20 degrees of the best available match, then weight compatible silhouettes by angular difference. The signed difference is axial modulo 180. Upright art never rotates; declared rotation permits only the intersection with ±8 degrees, with mild seeded variation. Heroes stay upright. Source variation intersects tier bounds: hero .96–1.06, primary .90–1.12, support .82–1.08, detail .75–1.05. Disjoint authored ranges skip with a warning. This favors silhouette selection over turning painted mountains upside down.

Lighting `other` is excluded from hierarchy composition with a warning; missing lighting is allowed for old assets. This is an author declaration and visual review aid, not automatic image-based illumination detection.

## Limits

No new scatter object kind, automatic existing-project rewrite, object-count budget increase, terrain-field change, renderer rewrite or generated-region live linkage. Artwork orientation options remain finite; a vertical ridge may use the closest available upright silhouette, not an exact 90-degree rotation. Density caps and collision exclusions can prevent every tier from appearing in a small biome. Existing Chrome accelerated-image sampling differences are measured separately from transform/persistence correctness in the sprint report.

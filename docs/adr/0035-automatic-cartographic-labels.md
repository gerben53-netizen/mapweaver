# ADR 0035 — Automatic semantic cartographic labels

Accepted 26 September 2026, Visual Fidelity Sprint G.

## Native model

Automatic labeling creates ordinary format-12 Label objects, using the existing metrics, bundled font loader, glyph/halo painter, selection, Properties, layer ordering and PNG scene. It never flattens text or regenerates geography. Optional `Label.automatic` stores `{version:1, sourceId, labelClass, category, baseline, overridden, suppressed}`. The baseline is the existing deterministic 16-hex fingerprint over text, visual style, position, size, offset and visibility. IDs reference semantic objects; absent sources are permitted until an explicit update. Unknown metadata versions/fields/classes and malformed fingerprints are rejected by the shared parser.

Optional `LandArea.labelKind` explicitly identifies region, major water, minor water or mountain-range sources. Existing geographic role, mountain terrain and water appearance supply defaults. Optional `MarkerConfig.labelEnabled` retains an explicit marker-label choice; false prevents automatic label creation. Existing markers without this field remain supported. No SQLite schema or ZIP container change is needed. Documents without these fields remain unchanged.

Sources use existing object names only. Blank/default generic names are skipped; names are never inferred from image filenames or invented. Named Areas, Places/Smart Markers and River Paths are supported. Named mountain-region Areas are supported; unnamed generated stamp chains are not silently converted into ranges. Seas are explicit named water Areas, not an inferred name for the entire ocean background. A standalone title remains an existing Map Element and is an exclusion, not a second generated world title.

## Style and layout

A central class registry defines priority, size and theme role for title, major region, region, capital, major city, settlement, landmark, major/minor water, river and mountain range. Automatic typography uses existing themeText defaults with semantic class refinements; Minimal Political has a smaller size scale. Water is italic, boxless and haloed where the theme enables halos. New labels register theme field ownership; subsequent theme switches retain normal per-field override protection. No arbitrary font URL or new font dependency is added.

One deterministic placement service generates eight marker offsets, up to 32 spatially distributed interior Area candidates, or readable rotated straight labels along sufficiently long, low-curvature river spans. Area visual centers rank bounded grid samples by distance to all contour edges, including holes. Candidate label bounds must remain inside the Area. Edited land maps also require land labels to remain on visible land. Major water candidates avoid landmasses.

Higher-priority sources are placed first with stable ID tie-breaking. Rotated AABBs plus padding reject overlaps with visible labels, markers, titles, panels, compass/legend/scale bar, map edges and frame safe margins. A spatial hash limits obstacle queries; terrain stamps/scatter have soft overlap penalties. This is a bounded heuristic, not a global typography optimizer. It does not shrink text to force placement. Failed candidates become native `visible:false` labels with `suppressed:true`; the source remains intact. Objects can reveal them for manual placement. Low/Medium density omits minor sources, retaining the same class sizes.

## Ownership and update

Automatic labels are created only by the explicit World/Regional Map actions dialog. Its isolated PNG preview uses the real export painter and never changes the document. Apply/update makes one history transaction and refuses stale snapshots. Up to 300 named sources are considered per operation; hidden/locked sources and protected generated labels are skipped. Existing manual labels and linked marker labels are retained without adoption or duplication. Standalone labels go in an editable Automatic labels layer; settlement labels use native ownerId in their marker's layer.

An update adds new eligible names, repositions unmodified managed labels, updates source text, and removes unmodified orphan labels. Unselected categories and temporarily hidden sources remain intact. Direct native label moves, rotation, text/style/visibility changes mark the label overridden in the central project setter. Fingerprint comparison also conservatively protects edits from other model paths. Owner-follow movement refreshes the baseline without becoming a manual override. Theme changes that differ from the placement baseline are conservatively protected by later automatic layout. Detach removes only automatic metadata and retains text, style, geometry and any marker link. No force-reset action is added.

## Limits

Straight river text replaces full curved text. Mountain labels use named Area geometry and remain horizontal or moderately rotated for tall ranges; there is no inferred ridge/name graph for scattered peaks. Sampling is approximate and collision boxes conservative; narrow regions may require manual placement. Small caps, complex-script shaping, geographic name generation, automatic label updates while panning and thousands-of-sources optimization are outside scope. Existing text/document limits, glyph fallback and export size limits remain applicable.

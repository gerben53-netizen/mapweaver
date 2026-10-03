# ADR 0044 — Illustrated Smart Markers

Accepted 26 September 2026.

## Representation and compatibility

Project format 12 gains optional `Place.visualMode: "symbol" | "illustrated"`. Absent means the existing renderer, byte-for-byte unchanged document data. Explicit modes require the existing version-1 `marker` config. Illustrated also requires the existing `assetId`, resolving to a stamp. Symbol with marker metadata cannot carry an asset. The existing icon config is retained for an explicit return to Symbol. Legacy custom Place assets remain valid without a mode or marker config. No database migration or paired Stamp object.

This narrowly supersedes ADR-0024's prohibition on marker config plus asset ID. Place remains canonical for name, note, tags, importance, anchor, bounds, captured pixelsPerKm and layers. Illustrations are ordinary shared image resources embedded by the existing save/portable pipeline. Missing resources fail admission/export rather than falling back to an unrelated badge. Editor, wizard preview and PNG call the same `paintAnnotation` image branch; no renderer fork.

## Creation, scale and labels

Symbol remains the initial choice, including on painterly maps; the theme recommends Illustrated in text only. New illustrated world width is 2.5% of physical map width × type factor (capital 1.15, town .85, village .7, other 1) × existing prominence (.75/1/1.3/1.65). This is atlas exaggeration, not an asserted city footprint. The result is explicit kilometres, captured into map-coordinate bounds and pixelsPerKm. Width remains editable. Changing prominence explicitly scales the current image and linked label as before. Zoom and later geography edits do not resize existing markers. Image replacement preserves physical width; Symbol conversion explicitly chooses the current symbol preset size at the same anchor.

One marker is still one selectable/movable Place. Linked names remain ordinary Label objects, managed atomically by editMarker, with normal owner links, overrides, undo and layer assembly. Automatic labeling already excludes linked/disabled marker names, so no new automatic-label branch is required. Semantic type changes in Properties keep the chosen illustration until explicitly replaced.

## Assets and authoring

Use the existing package schema's tags, not terrain-generator metadata. Reserved case-sensitive `marker:<registered-type>` tags explicitly classify suitable artwork. `theme:<slug>` and `style:<slug>` support optional filtering; applicableMapTypes stays the existing field. There is no filename inference. The shared package parser and library metadata update validate recognized namespaced values. Existing ordinary tags remain unchanged. Library ZIP exports preserve these values without new columns or schema versions. See the illustrated-marker authoring guide.

The curated 31-image pack ships locally. The chooser reads only its small validated catalog and lazy thumbnails. An explicit selection checks the PNG hash, uses the existing local service's image admission/deduplication, then adopts the resource into the active project. It adds metadata only on a newly imported source, never overwriting a user's existing library metadata. Existing Library candidates use the same adoption path. A project-generation guard prevents late asynchronous selection from editing a different map. Cancelling may retain an imported image in the Library, but never creates map objects.

The library query is paged at 60 assets; semantic queries and map-type filtering are server-side, exact tag filtering and optional theme/family filtering apply to the loaded page. Manual override includes other compatible stamps and embedded project images. Images remain shared by imageCache leases, including export. Artwork is bounded to a 384px long edge; no per-placement bitmap is created.

## Boundaries

No automatic settlement placement, lore/civilization model, map-wide icon conversion, custom SVG subsystem, paired stamps, service dependency, new npm dependency or Windows package. Tall/narrow artwork and deliberately small villages retain their native aspect; users can adjust their world width. Production build ships the local catalog/PNGs; the ZIP is an ordinary optional library transfer artifact.

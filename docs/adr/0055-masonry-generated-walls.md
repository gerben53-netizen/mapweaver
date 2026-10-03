# ADR-0055 — Shared Generated Wall masonry strategy

Accepted 3 October 2026. Additive to ADR-0051; no Living Root, legacy-wall or user-document conversion.

The immutable Generated Wall registry admits `generatorType: masonry` alongside `living-root`. Definitions select the strategy; material names never select geometry. Required masonry roles are `block-large`, `block-medium`, `block-small`. Optional persisted masonry parameters are `regularity` and `variation`, each 0–1 and required for masonry. Existing root recipe fields remain reserved zero values for masonry; existing Living Root recipes and layout are unchanged. Format 12's optional generated recipe is extended, without altering SQLite, archive ownership or the Campfire contract.

Masonry uses the existing native Wall/path, physical reference, opening objects, selection, history and final/preview surface cache. It packs staggered longitudinal courses of at most 0.5 ft nominal depth. Weighted indexed seed variation controls component selection; Regularity restrains lateral/angle irregularity. Source aspect ratios and bounded size variation define blocks. A very short terminal filler uses source cropping instead of extreme compression. Abrupt corners repack intervals and fan ordinary square fillers through the outside turn; no special corner artwork or scene stamps. Closed seams receive the same join treatment.

Attached openings split course intervals and use the existing wide opening-only clip, so neither rotated stone overscan nor corner infill can span a passage. Stones define the silhouette; no wall-envelope/floor-texture clip. Independent T/crossing walls use the existing z-order overlap model (as Living Root does), not a persistent graph, fusion or shared ownership. This is an intentionally limited join model: stones are not globally repacked across different objects.

Bundled Rough and Dressed dev-1 definitions share six development PNGs (two variants per role), differing only in defaults. Installer builds hide development choices except the exact saved ID/revision; compatibility resources remain available. This sprint does not publish Premium artwork or an installer. New production artwork requires an immutable new pack revision, retaining the component vocabulary and strategy.

Admission accounts for masonry course count and a conservative corner/opening budget. Actual generation enforces the shared 12,000-component cap. Existing 4 Mi-pixel surface, 16 Mi-pixel retained surface/source budgets, half-resolution previews and final surfaces up to 2 samples/map pixel remain unchanged. Very long/thick walls may require splitting or reduced detail; no unmeasured worker/graph abstraction is introduced.

The reproducible external artwork specification is exported with `node scripts/export-masonry-wall-spec.mjs`. Generated handoff files, editable benchmark maps, measurements and screenshots are ignored local deliverables. They are not user data or default Premium content.

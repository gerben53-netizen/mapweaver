# ADR 0020 — Map-type creation capabilities and cartographic label presets

Accepted 24 September 2026 for the focused map-context/label UX follow-up.

`src/domain/mapCapabilities.ts` owns the creation-tool matrix, geographic Area availability, room-analysis availability and reusable asset applicability predicate. The editor tool union lives alongside this matrix. Selection/editing modes are universally allowed. Capabilities never filter the saved scene, layers, object list, export or persistence admission.

The editor installs one context watcher while mounted. It checks every editor activation and map-type change, cancels an unsupported draft and returns to Select. Existing route/wall continuation is allowed only with a matching existing path reference; changing type still falls back. Existing geometry editing, opening Properties and existing room-floor regeneration remain available. New room detection, boundary-wall creation, Area-to-Border creation and path-type conversion use the same capability policy. No additional tool shortcuts are introduced; V remains the universally available Select shortcut.

Scatter remains available for all types: its existing physical-size sources and deterministic recipe are useful for forests and terrain symbols as well as local props. Generic Path and Pattern fill are not roads or structure-specific tools and remain universal. Regional and world maps share creation tools but have distinct label defaults; no speculative world-only tools are added.

The ordinary stamp/fill-pattern picker defaults to active map applicability. The existing service library query accepts optional `mapType`; it filters before counts/pagination and retains assets with no applicability restriction. Show assets for all map types explicitly removes the filter. Project-owned assets use the same predicate. The global library and specialized wall/scatter/prefab pickers keep their existing broad-browsing behavior.

Labels use the existing format-12 TextStyle with explicit fill, stroke, typography and background values. `labelTextStyle(mapType)` applies only at creation (standalone, place-linked and Add linked label), or when initializing an explicitly applied bulk style. The old DEFAULT_TEXT remains fixed for existing legend layout metrics. All preset labels have backgroundOpacity zero. Regional/world styles use light text/dark halo with larger size/tracking. No fonts, style fields, shadow model, semantic taxonomy, schema version or migration are introduced.

Canvas and PNG continue to call one annotation painter. A zero-opacity background is not painted. Full-run outline precedes glyph fills so neighboring outlines cannot obscure earlier letters. Stored background opacity remains authoritative for old boxed labels. Properties names this Box annotation rather than mislabeling the rectangle as a halo. Glyph halo color/width are separate. Rotation and uniform layout scaling use existing transforms; outline scales with the text. Selection/hit rectangles remain editor-only.

Curved/path-following text and shadows are deferred: the pinned glyph-metrics renderer does not support them without additional layout/render contracts. Existing Liberation Sans regular/bold/italic variants remain the only family.

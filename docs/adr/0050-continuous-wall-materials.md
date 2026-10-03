# ADR-0050 — Continuous wall materials and organic surface rendering

Accepted 2026-09-28 for the Wall Materials & Organic Wall Rendering sprint. Extends ADR-0011, ADR-0013 and ADR-0046. Existing walls and source artwork are preserved. The explicit sprint compatibility requirement supersedes the earlier general permission to discard historical data for this task.

## Contract

`WallMaterialDefinition` names the existing immutable atlas-backed definition. The specialized `wall-set.json` container gains an opt-in `renderingMode: continuous` and a versioned `continuous` recipe. The recipe declares category, source channels, physical texture dimensions, organic wavelength, edge width, four named width presets, supported controls, defaults, named parameter presets and bounded numeric options. Channels index the existing component table (`bodyVariants`); no new asset registry or blob ownership path is introduced.

The existing strict importer admits PNG/WebP, validates image dimensions, file listing and resource limits, packs one atlas, computes the immutable SHA-256 revision and registers it in `wall_sets`. Continuous fill sources may be opaque; the legacy transparent silhouette/core checks remain unchanged for strip/segment packs. Component rectangles/hulls and image bytes are generated/owned by the importer, never supplied as executable material logic. A new source pack revision cannot replace an already registered ID/version silently.

The native wall remains one Path. Width remains `strokeWidth`, with its existing explicit unit/pixelsPerUnit reference. Material state stores its embedded definition, optional matching `materialId`, seed, variation, organic, growth, overgrowth and validated material options. Missing continuous settings resolve to the embedded definition's defaults. Legacy `roughness` and old material rendering are retained. No new objects, persistent mesh, render tiles or material graph enter the project.

Current project format 12 and wall-set container schema 1 gain optional fields; no SQLite schema, archive layout, asset IDs or destructive migration changes. Old application versions that do not understand `continuous` cannot read this new mode; old documents still load in this version. Forward compatibility with older binaries is not claimed.

## Surface and geometry

The canonical path supplies a native stroke mask for straight lines, cubic curves, closed loops, cap/join choices and outward room walls. Organic rendering displaces that **visual mask**, using a coherent seeded spatial field. The minimum wavelength is twice nominal wall width to avoid high-frequency jagged edges or foldovers. Nodes, handles, thickness, opening attachment and functional geometry remain unchanged. Outside-aligned walls still exclude their canonical interior.

Atlas sampling follows a bounded adaptive path field. Arc coordinates are local to each original path segment so editing an earlier segment does not rephase every later segment. Variation uses a deterministic world-space field; there is no time, frame, viewport or editor-selection random input. Texture length/width use physical units independently of nominal wall width and zoom. Explicit map scale is captured when choosing a material; maps without one use 10 px/ft (50 px/5 ft). Material-specific width presets are not global constants.

The renderer samples one composited surface, not hundreds of independently painted stamp sprites. Periodic source preparation softens tile boundaries; local surface color transitions to a shared world-space sample around nodes and overlapping compatible walls. End/corner/T/crossing/opening channels are optional local surface treatments, not disconnected geometry patches. Masks gate detail overlays without cutting structural holes. Growth and overgrowth remain inside the band. A restrained contact edge and optional inside-band outline are direction-independent. Existing opening clipping is applied after surface generation and removes the complete material band without stretching the remaining texture across the gap.

Compatible visible walls with the same immutable revision and opacity supply transient neighbor context. No IDs are merged or split, and normal scene ordering, selection and undo remain native. Different materials are not silently blended into one material. Highly translucent overlapping walls retain ordinary source-over compositing; this mode does not introduce a general Boolean merge or transparency graph.

## Cache and resource policy

Each wall surface is cached by immutable wall identity, image identity, openings, neighbor references and quality mode. Unrelated editor events reuse the surface. A changed wall rebuilds its own surface and affected neighbor context; changing the material or seed intentionally invalidates it. Geometry fields are weakly cached and spatially indexed, with a 100,000-cell guard. Periodic source tiles are at most 512 px per axis.

Final surfaces use up to two samples per map pixel, at most 4,194,304 pixels and 4096 per axis. The shared surface cache retains at most 16,777,216 pixels. Source pixel caching has a separate 16,777,216-pixel budget. The exporter includes a conservative 192 MiB allowance for material working caches in its existing 512 MiB admission estimate. Large individual walls receive a visible detail-budget warning instead of silently promising arbitrary resolution.

Drawing drafts and selected path-edit sessions use a 0.5-sample-per-map-pixel preview. Ending the edit rebuilds final quality. PNG always requests final quality, independently of current editor mode. Ordinary object transforms already use the existing Konva gesture preview. No raster surface is persisted or used as the canonical editable wall.

## UI and authoring

Wall Tool and Properties → Style details expose metadata-defined width presets, percentages, presets, options and explicit Randomize variation. Properties retains the existing Apply transaction so several style changes form one undo step. All render paths remain shared with PNG. Existing simple fills, textures and strip/segment sets stay available.

The separate [production instruction](../wall-sets/CREATE-WALL-MATERIAL-PACK.md), [manifest template](../wall-sets/continuous-template/wall-set.json) and updated JSON schema define what the external artwork task must deliver. Development fixtures reuse existing Timber/Masonry image bytes unchanged. They validate software plumbing and geometry, not final Living Root/Pale Stone art quality.

## Boundaries

This is a bounded raster surface over editable vector geometry, not a topology solver or a procedural botanical generator. Deep self-overlaps, materially different adjoining walls, extreme thin details at low zoom and deliberately translucent intersections remain subject to source-art and normal compositing limits. Definitive production-quality visual acceptance awaits the separately supplied graphics and must use the documented seam/repetition/junction benchmark. No manual wall stamps may be used to hide failures.

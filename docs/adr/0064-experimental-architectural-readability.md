# ADR-0064 — Experimental Architectural Readability Layer

Superseded in part by ADR-0065: Edit no longer composites full ARL; Preview and exports choose explicit independent profiles. Coverage, ownership and native fallback rules below remain applicable.

Status: accepted for default-OFF integration, 2026-10-08. Production activation is not approved.

## Decision

ARL is session-only renderer state (`useArlStore`), selected through Map actions → Experimental wall readability. OFF preserves the existing generated-wall renderer and its one contact shadow. B substitutes a floor-constrained contact shadow. C adds a narrow structural edge and mass reinforcement. Reloading the application resets OFF; maps, portable archives and Campfire semantics do not acquire an ARL field. PNG export captures the selected session mode before asynchronous preparation; explicit export options can override it.

The editor and PNG export call the same `paintArlBatch` compositor. It uses existing native component placement, immutable artwork, genuine opening cuts and raw generated-wall surfaces. Raw surfaces omit the baseline contact shadow. No second wall engine, scene stamps, directional lighting or functional wall geometry is introduced.

## Coverage and ownership

Only opaque, unrotated generated Battlemap walls from the seven benchmarked materials are admitted: Pale Palace Stone, Marble, Natural Cave Rock, Refined Timber, Rustic/Heavy Timber, Living Root and Rough Stone. Other families retain baseline until separately accepted. Filled, opaque visible non-land/non-ceiling Areas below the walls define floor footprints, including polygon holes. Colored canvas and background images do not establish a floor. Unsupported walls and uncertain/no-floor scopes retain their native baseline. Texture-filled Areas provide their authoring footprint; ARL does not infer floor semantics from the texture's RGB or alpha colors.

Native opening-clipped artwork alpha establishes visual wall coverage, independently of functional centerlines. Every nearby floor pixel has one nearest wall owner, with deterministic topmost ownership at ties. Shadow therefore does not stack at material transitions or joints. Genuine opening exclusions and local free-end tangent exclusions constrain expansion. Unsupported wall strategies conservatively exclude their nominal ribbons from floor coverage. Four fixed profiles distinguish refined stone, rough stone, timber and organic walls. Rough stone and organic profiles disable C's edge and mass terms.

Contiguous wall batches stay at their original scene position. Doors, props and render strata break batches. Existing Environmental Detail ordering remains authoritative. Editor hit shapes and native edit/history operations remain present; the shared composite is non-listening. Selection, previews and transformer overlays remain outside player PNGs.

## Cache and bounds

World-space compositor keys include visible wall geometry, caps/joins, width, alignment, generator revision/seed/parameters, opening attachment/width, relevant floor geometry, map bounds and mode. Zoom, selection, object names and door runtime status are not mask inputs. Asset-context generation clears composites on reload. Source surfaces reuse the existing generated-wall LRU under a separate raw-artwork key.

The ARL LRU is bounded to 32 entries and 16,777,216 cached pixels. A composite is bounded to 4,194,304 pixels, a 4096-pixel edge and at most 2× sampling. The aggregate raw sources retained by a build are capped at 16,777,216 pixels; wall-count admission happens before source acquisition. Extremely large/unsupported scopes use a bounded negative-cache baseline fallback. This bounds permanent cache size, not total transient memory across all simultaneously live scratch buffers. Cache misses execute synchronously; large-map editing latency must pass production acceptance before activation. Mask/source scratch canvases request `willReadFrequently` on first context creation to avoid the earlier proof's readback-induced raster transition.

## Acceptance and limits

Ignored native evidence lives in `deliverables.local/Architectural-Readability-Renderer-Integration/`. Seven-material editor/PNG proofs, floor boundaries, mixed strategies, organic close-ups, reload, invalidation and wall-heavy measurements inform a separate GO-B/GO-C/ADJUST/REJECT decision. Integration is intentionally usable behind the flag even when that decision is ADJUST. A GO would still require a separate explicit production-activation instruction.

The compositor preserves persisted models and immutable artwork. It does not change LOS, collision, openings, lighting or the canonical Campfire contract. No database or project-format migration is needed. Existing Environmental Detail resolution-dependent tile rasterization is measured separately from ARL parity; this integration does not silently change OFF to repair it.

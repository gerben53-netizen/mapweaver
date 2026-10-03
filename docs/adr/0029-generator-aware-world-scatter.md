# ADR 0029 — Generator-aware world scatter

Accepted for Sprint C, 25 September 2026.

The geography generator remains world-v1/version 1. An optional, separately versioned world-scatter engine 1 decorates its output with ordinary StampObjects. It reuses the existing terrain field, semantic asset query, seeded RNG, weighted selector, physical placement sizing and full-image Area containment. No new persisted object kind, raster terrain layer or image duplication is introduced. Disabled scatter returns the original terrain result unchanged.

The fixed 145 × 97 logical field makes density independent of output pixel resolution. Opposing-neighbour nonmaximum suppression identifies ridge cells and tangents in mountain/highland masks. A distance transform supplies foothill transitions and forest edge attenuation. Candidate acceptance, spatial patch density, jitter, selection and variation use independent counter-based random channels. Scale varies inside each source's declared range, with peaks biased toward its upper end and foothills toward its lower end; physical defaults remain the size authority. Upright sources never rotate; orientation alignment is clamped to declared limits.

Exact semantic type, map applicability, compatible biome/generic biome and selected theme are hard constraints. Within that compatible set, Sprint B's role/biome/theme fallback order is reused and reported. A type-only incompatible biome or theme is never silently substituted. Sources are loaded from a revision-consistent, read-only query snapshot. The ordinary generator has no volcanic classification: it emits no arbitrary volcanoes. Providers with an explicit volcanic ridge are supported with a low acceptance probability and at most two volcanoes.

Collision uses a spatial hash and source spacing hints, permitting controlled image overlap while separating centres. Full rotated rectangles must fit emitted land; conservative raster footprint checks exclude water/lakes and emitted rivers. Semantic places receive an exclusion neighbourhood. No label collision, alpha-level packing or tectonics is introduced.

## Persistence

Format 12 gains optional `map.generation.scatter`: engineVersion 1, validated settings, a versioned library fingerprint, placement ownership records and bounded warnings. Each record stores original object ID, source asset ID, semantic group/role, terrain cell, chosen scale and fallback level. Existing world-generation seed/parameters and native transforms complete the identification record. The fingerprint is an identity/checksum hint, not a security hash or a complete copy of the source library. Exact regeneration still needs the original candidate metadata and IDs; saved rendering does not.

Ownership is historical and ID-based, never inferred from editable layer/object names. Manual duplicates with new IDs are not automatically generator-owned. Deleting/moving stamps leaves their provenance record historical; no automatic replacement consumes it in this sprint. Native object transforms and embedded image assets are authoritative for save/reload/portable ZIP/export. Maximum ownership increases to 840 IDs/13 layer IDs; the scatter pass itself is bounded to 180 mountains (including volcanoes), 240 forest clusters and 120 detail stamps, with at most 128 decoded source images and existing file/pixel budgets.

No database migration is required. Old maps without the optional field remain valid. The central format parser validates this extension. Older binaries that reject unknown fields cannot load newly decorated documents; this is not a promise of forward compatibility.

## Preview and history

The cancellable worker creates temporary native objects only. Image blobs and bitmaps are temporary, do not enter the active project's asset registry, and are released on replacement/cancellation. Create writes a new normal local project with its required manifests, then installs its embedded resources. The initial stamp pass is one undoable edit; creating the project itself follows the existing new-project lifecycle. Subsequent selection, transforms, layers, undo/redo and export are standard editor operations. Selective regeneration is deferred; no existing/manual content is overwritten.

The five possible detail layers (Volcanic, Mountain stamps, Forest stamps, Swamp / Wetland, Hills & Rocks) appear only when used, within Generated World and above the retained terrain layers. Preview uses the same images and native stamp transforms as editor/export. No debug masks become document content.

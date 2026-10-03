## Visual Fidelity Sprint G - 2026-09-26

- Explicit automatic label preview/apply/update for named World/Regional regions, settlements, water, rivers, mountain Areas and landmarks.
- Central theme-aware hierarchy, interior candidates, readable river rotation, spatial collision avoidance and hidden native labels when placement fails.
- Persistent source ownership, manual-edit protection, ordinary Label Properties/detach, and explicit marker-label opt-out.
- Format 12 optional metadata; unchanged font/render/export infrastructure and existing manual labels.

## Land / Water Brush - 2026-09-26

- Add, remove, smooth and roughen semantic land with six brush shapes/presets, world-size controls and cancellable worker previews.
- Reuse coastline styles; clip biome and visual terrain to edited land in editor and PNG, with one undo step per stroke.
- Persist manual geography metadata in format 12 through local save, project transfer and backups.
- Defer autosave during transient gestures and avoid falsely marking an in-flight save clean during a newer stroke.

# Changelog

## Terrain Brush & Texture Painting (26 September 2026)

- Add World/Regional Paint, Erase and Blend with size, softness, strength, fractional texture scale and cursor preview.
- Store independent, validated terrain masks in optional format-12 `map.terrainPaint`; semantic Areas and generation remain unchanged.
- Add one logical paint layer, per-stroke undo, shared editor/PNG rendering and persistence through existing save/ZIP/backup paths.
- Validate targeted behavior, storage, four zoom levels and exact 1×/2× editor/PNG parity; see the Terrain Brush sprint report for timings and limits.
- No Windows package or external actions.

## Sprint F — World visual themes (26 September 2026)

- Add five composed World/Regional themes, preview picker, per-field override preservation and explicit reset in one undo operation.
- Add generator theme choice, deterministic semantic stamp replacement, themed element defaults and optional format-12 ownership metadata.
- Share decoded editor/export images to eliminate the measured translucent-stamp mismatch at 1×.
- 83 targeted tests, scoped lint and production build pass; all five styles match canvas/PNG pixels at 1× and 2×. See the Sprint F report for evidence and limitations.
- No automatic labeling, Windows package or external actions.

## Sprint 20 - Geographic map workspace (24 September 2026)

- Add Regional/World map types, physical scale, measurements and optional PNG scale bars.
- Specialize existing Areas as editable landmasses/terrain with clipping, contour previews and deterministic coastlines.
- Introduce format 10 with pixel-identical battlemap migration; validate 50 terrain regions and 10,000 nodes.
- No Windows package or external actions.

## Sprint 19 - Scatter brush (24 September 2026)

- Add weighted deterministic Scatter painting, erasing, Area masks with holes, variations and whole-object editing.
- Persist shared stamp references, frozen instances and recipe in format 9; support explicit regeneration, replacement, expansion and PNG export.
- Validate 5,000 instances, storage/backup round trips and 14 Chromium workflows; see the Sprint 19 report for measurements and limits.
- No Windows package or external actions.

## Sprint 17.1 - Wall materials (24 September 2026)

- Add immutable transparent strip/segment wall sets, visual import/picker and three illustrated example sets.
- Preserve editable walls, openings, history and shared PNG rendering; add one-time Area boundary walls.
- Document format 8, schema 4, maker schema/template, bounded rendering and acceptance evidence.

## Release audit � 23 September 2026

- Guard geometry, layer/object/asset counts, cumulative image resources and completed metadata growth before unsavable edits commit.
- Reject delayed background imports after project replacement.
- Report autosave pending immediately and prevent older writes from marking newer changes saved.
- Restore modal Escape/focus with filled search inputs; preserve access to controls at narrow CSS viewports.
- Repair outdated test fixtures, add isolated Playwright/axe audit tools and synthetic fixtures; publish independent release reports in `docs/release`.
- No format or Dexie schema version change; no existing dependency upgrades.


## Sprint 10 — Editor workspaces

- Separate Map editor / Asset library, compact toolrail and tabbed, collapsible inspector.
- Typed stamps/fill patterns, searchable modal pickers, repeated click-to-place stamps and contextual properties.
- Compact layers, explicit save status, shared design tokens, accessible native modal focus restoration.
- Portable format v2 with central v1 migration; transactional Dexie v3 migration and shared library image bytes.
- Nine focused migration/UX tests; see the Sprint 10 record for technical and manual validation.

## 1.0.0 — Release preparation

- Desktop map editor with zoom/pan, background and stamp imports, editable stamps, layers, square grid/snapping and rectangular repeat/stretch patterns.
- Meaningful undo/redo, portable `.mapweaver` v1 projects and local recovery copies.
- Full-map PNG export at 1×/2×, optional grid and transparent canvas color, plus copyable manual Roll20 alignment information.
- Native project/export modal focus handling and separately cached dependency bundles.

Known limits: desktop use, square grids, one-object scaling/rotation, no persistent history, no project preview generation, no cloud or VTT integration. Browser recovery is not a backup; downloads cannot confirm final disk persistence. Export is bounded to 32 million pixels / 16,384 per edge and a 512 MiB estimated working budget. Some large maps cannot export at 2×. The full manual release checklist is tracked in the Sprint 9 notes and must not be treated as completed by the version label alone.

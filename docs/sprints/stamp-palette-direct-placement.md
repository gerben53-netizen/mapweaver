# Stamp Palette & Direct Placement — delivery report

28 September 2026 · develop · local implementation

## Delivered workflow

Previously, ordinary stamp selection used a separate picker and confirmation before returning to the canvas. Now **Place asset** opens the existing Asset Library beside the canvas. Drag a result directly onto the map for one native Stamp, or click it to start repeated placement. Search/category/filter state and the result scroll container survive placements. Full Library administration remains available through **Manage**; **Browse beside map** returns to placement before dragging begins. The same mounted LibraryWorkspace serves both layouts.

The bottom **Stamp palette** contains campaign-specific named working sets. Use a library card’s **+**, or drag a library card onto the palette. New/Rename/Delete, drag reordering, keyboard Move left/Move right and removal work. Removal/deletion asks confirmation and never deletes source assets. Missing references show a removable missing entry; replace by removing it and adding another library asset. Favorites remain independent.

Click a palette thumbnail once, then click the canvas repeatedly. Each click creates one native Stamp and one undo entry. Another thumbnail immediately starts preparing the new choice; late asynchronous responses cannot overwrite it. Escape cancels even during a mouse press, and switching tools exits placement. Dragging from the palette is one-off and preserves an already active continuous choice. No new rotation/scale interaction was needed; placed stamps retain the existing transform controls.

All paths converge on `project.place`, normal asset adoption, default sizing, snapping and history. Ghosts use actual decoded images, matching aspect ratio, world size/map scale and Alt-to-bypass snapping. Red feedback identifies invalid destinations. Hidden/locked active layers and incompatible map types reject placement; no fallback layer is chosen. Room Generator’s active Bibliotheek layer receives furniture. Coordinates and persisted stamp serialization are unchanged.

## Persistence, accessibility and performance

Palette records contain only names, IDs, order and active choice. They save automatically through the local service to campaign-scoped SQLite settings with version, bounds and revision conflict checks. Full dataset backups include them; single-map `.mapweaver` exports do not include campaign palettes. A conflicting/failed write is visible and does not replace the last saved state. Collapse preference alone is browser-local. Details: [ADR-0048](../adr/0048-stamp-palettes-and-direct-placement.md).

All palette management and selection have button/select alternatives to dragging. Thumbnail names/tooltips are accessible; input fields retain normal behavior and stamp UI does not trigger map Delete/nudge actions. Active choices are highlighted. The strip supports horizontal overflow; collapsed state survives reload.

The library retains its existing 60-result pagination and IntersectionObserver thumbnail loading; the palette reuses AssetThumbnail and the image cache. No full-resolution decoding is added for thumbnails. Only selected/dragged stamps prepare the actual source. Palette metadata queries are bounded to the active set, at most 64 IDs. The tested fixture has 11 library images; this sprint does not claim a new large-library performance benchmark. At 1280×720, the canvas is 850 pixels wide with the dock and collapsed Inspector, and 351 pixels high with the expanded palette and active tool controls (391 without the extra stamp-choice bar). It grows when the palette/browser collapses.

## Validation

- **27 client tests passed** across stamp palette domain validation, palette component behavior, direct placement, existing placement mathematics and workspace interactions.
- **1 service test passed** covering campaign isolation, names/order/active choice, missing IDs, persistence after reopening SQLite, revision conflicts and malformed input.
- **TypeScript checks passed**, including client and service compilation in the final production build.
- **Scoped ESLint passed** for changed TypeScript source/tests.
- **Production build passed**, including service build and bundled font/license verification. Vite reports its chunk-size warning for output chunks over 500 kB.
- **Headless Chrome on Windows, 1280×720:** all seven requested scenarios passed in a fresh isolated service/database using original furniture images. No browser page errors.
- Additional browser checks passed: real palette drag reorder; Library-to-palette drop without map creation; explicit full-Library-to-dock transition; out-of-map rejection; preservation of an existing continuous choice during a one-off drag; collapsed state after reload.

The browser assertions check ten different native drags while retaining search/Favorites, seven palette entries saved/reopened with their order, exactly ten Bookcase clicks, rapid Bookcase → Table → Chair → Books switching, exactly one Plant drag, Bibliotheek membership/locked rejection, and three individual keyboard undo/redo operations. The ghost uses a real image and measures **200 map pixels for 20 feet at 50 px per 5-foot cell**. Local map save/reopen retained the native stamp content.

An intermediate test run was obstructed by the existing recovery notification after deliberately reloading unsaved test edits. The final harness saves before reload and handles the dismissible notice. It also uses the explicit browsing transition rather than changing the layout during a native drag. Final evidence comes from the clean passing run.

No unrelated broad suite, new PNG-renderer test suite or Windows packaging was run. Existing serialization/export paths are reused without format changes. No new number shortcuts or separate Recent row were added; both were optional. Palette-only portability beyond full dataset backup remains a follow-up.

## Important files and evidence

- `src/library/LibraryWorkspace.tsx`, `Assets.module.css`: one persistent browser, compact filters, draggable results and Add to palette.
- `src/library/StampPalette.tsx`, `StampPalette.module.css`, `stampPaletteStore.ts`: accessible working sets and service persistence.
- `src/library/stampPlacement.ts`, `src/canvas/useStampPlacement.ts`, `StampPlacementGhost.tsx`: shared preparation, drag target, continuous clicks and real-image ghost.
- `src/domain/stampPalettes.ts`, `stampPlacement.ts`, `service/stampPalettes.ts`, `service/app.ts`: validation, compatibility and campaign storage.
- App/layout, ToolRail, PatternTools, editor/project stores, shortcuts and CampaignWorkspace integrate the workflow. README, AGENTS glossary and ADR-0048 document it.

Local evidence under `deliverables.local/Stamp-Palette/`:

- `01-ten-library-stamps-1280.png` — ten distinct Library placements.
- `02-continuous-bookcase-ghost.png` — repeated placement, actual ghost and named palette.
- `03-locked-layer.png` — locked-destination feedback.
- `04-palette-reopened.png` — retained palette after reopening.
- `05-final-layout.png` — reordered/expanded palette and explicit out-of-map feedback.
- `results.json` — final assertions, image sources, dimensions and isolated database path.
- Reproducible local harness: `.qa.local/stamp-palette-browser.mjs`.

No external push, merge, publication or deployment occurred. No Windows package was created. Original source images and the user's primary projects/library were not modified by validation.

# Smart map markers, wizard and Windows package cleanup

Completed 24 September 2026.

## Delivered behavior

Marker is now a Cartographic Element backed by the existing Place object. Both **Map Elements → Marker** and **Place marker** open the same compact Configure → Place wizard. It offers semantic type, style, compatible visual icons, name, optional linked label, label position, prominence and a live preview. Finish enters placement mode; a click adds the marker/label in one undo transaction and selects the marker. Escape cancels. The wizard remembers choices for the same map type within the session; duplication supports repeated placement.

Implemented **22 types**: Capital, City, Town, Village, Fortress/Castle, Ruin, Temple/Shrine, Harbor/Port, Cave, Dungeon, Tower, Camp, Landmark, Gate/Pass, Mine, Bridge, Point of interest, Objective, Entrance, Exit, Trap/Warning and Custom.

Implemented **five style families**: Minimal, Cartographic, Ornate Fantasy, Parchment/Explorer and Technical. **Nineteen built-in vector icons** cover walled city, clustered roofs, twin-tower keep, watchtower, broken tower, ruined arch, columned shrine, anchor, sailing harbor, cave mouth, encampment, mountain landmark, crossed picks, stone bridge, radiant star, survey diamond, warning cairn, passage arrow and settlement glyph. Compatible icon selection is centralized; no Asset Library browsing or asset records are needed for new markers. Full preview/editor/PNG use the shared painter and fixed map colors, independent of application theme.

Properties starts with Name, Type, Style, curated icon and Minor/Normal/Major/Primary prominence, followed by label and appearance. Metadata and Advanced contain notes/tags and exact X/Y, size mode, captured world scale, symbol width/anchor and legacy importance. A compatible icon survives type changes; an incompatible one receives a sensible compatible default. Explicit style changes apply preset colors. Legacy custom-asset picking remains in Advanced.

Labels reuse existing Label objects, pinned font metrics, boxless map-type styling, halo and PNG rendering. `ownerId` supplies movement/copy/delete behavior; optional `markerName` opts into name following. Direct label-text editing or detachment disables automatic name following. Custom text and old labels remain independent. Automatic multiline name changes and prominence resizing retain the symbol-to-label gap; this received a visual PNG check and a regression test. Label toggling and marker edits preserve z-order and use one reversible transaction.

Battlemap defaults prioritize compact POI/objective/entrance/exit/warning choices with Minimal styling and labels off. Regional maps prioritize settlements and local landmarks with Cartographic styling; World maps prioritize capitals/major locations with Ornate styling. Base cartographic sizes are 24/36/44 map pixels; prominence scales these by .75/1/1.3/1.65 and maps to existing importance 0/1/3/5. Existing physical-scale controls remain exact and zoom-independent.

## Compatibility and changed files

Existing Place IDs, geometry, arbitrary type strings, custom stamp references, importance, notes and tags remain unchanged. Missing new marker metadata selects the exact legacy rendering path; conversion is explicit. This is an optional-field extension of project format 12: `Place.marker` has explicit version 1 and validated icon/style/prominence/colors. Label adds optional boolean `markerName`. Invalid values/extra fields are refused. SQLite schema, asset schemas and portable archive containers are unchanged. Wizard state stays in the editor store, not the project.

Primary changes:

- `src/domain/markerRegistry.ts`, `markers.ts`, `annotations.ts`, `cartographicPresets.ts`, `decorations.ts`: registry, defaults, model admission and linked-label behavior.
- `src/canvas/drawMarker.ts`, `drawAnnotation.ts`: shared built-in vector rendering.
- `src/app/MarkerWizard.tsx`, `MarkerFields.tsx`, `MarkerProperties.tsx`, `Markers.module.css`: creation, preview and semantic Properties.
- `src/app/AnnotationTools.tsx`, `AnnotationProperties.tsx`, `MapElementsMenu.tsx`, `ToolRail.tsx`: integration and preservation of independent label editing.
- `src/store/editorStore.ts`, `projectStore.ts`: session choices and atomic marker/label edits.
- Targeted marker/model/component tests, existing annotation/decorations tests, `service/annotations.test.ts`, and `tests/persistence/smart-markers.mjs`.
- `AGENTS.md`, `README.md`, `docs/smart-markers.md`, `docs/portable-windows.md`, ADR-0024 and this report.

The requested develop branch is absent; this repository has an unborn master with untracked existing project files. Work stayed in the existing workspace without replacing user changes or inventing a branch/commit.

## Validation

- `npm run test -- src/domain/markers.test.ts src/domain/annotations.test.ts src/domain/decorations.test.ts src/app/markers.test.tsx src/app/annotationInteraction.test.tsx src/app/cartographic-labels.test.tsx`: **41 passed**. Includes all map defaults, compatible icons, invalid input, legacy custom symbols, wizard choices/cancel/keyboard flow, semantic Properties/Advanced, label toggles, exact persistence, name following/overrides, transforms, z-order, undo/redo and multiline label spacing.
- `npm run test:service -- service/annotations.test.ts service/cartographic-elements.test.ts`: **2 passed**. New markers and linked labels coexist with legacy custom artwork through SQLite, reopen, portable transfer and verified backup.
- `npm run typecheck`: passed during implementation; final `npm run build` also passed both client and service TypeScript checks and both production bundles.
- Scoped ESLint: passed for every changed TS/TSX/MJS source/test; final changed annotation/store/browser files were rechecked after the spacing correction.
- `node tests/persistence/smart-markers.mjs`: production-browser workflow passed, using isolated data.
- `node tests/persistence/smart-markers.mjs Mapweaver-SmartMarkers-20260924-Final`: **7 packaged acceptance/integrity checks passed**, no browser page errors. Launched actual native Mapweaver.exe, created campaign/map, opened wizard through both entry points, checked keyboard focus/Escape/Enter, selected icon/style/label/prominence, placed and autosaved, changed name/icon/style, verified linked text and undo/redo, exported PNG, safely stopped/restarted and reopened the last map/campaign, opened Campaign Explorer and Asset Library. PNG icon/label regions contain visible pixels, background is transparent, selection-on/off output is pixel-identical and label clearance is checked. Wizard, Properties and PNG artifacts were visually inspected at 1280 × 720.
- No full unrelated test suite or separate formatcheck. No installer/signing/default-browser or tray-menu manual test; native lifecycle and browser flows were automated using `--test --no-browser` with real headless Chrome. The portable package is the requested Windows deliverable.

## Final Windows deliverable

Package: `C:/Users/gerbe/Documents/ChatGPT/Mapweaver/distribution.local/Mapweaver-SmartMarkers-20260924-Final/`

Executable: `C:/Users/gerbe/Documents/ChatGPT/Mapweaver/distribution.local/Mapweaver-SmartMarkers-20260924-Final/Mapweaver.exe`

SHA-256 manifest: `distribution.local/Mapweaver-SmartMarkers-20260924-Final-SHA256SUMS.txt`.

All **4498 package files** matched the manifest before the native acceptance test. Executable SHA-256:

`4E082CCBD40F6C5D45E49A1EAD38F43B44027995AA18A722FD9BBC7B02F4A90C`

The complete package folder is required. Packaging used the existing pinned Node 24.17.0 x64/runtime/native-module/C# launcher process. No dependency or launcher implementation changes were needed.

## Cleanup verification

Removed **15 pre-existing obsolete build directories plus one superseded intermediate marker build** (16 total), only after successful validation of their replacements. Scope was strictly the resolved local `distribution.local` directory. Each package identity, known contents, runtime/service and absence of reparse points were checked. The old running StartupUX supervisor was safely stopped through its normal Stop/Wait command outside the sandbox after the sandbox could not reach it; no process was force-killed. User data was confirmed outside distribution. Corresponding obsolete checksum manifests were also removed.

- `distribution.local/failed-first-build/`
- `distribution.local/Mapweaver/`
- `distribution.local/Mapweaver-Lifecycle/`
- `distribution.local/Mapweaver-Lifecycle-validation/`
- `distribution.local/Mapweaver-Sprint14/`
- `distribution.local/Mapweaver-Sprint15/`
- `distribution.local/Mapweaver-Sprint15-validation/`
- `distribution.local/Mapweaver-Sprint17-1/`
- `distribution.local/Mapweaver-Sprint23/`
- `distribution.local/Mapweaver-Sprint23B/`
- `distribution.local/Mapweaver-StartupUX-20260924/`
- `distribution.local/previous-before-final-validation/`
- `distribution.local/previous-before-healthcheck-fix/`
- `distribution.local/previous-tested-build/`
- `distribution.local/prior-launcher-timeout-build/`
- `distribution.local/Mapweaver-SmartMarkers-20260924/`

Post-cleanup enumeration confirms exactly **one package directory and one Mapweaver.exe**, both belonging to `Mapweaver-SmartMarkers-20260924-Final`. No uncertain package was deleted or retained. Source, root documentation, tests, campaign/map/project data and user backups were not deleted or moved. Validation used a separate `.smart-markers.local` test dataset. The normal user-data service was stopped safely, not migrated or rewritten by this implementation.

Machine-local evidence: `.smart-markers.local/package-1790273515182/` (`results.json`, screenshots, selected/unselected PNGs, cleanup-result.json). Earlier cleanup inventory is in `.smart-markers.local/package-1790273035629/cleanup-plan.json` and `cleanup-result.json`.

## Known limits

There is one compact configuration step followed by canvas placement, rather than six wizard pages. Name + subtitle can be entered as a custom multiline label after placement; no dedicated subtitle control was introduced. Advanced label font/halo controls remain in the existing label inspector. If an old marker has multiple independently linked labels, its marker panel edits the first; the others remain individually editable. Custom theme packs, SVG import, clustering, zoom-based visibility and automatic collision avoidance remain outside scope.

No push, merge, publication, release, upload, deployment or cloud change was performed. Local Windows packaging and bounded cleanup were explicitly requested and completed.

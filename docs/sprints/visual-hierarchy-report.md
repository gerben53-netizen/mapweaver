# Visual hierarchy polish — 24 September 2026

## Acceptance and result

Keep the existing editor structure, workflows and map artwork while making active navigation, tools, inspector tabs, selection, focus and destructive actions easier to distinguish. Use one restrained accent family, shared tokens and subtle graphite surfaces. No data-format, renderer, storage or layout architecture changes.

- Shared tokens in `src/styles/global.css`: muted teal `#80bdb3`, selected background `#233b3b`, selected hover `#2c4948`, neutral hover `#374248`, bright focus `#b1e8de`, warm off-white text and semantic danger/warning/success. Teal separates interaction state from neutral artwork without competing with it. Shell, canvas surround, toolbar, panel, raised surface and input have separate neutral tokens.
- Navigation and inspector tabs retain their underline and brighter labels; tools retain a vertical active edge. Keyboard focus remains an independent outline, including on an already active tool. Disabled controls remain subdued and readable.
- Objects, the actual Layers tree, Campaign Explorer and asset cards use the same selection family. Selected hover keeps its teal identity. Campaign selection uses the filled row; the open map independently retains its edge, bold name and existing dot. Objects retain their checkmark and distinct dashed keyboard cursor.
- Buttons have shared primary, default secondary, tertiary and destructive treatment. Export PNG is a restrained secondary action; create/import/finish actions retain primary styling. Delete selection and category/collection removal now use the destructive variant. Existing confirmations and undo behavior are unchanged.
- Properties identity uses a subtle raised surface and selection edge; section headings/dividers and secondary sections improve scanning without reorganizing fields. Empty Properties stays muted. Modal surfaces, geographic inputs and tool status text use shared tokens.
- Asset Library uses the same tabs, category/favorite states, cards and focus styles. Uncategorized now exposes its missing pressed state. Bulk action separators remain neutral. Thumbnail/artwork backgrounds are intentionally independent of the UI accent.
- Document identity is readable but secondary to navigation. `SaveStatus` preserves the existing messages and timestamp tooltip while exposing its state for styling: saved/dirty are neutral, saving subtly brighter, error/conflict danger. Bottom status/help stays muted and readable.

## Important files

`src/styles/global.css`; CSS Modules for App, MapCanvas, ObjectsPanel, LayersPanel, ObjectProperties, CampaignExplorer, Assets, ProjectControls, Modal, Markers, Geography, MapSettingsPanel, OpeningTools, PatternTools and Scatter. Component changes: `ToolRail.tsx`, `SelectionToolbar.tsx`, `ExportControls.tsx`, `ProjectControls.tsx`, `SaveStatus.tsx`, `LibraryWorkspace.tsx`.

Tests: `src/app/visual-hierarchy.test.tsx`, updated `src/app/ux-improvement.test.tsx`, and `tests/persistence/visual-hierarchy.mjs`. The old marker test expected immediate placement; it now checks the already-existing marker wizard, without changing that workflow.

## Validation

- `npm test -- src/app/visual-hierarchy.test.tsx src/app/ux-improvement.test.tsx src/app/SelectionInspector.test.tsx src/app/ObjectsPanel.test.tsx src/library/LibraryWorkspace.removal.test.tsx`: **39 passed, five files**. Covers tab keyboard/selection semantics, tool state, save variants, object selection and asset removal regressions. Palette tests require at least 4.5:1 for text pairs (including disabled text) and 3:1 for focus against adjacent interactive surfaces.
- Scoped ESLint on all changed TS/TSX files and the browser harness: passed.
- `npm run build`: passed client and service TypeScript checks and production builds. `npm run build:client` passed again after the final component/CSS changes. No separate typecheck command was necessary; these builds include both TypeScript projects.
- `node tests/persistence/visual-hierarchy.mjs`: **six browser checks passed** in installed headless Chrome at 1280 × 720, using production files and an isolated disposable local dataset. Actual computed styles verify active navigation/tools/inspector/layer, neutral versus selected hover, active plus keyboard focus, asset-card selection, destructive controls, Objects selection and quiet Saved state. A selected folder is tested independently from the currently open map.
- Axe `color-contrast` scans: **zero reported violations** across Editor, Campaign folder, Asset Library, Remove assets dialog, Properties, Objects and Projects. Screenshot review covers those surfaces and tool keyboard focus. Saved evidence is linked below.

## Boundaries

This is not a full WCAG or screenreader audit. Axe reports some incomplete checks for glyphs and canvas/overlaid content; screenshots and token contrast checks supplement them. Arbitrary user artwork and every tool-specific dialog have not been contrast-certified. No unrelated full test suite, service suite, native launcher or Windows-package test was run.

The repository has no commits or existing `develop` branch. Work remains in the existing working directory; no checkout/reset/commit was performed. No external push, merge, release, upload, deployment or cloud action. No Windows package was created or changed; the existing package does not include this polish.

Evidence: [results](evidence/visual-hierarchy/results.json), [contrast scan](evidence/visual-hierarchy/contrast.json), [editor](evidence/visual-hierarchy/editor-1280.png), [Properties](evidence/visual-hierarchy/properties-1280.png), [library](evidence/visual-hierarchy/library-1280.png), [folder and open map](evidence/visual-hierarchy/campaign-folder-1280.png), [active tool with keyboard focus](evidence/visual-hierarchy/active-tool-keyboard-focus.png).

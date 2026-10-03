# Decorative title banners — 24 September 2026

## Delivered

Extended the existing Title / Cartouche object, registry, insertion flow, Properties and shared canvas/PNG painter. No competing title type, library assets, dependencies or storage subsystem.

- Four new internal vector presets: **Ribbon Banner**, **Parchment Banner**, **Ornate Fantasy Cartouche**, and **Region Nameplate**. All five original title choices, including Simple, retain their IDs/layout/rendering. New Regional titles default to Ribbon, World to Fantasy, Battlemap to Simple.
- Existing title and subtitle strings remain separate from frame artwork, typography and transforms. Changing preset preserves text; explicit preset selection applies its ink/paper defaults. Text color, halo, weight, italic, alignment and frame colors remain editable independently.
- Registry-owned aspect ratios, text insets and minimum font size control layout. New carriers fit a single title and optional subtitle line, shrinking to a minimum and warning in Properties if text still overflows. Stored subtitle newlines render as spaces. No strings are truncated. Width scales proportionally; Wrap width changes logical text capacity. Canvas corner handles already preserve aspect ratio.
- Title-specific Properties prioritize title/subtitle and style, retain the shared font controls and place frame appearance/exact position/rotation/opacity under Frame and placement. Apply remains one undo step.
- The existing insertion toolbar and Properties both offer **Preview title styles…**. All previews use the real painter and bundled font. Named native buttons, pressed/checkmark selection, arrow-key focus, Enter activation and Escape/cancel use the existing modal behavior. A font-loading failure retains the named choices and reports preview unavailability.
- Internal vector resources ship as application code. No user-library entries or external artwork/fonts are required. Ordinary selection, transform, layers, ordering, hide/lock and export remain in place. Project format remains 12 with four additional accepted preset IDs; no transient or derived layout fields are saved. ADR-0023 documents the extension.

## Validation

`npm test -- src/app/title-banners.test.tsx src/domain/decorations.test.ts src/app/cartographic-labels.test.tsx`: **21 passed across three files**. Covers registration/applicability/defaults, invalid/missing registry lookup fallback, legacy layout and round-trip preservation, independent appearance overrides, fitting/overflow/subtitle, text-preserving preset changes, proportional width, undo/redo, preview keyboard selection, shared painter, legacy annotations and export-scene separation.

`node tests/persistence/title-banners.mjs`: **three browser acceptance groups passed**, no uncaught page errors. Installed headless Chrome at 1280 × 720 against production builds and an isolated local dataset. Places all four carriers through the actual Title flow, waits for all nine previews to paint, tests keyboard navigation, overflow warning, content-preserving preset changes, 500px proportional width, 50% opacity, explicit save and reload. The user Asset Library remains empty.

Real transparent PNGs are pixel-identical with selection on/off. Carrier corners remain transparent, interior paper at 50% opacity measures alpha 128 ± 1, and text/frame content is present. Exported artwork and preview screenshots were visually inspected; ribbon text insets and fantasy ornament clearance were refined based on that review. Existing layer ordering is reused; a separate overlapping-layer browser scenario was not added.

Scoped ESLint passed for all changed TS/TSX files and the browser harness. `npm run build` passed both client/service TypeScript checks and production builds. No unrelated full suite, native launcher test or Windows packaging was run.

## Files and limits

Changed: `src/domain/cartographicPresets.ts`, `decorations.ts`, `decorations.test.ts`; `src/canvas/drawCartography.ts`; `src/app/AnnotationTools.tsx`, `AnnotationProperties.tsx`. Added: `TitleProperties.tsx`, `TitlePresetPicker.tsx`, `TitlePresets.module.css`, `title-banners.test.tsx`, `tests/persistence/title-banners.mjs`. Updated README and ADR-0023.

No curved text, new font family, shadow, heraldry slots or nine-slice frames. Extremely long text can exceed the frame at the minimum size; Properties warns and the user can shorten it or increase Wrap width. Ordinary map-edge clipping still applies. Arbitrary historic nonproportional transforms remain renderable. This is not a full accessibility or screenreader audit.

The requested existing develop branch is absent; this repository remains an unborn master with untracked working files. No checkout, reset or commit. No push, merge, release, upload, deployment or other external action. **No new Windows package**; the existing package does not contain this follow-up.

Evidence: [results](evidence/title-banners/results.json), [preset picker](evidence/title-banners/preset-picker.png), [editor](evidence/title-banners/titles-editor.png), [transparent export](evidence/title-banners/unselected.png).

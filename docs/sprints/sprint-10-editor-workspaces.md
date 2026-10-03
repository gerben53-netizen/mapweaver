# Sprint 10 — Editor workspaces

## Acceptance and action inventory (before implementation)

Preserve every existing map operation while replacing the permanent asset sidebar with a toolrail, typed pickers and a separate library workspace. Workspace, inspector, picker and recent-choice state must never become project/history data. Validate typed library/project migrations before changing user data.

| Existing actions | New location |
| --- | --- |
| New, open, download, PNG export / Roll20 settings, recovery / removal | Single header; recovery dialog |
| Undo, redo, copy/paste shortcuts | Header history / Edit; selection copy in Properties |
| Import stamp batch, categories/create category, search, filter, retry, import report | Asset library, independently for Stamps / Fill patterns |
| Library thumbnail drag placement | Stamp picker followed by repeated click-to-place |
| Use as pattern, pattern image replacement | Fill-pattern picker; explicit cross-type copy in library |
| Select, pattern draw / cancel | Toolrail; active choice in canvas toolbar |
| Zoom, fit, pan | Canvas toolbar / canvas gestures / status bar |
| Grid visibility, snapping | Canvas toolbar; full settings in Map |
| Background import/replacement, dimensions/color/grid, cell summary | Map inspector tab |
| Add/activate/rename/reorder/hide/lock/delete layer | Compact Layers rows, inline rename and More |
| Duplicate/delete/copy/object ordering/move to layer | Contextual Properties actions |
| Stamp coordinates/dimensions/rotation/flips; multi-selection | Properties tab |
| Pattern bounds/mode/scale/rotation/offsets/opacity/replacement | Properties tab |
| Library rename/category/delete/sort and type copy | Library details |

## Compatibility decision

Project format v2 explicitly requires `kind: stamp | fillPattern` on logical asset entries. v1 loads through one deterministic migration: stamp-only/unused become stamps, pattern-only become fill patterns, shared assets split into two IDs with shared source bytes and only pattern references rewritten. Backgrounds are type-neutral references. Shared logical entries may point to one ZIP asset path. New files use v2, never silently reinterpret a typed incompatible entry. Dexie v3 retains existing blobs and adds logical blob references; classification uses persisted recovery documents, since an unpersisted old browser session is unavailable during a database upgrade.

## Validation plan

Two focused files, approximately nine cases: migration/bytes, parser compatibility/type rejection, picker filtering/selection, Escape/focus, both creation paths, workspace/inspector isolation, compact layers, shortcut guards. TypeScript, changed-scope lint and production build only. Manual target: 1280×720 workflow and seven screenshots covering empty/selected editor states, both library types and both pickers. Prior browser-tool URL-confidence failures remain a validation risk, not evidence that the UI passes.

## Implemented and technical validation

One header; two local workspaces; typed reusable picker with native modal focus containment/restoration; click-to-place stamps; existing pattern drawing; three independently scrollable inspector pages and collapse; compact layers; contextual properties; neutral/blue/destructive tokens and SVG tools. Old permanent library and untyped Use as pattern component were removed after replacement flows passed tests. Library deletion also protects chosen tools and clipboard so a later placement/paste cannot refer to deleted bytes.

2026-09-23: `npm test -- src/projects/sprint10-assets.test.ts src/app/sprint10-workspaces.test.tsx`: **9/9 pass** in two files. Includes real fake-indexeddb schema-2 upgrade/reopen/blob retention and strict old-archive decoding/new-format roundtrip, typed picker filters/resolver rejection, native cancel contract with restored focus, repeated stamp placement/snapping, rectangle creation and type rejection, UI state isolation, layer controls and keyboard guards. Browser-native Escape dispatch/focus containment itself still requires manual verification. A discovered React autofocus-before-trigger-capture bug was fixed and covered by the cancel test.

TypeScript: `npm run typecheck` passed; final `npm run build` also ran `tsc -b` successfully. ESLint passed for the changed TS/TSX scope only (43 files). Production build passed: 126 modules, largest chunk 347.69 kB before gzip, no chunk warnings. No broad regression suite or Playwright run; earlier tests were not rewritten for markup. No external actions.

## Manual validation and screenshot record

Pending the Windows browser workflow at 1280×720. No screenshots or visual pass are claimed yet. Planned views: unselected editor, selected stamp, selected fill, library Stamps, library Fill patterns, stamp picker, fill picker. Planned check includes imports/metadata, picker search/category/cancel/focus, repeated placement, fill drawing, layers, properties, undo/redo and download/open/export. The browser automation tool previously reported URL-confidence failures; if this recurs, it is a tooling blocker rather than a successful manual check.

Manual attempt outcome (2026-09-23): **blocked, not passed**. The Windows tool showed inconsistent browser/tab identity. Automatic approval review rejected the intended Mapweaver-tab click because its target was uncertain and the following accessibility read could expose an unrelated signed-in conversation. A safer foreground activation and keyboard selection with screenshot-only refresh did not establish the intended local tab. No further app inputs were issued. No requested Mapweaver screenshots were obtained; consequently visual hierarchy, readability, actual 1280×720 layout, native focus behavior and the full browser save/open/export workflow remain unverified. Continue only from a clearly verified local Mapweaver tab. This is an explicit acceptance gap, not a known successful UX result.

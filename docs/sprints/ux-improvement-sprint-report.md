# Mapweaver UX improvement sprint

24 September 2026. Scope: refine the current editor architecture and dark visual direction without a renderer/library rewrite or persistence changes.

## Acceptance and implementation

- Grouped compact SVG tool rail: selection, assets, drawing, structures and annotations. Each tool has an accessible name, tooltip and pressed state; the active tool also has a border/edge marker. The existing semantic Place is named **Place marker**, while stamp placement becomes **Place asset**. Landmass/Terrain/Measure remain available on geographic maps.
- Tool/selection context has an explicit heading and high-value Duplicate/Delete/Group/Ungroup/Properties actions. Existing Wall, Scatter and other tool controls remain contextual. **Map actions** separately contains room detection, prefab capture and keyboard help. No unsupported controls were invented.
- Battlemap dimensions use squares in Map settings and New project; derived pixels remain visible. Fractional squares preserve nonmultiple legacy dimensions without rounding. Resize is explicit and retains clipping confirmation; no object positions or sizes change.
- Grid visibility/snap/color/opacity/stacking and map color update immediately through the existing command/history/persistence path. Resolution/offset numerical edits commit on Enter or blur. Structural resize drafts survive unrelated live toggles. Advanced grid settings are collapsed; game scale uses `1 square = distance unit` and explicit Set game scale. Regional/world map settings retain their own scale behavior.
- Grid/style changes no longer trigger automatic Fit. Actual dimension changes still fit the map. F fits map, Shift+F fits selection around actual bounds. Keyboard actions respect editable fields and dialogs. Existing pointer transforms and pan/zoom handlers are retained. Escape clears selection after gesture/group cancellation priorities.
- Focus button/backslash hides both side panels, retains their state and has an always-visible exit. It stays in temporary editor state, never the saved project.
- Inspector tabs retain arrow-key/Home/End navigation, stronger readable selected state and responsibility tooltips. Existing Layers/Objects/Properties boundaries are preserved. Tool-aware footer instructions replace the generic status text.
- Saved/Saving/Save failed/conflict/unsaved states are concise; the saved timestamp is secondary tooltip information. Manual Save retains immediate flush semantics and shortcut explanation. PNG export remains prominent and correctly named.

## Files

`src/app/ToolRail.tsx`, `Icon.tsx`, `App.tsx`, `App.module.css`, `SelectionToolbar.tsx`, `MapSettingsPanel.tsx`/CSS, `GeographicSettings.tsx`, `PatternTools.tsx`, `ProjectControls.tsx`/CSS, `Tabs.tsx`, `editorUx.ts`; `src/canvas/MapCanvas.tsx`/CSS, `viewActions.ts`; `src/store/editorStore.ts`, `shortcuts.ts`. Tests: `src/app/ux-improvement.test.tsx`, corrected older workspace-test mock, and `tests/persistence/ux-improvement.mjs`. README documents the interactions.

## Validation

`npm test -- src/app/ux-improvement.test.tsx src/app/sprint10-workspaces.test.tsx src/canvas/useCanvasNavigation.test.tsx src/canvas/viewport.test.ts src/domain/mapSettings.test.ts src/store/history.test.ts src/store/arrangement.test.ts`: **53 passed across seven files**. Tests cover grouping/active state, context switching, basic/advanced inspector, exact cell calculation/partial squares, game scale, live changes and undo, clipping cancellation, tab navigation, input guards, focus toggle, selection fit and save states, plus existing pan/zoom/history/group behavior.

The old workspace test initially mocked the pre-Sprint-23 unfiltered library API. Its mock now honors kind/search/category just like the real paginated hook. No library product code was changed for that failure. A new test caught a draft reset when legacy missing mapType normalized to battlemap; the form key now treats those states identically.

Scoped ESLint passed for the changed TypeScript/TSX files and tests. `npm run build` passed client/service TypeScript checks and production builds. No full suite or unrelated service tests were run. Browser evidence and final result are recorded below.

## Decisions and boundaries

There is no existing develop branch or HEAD commit in this repository: all files are untracked on the unborn master branch. No branches/commits were invented and no user changes were reset.

No schema or format changes: SQLite remains 6 and projects remain 12. Existing project import/save/reload is exercised in the browser. Pixel/world controls stay available where appropriate. Resolution changes grid spacing, not canvas resolution or existing artwork; this preserves existing semantics. Text/numeric input commits on blur/Enter avoid invalid transient values or one undo per typed digit. Physical-scale changes retain an explicit action.

Existing SVG icons, CSS tokens, components, object selection/transform behavior and Zustand stores are reused. No nonpersistable handles or new auto-join behavior. Advanced alignment remains in the existing Properties action section rather than crowding the quick toolbar. PNG and project-file export are intentionally distinguished. Focus mode is session-only. Native tooltip behavior and a full screenreader audit were not independently tested.

No new Windows package: the user only requests one when explicit, and this prompt does not. Earlier packaged versions therefore do not contain these UX changes; run the current source/production build to use them. No external push, merge, release, deployment, cloud action or system service change.

## Browser and visual result

`node tests/persistence/ux-improvement.mjs`: **9 checks passed, zero uncaught page errors**, installed headless Chrome against the production build and a fresh isolated service dataset. Evidence: `.ux-improvement.local/1790262198495/`; selected screenshots and results are copied to [evidence/ux-improvement](evidence/ux-improvement/).

Checks exercise existing prefab-house project import/open, five tool groups, Wall context/global room-command separation, 36-square resize with persisted 1800px width, grid visibility without viewport reset, advanced opacity, game scale, input shortcut guards, Fit, reversible focus mode, selected-object actions, fit selection, Escape deselection, middle/Space pan without coordinate mutation, saved-state rendering, reload and a new 40x40-square / 2000x2000-pixel project in unchanged format 12.

Screenshots at 1280x720 and 1600x1000 were inspected separately from assertions: rail and contextual controls are distinct, inspector scroll remains contained, focus mode hides both side panels while retaining the exit button, and selection bounds remain visible. The Map inspector scrolls to game-scale and advanced options at 720px height. Extra toolbar actions may wrap to a second row for a selection; they do not overlap the canvas. An initial navigation attempt reached the project dialog but exceeded an overly short load-event timeout; the harness now waits for DOM readiness and the visible workflow. This was not counted as a passing run.

Final follow-up added distinct Landmass/Terrain icons and a regional-map unit test; scoped lint and a fresh client TypeScript/production build passed afterwards. No renderer or service behavior changed. No native Windows/system-tray interaction or full screenreader/contrast audit is claimed.

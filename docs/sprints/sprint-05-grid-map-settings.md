# Sprint 5 — Square grid and safe map settings

## Acceptance scope

Configurable square grid and map dimensions/color; efficient clipped rendering; independent visibility/snap; center snapping for placement and completed single/group movement, including offsets and Alt bypass; non-destructive resizing and clipping confirmation; applied pixel/cell summary. Preserve directly affected layers, transforms and navigation. No VTT integration, patterns, undo, persistence or export.

## Decisions and model

- Required `MapDocument.backgroundColor` and `grid: GridSettings` are project content. The existing map/layers/object separation remains. Form drafts live only in the settings component. Alt is sampled from the drop event before asynchronous image acquisition and from drag events; it belongs to the gesture, not the project.
- One consistent Apply action validates and normalizes all fields, requests clipping confirmation if necessary, commits one map change and triggers the existing fit effect. Invalid/cancelled changes do not mutate the map. `applyMapSettings` centralizes this boundary for future history.
- `src/domain/mapSettings.ts` centralizes validation, offset normalization, snapping, cell summaries, resize impact, defaults and render configuration. Map edges are integer 1–8192 px, total at most 24 million pixels (reuse image maxima). Cells are finite 4–1024 px. Grid opacity is 0–1 internally, 0–100% in the UI. Colors are six-digit hex. These are current application limits, not a persisted file-format commitment.
- Offsets normalize to `[0, cellSize)`. Full-cell and partial-edge summaries include shifted first/last cells. Half-cell snapping ties resolve toward the positive axis.
- A single custom non-listening Konva Shape builds one stroked path. It is clipped explicitly and also sits within the map clip. Stroke width is 1/zoom map units. Below four screen pixels per cell, the display stride increases by an integer factor while retaining map-grid alignment. This avoids dense unreadable rendering without changing snap spacing. There are no per-line React nodes or per-pointer grid state updates.
- Grid mounting uses `gridRenderPosition` explicitly before or after the object list. Background stays below both. Background rendering now uses `background.width/height`, not current map dimensions. The origin remains (0,0), so resizing preserves image geometry and alpha reveals the map color.
- Placement snaps its center; drag previews remain continuous. Only a completed move invokes `snapObjects` before its existing single/group commit boundary. Group snapping translates all editable members by the same primary-center correction. Scaling, rotation, numeric edits, duplicate and paste are unchanged.
- Shrink detection checks rotated object bounds across all layers and the background's own extent. Confirmation describes the affected count as clipped, never deleted. No content is discarded; changing map dimensions changes only clipping, background color and viewport fit.

## Focused automated validation

Passed:

- `npm exec vitest run src/domain/mapSettings.test.ts`: six focused definitions, eight cases after expanding the positive/negative/offset snap table. Covers validation/normalization and partial cells; pure snapping; shared delta; placement/move bypass and numeric-edit exclusion; resize detection/cancellation/data preservation; render position and display density.
- `npm exec vitest run src/canvas/canvasEditing.test.tsx -t 'Sprint 5'`: npm did not forward the filter (`--` was missing), so the directly modified canvas file ran all ten cases rather than just the new case. All passed. The one new Sprint 5 integration case exercises completed-drag snapping, shared delta, release Alt, no scale snapping and post-resize fit. No additional integration file was introduced.
- `npm run typecheck`, `npm run lint`, `npm run build`: pass. The build includes TypeScript again and retains Vite's non-blocking >500 kB bundle warning (about 642 kB / 200 kB gzip).

18 distinct cases passed in two narrowly scoped files. No full suite, unrelated Sprint 1–4 suites, snapshots, pixel comparisons or Playwright suite. Existing typed map fixtures received the required defaults; the older MapCanvas mock gained Shape support but was not run.

## One manual browser round

Using the computer-use skill against local Chrome, verified:

- App and default clipped grid render; settings panel expands and remains scrollable.
- Cell size 50 → 75, offset -10 normalizes to 65, grid hex color and 35% → 70% opacity apply visibly.
- Hide/show grid operates independently of the enabled snap checkbox.
- Map color applies; width 1600 → 1800 → 800 changes bounds and triggers fit, without errors on an empty map.
- Full/partial cell summary changes correctly for the chosen size and offset.
- Zoom changes from 90% to 122% retain grid geometry and thin lines; Fit restores the bounded map.
- Above objects can be toggled and applied, but visual order relative to real placed objects was not confirmed.

A native drag attempt from a stamp thumbnail did not produce a placed object. The available drag API also has no held-modifier or middle-button argument. Real snapped placement, single/group snapped movement, Alt bypass, pan, content-clipping confirmation and background-image clipping remain manually unverified. They are not claimed as passing manual checks. The single new integration case covers the highest-risk drag/finish coupling. Browser verification used a 1280 px wide Chrome window; a separate exact 1280 × 720 round was not performed.

## Remaining limits

Manual content-interaction checks above remain outstanding for full acceptance. Maps and grid settings remain session-only; there is no undo or export. Dense-grid display thinning is intentional and does not change snapping. No dependencies, external services, push, merge, publication or deployment were added. Existing uncommitted work on master was preserved.

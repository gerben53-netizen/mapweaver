# Sprint 18 — Doors, windows and rooms

Date: 24 September 2026. Completed — implementation, targeted validation and interactive acceptance passed. No known open Critical/High finding in the tested scope.

## Acceptance criteria

- Typed door/window objects derive their geometry from a stable wall reference and centerline position; edits reject overlaps, segment overflow and orphan references.
- Placement previews, attached dragging, property changes and confirmed cascade deletion have atomic history boundaries.
- Shared editor/export painting and hit testing really interrupt solid and textured walls.
- Explicit bounded room detection previews closed networks, gaps, crossings, holes and existing floors; selected results become ordinary Areas. Regeneration requires confirmation.
- Clipboard, transforms, layers, SQLite, portable projects and backup preserve references.
- Targeted tests, client/service type checks, scoped lint, production builds, Chromium at 1280×720, restart/export comparison and a 100-wall/80-opening/20-room measurement pass.

Preparation: read the preceding prompts/reports and current model, wall/path/area engines, history, storage and rendering routes. Sprint 17 baseline: 25 tests passed across walls, paths and path drawing. Existing files preserved. No Windows package or external action authorized.

## Delivered

Door and Window are typed, individually selectable map objects with stable Wall references, normalized arc positions, pixel widths and explicit unit references. Properties includes single/double/passage doors, three visual door states, simple/wide windows, name, width, position, wall reassignment, flip, reverse side, center-on-segment, next-free and the existing stamp picker for optional symbols. There is no detached or VTT door model.

One compact Opening tool offers a complete live symbol/cutout preview, repeated click placement, segment/free-interval/grid snapping and Alt bypass. Invalid placement is red and explains the rejection on click. Escape cancels; pan does not create objects. Dragging preserves attachment; a selected complete group moves together. Width input accepts intermediate typing and validates at completion.

The wall remains one editable path. A shared clip excludes opening contours from wall outline, solid fill, texture painting and hit painting. Separate exclusion clips avoid XOR refilling where enlarged hit regions overlap. Built-in door/window symbols and optional-image fallback are shared by editor and PNG. Core orphan references block export. Render arrays for unchanged walls and sampled cutouts retain their caches.

Openings share the concrete wall layer and inherit wall availability. Groups containing an opening must include its wall. Copy/duplicate/move-to-layer include the assembly; internal IDs are remapped. Deletion lists dependent openings and performs one confirmed undoable cascade. Whole-wall transforms carry and scale openings; hidden/locked attachments block changes. Impossible segment edits preserve the last valid model with an explanation. Open and closed reversal retain the original center and orientation.

Detect rooms runs explicitly in a bounded disposable worker over existing path samples. Exact endpoint/T connections split temporary graph edges; face walking produces closed rooms, open-endpoint diagnostics, invalid-crossing diagnostics and nested holes. Existing polygon-clipping supplies area-overlap checks. Chosen rooms become ordinary Area floors behind objects on the active layer. Historical provenance supports explicit regeneration; a preview and confirmation protect manual geometry. Existing ID, style, layer and order are retained. Changed documents invalidate outstanding previews.

Format v7, central browser/service reference validation, embedded symbol assets, SQLite autosave/reopen, portable transfer and complete backup restore are integrated. Older readers cannot open v7; retained v1–v6 input routes still work. SQLite schema and backup container are unchanged. See [ADR 0012](../adr/0012-linked-openings-and-room-floors.md), [format v7](../architecture/mapweaver-format-v7.md) and [object model](../architecture/object-model.md).

## Validation

| Check | Result |
|---|---|
| Focused client selection: 13 files, 86 tests | Passed |
| Follow-up placement + MapCanvas checks: 3 tests (2 repeated) | Passed |
| Final diagnostic-budget room tests: 5 tests (4 repeated) | Passed |
| Native service: openings, walls, areas, groups, paths; 5 tests | Passed |
| Client and service TypeScript | Passed through production build; separate typecheck also passed |
| Scoped ESLint over changed source, tests and browser scripts | Passed |
| Client and local-service production builds | Passed |
| Chromium 1280×720 end-to-end workflow | 14 checks passed, including final live-cutout preview |
| Straight/curved × solid/texture pixel and hit exclusion | All four cases passed |
| Additional step-by-step in-app Chromium review | Passed; details below |

Across these focused runs, **88 distinct client tests and 5 native-service tests passed**. The final crossing-diagnostic cap was tested separately after browser acceptance and followed by successful scoped lint and both production builds; it changes only excessive-input refusal.

Primary client command:

```sh
npm test -- src/domain/openings.test.ts src/domain/rooms.test.ts src/domain/walls.test.ts src/domain/paths.test.ts src/domain/selectionTransform.test.ts src/domain/grouping.test.ts src/projects/archive.test.ts src/projects/localSession.test.ts src/projects/sprint10-assets.test.ts src/export/export.test.ts src/store/objectManagement.test.ts src/canvas/openingPlacement.test.tsx src/canvas/roomsClient.test.ts
npm test -- src/canvas/openingPlacement.test.tsx src/canvas/MapCanvas.test.tsx
npm test -- src/domain/rooms.test.ts
npm run test:service -- service/openings.test.ts service/walls.test.ts service/areas.test.ts service/groups.test.ts service/paths.test.ts
npm run build
node tests/persistence/sprint18.mjs
node tests/persistence/opening-render.mjs
```

Coverage includes malformed fields/bounds, orphans including hidden export orphans, overlap and interval edges, short segments, straight/curved projection, width and network budgets, room holes/gaps/crossings/overlap, cached unaffected walls, grid/free-space/Alt, repeated placement, both pan methods and Escape, worker timeout/cancellation, history/cancel, confirmed deletion, clipboard/duplicate/layer copies, whole-object scale/rotation/reflection, locked children, closed-wall reversal and explicit room-floor regeneration. Existing conflict/autosave behavior is covered by the focused localSession tests.

The native opening test saves symbol-bearing doors/windows and floor provenance, refuses invalid writes without changing the revision, closes/reopens SQLite, transfers to a clean storage directory with asset remapping/byte verification and verifies a full backup/extraction/restored dataset. Existing directly affected asset/group/path storage tests also pass.

Development checks exposed a reversal-position bug and a missing too-short-segment preview guard; both were fixed and have regression coverage. A snapping test initially used an incorrect expected free-space coordinate; the geometry was checked and the fixture corrected. One synthetic pointer event lacked pointerId; the browser-like test event was fixed. These failed attempts are not counted as passing evidence. Earlier browser setup incorrectly assumed project creation retained the supplied ID; the harness now uses the actual service-created ID.

## Browser and visual evidence

`tests/persistence/sprint18.mjs` operates installed Chrome through real DOM, pointer and keyboard interactions. It draws a closed house and an interior wall, places two doors and a window, drags a door, changes its swing, previews and creates two floors, exercises undo/redo, checks regeneration confirmation and cancellation of cascade deletion, exports PNG, stops/restarts/reopens the service, exports a portable project and moves a complete group by dragging its opening. It then loads and drags an opening in a 100-wall/80-opening/20-floor scene. No console/runtime errors.

Final browser evidence: `.sprint18.local/1790233394291/` (`results.json`, preview/house/reopened/performance screenshots, `house.png`, `house.mapweaver`). Images were opened and visually inspected. Canvas and PNG agree; editing overlays are absent from PNG. The sampled solid-wall gap shows the underlying floor color, not wall pixels.

The separate render fixture in `.sprint18.local/render/` was also viewed. For all four straight/curved and solid/texture cases, the gap center has alpha **0** in the editor painter, hit painter and exported scene. The surrounding walls remain visibly present. No white overpaint simulates the gap.

Additional direct browser review used an isolated local service on port 47992, an empty new project and an explicit 1280×720 viewport. Observed: drawing a closed house and T-connected divider, placing two doors and one window, moving the interior door, changing open-right swing, detecting exactly two rooms with zero gaps/crossings, choosing both floors, one-step undo/redo, Save, successful PNG download feedback, graceful service restart and reopening the same complete map. The reviewed screenshot after reopening shows the same wall cuts, swing and floors. Browser error log was empty. This is agent-operated interactive inspection, not a claim of an independent human review. Owned services were stopped; viewport override reset and temporary tab closed.

## Measured limits and performance

Limits: 64 openings/wall, width 4–4,096 map px, 256 subdivisions/cut; 256 visible walls, 2,048 sampled room segments, 2,100,000 pair checks, 256 crossing diagnostics, 128 rooms, 512 points/face and existing Area hole/total-point limits. Worker deadline 1,500 ms. Connectivity epsilon 0.000001 px; adjacent openings keep 0.01 px spacing subject to that numeric epsilon.

On this Windows/Chrome machine, the recorded 100-wall/80-opening/20-room fixture took **11.48 ms** to detect rooms. **100** geometric opening previews took **53.11 ms total**. A browser drag with ten synthetic pointer moves took **370.62 ms**, including Playwright round trips and React/canvas work; this is not an individual frame-time claim. Unaffected wall opening arrays and contour caches are explicitly tested for reuse.

## Boundaries and handoff

Floors follow centerlines, not architectural inner-wall offsets. Detection requires exact connections and rejects proper crossing/collinear overlapping walls; it does not heal near-miss gaps. Simple nested holes are supported; geometry beyond Area limits is refused. Window/door symbols use the local center tangent; existing sharp-turn/self-crossing texture limitations from Sprint 17 remain. Floors are historical snapshots, not live rooms. Full assemblies are copied deliberately; detaching an opening is unavailable. Same-layer ownership is an explicit relationship-safety constraint.

No known open Critical/High issue remains in the tested workflows. **Niet getest:** other browser/OS matrices, maximum-size pathological documents beyond the enforced rejection cases, actual power failure, installer/default-browser integration and Windows packaging. No broad unrelated regression suite or full OS restore audit was run. Earlier Sprint 13 installer limitations are unchanged.

Main files: domain `models/openings/rooms/grouping`, project and editor stores, opening placement/node/preview/shared painters, opening Properties/tool and room preview dialog, central format/assets/export/service-storage integration; new unit/component/native-service/browser tests; README, vocabulary, object model, v7 specification, ADR 0012 and roadmap.

**No Windows package, push, merge, commit, publication, deployment, upload, cloud change, dependency installation or system-service installation.** Personal datasets and existing user services were not modified. Test data/evidence remains in ignored local directories.

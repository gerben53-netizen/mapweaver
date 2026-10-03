# Path geometry and interaction

`domain/paths.ts` is the pure core. `models.ts` defines the persisted union; `projects/format.ts` owns version dispatch and document budgets. Details and canonical units are in [format v4](mapweaver-format-v4.md).

- `buildSegments` connects ordered nodes into straight/cubic segments, including last→first when closed. It returns library curves, per-segment length and cumulative start distance.
- `pathGeometry` derives/caches segment lengths, cumulative lengths, exact library extrema and adaptive samples. Subdivision checks control-point distance to the chord and control-polygon excess (also detecting collinear reversals). Depth/sample limits cause a clear refusal instead of uncontrolled work.
- `pointAtDistance`/`pointAtPosition` return point, normalized tangent, segment index and parameter. Curve distance inversion uses 16 bounded bisections of library arc-length integration. At a segment boundary, the preceding segment tangent is used. Zero derivatives fall back to a small neighboring chord, then (1,0).
- `nearestPathPoint` uses library projection on each bounded segment. `insertPathNode` splits that exact cubic and rewrites neighboring relative controls. Removal keeps minimum node counts but may change the neighboring shape. Reversal reverses node order and swaps in/out controls. `setPathHandle` preserves the opposite handle's length and antiparallel direction for smooth nodes.
- `transformPath` scales/mirrors relative vectors, rotates them, transforms positions around the original bounds center and recalculates canonical bounds. `beginObjectEdit` always previews relative to the original gesture snapshot, avoiding compounded transforms.
- `screenTolerance` converts constant pixel tolerances to map units. The existing `snapPoint` remains the single grid snapping source; Shift uses 45-degree angle constraints and Alt bypasses grid. Other-path-node snapping is intentionally not included (optional this sprint). A green live cursor marks grid-snapped drawing; edit nodes visibly move to the grid.

## Caching and rendering

WeakMap keys are immutable node-array identity plus closed state (the in-memory geometry revision). Style-only changes reuse derived geometry; node replacement invalidates by identity. Runtime admission explicitly invalidates a potentially stale cache before checking mutable imported input. Texture layout has a separate WeakMap keyed by immutable PathObject, covering stroke spacing/offset changes as well as geometry. Weak keys permit collection when snapshots leave history.

`canvas/drawPath.ts` shares path tracing and painting between editor and PNG. Exact cubics are rendered, not sampled polylines. One Shape contains a solid, dashed or bounded texture stroke. Texture tiles reuse one image; positions come from arc distance and tangent. Missing images render a pink dashed placeholder in the editor. Export performs source validation and refuses missing assets. `PathPaint` supplies centerline hits at a minimum 10 screen pixels. Empty space in the conservative transform box does not make the path selectable. `PathPoints` and `PathPreview` are editor-only overlays with constant screen-size nodes and handles.

## Transactions

`usePathDrawing` owns temporary nodes; it adds no document/history entries until Enter, double-click, first-node closure or Done. Escape/focus loss cancels. Space/middle navigation and wheel zoom preserve already placed map nodes. A cancelled drawing never autosaves. Curved mode drag creates smooth opposite handles; a click creates a corner.

`pathEditing` begins one transaction. Node/handle moves, insertion/deletion, corner/smooth, reset, reverse and style changes preview inside it. Done/Enter commits; Escape restores all starting properties and geometry. Other completed application actions finish the owned interaction through the existing mechanism. Autofocus does not enable shortcuts while editing form fields. Numeric styles remain draft form values until Apply. Autosave observes the history boundary, never a preview.

Layer membership, locks/visibility, Shift selection, group translation, clipboard, object ordering, deletion, portable assets and service conflicts use the existing object pipelines. Multi-object scaling/rotation remain outside the current editor's capabilities; a single path supports both plus mirroring.

## Profiling

Run `node tests/persistence/path-performance.mjs` for bounded core cases and `node tests/persistence/path-browser-performance.mjs` for real Chromium selection/drag at 25/100/400%. The latter creates its own service/data on port 47952 and stops it afterward. It measures automation-inclusive wall time, not a claimed pure frame time. See the Sprint 15 report for measured results and limits.

## Specialized walls
Sprint 17 dispatches wall paths to drawWall.ts. The shared cubic centerline, node editor, history and bounds remain authoritative. Textures use a cached bounded ribbon contour with tangent-aligned repeating strips instead of generic square tile instances. The outline participates in bounds/hits. See [ADR 0011](../adr/0011-wall-path-specialization.md) for units, limits, transforms and texture seams.



## Geographic routes
Sprint 21 adds River/Road/Border dispatch through `drawRoute.ts`; the same painter is used by Konva and PNG. `domain/routes.ts` owns the discriminated settings, defaults, scale conversion, validation, profile reversal/splitting, warnings and bounded junction checks. Existing drawing, editing, snapping and object commands are extended rather than copied. Type conversion and Area-edge following have explicit previews. See [ADR 0016](../adr/0016-geographic-route-paths.md) and [format 11](mapweaver-format-v11.md) for opacity composition, cache/contour limits, physical width transformations and connection semantics.


## Sprint D river appearance

Optional versioned river appearance extends the existing routes; see [ADR 0030](../adr/0030-river-appearance.md). Geometry caching now also keys the non-destructive smoothing mode. Derived curves are shared by bounds, length, snapping, hit tests and rendering. Explicit insertion/splitting can materialize handles to retain the visible spline. Live river appearance uses a separate stable-ID history gesture; generic path draft/Apply behavior is unchanged.

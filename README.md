# Mapweaver

Build worlds, one layer at a time. A desktop, local-first map editor with an English interface. **Mapweaver creates maps; Roll20 remains the virtual tabletop.** No account, cloud, remote assets or telemetry is required. A local Node.js service manages SQLite and image files, shared by browsers on this computer.

## Painterly terrain materials

Terrain Brush now includes [14 painterly materials and presets](docs/premium-terrain.md) across ten terrain families, with search, family browsing and scale preview. Existing painted maps retain their classic appearance; new materials are explicit choices. No library import or network service is needed.

## Install and run

Create importable stamps, fill patterns and generator-ready world packs with the [asset authoring kit](docs/asset-authoring/README.md), including complete templates, exact field limits and `npm run validate-asset-pack -- path/to/pack.zip`. Custom Terrain Brush images are not packageable; terrain surface templates use Area fill patterns.

Development policy: create a new Windows package only when explicitly requested. Normal builds update `dist/` and `dist-service/`; an existing portable package keeps its previously packaged application.

Startup reopens the last successfully opened map and its campaign directly in the editor. **Projects** now chooses a campaign; the docked **Campaign Explorer** switches maps without leaving the editor. Existing flat projects migrate to same-named campaigns with their original map at the root, retaining map IDs and content. Empty campaigns reopen to their map library.

Use **+ Folder / + Map** in the explorer to create in context. Browse the tree with arrows, Enter, F2 and Delete; right-click, Shift+F10 or the **⋯** button opens actions. Drag into the middle of a folder to move, or to the top/bottom edge of a row to reorder; **Move to folder / Move up / Move down** provides a keyboard alternative. Breadcrumbs navigate ancestors. Search, Recent and Favorites show path context. List/Gallery preference and expansion/selection are stored per campaign. The explorer can be collapsed; canvas focus mode hides it temporarily. Folder Trash retains descendants and supports restore. Map export is explicitly **one map only**; **Storage → Back up all data** preserves complete campaign organization and assets. Dedicated per-campaign transfer and rendered map thumbnails are follow-ups. See [Campaign architecture](docs/adr/0022-campaign-explorer.md).

## Object and layer management — Sprint 16

Properties → **Align and distribute** now provides six visual-bound alignments, equal horizontal/vertical center spacing, matching dimensions and centering the complete selection on the map. The first selected object anchors alignment and dimension matching. Same width/height preserves aspect ratio; exact same size refuses an unrepresentable rotated or stroked shape instead of partially changing the selection. All selected objects must be visible and unlocked. Each action has one undo entry.

Arrow keys move the selection one map pixel. Shift+arrow moves one grid cell when the grid is visible or snapping is enabled, otherwise ten pixels. Typing fields retain normal keyboard behavior.

**Snap → Objects / Guides** controls object snapping and its visual overlay independently. Drag snapping uses the whole selection's bounding box and one shared correction. Object edges/centers and map center within eight screen pixels take precedence per axis over grid snapping; the grid targets the joint selection center. Alt bypasses both, including when held at release. Hidden/locked objects are excluded. Guides never enter PNG rendering.

The **Objects** inspector lists the active layer or all visible layers, front objects first. Search matches object names and stamp source names; Type filters Stamp, Area, Path or Wall. Click to select, Shift-click to add, or use arrows and Enter inside the list. **Reveal selected** clears filters, expands its group and scrolls to the selection. Expand **Manage…** to rename, hide/lock or change group membership. Collapsible group rows preserve layer draw order. The list uses bounded rows, metadata-only asset names and no thumbnails; position previews do not rerender it.

**Ctrl/Cmd+G** groups a same-layer selection; **Ctrl/Cmd+Shift+G** ungroups without changing draw order. Clicking a member selects its group. Double-click or Enter Group enables individual member editing; Escape exits while retaining selection. **Transform selection** applies uniform scale, rotation or flips to mixed stamps/areas/paths. Geometry and strokes scale together. Groups support rename, membership editing, visibility/locking, duplication, clipboard transfer across projects and deletion. Undo restores each completed action.

**Layers** supports nested groups up to five levels, inherited hide/lock, temporary Solo, move/reorder controls and subtree duplication. Overflow menus expose less common actions. Deletion shows layer/object counts and is undoable. The active layer is always concrete. Root/child order is front-to-back; a layer's object IDs are back-to-front. Guides include bounded equal-gap labels and existing path-node coordinates. They and Solo are editor-only.

Current documents use [format v7](docs/architecture/mapweaver-format-v7.md). Historical backwards compatibility is no longer required by the user's September 23 decision. See the [shortcut reference](docs/shortcuts.md) and [Sprint 16 report](docs/sprints/sprint-16-advanced-object-and-layer-management-report.md). Sprint 17 adds Wall; Sprint 18 adds linked openings and explicit room floors below. Sprints 19–22 remain queued.

## Running the application

For the local Windows portable build, open **distribution.local/Mapweaver-OpenWallFix-20260929/Mapweaver.exe**. Save and stop an already-running older Mapweaver before opening the new package. Previous distribution builds have been removed following explicit user authorization. Keep the entire package together. It includes Node 24.17.0, the native SQLite/image dependencies, client and service; no terminal/npm installation is needed. The launcher waits for a healthcheck and opens your default browser. Start it again to reopen the same service, or visit **http://127.0.0.1:47831** in Chrome, Edge or Firefox.

Mapweaver stays in the Windows notification area while running. Right-click its **M** icon for **Open Mapweaver**, **Restart Mapweaver**, **Stop Mapweaver**, **Keep Mapweaver running**, and **Diagnostics**; double-click to reopen the browser. Closing browser tabs leaves the service and tray running. There is no idle auto-exit. Windows may put the icon in the notification overflow.

Stop waits for active operations and asks open tabs to flush pending saves. A busy dialog offers waiting, safe operation cancellation where available, or keeping Mapweaver running. Atomic restore replacement cannot be cancelled. Unresponsive tabs/save conflicts block shutdown; after two minutes the supervisor reports a timeout without killing the writer. Restart waits for the old service to exit before starting its replacement. An old tab must explicitly reload after a restart.

**Project → Storage → Stop Mapweaver** is the additional browser route. Command equivalents are `Mapweaver.exe --stop` and `--restart`; `--stop --wait` waits for supervisor exit, and `--debug` opens a local diagnostic window. Double-click **Create shortcuts.exe** only if you want desktop shortcuts. No permanent Windows service or administrator rights are required. See the [portable guide](docs/portable-windows.md), [lifecycle/IPC contract](docs/architecture/portable-lifecycle.md) and [validation report](docs/sprints/sprint-13-1-portable-lifecycle-controls-report.md), including outstanding native Windows acceptance.

For development, use Node.js 22.12+ (tested/pinned package runtime 24.17.0) and npm:

```sh
npm ci
npm run build
npm start
```

The process serves frontend and `/api/v1`; Ctrl+C requests the same safe drain for a terminal launch. Frozen tabs can prevent completion. Native better-sqlite3 and Sharp must match the runtime/platform. See [Windows troubleshooting, upgrades and uninstall](docs/troubleshooting.md).

Build a portable Windows package using `npm run package:windows`; existing output is never overwritten. Use `node scripts/package-windows.mjs Mapweaver-<release-name>` after building for a separate output. `npm run build:client`, `build:service`, and `build:launcher` build individual parts. For the normal per-user Windows installer, run `npm run package:installer`; it builds an explicitly curated package and `distribution.local/Mapweaver-Setup-<version>.exe`, with SHA-256 checksums. Set up the Inno compiler as described in [distribution documentation](docs/distribution/README.md). The end-user guide is [INSTALLATIE.md](INSTALLATIE.md).

Production data defaults to `%LOCALAPPDATA%\Mapweaver` on Windows, `~/Library/Application Support/Mapweaver` on macOS, or `$XDG_DATA_HOME/Mapweaver` / `~/.local/share/Mapweaver` on Linux. Only Windows has been exercised. `MAPWEAVER_PORT` changes the default 47831 port. **Project → Storage** shows the resolved location, integrity findings and estimated registered storage usage.

Development starts the backend and Vite together in persistent **Primary Development**, using the normal OS user data directory. In PowerShell:

```powershell
# Check for an existing Mapweaver instance before starting a separate session.
# Use non-default ports for an independent development/QA instance.
npm run dev
```

The command builds the service, starts it, waits for its health response, then starts Vite with HMR. Backend stderr remains visible. If the backend fails, the whole dev session fails and Vite closes. Ctrl+C stops both. Service changes require restarting `npm run dev`; client changes use HMR. `-- --port <port>` overrides the frontend port; binding is always strict. An existing healthy service on the configured backend port is reported instead of starting another backend. No one-click development launcher is implemented. See [runtime profiles](docs/runtime-data-roots.md).

Never point tests at a real data directory. An explicit `MAPWEAVER_DATA_DIR` must be an absolute path, not a filesystem root or symlink/junction. Development may explicitly use an ignored `*.local` directory; production never implicitly uses the repository, Downloads or current directory. The client uses relative API routes; the orchestrator passes one `MAPWEAVER_PORT` to the backend and proxy. `npm run dev:service` remains an independent backend-only command for diagnosis. `npm run preview` alone is not a storage-capable production start; use `npm start`. Campfire credentials/connectivity are not required for local startup.

```sh
npm run typecheck       # Client and service
npm run build           # Both typechecks, dist/ client and dist-service/ service
npm run test:service    # SQLite, API, real images, backup and Dexie migration integration
npm test -- src/projects/localSession.test.ts src/projects/archive.test.ts src/projects/sprint10-assets.test.ts src/projects/recovery.test.ts src/imports/readImage.test.ts src/imports/importBackground.test.ts src/canvas/patternDrawing.test.tsx src/app/sprint10-workspaces.test.tsx src/storage/libraryRepository.test.ts src/export/export.test.ts
npm run lint
```

See [Sprint 12 validation](docs/sprints/sprint-12-persistent-storage-migration-report.md). Historical Sprint 11 browser scripts assert the old Download/Open/recovery interface; use the new `tests/persistence/` acceptance scripts for this migration. `npm run test:e2e` runs the initial storage acceptance against an already-running dedicated test service; the scripts refuse a different data location. These are not a broad browser matrix.

## Workspaces

**Map editor** keeps the canvas between a narrow toolrail and a collapsible inspector. **Asset library** is a separate workspace for reusable local images; switching leaves the project, selection, undo history and dirty state unchanged. The header groups project actions, explicit save status, Undo/Redo, Edit/Paste, Recovery and PNG export.

The inspector has independent scrollable **Layers**, **Properties** and **Map** tabs. Selection normally opens Properties; using Layers gives a five-second grace period, and **Keep Layers open** pins it. Creating a pattern opens its properties. The canvas toolbar contains tool/asset choice, grid, snapping, zoom and Fit. Arrow keys/Home/End navigate tabs. Dialogs contain focus and restore the trigger when closed.

## Build a map

### Path tool (Sprint 15)

Choose **Path → Straight / Curved**. Click nodes; drag during placement in Curved mode to create handles. Enter, double-click or Done finishes; clicking the first node closes a path with at least three nodes. Backspace removes the latest node; Escape cancels. Shift constrains new segments to 45°; Alt bypasses grid snapping. The green cursor marks grid snapping. Space/middle pan and wheel zoom retain placed map coordinates.

Select → **Edit path**. Drag nodes/handles; double-click a segment to insert; Delete/Backspace removes the selected node while preserving minimum counts. Properties offers Make corner/smooth and Reset handles for the selected node. Smooth handles keep opposite directions. Done/Enter commits the whole session once; Escape restores it. Whole-object selection supports movement, proportional corner scale, rotation and horizontal/vertical flip. Scale also scales line width.

Properties shows name, length in map pixels, node count, open/closed, stroke width, opacity, solid/dashed/texture, cap/join and reverse direction. **Apply path properties** commits the form. Use a gap wider than round cap extensions for clear dashes. Texture uses fill-pattern assets as square patches following the centerline; scale, center-to-center spacing and phase offset are editable. Sharp corners/crossings can overlap or show wedges. No specialized wall/road joins, doors or physical-scale units are implemented.

Limits: 256 nodes, 8,192 samples, depth 12 and 2,048 texture tiles per path; 20,000 nodes / 250,000 derived samples per project. Exceeding limits refuses the edit/import. Geometry and textures use the same painter in PNG; editing handles are excluded. Files now use **format v4**, with centralized v1–v3 migration and unchanged SQLite/backup schemas. Older packages cannot load newly saved v4 documents. See [format v4](docs/architecture/mapweaver-format-v4.md), [geometry](docs/architecture/path-geometry.md), [ADR-0008](docs/adr/0008-generic-paths.md) and [Sprint 15 report](docs/sprints/sprint-15-generic-path-engine-report.md).

Targeted checks: `npm test -- src/domain/paths.test.ts src/canvas/pathDrawing.test.tsx src/projects/localSession.test.ts`; `npm run test:service -- service/paths.test.ts`. After `npm run build`, run `node tests/persistence/sprint15.mjs` (isolated port 47951; uses `.audit.local/fixtures/fill.png` from `npm run audit:fixtures`). Performance scripts: `node tests/persistence/path-performance.mjs` and `node tests/persistence/path-browser-performance.mjs` (isolated port 47952). Evidence stays under ignored `.sprint15.local`. These scripts stop only their own processes.

### Area tool (Sprint 14)

Choose **Area** in the toolrail, then **Shape** and **Fill** in the canvas context bar. Rectangle and Ellipse use dragging; hold Shift for a square/circle. Polygon uses clicks: click the first point, double-click or press Enter to close; Backspace removes the last point. Shift constrains polygon segments to 45° increments. Freehand samples a dragged contour and simplifies it in map pixels. Escape discards unfinished drawing. Draw wholly inside the map; invalid or self-crossing contours are rejected with an explanation. Alt bypasses grid snapping. Existing pan methods and wheel zoom remain available.

**Pattern fill** is a shortcut into the same Area tool: choose a fill-pattern asset and draw with your last-used shape. Choose None, Solid or Pattern; enable Stroke and its style in the context bar. After placement, Properties provides name, fill opacity, pattern replacement/Repeat/Stretch/scale/rotation/offsets/reset, and stroke color/opacity/width/style. Use **Apply area settings** to commit the entire form once. Stroke includes hole boundaries and stays the same width in map pixels when the area is scaled.

Select an area → **Edit points**. Choose the active outer/hole ring in Properties, drag nodes, double-click an edge to insert the nearest point, and Delete/Backspace to remove the selected point (at least three must remain). **Done/Enter** commits the session as one undo step; **Escape** restores the starting geometry. Ordinary selection allows whole-object movement and proportional corner scaling. Whole-area rotation/mirroring is not enabled; stamps retain their existing controls.

Shift-select two or more areas → Properties → **Union** or **Subtract**. The first-selected area is the primary; its name/ID are shown. Subtract removes subsequent selections from it, including making holes. The result retains primary appearance/layer. Empty results require confirmation. Invalid, excessive or timed-out results keep all sources. Each successful operation is one undo step.

Texture coordinates use a stable frame: moving the object moves its texture; editing points reveals/crops the existing texture. Repeat keeps tile size during resize; Stretch uses the frame dimensions. Every completed drawing, point session, transform or boolean action participates in local autosave. PNG uses the same painter without editor handles.

Sprint 14 introduced project format v3; current saves/exports use **project format v7** (see Wall below). Old v1/v2 pattern rectangles migrate on load without changing IDs, order or pattern appearance. Original files are not overwritten automatically. Older binaries cannot read v3; retain older backups if needed. See [format v3 and limits](docs/architecture/mapweaver-format-v3.md), [object model](docs/architecture/object-model.md) and [Sprint 14 report](docs/sprints/sprint-14-freeform-areas-and-masks-report.md).

Targeted checks: `npm test -- src/domain/areas.test.ts src/canvas/areaBooleanClient.test.ts src/canvas/patternDrawing.test.tsx`; `npm run test:service -- service/areas.test.ts`. After `npm run build`, `node tests/persistence/sprint14.mjs` runs the isolated Chromium workflow on port 47941 (requires the existing `.audit.local/fixtures/fill.png`; generate fixtures with `npm run audit:fixtures` if absent). `node tests/persistence/area-render.mjs` compares the legacy/canonical painters using an owned Vite instance on 47942. Both stop their own processes and retain evidence under `.sprint14.local`. Never point them at personal data.

### Other map operations

1. **Projects → New project** stores the name, dimensions and canvas color. The initial map is 1600 × 1000, with a 50 px square grid and one object layer.
2. **Map → Import background** accepts PNG, JPEG or WebP. Its decoded dimensions initially become the map size; replacement asks for confirmation. Existing objects retain their map coordinates. **Remove background** removes only its map reference and is one undo/redo step.
3. **Asset library → Stamps → Import stamps** stores reusable images through the local service, shared across projects and browsers. Choose/create a category, search/filter and sort by name or recently added. Details allow rename, category changes and safe deletion. Back in Map editor, **Place asset** opens the Asset Library beside the canvas. Drag an image directly onto the map for one placement, or click it to place repeatedly. Add favorite working references to the campaign Stamp Palette using the card’s **+** button. Escape or Select ends placement. Imports validate each file and report failures; exact duplicates within one type are skipped.
4. Click an object to select it; drag to move, use corner handles to scale a stamp proportionally, or the rotation handle to rotate. Shift during rotation snaps to 15°. The properties panel supports coordinates, rotation and horizontal/vertical flips. Empty or invalid values are rejected.
5. Shift-click builds a multi-selection. Drag it to translate all selected objects together. Duplicate, copy/paste, delete, order and layer-transfer actions are available. Multi-object scale/rotation is not supported.

Images preserve transparency. Objects remain separately editable and content outside map bounds is clipped. Image imports allow 20 MiB per image, 8192 px per edge and 24 million pixels; up to 50 files per stamp import. Map dimensions have the same edge/pixel limits.

## Layers, grid and patterns

Layers are listed front to back. **Add layer** creates and activates a layer. Click its name to activate; double-click or use More → Rename for an inline name (Enter/blur commits, Escape cancels). Icons hide, lock and reorder; More → Delete is destructive. Hidden layers do not render; locked visible layers still render and export. New content goes to the active visible, unlocked layer. Deleting a populated layer asks for confirmation. The background is below all object layers.

**Map & grid settings** applies one validated change. Resizing clips rather than rescales/deletes content; shrinking warns about affected content. Configure grid size, offsets, color, opacity, visibility, placement above/below objects and snapping. Snap affects placement centers and completed movement, not numeric edits, rotation or scaling. Hold Alt on placement/release to bypass snapping. Whole and partial edge cells are reported explicitly.

Import images in **Asset library → Fill patterns**. **Pattern fill** opens the picker and activates the unified Area tool described above. Pattern areas support the same shape, point, layer, history and export operations as solid areas. Rotated Stretch may leave transparent corners by design.

Stamps and fill patterns are distinct logical asset types. To reuse the same image in the other tool, use **Copy to fill patterns/stamps** in Library details; shared original bytes are retained once. Pickers search/filter the chosen type and show **Library** or **Project assets** when embedded images are available. Importing a project registers its stamp/fill assets in the shared library; background-only sources stay outside those two picker types. Recent choices are session-only. Cancel/Escape leaves the existing tool and project unchanged.

Deletion checks current objects, undo/redo, copied objects, tool choices and saved SQLite projects. A used item is retained with an explanation; embedded project bytes are never removed by a library deletion.

## Navigation and history

| Action | Control |
| --- | --- |
| Zoom around pointer | Mouse wheel; 1–400% |
| Pan | Middle-button drag or Space + primary drag over/focused in canvas |
| Fit full map | Fit to map |
| Undo / redo | Ctrl/Cmd+Z; Ctrl/Cmd+Shift+Z or Ctrl+Y |
| Duplicate / copy / paste | Ctrl+D / Ctrl+C / Ctrl+V |
| Delete selection | Delete or Backspace |
| Clear selection / cancel gesture | Escape |
| Save to local SQLite (no download) | Ctrl/Cmd+S in the editor |

One completed gesture or applied form is one undo step; up to 100 steps are retained. A new edit after undo discards redo. Selection, viewport, clipboard and library operations are not history. Text fields retain normal text-edit shortcuts; modal dialogs contain focus and Escape closes them when idle. Save uses committed model values, not unfinished form drafts. Focus loss/cancellation rolls back active object gestures and ends pan. Zoom/pan never change map coordinates.

## Projects, saving and recovery

**Projects** lists saved maps with name, modified time and a neutral preview placeholder. Create a named project with its dimensions/color before editing. Open loads its model and images from the local service. Rename, Duplicate, Export and Move to Trash are available. Trash preserves project IDs, contents and asset references; Restore project returns it to the active list. Delete permanently requires separate confirmation; automatic emptying is disabled. An open project must be closed/switched before deleting it from the list. All imported stamp/fill images are reusable across projects; typed entries can share original bytes.

**Save** and **Ctrl/Cmd+S** write SQLite, never Downloads. Completed model transactions schedule autosave after 700 ms; selection, pan, zoom and uncommitted form drafts are not saved model changes. The header shows Saving…, Saved locally at…, Unsaved changes, Save conflict or Save failed. A save response cannot mark a newer edit clean. Keep the window open until a success status. Edits during the debounce interval and before recovery storage succeeds are not crash-proof.

Two tabs/browsers editing one project use optimistic revisions. On conflict, keep the current edits by **Save as separate project** or **Export unsaved project**, or confirm **Reload saved version**. No automatic overwrite/merge is performed. If the service stops or storage fails, the document stays open and the header reports failure. After a service restart, preserve unsaved work with Export or the recovery buffer, then reload explicitly; the old tab cannot silently write to the new instance. The separate `mapweaver-unsynced` IndexedDB holds temporary recovery copies; **Project → Recovery** explicitly resumes one against its original revision. A conflict stays a conflict. Recovery rows are removed only after a confirmed current-model save; cache loss never deletes a SQLite project, but unsynced edits still need syncing or export before clearing browser data.

**Project → Export project** makes a standalone `.mapweaver` from the current committed editor model, including unsynced changes when required image bytes are available. This is a transfer/backup, not a database save; it never clears a failed/conflict/dirty status. Export from the Projects list exports the stored revision through the service. **Import project file** validates all bytes and creates a new database project, preserving the existing one. Files contain used images, map, layers and objects; no viewport or undo history. Deleting a downloaded file has no effect on normal storage.

The [v2 format](docs/architecture/mapweaver-format-v2.md) is unchanged: v1/v2 imports, typed assets, shared image paths, strict validation, 128 MiB archive/unpacked, 512 logical assets, 514 ZIP entries, 4 MiB JSON, 96 million decoded pixels, 10,000 objects. Project previews and persistent undo history are not implemented.

## Migrate an existing browser library

**Important: IndexedDB belongs to the exact browser profile AND origin (hostname and port).** The new production port cannot read the old Vite origin automatically. To migrate old `http://127.0.0.1:5173` data, start the new service against the desired permanent directory and run the updated Vite client at **that same old origin**, using the development proxy configuration above but selecting your actual destination directory. Set `MAPWEAVER_DEV_ORIGIN` to that exact local origin. Repeat at any other old port/hostname and in each previously used browser profile. Then use the production service URL normally. Do not clear old browser data first.

**Projects → Storage** inventories library images, shared blobs, recovery projects, embedded backgrounds, byte counts and duplicate/ID conflicts. Choose **Copy and verify browser data**. One image/project per bounded request keeps progress resumable. SHA-256/type deduplicates originals; UUID project IDs are preserved when free, otherwise the report records their new mapping. Every copied asset is reread/hash-checked, and each exported project is decoded and its full map/layer/object meaning compared. Only full verification marks the service primary. Download the report. Stop after current item or retry after an interruption; idempotency keys prevent duplicate projects. Missing/corrupt legacy bytes block completion. **No old Dexie rows are deleted automatically.** Legacy original filenames not recorded by earlier versions are reconstructed from safe IDs/MIME during migration.

See the exact [database/API and legacy-table contract](docs/architecture/local-storage.md). Export old `.mapweaver` files through **Import project file**; they do not require Dexie migration.

## Back up and restore

**Project → Storage → Storage & backups** offers a streamed, validated full backup, Restore all data with explicit replacement confirmation, cancellable staging, storage usage, integrity checks and a privacy-safe diagnostics ZIP. Save/export unsaved work in every browser before replacing data. The old dataset remains a recovery point. Old browser tabs cannot overwrite a restored dataset; reload explicitly afterwards.

The previous 512 MiB memory limit is removed. ZIP64 backups stream through bounded buffers with a configurable 256 GiB safety limit, checksums, SQLite snapshot validation and a final verification pass. Sprint 12 format-1 backups remain supported. Follow the [full backup and restore guide](docs/backup-restore.md) for destinations, disk-space requirements, recovery points and moving the complete dataset to another configured location. `.mapweaver` export transfers one project and does not replace a full-library backup.

## PNG export and Roll20

**Export PNG** opens a focused dialog with filename, scale, output dimensions and copyable grid information.

- **1×** produces exactly the map dimensions; **2×** doubles both dimensions and proportionally scales content and grid lines.
- **Include grid** initially follows editor visibility, then changes independently. Its above/below-object setting is preserved.
- **Transparent canvas background** removes only the map color. Background images and their transparency remain.
- Only visible map content is exported, with original paint order, transforms and clipping. Viewport zoom/pan, selection controls, tool previews and panels are excluded.
- **Download PNG** checks required images before rendering. Errors list missing/unreadable sources. Export does not save the editable project, change undo history or clear its unsaved state.

Output is limited to 32 million pixels and 16,384 px per edge. A 512 MiB estimated working image budget is checked before rendering; existing editor memory and encoder overhead are additional. Choose 1×, smaller source images or a smaller map if necessary. These limits reduce allocation risk but are not a guarantee for every browser/device.

**Copy settings** copies output pixels, pixels per cell, cell counts and grid origin. Exact whole-cell counts are shown only when the map edges align with the grid. Partial cells require manual alignment; never round their counts to size the image. Upload the PNG manually to Roll20 and use its map sizing/alignment tools. There is no Roll20 API, upload, token, fog-of-war or lighting integration. See Roll20's [official map placement guidance](https://roll20partners.zendesk.com/hc/en-us/articles/10269615372311-Placing-and-Aligning-Maps).

## Architecture and limitations

`src/domain` contains the map model and geometry; `src/store` contains project/editor state and history; `src/canvas` contains interactive rendering; `src/projects` contains project parsing, assets and recovery; `src/export` contains the independent PNG scene/renderer; `src/app` contains the shell/dialogs. CSS Modules use shared variables in `src/styles`.

Desktop target: at least 1280 × 720. No mobile optimization, hex grids, persistent history, cloud, accounts, collaboration, direct VTT integration or embedded-browser editor. Export supports PNG only. See [AGENTS.md](AGENTS.md), [ADR-0005](docs/adr/0005-persistent-storage-architecture.md) and [Sprint 10 validation](docs/sprints/sprint-10-editor-workspaces.md), including outstanding manual checks; the version label alone does not certify them.


## Validation history

The [Sprint 11 audit](docs/release/RELEASE-READINESS.md) describes the previous browser-storage architecture, not certification of this migration. [Sprint 12](docs/sprints/sprint-12-persistent-storage-migration-report.md) records current technical checks, actual Chrome/Edge restart/cache-clearing checks, failures found during development and remaining limitations. [Local-service security](docs/architecture/local-service-security.md) describes the current trust boundary.

Editing rejects unsupported geometry, object/layer/asset counts and cumulative image budgets before committing. New edits reserve 4 MiB for JSON within the 128 MiB source budget and cap editable model JSON at 3 MiB, leaving room for manifests. Existing valid larger documents can still be opened and reduced.

## Reproduce the storage browser acceptance

Use only synthetic fixtures and a dedicated data directory. Chrome and Edge must be installed; every script creates a disposable browser context. Never reuse a personal browser profile or real application data.

```powershell
npm run audit:fixtures
npm run build
$env:MAPWEAVER_DATA_DIR = Join-Path $PWD '.sprint12.local/browser-data'
npm start
# Separate terminal:
node tests/persistence/acceptance.mjs initial
# Stop the service with Ctrl+C; restart npm start in its original terminal.
node tests/persistence/acceptance.mjs restart
node tests/persistence/acceptance.mjs edge
node tests/persistence/migration-conflict.mjs
node tests/persistence/outage.mjs
```

The outage script owns an additional temporary service on port 47832, stops/restarts only that child process, and retains its synthetic directory for inspection. Browser scripts delete only their own downloaded files under `.sprint12.local/downloads`; they never clean the real Downloads directory. Screenshots/evidence stay in ignored `.sprint12.local`. The initial script must run before the other shared-dataset scripts because it records the generated project ID.

### Reserved asset sizing metadata

Database schema 2 reserves native/grid/world sizing, optional default dimensions and units, aspect-ratio locking and map scope. Existing assets migrate automatically with native behavior preserved. No sizing controls or placement changes are introduced yet; those belong to Sprint 23. See [storage schema](docs/architecture/local-storage.md#reserved-asset-sizing-metadata). Restart the local service after rebuilding to apply the migration. Use the current application build to open an upgraded database.

## Wall tool (Sprint 17)

Choose **Wall** for a continuous wall workflow. Click nodes in Straight mode; drag each node in Curved mode to create handles. Enter or double-click finishes an **open** wall and keeps Wall active. No Area, room or floor is required. Straight/Curved can be switched during drawing without losing nodes. Click the first node to explicitly close, or use **Properties → Geometry → Close Path / Open Path** (closing needs at least three nodes). Backspace removes the last node; Escape cancels the draft. **Done** finishes and selects; **Select** or **V** cancels an unfinished draft and returns to selection. Space/middle pan and wheel zoom retain draft coordinates. Shift constrains 45-degree angles; Alt bypasses snapping.

**Simple wall**, **Thick stone** and session-only **Custom** store concrete styles in each new wall. Thickness accepts pixels, grid cells or feet/metres with an explicit pixels-per-unit reference. Grid changes do not resize existing walls. Properties include joins/caps, opacity, optional outline, open/closed, direction, node editing, texture scale/offset/flip and measured length. A physical length uses the wall's own reference; a global physical map scale is not inferred.

Endpoint/node/T/grid indicators share the eight-screen-pixel snap policy. Ordinary snapping starts a separate wall. Use **Continue wall** at a matching endpoint or **Extend from start/end** in Properties to modify an existing compatible open wall in one undo step. The Properties action activates its owning layer. Existing openings keep their centers when extending either end; extending from the start also adjusts their direction metadata. Incompatible layers/styles stay separate. Groups, layer visibility/lock, Objects filtering, arrangement and clipboard use the ordinary object model. Select multiple editable walls to apply a concrete style in one transaction (maximum 100).

Texture selection uses the existing fill-pattern picker and embedded project assets. Use repeatable opaque textures for predictable results. Sharp corners/closed-loop seams and cusp/self-crossing overlaps are documented in [ADR 0011](docs/adr/0011-wall-path-specialization.md); linked openings and room floors are described below. Export uses the same painter, without edit handles. Current files use [format v10](docs/architecture/mapweaver-format-v10.md). See [Sprint 17 validation](docs/sprints/sprint-17-wall-tool-report.md).



## Doors, windows and room floors (Sprint 18)

Choose **Opening**, select **Door** or **Window**, set its width in map pixels and hover a wall. Click a valid preview to place; repeat or press Escape/Done. Red previews indicate overlap, insufficient segment length or a locked wall. Grid distance, segment ends and nearby free intervals snap in map coordinates. Alt bypasses optional snapping while retaining wall attachment. Space/middle pan remain available.

Select an opening and drag along its wall. Properties provides single/double/passage doors, closed/open-left/open-right status, simple/wide windows, width units and explicit scale reference, flip, reverse side, center-on-segment, next-free-position and a different compatible wall. Optional symbols come from the stamp picker; **Use built-in symbol** removes that reference. Unreadable optional symbols fall back to the built-in drawing. There is no detached door object or VTT interaction.

Openings share their wall's layer. Hide restores the underlying wall section; wall visibility/lock is inherited. Group an opening together with its wall. Copy/duplicate includes the full wall assembly and remaps wall IDs; moving it to another layer carries attachments. Geometry edits that cannot retain valid openings are refused. Unlock/show all linked openings before transforming the wall. Deleting a wall lists its linked openings for confirmation and is one undo step. Removing an opening leaves the original wall intact.

**Detect rooms** previews closed wall contours and exactly joined networks, with open endpoints, invalid crossings, holes and existing-floor overlaps. Select rooms and **Create selected floors** to add ordinary Areas behind objects on the active layer. Use Area Properties for colors/patterns and point editing. Openings do not split room topology: detection uses centerlines. Crossing or overlapping walls require repair; small gaps are never silently closed.

A generated floor retains historical source IDs. **Regenerate room floor** previews the new result and requires explicit confirmation to replace manual geometry; style and identity remain intact. Floors never update silently. Show missing/hidden source walls before regeneration.

Limits: 64 openings per wall; width 4–4,096 px; detection up to 256 visible walls / 2,048 sampled segments / 128 rooms, with a 1.5-second worker deadline and existing Area limits. These target building maps, not BIM. Details: [ADR 0012](docs/adr/0012-linked-openings-and-room-floors.md), [format v7](docs/architecture/mapweaver-format-v7.md), [Sprint 18 report](docs/sprints/sprint-18-doors-windows-rooms-report.md). No new Windows package is made unless explicitly requested.

## Wall materials (Sprint 17.1)

Wall now offers Masonry, Timber and Cave rock with transparent material silhouettes. Pick a set, set thickness and draw. Import your own wall-set ZIP through the same visual picker; preview before confirming. Properties → Apply commits material/roughness/New variation as one undo step. Area Properties → Create boundary walls copies outer contours and optional holes once without changing the Area. Existing doors/windows cut through the material.

See [the wall-set makers guide](docs/wall-sets/README.md) for the schema, source artwork, caps/joins, immutable revisions and import limits. Ready-to-import examples are in `public/wall-sets/`; `public/examples/wall-materials.mapweaver` is a portable demonstration with embedded assets. The examples and demo are also shipped under `dist/` in the separate Windows package. [Format v8](docs/architecture/mapweaver-format-v8.md) and [ADR 0013](docs/adr/0013-wall-material-sets.md) describe persistence. No old dataset is reset.

## Scatter brush (Sprint 19)

Choose **Scatter → Stamps**, select up to 16 library/project stamps and adjust weights. Drag to paint; each completed stroke is one undo action. Escape cancels an active stroke. Scroll zoom and middle-button/Space-drag pan remain available. Free scattering intentionally does not snap to grid; diameter/spacing are map pixels.

A selected compatible scatter on the active editable layer receives further paint. **Erase** affects that scatter only. **Done / Select** restores selection. Properties offers density, random/even strategy, falloff, spacing/bounds collision, scale/rotation/flip/opacity ranges, stroke alignment and draw order. Apply regenerates the recipe explicitly. The same seed reproduces it; New seed changes the distribution.

Select an Area and choose **Fill selected area with scatter** to copy its mask, including holes. The Area stays editable and independent. Full stamp rectangles remain inside; generous transparent margins may leave conservative edge gaps.

Move, uniformly scale, rotate, mirror, group, duplicate, copy/paste or move layers as one object. Nonuniform scaling is refused. **Expand to individual stamps** asks confirmation and is one undo action. **Recalculate using current asset defaults** asks confirmation; later library metadata changes never silently resize existing instances. Missing source images show pink placeholders and a replacement action; restore or replace them before saving/exporting.

Five recent weighted sets are stored in local SQLite. Scatter uses existing stamp bytes and no second asset library. Limits: 5,000 instances/object, 10,000/document, 16 sources, 128 strokes and 4,096 points; existing project metadata limits also apply. Scatter was introduced in format **9**; current files use **12**; use the updated application to reopen new files. No Windows package is created as part of Sprint 19.

Validation/evidence: [Sprint 19 report](docs/sprints/sprint-19-scatter-brush-report.md).

## Regional and World maps (Sprint 20)

Choose **New project → Map type → Regional map / World map** and set the geographic width in km. These are flat creative canvases with ordinary, editable layers for land, terrain and later map content. Battlemap projects retain their grid, artwork and positions. No Earth projections, GIS or longitude/latitude are implied.

**Landmass / Terrain** activate the existing Area tool: draw Polygon or Freehand, edit points and use Union/Subtract to make islands and inland seas. In Properties, **Geographic role & contour** converts Areas, sets terrain type and previews simplify/smooth or deterministic coastline roughness. Stroke color/width are the normal Area controls. Preview is temporary; Apply is one undo step. **Clip to landmass** copies the intersection, preserving holes and the source land. Subsequent land edits do not alter clipped terrain automatically. **Fill selected area with scatter** adds independent decoration.

**Measure**: click two or more points; the pointer previews the next segment. Enter finishes, Backspace removes a point, Escape clears. Total and last-segment distance use the active km/mi unit. Scroll zoom, middle-drag, Space-drag and Fit remain available. Measurement is temporary and is not exported.

The **Map** tab controls physical width, unit, north annotation, optional local origin, ruler, scale bar and a local coordinate grid. **Preview workspace change** explains type/scale effects before applying. Existing objects never resize. Canvas dimension changes retain the physical width. Returning to Battlemap restores the stored battlemap grid; geographic tools do not snap to that grid. A local coordinate grid is decorative, not a latitude/longitude graticule.

PNG export offers **Include scale bar** independently of editor visibility; output still covers the complete map at 1× or 2×. Reserved world-sized asset defaults in metres/feet now use this scale for new stamps/scatter sources when their scope matches. Changing metadata or map scale never resizes existing instances. Asset-profile editing remains outside this sprint.

Limits: 256 land/terrain Areas, 10,000 combined nodes, existing 512 nodes/ring and 2,048/Area, 4,096 coastline samples/Area, 256 measurement points. Clipping shares the bounded Area worker; invalid/overly complex results preserve the source. Roughness changes only the visible stroke, not fill/selection/clipping geometry.

Format **10** and SQLite schema **4**: use the current application for newly saved files; old binaries reject them. See [ADR 0015](docs/adr/0015-geographic-map-workspaces.md), [format specification](docs/architecture/mapweaver-format-v10.md) and [Sprint 20 report](docs/sprints/sprint-20-map-workspace-report.md).


## River, Road and Border (Sprint 21)

Choose **Route**, then **River**, **Road** or **Border**. Click nodes; Curved mode creates Bézier handles by dragging. Enter/double-click finishes, Backspace removes the last node, Escape cancels. The tool stays active until Done/Select. Shift constrains angles; Alt bypasses snapping; wheel and middle/Space navigation preserve a draft. Endpoint/node/T/Area-edge/grid snap hints have distinct labels and shapes. Crossings do not silently merge objects.

Properties provides the name, active-unit length, pixel/physical widths and appearance. Rivers have a linear source-to-mouth width profile, taper/widening factors, banks and optional fill-pattern texture. Reversal swaps direction and endpoint profile. Roads offer trail/road/major presets, solid/dashed/texture surfaces, outlines, caps/joins and optional center marking. Borders offer solid/dashed/dotted/double strokes and a soft halo. Presets store concrete values. Complete property changes use Apply and one undo step.

Use **Edit path** for shared nodes/handles, segment insertion, corner/smooth and deletion. **Split at node** splits an open route at a selected interior node; **Extend from start/end** continues the same object. **Convert path type** previews style loss and commits once. Wall conversion is deliberately excluded. Area Properties → **Follow Area edge with Border** previews an independent copy of a selected contour, including holes; larger than 256 nodes requires explicit simplification first.

Width units capture the current map scale. Later map-scale changes do not resize existing routes; Properties still shows their current physical extent. Uniform object/group scaling scales widths and line decorations. Nonuniform transforms scale centerlines independently and appearance by the smaller axis factor. Textures stay map aligned. Split/extend do not model hydrology or road networks. Bridge overrides, path labels and automatic political regions are not implemented.

Routes share layers/groups, search/type filters, clipboard, undo/redo, local autosave/conflicts/recovery, portable projects, backups and PNG. Routes were introduced in format **11**; current project format is **12**; earlier binaries cannot open new files. See [route architecture](docs/adr/0016-geographic-route-paths.md), [format 11](docs/architecture/mapweaver-format-v11.md) and [Sprint 21 validation](docs/sprints/sprint-21-rivers-roads-borders-report.md). No Windows package is generated unless explicitly requested.


## Places, labels, legend and compass (Sprint 22)

**Place**: choose a built-in or custom type, optional stamp symbol from the existing searchable/recent library, size mode and default label position. Click the map, enter a name, press Enter. Escape cancels that placement; the tool remains active until Done/Select. Places and their labels enter the active unlocked layer. The default cartographic symbol is 28 map pixels wide; map-scale mode uses applicable asset defaults. Properties stores type, note, tags, importance, anchor, opacity, rotation and explicit size mode. World units capture a sizing reference; changing map scale never silently resizes artwork. Export 2× doubles output pixels for all map artwork.

**Label** creates standalone editable plain text. Select any non-label object and use **Add linked label** to attach text. Drag the label independently; its offset is retained when the owner moves. Properties supports multiline text, wrapping, alignment, four bundled Liberation Sans variants, size, tracking, line height, color, outline, halo/background, padding, opacity, anchor and rotation. Use Apply properties to commit the draft. Linked labels offer position presets, Reset label offset, optional leader line and Detach. Changing the owner name does not overwrite independently edited label text.

Select multiple labels for a bulk style command. **Avoid overlaps** previews a bounded arrangement; Cancel leaves the project untouched and Apply is one undo step. Dense scenes may still overlap; no automatic rearrangement occurs during navigation. Objects list provides label selection and type filters; normal fields retain text keyboard shortcuts. Owner copy/duplicate includes its labels; label-only copies detach. Moving a linked label between layers includes the owner. Owner deletion lists linked children and is undoable.

**Legend** places a snapshot of types/symbols currently used. Edit title, entries, order, columns, padding, background/outline, size and opacity in Properties. Remove/add entries manually; apply a new entry before choosing its symbol through the existing picker. **Refresh from map** offers a selectable preview and never updates existing legends silently. **Compass** offers three vector styles, color, size, rotation and an optional stamp. Compass rotation is independent of the map north annotation. PNG uses the existing **Include scale bar** option; no second scale-bar object is introduced.

Map text is stored as text, not a bitmap. Liberation Sans and its OFL license ship locally in `public/fonts`; no webfont or system-font dependency. Missing font files or declared symbol images block PNG with a repair message. Unsupported glyphs visibly render as `?` while retaining original text. The layout supports ordinary left-to-right text; complex-script shaping, path text and arbitrary font imports are outside this release. Restore the bundled fonts folder if export reports missing fonts.

Limits: 2,000 labels, 2,048 characters per label, 64 legend entries/4 columns, and overlap preview for 1–100 labels with 25 candidates each. Existing metadata/image budgets apply. Format **12**, [architecture](docs/adr/0017-places-labels-and-map-annotations.md), [format](docs/architecture/mapweaver-format-v12.md) and [validation report](docs/sprints/sprint-22-places-symbols-labels-report.md). New Windows packages are built only on explicit request.

## Advanced asset library (Sprint 23)

Nested categories, subtree search, paginated views, tags/favorites/collections, safe batch packs and placement defaults are available in Asset library. See [the user and technical guide](docs/asset-library.md), [schema/templates](public/asset-templates/) and [validation report](docs/sprints/sprint-23-advanced-asset-library-report.md). Existing object transforms remain unchanged.

## Reusable compositions (Sprint 23B)

Use **Save as reusable prefab** above the canvas for a selection, object group, layer or layer group. Editable preserves ordinary independent objects and internal relationships; Flattened stores a transparent image with a stable map size and anchor. Find both in **Asset library > Prefabs**. Preview, explicit dependency inclusion, layer choices, physical sizing and one-step undo are supported.

See the [user guide](docs/prefabs.md), [architecture](docs/adr/0019-reusable-compositions.md), [house examples](public/examples/prefabs/) and [Sprint 23B report](docs/sprints/sprint-23b-prefabs-and-reusable-compositions-report.md). SQLite schema is now **6**; project format remains **12**. The current Windows package is `distribution.local/Mapweaver-20260926/Mapweaver.exe`; keep the complete directory together.

## Editor UX refinements

The grouped icon rail separates selection, assets, drawing, structures and annotations. **Place asset** chooses a stamp; **Place marker** creates a semantic place. Hover or focus a tool for its accessible name; Select also uses V. Context actions follow the active tool/selection. Room detection and reusable-composition capture are in **Map actions** above the canvas.

Battlemaps use columns/rows in squares in New project and Map settings, with derived pixels shown underneath. **Resize canvas** changes only bounds and warns about clipping. Grid visibility, snap, colors, opacity and stacking update directly with undo/autosave. Resolution and offsets commit on Enter/blur; changing resolution keeps existing canvas pixels and artwork unchanged. **Game scale** reads `1 square = 5 ft` (or metres) and is explicitly set; no scale is invented. Advanced grid options remain collapsible. Regional/world maps keep pixel/world terminology.

Use **Focus** or **Backslash** to hide/restore both side panels without losing their state. This is session-only, not browser fullscreen. **F** fits the map; **Shift+F** fits selection. Space+drag and middle-drag pan, wheel/Ctrl+wheel over the canvas zooms. Escape cancels or clears selection; Delete/Backspace removes objects, Ctrl/Cmd+D duplicates, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes. Text fields keep their normal editing keys. **Map actions > Keyboard help** lists shortcuts.

Autosave status is concise; hover it for the saved timestamp. **Save** still flushes completed edits immediately (Ctrl/Cmd+S). **Export PNG** remains distinct from **Project > Export project**. See the [UX sprint report](docs/sprints/ux-improvement-sprint-report.md) for verification and deliberate boundaries. No new Windows package was requested for this UX sprint.


## Selection and contextual Properties

**Objects** is the searchable object browser. Selected rows use a checkmark, accent edge and background; keyboard focus has a separate dashed outline. Arrow keys browse, Enter selects, and Shift/Ctrl/Cmd adds to selection. A single selection scrolls into view if it matches the current filters; **Reveal selected** clears filters and opens the relevant group/layer. Multiple selections do not automatically move the list.

**Properties** starts with the selected name, type and layer. Identical display contexts include `Item N`, shared with Objects; this is the current list order, not a persistent identifier. Stamp position, width, height, rotation and flips are directly visible. Width/height changes preserve proportions and center and support undo. Geometry objects retain uniform transforms above their specialist controls. Multi-selection shows shared transforms, valid grouping, alignment (2+ objects) and distribution (3+ objects). No selection shows only a short empty state.

Layer assignment and object draw order live below primary fields; full layer management stays in **Layers**. **Asset settings** is collapsed and appears only for selections containing stamps. Successful asset actions disappear after five seconds; warnings/errors offer dismissal. Rare actions and Duplicate/Delete are lower in Properties, with frequent actions still available in the existing contextual toolbar. See the [follow-up report](docs/sprints/ux-selection-properties-follow-up-report.md).


## Map-type tools and cartographic labels

Battlemap creation tools include **Wall**, **Opening** and **Detect rooms**. **Path → River/Road/Border**, **Land / Water**, **Terrain Region**, **Terrain Brush**, **Water Depth** and **Measure** are available on regional/world maps. Trail is a Road class. Land / Water shapes coasts; Terrain Region assigns biome metadata; Terrain Brush paints visual detail; Area creates generic zones. Material selects imagery and Brush Preset selects behavior. See [tool intent guide](docs/tool-intent.md). Generic drawing, stamps, Scatter and annotations remain available everywhere. Changing workspace preserves all placed objects and saved styles; existing objects remain selectable/editable even when their creation tool is hidden. An unavailable active tool returns to Select.

The normal asset picker initially shows assets applicable to the current map type, including universal assets. **Show assets for all map types** restores broad browsing. This does not alter placed objects or the global Asset library.

New **Label** text has no rectangular background. Battlemap labels use 18px dark text with a light 1.5px halo; regional labels use 24px light bold text with a dark 2px halo; world labels use 30px light bold text with a dark 2.5px halo and wider tracking. Values are map pixels before zoom/uniform object scaling. All use bundled Liberation Sans. Properties puts text and typography first; color, **Outline / halo color** and **Outline / halo width** are independent. **Background style → Box annotation** enables an intentional rectangle. Old saved boxes remain unchanged. Use Apply properties to commit, or Reset changes to discard drafts.

Map-type changes do not restyle existing labels. PNG includes the same typography and halo as the canvas, without selection handles. Curved/path-following text and shadows are not implemented. See the [map context and label report](docs/sprints/map-context-cartographic-labels-report.md).


### Map Elements

Use **Map Elements** in the tool rail, choose an element and its preset, then click the map. Compass, Scale bar, Title / Cartouche, Legend and List / Note open in **Properties** immediately. Edit the content/style and use **Apply properties**; an edit is one undo step. Labels retain their existing creation workflow and gain optional Place, Region, Landmark, Water, Annotation and Title-like styles.

Compass styles are Technical, Minimal, Cartographic Classic, Ornate Fantasy and Parchment Explorer. Titles offer Simple, Ribbon Banner, Parchment Banner, Ornate Fantasy Cartouche and Region Nameplate, plus the unchanged earlier Banner, Cartouche, Ornate and Parchment styles. Legends, notes and scale bars offer Minimal, Cartographic, Ornate and Parchment; old legends retain Legacy. Defaults follow the map type only for newly placed objects. Existing maps keep their appearance.

Scale bars derive distance from the current map's geographic width or battlemap physical grid scale. Choose km, mi, m or ft. Resizing changes displayed distance; entering a distance calculates the corresponding width. Without physical scale, configure it in **Map settings** or hide the unavailable bar before PNG export. **Include corner scale bar** controls the separate geographic corner guide, not placed objects. All placed elements export through the same renderer as the canvas, without selection handles. Presets are internal artwork, not user library assets.

Architecture: [ADR 0023](docs/adr/0023-cartographic-elements.md). No automatic anchors, map borders, embedded inset maps, rich text or user style packs are included.

## Smart map markers

Use Map Elements → Marker or Place marker to choose a built-in icon, style, prominence and linked label before placement. Existing custom markers remain unchanged. See [Smart markers](docs/smart-markers.md).

### Decorative title banners

Choose **Map Elements → Title / Cartouche → Preview title styles…**, then select a preset and click the map. The same preview picker is available in Properties. Use Tab or arrow keys to move between preview buttons, Enter to choose, and Escape to cancel. New Regional titles default to Ribbon, World titles to Fantasy, and Battlemap titles to Simple.

Title and optional subtitle remain editable independently of the vector carrier. **Apply properties** records one undo step. **Element width** scales the whole element proportionally; **Wrap width** changes logical text capacity. New decorative carriers use a single title/subtitle line and automatically reduce text size within a minimum. Properties warns if unusually long text still does not fit; shorten it or increase Wrap width. No text is truncated. Frame colors, position, rotation and opacity are under **Frame and placement**. Existing titles are never automatically converted.

## Editable world generation

Choose **+ Map → World map → Generate world map…**. Set a seed, choose one of six presets, then adjust continents, water level, roughness, mountains, forests, rivers, islands or climate. Dimensions and physical world width are under **Map dimensions and scale**.

**Generate preview** and **Regenerate preview** do not save anything. **Randomize seed** changes the seed; regenerate to see it. **Create generated map** saves and opens a normal editable world map. Cancel abandons the preview. Generated terrain consists of Areas and native river Paths grouped into Land, Biomes, Mountains, Forests, Lakes and Rivers layers. The ocean uses the map background colour. Normal Properties, node editing, layer visibility/locking, undo/redo, save and PNG export remain available.

Seed, original settings and generator version are retained under **Generation source** in geographic settings. Identical settings and seed reproduce the same version's output. Water level is an elevation threshold, not a requested ocean percentage. Continent centres can merge or split. Version 1 uses coloured terrain Areas rather than automatic mountain/tree stamps; it does not generate settlements, labels or lore. Post-creation regeneration is deferred: create another map to explore alternatives safely.

Generation is offline in a cancellable worker (15-second timeout), bounded to 240 objects and 9,000 Area nodes. See [ADR 0025](docs/adr/0025-editable-world-generation.md) and the [validation report](docs/sprints/world-generation-report.md).
## Bundled map fonts

Text Properties now offers **Choose font** with grouped, visual samples. The library contains Cinzel, Marcellus SC, Cormorant Garamond, EB Garamond, Spectral, IM FELL English, Source Sans 3 and Roboto Condensed. Existing Liberation Sans remains under **System / Legacy**. Use Tab or arrow keys to browse, Enter to choose and Escape to close. Apply properties commits the change as one normal undoable edit.

The same picker is used for labels, titles/cartouches and decorative banners, legends, note/list panels, placed scale bars and marker labels. Only bundled variants are offered; fonts without italic or bold do not synthesize those styles. New map-type defaults prefer readable sans fonts for battlemaps and cartographic serif fonts for regional/world maps. Existing font choices are preserved.

All fonts work offline. Editor, previews and PNG export wait for the local font files. If resources are missing, the app reports affected families and uses fallback text, including in exports; restore the fonts folder and reload for the intended typography. Generic/system fonts retain their saved names but are less portable; bundled choices give reliable metrics. Complex-script shaping remains outside the current glyph-based text renderer.

Sources, exact variants, copyright and licenses: [Third-party font notices](THIRD_PARTY_FONTS.md). Original OFL texts are in `public/fonts/<family>/OFL.txt` and production `dist/fonts/<family>/OFL.txt`. `npm run build` verifies production resources. Windows packaging carries those resources and the notices automatically; no new Windows package is required for development. See [ADR 0026](docs/adr/0026-curated-font-library.md) and the [sprint report](docs/sprints/curated-fonts-report.md).


### Textured world terrain

World generation now offers **Textured terrain and soft coasts**. Existing Areas can use **Properties → Terrain appearance** for built-in terrain textures, inward edge feathering and derived coastline presets. **Map → Water appearance** controls world/regional ocean styling. Changes are editable, undoable and shared with PNG export; disabling styling restores retained original artwork. See [the terrain guide](docs/world-terrain.md), [validation](docs/sprints/terrain-rendering-report.md) and [the remaining cartography-program milestones](docs/sprints/cartography-polish-program.md). No new Windows package was created.


### Semantic world assets

The optional [Mapweaver Engraved asset pack](public/world-assets/mapweaver-world-engraved.zip) contains 24 transparent world/regional stamps. Import the ZIP through Asset Library; **Generator metadata** in stamp details edits validated semantic types, roles, biomes, themes and selection hints. Existing assets need no metadata. The world generator checks installed families and places terrain stamps through generator-aware scatter. See the [guide and canonical schema example](docs/generator-assets.md) and [Sprint B report](docs/sprints/semantic-world-assets-report.md).


### Generator-aware terrain stamps

World generation offers independent Off/Low/Medium/High controls for mountain chains, forest clusters and terrain details. Import a semantic pack, choose its asset family and preview before creating. Output is editable native stamps, with initial-pass undo/redo, embedded assets and ordinary PNG export. Missing families and placement limits are reported. See the [usage guide](docs/world-scatter.md) and [Sprint C report](docs/sprints/generator-scatter-report.md).


### River styling

Selected River Paths now have five presets, uniform/downstream/manual width modes, non-destructive smoothing, outline and a subtle halo. Appearance updates live with undo/redo; saved legacy paths remain unchanged. New styled world maps use Fantasy River. See the [river guide](docs/river-styling.md) and [validation report](docs/sprints/river-styling-report.md).

### Map atmosphere and frames

Map → Effects & map frame offers optional Area-masked fog, vignette and six map-bound vector frames. Selected stamps have opt-in shadow/glow in Properties. Apply is one undo step; old maps remain unstyled. See [guide](docs/map-effects.md), [ADR-0031](docs/adr/0031-map-effects-and-frame.md) and [Sprint E report](docs/sprints/map-effects-report.md).

### World visual themes

Map → Visual theme offers Painterly Fantasy, Classic Parchment, Dark Fantasy, Minimal Political and Elven / Elegant Fantasy on World/Regional maps. Apply preserves geography and text, supports per-field overrides or explicit reset, and is one undo step. The generator can choose the same style and semantic asset family before preview. See the [theme guide and exact preset mappings](docs/world-visual-themes.md), [ADR-0032](docs/adr/0032-world-visual-themes.md) and [Sprint F validation/screenshots](docs/sprints/world-themes-report.md).


### Terrain Brush

World/Regional maps offer a Terrain Brush with Paint, Erase and Blend, logical-map diameter, softness, strength and fractional texture scale. Paint is an independent visual mask layer with visibility, lock, per-stroke undo and ordinary persistence/PNG export. Semantic biomes remain unchanged. See the [guide and limits](docs/terrain-paint.md), [ADR-0033](docs/adr/0033-terrain-paint.md) and [sprint validation/screenshots](docs/sprints/terrain-paint-report.md).

### Land / Water Brush

World/Regional maps offer **Land / Water** beside Terrain Brush. Add Land, Remove Land, Smooth Coast and Roughen Coast edit ordinary semantic Landmass Areas. Drag with the primary button; hold Alt before starting a stroke to invert Add/Remove. Escape or window blur cancels. Space-drag and middle-drag still pan. Use the size field in km/mi or the logical-map diameter slider, plus shape, softness, roughness and smoothing. Six presets cover continental land, regional coast, islands, archipelago detail, smooth shores and rocky coasts.

Each completed stroke is one undo step. Existing coast and water styles follow edited contours. After the first edit, visible land becomes the clipping boundary for biome Areas and Terrain Paint; their source data remains recoverable by undo or adding land again. Ordinary stamps and routes remain independently editable. See [ADR-0034](docs/adr/0034-land-water-brush.md) and [validation, screenshots and limits](docs/sprints/land-water-brush-report.md).

### Automatic labels (World / Regional)

Choose **Map actions → Automatic labels…**, select source categories and Low/Medium/High density, then **Preview labels → Apply labels**. The same action updates existing automatic labels after sources are added, renamed or removed. Preview uses existing names and the active world theme; it never changes the document. Apply is one undo step.

Labels remain native text objects with ordinary font, halo, text, rotation and position Properties. Direct edits are protected on later updates. **Detach from automatic layout** makes a label manual. Existing manual and linked marker labels are preserved. Explicitly disabled marker labels remain disabled. Conflicting labels are kept hidden; reveal them in Objects and position them manually.

For named sea/lake or mountain Areas, use **Geographic role & contour → Automatic label category**, preview/apply that Area change, then run automatic labels. Unnamed/default generic features and unnamed mountain stamp chains do not acquire invented names. See [ADR-0035](docs/adr/0035-automatic-cartographic-labels.md) and [Sprint G validation/screenshots](docs/sprints/automatic-labels-report.md).

## Painterly World assets

The [Painterly World pack](public/world-assets-painterly/mapweaver-world-painterly.zip) adds 42 transparent atlas stamps in eight collections, with 41 generator-ready terrain assets for the Painterly Fantasy theme. Import it through Asset library -> Import assets. Existing maps and the Engraved pack are retained. See the [asset guide](public/world-assets-painterly/README.md), [catalog](public/world-assets-painterly/catalog.png), and [Velanth comparison report](docs/sprints/world-asset-quality.md).

## Geography & Terrain Finish

World/Regional maps offer **Map -> Geography & terrain finish**. Choose relief
strength, light direction, softness and contrast, plus natural material edges,
coast falloff and shelf/deep-ocean presets. Apply commits one undo step; Remove
restores the original appearance. Existing maps stay unchanged until you apply a
finish or explicitly apply a visual theme. Manual Terrain Brush paint is retained.

New world generation uses algorithm version 2 with connected ridge hierarchy,
valley-fitted river bends and editable reaches that widen at confluences. Existing
generation provenance remains valid; manual rivers are never regenerated in place.
Lakes are sinks; automatic outlets are not yet generated.

See [the sprint report](docs/sprints/geography-terrain-finish.md) and
[ADR-0036](docs/adr/0036-geography-terrain-finish.md) for benchmark evidence,
limits and the new Windows package.

## Water Depth and river mouths

World/Regional maps now offer **Water Depth**: automatic coastal/lake depth, Shallow/Deep/Reset/Blend painting, water-only clipping and restrained river-mouth integration. Existing maps opt in explicitly; completed strokes and global reset support undo. [Usage](docs/water-depth.md) and [validation evidence](docs/sprints/water-depth.md).

Hexagonal geography: **Land / Water → Hexagon** supports Flat/Pointy orientation, explicit rotation, Exact/Soft Coast/Rough Coast and world-space opposite-corner diameter. See [Hex land guide](docs/hex-land.md).

Hex grids: **Map → Grid type** offers Square, Hex — Flat top and Hex — Pointy top. Hex diameter is measured corner to corner in map pixels; World/Regional maps also show the derived world distance. Show/Snap, color, opacity, origin offsets and above/below rendering use the existing grid settings. **Land / Water → Hexagon → Match one hex cell** draws aligned native land polygons. [Guide](docs/hex-land.md) · [Sprint validation](docs/sprints/hex-grid.md).

Terrain Brush now includes 32 painterly materials: 18 additions cover desert, damp/rough underground, salt flats, woodland litter/roots, clay, gravel and cavern lichen. Find them via **Terrain Brush → Browse materials**. [Material guide](docs/premium-terrain.md) · [Additional Terrain report](docs/sprints/additional-terrain-textures.md).

Water Depth now offers opt-in [refined bathymetry](docs/sprints/bathymetry-refinement.md): muted water ramps, variable island/coast shelves, scalar Blend and an independent shoreline edge. Existing maps keep their appearance until **Apply current water style** is used.

The editor now uses warm graphite, the existing muted teal and restrained brass cartographic details. See the [visual personality report](docs/sprints/game-cartography-personality.md) for screenshots, contrast checks and unchanged-workflow validation.

[Coastal Contours: controls, architecture, visual evidence and validation](docs/sprints/coastal-contours.md).

[World Asset Hierarchy: 46-asset family, generation behavior, comparisons and validation](docs/sprints/world-asset-hierarchy.md).

Smart Markers now support [illustrated settlements and landmarks](docs/smart-markers.md#illustrated-mode), with a local 31-image painterly family and editable physical width. [Asset authoring](docs/asset-authoring/illustrated-markers.md).

New Map now includes [theme selection and rich miniature previews](docs/sprints/new-map-themes.md) before blank creation or world generation. World/Regional default to Painterly Fantasy; Battlemap keeps a neutral canvas.

Battlemap **Map → Generate Room…** creates an editable floor, walls and 0–4 doors in a new dedicated normal layer. Rectangle, Square, Circle and Oval use usable interior dimensions, seven reusable wall presets, logical-unit thickness, deterministic seeds and a native-rendered preview. Walls grow outward; thickness remains editable in normal Properties. One Undo removes the complete room and layer. [Room Generator guide](docs/room-generator.md).

Properties now opens a [contextual Inspector](docs/inspector.md): common controls first, world dimensions, compact transforms, separate Actions and lazy Geometry/Advanced sections. Drag the inspector edge to resize; the width is remembered locally. [Sprint report and before/after evidence](docs/sprints/contextual-inspector.md).

### Battlemap Texture Brush

In a Battlemap, choose **Texture Brush** from the tool rail and **Browse** to select a fill pattern from the existing library. Paint, Erase and Blend use a map-space brush; Size follows the map game scale (feet/metres, otherwise cells). Softness and Strength are percentages; Texture scale accepts fractions and starts at the library recommendation when supplied. Drag to paint, release to commit one undo step, or press Escape to cancel. Space-drag and middle-drag still pan. **Done** returns to Select.

**Scene → ••• → Layer organization and map paint → Texture paint** controls visibility, lock and opacity. This is one map-wide layer above filled Areas and below other objects. Where filled Areas exist, paint is clipped to their visible surfaces; otherwise it covers the map base. Room floors remain separate editable Areas. Erase affects only paint. Save, `.mapweaver` download/import, backups and PNG export preserve/use the same materials and masks. Source texture tiling quality still matters. See [the architecture decision](docs/adr/0047-battlemap-texture-paint.md) for budgets and limits.


### Stamp Palette and direct placement

**Place asset** opens the existing Asset Library beside the canvas. Search, category, collection, Favorites and map-type filters stay in place as you work; **Filters** expands the compact filter controls. Drag a thumbnail onto the map to place one native Stamp, without Apply. In the full Library, **Browse beside map** opens the same browser next to the canvas. **Manage** returns to library administration.

Use a thumbnail’s **+** button or drag it onto the bottom **Stamp palette** strip to add a reference. Create named palettes with New/Rename/Delete. Click a palette thumbnail and keep clicking the map to place copies; selecting another thumbnail switches the active stamp. Escape or another tool ends placement. Dragging a palette thumbnail places just one, preserving any previously active continuous stamp choice. Preview shows the actual image at the asset’s world/default dimensions with snapping; Alt bypasses snapping. Placement uses the active visible, unlocked layer and rejects incompatible map types. Each stamp is independently undoable with Ctrl+Z / Ctrl+Y.

Reorder palette entries by dragging, or focus an entry and use Move left/Move right. Remove from palette removes only the reference after confirmation. Missing sources show a removable missing entry; add a replacement from the library. Collapse the strip to regain canvas space; this preference is remembered in this browser. Palette names, order and active choice save automatically to the **campaign in local SQLite**, shared across its maps and browsers. They travel in **Back up all data**, not a single-map `.mapweaver` export. Limits: 32 palettes/campaign and 64 references/palette. Favorites remain independent. See [ADR-0048](docs/adr/0048-stamp-palettes-and-direct-placement.md).


### Scene Outliner

**Scene** replaces the separate Layers and Objects tabs with one full-height tree: Layer → Group → Object, or Layer → ungrouped Object. Layers have a strong header and active dot, groups have folders, stamps use cached library thumbnails and other objects use type icons. Search and All/Visible/Active layer and type filters retain parent context. Collapse all closes branches; Reveal selected clears filters, expands ancestors and scrolls to the selection without forcing scrolling on every canvas click.

Click an object to select it, Ctrl/Meta/Shift-click to toggle additional members, or click a group to select its members. Clicking a layer activates placement there. Open Properties for the shared selection. Eye/lock icons distinguish direct from inherited state. Drag an object onto a group or layer, or before/after a sibling, for one undoable hierarchy edit. Right-click / ••• provides equivalent move controls, duplicate/delete and rename. F2 or double-click renames; arrows navigate/expand/collapse, Home/End jump, Enter selects and Shift+F10 opens actions. Existing layer groups and map-wide paint remain under the Scene header’s **Layer organization and map paint** action. Whole-group cross-layer dragging is deferred.

See [ADR-0049](docs/adr/0049-scene-outliner.md) and the [Scene sprint report](docs/sprints/scene-outliner.md) for ordering, virtualization, validation and screenshots.


### Continuous Wall Materials

The Wall Tool now accepts data-driven **continuous** material packs through **Choose wall set → Import wall set**. Each wall remains one editable native path. Material controls include physical Thin/Standard/Heavy/Massive width presets, Organic, Variation, Growth and Overgrowth where declared by the pack, material presets and explicit Randomize variation. In Properties, expand **Style details**, make changes and use **Apply path properties** for one undoable edit. Existing simple fills and legacy wall sets keep working.

Texture scale is physical and independent of zoom. The map scale is captured when choosing a material; the fallback is 50 px = 5 ft. Path editing uses a lighter live preview, then returns to final quality. Save, autosave, portable project archives and PNG 1×/2× preserve the native wall/material data.

Give the separate artwork task this [Wall Material Pack production instruction](docs/wall-sets/CREATE-WALL-MATERIAL-PACK.md), with its [JSON template](docs/wall-sets/continuous-template/wall-set.json). No new artwork was generated in this sprint. `node scripts/wall-material-fixtures.mjs` creates local development ZIPs from existing artwork bytes for renderer validation; these are not final Living Root/Pale Stone production assets. See [ADR-0050](docs/adr/0050-continuous-wall-materials.md) and the [sprint report](docs/sprints/wall-materials-organic.md) for validation and limits.


## Area and material editing

Area creates geometry and can choose an initial pattern. Select an existing Area/Floor and use **Apply Material**, or **Properties > Appearance > Browse materials**, to preview another fill. Apply is one undo step across compatible selected Areas; Escape/Cancel leaves the original document unchanged. Existing pattern transforms are preserved; solid/empty fills start at scale 1. Texture Brush paint remains independent. See [interaction details and validation](docs/sprints/area-material-interaction.md).


## Toolbar tools

Use **Place Marker** for semantic locations and linked names. **Map Elements** contains Compass, Scale bar, Title / Cartouche, Legend, Label and List / Note; it no longer repeats Marker. Tools are grouped as Select/edit, Assets, Draw, Terrain/surface and Map elements, with map-type filtering. Path type selects Generic, River, Road or Border; Area draws geometry, Apply Material changes selected fills, and Texture Brush paints local variation. See the [toolbar inventory, compatibility checks and before/after screenshots](docs/sprints/toolbar-semantic-cleanup.md).


### Scatter rotation

The inline Scatter toolbar offers **Rotation: None / Random / Range** between Spacing and Paint. None preserves each source image's original orientation; Random varies it through a full turn; Range adds a seeded offset (for example −15° to +15°). Range fields accept signed degrees, apply on Enter/blur and reject invalid Min/Max combinations. On narrow layouts the toolbar scrolls horizontally rather than covering the canvas with wrapped controls.

New World and Regional maps default to None; Battlemaps default to Random. Changing rotation on a selected matching-source Scatter regenerates that recipe as one undoable action. Otherwise it configures the next stroke. Existing maps retain their saved instances and legacy recipes. Source angles are recipe-local; the asset library currently has no separate default-angle metadata field.


### Stamp Soft Shadow

In **Map → Effects & map frame**, set **Stamp Soft Shadow** to On and choose **Intensity (%)**, then Apply map effects. The default is Off (including existing maps); a starting intensity of 25% gives a subtle directionless contact shadow around the stamp alpha silhouette.

A selected stamp's **Properties → Appearance → Stamp shadow & glow** offers **Soft Shadow: Default / On / Off**, committed by Apply stamp effects. Default follows the map, On enables that stamp even when the map switch is Off, and Off excludes flat objects such as rugs or floor decals. Global intensity applies to all enabled stamps. This does not change source images or replace existing shadow/glow settings. Undo/redo, saved projects and PNG 1×/2× retain the effect.

Texture Brush paints directly on an empty Battlemap or over its background image; no Area is required. Base paint is stored separately below Areas and other objects. Paint inside filled Areas keeps the existing Area overlay. Erase reveals the original background, and Blend, undo/redo, autosave, save/reopen and PNG export include both sparse paint surfaces.

Generated Walls: choose **Living Root** in Wall Tool → Material / Generator or the selected wall’s Properties. Width, Organic, Growth, Overgrowth, Clean/Natural/Ancient/Overgrown and Randomize variation retain one editable native Wall. The default Living Root choice uses the supplied production artwork (`production-1`); component IDs, roles, weights and nominal sizes are unchanged. Saved `dev-1` walls retain their previous images. To upgrade a selected development wall, choose Living Root in Material / Generator; Living Root (development) remains available for the old revision. Save/reload and PNG 1×/2× regenerate the same roots; legacy wall materials are unchanged. See [ADR-0051](docs/adr/0051-generated-walls.md) and the [component authoring guide](docs/wall-sets/CREATE-GENERATED-WALL-PACK.md).

### Open wall corridors and manual openings

Draw corridor sides as separate open walls, finish each with Enter or double-click, then choose **Opening → Door / Open passage / Window** and set Width before clicking a wall. Placement projects onto the path. Openings must fit within a single segment and cannot overlap. No room, floor, automatic door or merge is created. The same workflow supports Living Root generated walls.

**Properties → Geometry** supports node/handle editing, extending from either endpoint and explicit Open/Close Path. Opening keeps all nodes and removes only the closing segment; it is refused if an opening is attached to that segment. New freehand walls always use centerline alignment, including when the drawing material was inherited from an Outside wall on project load. Generated, continuous and simple walls can be open or closed. Outside-aligned boundary walls remain closed because their offset geometry requires a polygon; this is explained in Properties. Ordinary node editing retains existing normalized attachment semantics.

See [Open Wall Paths & Manual Openings validation](docs/sprints/open-wall-paths.md). No new persisted fields or project migration are needed.

## Campfire Map Contract export

Use **Export Campfire Map** for a ZIP containing canonical v3 `map.json` and original-resolution `map.png`. Configure a physical game scale first. **Map actions → Lighting** authors ambient and point lights; its approximate preview is excluded from the PNG. See [Campfire export](docs/campfire-export.md) for identity, revisions, stable object IDs, mapping, validation and supported geometry. Campfire owns the immutable contract. **Naar Campfire sturen** adds authenticated API publishing with mandatory DM review; see [Campfire API publishing](docs/campfire-api-publishing.md).

## Local Git workflow

For the Windows end-user installer, see [INSTALLATIE.md](INSTALLATIE.md). The reproducible release command is `npm run package:installer`; build prerequisites and the canonical bundled-content inventory are in [distribution documentation](docs/distribution/README.md).

Mapweaver uses its existing local Git repository on `develop`. Start each sprint with a working-tree check. Review the diff and finish each sprint that changes tracked project files with exactly one dedicated local commit (`Sprint: <title>` or `Fix: <description>`). Do not create empty commits or silently include unrelated pre-existing changes. Preserve and report ambiguous changes if the sprint cannot be isolated safely. Do not create remotes or push unless explicitly requested.

Source, runtime resources and canonical test fixtures are tracked. Root `*.local` workspaces, dependencies, build outputs and caches are ignored and retained locally. Ignored does **not** mean disposable: `asset-production.local`, deliverables and QA datasets can contain unique artwork or copied user data. Inspect contents and references before any deletion. See [repository cleanup](docs/repository-cleanup.md).


### Ceiling / sky exposure authoring

On a battlemap choose **Ceiling** (roof icon), click polygon points, then Enter/double-click to close. Escape cancels. Select a ceiling to move it or edit its vertices through Properties → Geometry. Undo/redo and save/autosave preserve stable ceiling IDs. **Map actions → Ceilings** toggles the diagnostic overlay, which is never baked into PNG. Use several simple polygons to leave courtyard, ruined-roof or cave-entrance sky gaps.

Campfire v3 exports their union as direct sky/environment coverage only; movement, LOS, windows and point lights remain independent. Old maps retain unknown coverage; new maps start explicitly roofless. **Use explicit sky exposure** opts an old map into intentional roofless coverage. See [Ceiling / sky exposure](docs/campfire-export.md#ceiling--sky-exposure-v3).

# Room Generator v1.1 — Wall Controls

Delivered on develop, 27 September 2026. Scope: native wall presets, logical-unit thickness, usable interior dimensions, joins and openings. Semantic Furnishing remains deferred.

## Result

Map → Generate Room… offers Simple Timber (1 ft), Polished Wood (1 ft), Living Wood (2 ft), Rough Heartwood (3 ft), Root Wall (3 ft), Stone (3 ft), and Rough Stone / Cave Rock (5 ft). The same concrete presets are available in native Wall Properties. They use solid colors and native miter/round/bevel joins; they are not newly illustrated wood/root/stone assets. Current styles and imported wall sets remain available.

Preset selection resets thickness to its default; an explicit override is accepted in the map's feet, metres or grid cells. The preview updates with the shared native renderer and displays interior and outer dimensions. Native Properties → Thickness → Apply path properties edits the resulting wall with standard history support.

New room walls store `wall.alignment: 'outside'`, unit/reference and physical thickness. Their path defines the fixed interior boundary. A derived doubled stroke, clipped against that interior and the native join contour, grows entirely outward. This applies to Rectangle, Square, Circle and Oval. The independent floor geometry and pattern frame do not change with thickness. Optional outlines remain within the wall footprint. Absent alignment preserves all prior centered-wall behavior; no existing room is converted.

Openings keep their width and normalized boundary distance. Their visible anchor shifts outward by half the thickness and their native cutout spans the entire wall. Generator corner clearance includes full outward thickness. Material strips cannot protrude beyond the outer band; material core color backs the joins. Every generated room remains one ordinary new layer with floor, wall and native doors. Creation is one undo action.

Limits: outward thickness 0.5–512 map pixels after unit conversion; at the benchmark scale this is 0.05–51.2 ft. Existing centered wall limits are unchanged. Interior dimensions span 16–8192 pixels, outer width/height must fit the map dimensions, and existing opening/geometry/material/document budgets still apply. Invalid or insufficient-clearance requests are rejected before creating objects.

## Validation

- 84 targeted Vitest tests passed in seven files: domain roomWallControls, roomGenerator, walls, openings, wallMaterials; store roomGenerator; app RoomGeneratorWizard. Coverage includes seven preset defaults/override, ft/m/cell conversion, 0.5/1/2/3/5-ft thickness, exact six-cell interior, outer corners, curve/floor/pattern invariance, valid seeded openings, native editing undo/redo, parser roundtrip, independent layers and old-wall compatibility.
- TypeScript: `npx tsc -b` passed. Final `npm run build` also passed client and service TypeScript, Vite production builds and bundled font/license verification. Vite still reports its advisory about chunks over 500 kB.
- Scoped ESLint passed for all 15 changed/added TypeScript implementation/test files. No broad test suite or full-repository lint was run.
- Chrome at 1280 × 720, using a separate disposable local service/database: three requested rooms created with 30 × 30 ft interiors, 50 px / 5-ft grid, seed 48217. Timber 1 ft / two doors → 32 × 32 ft outer; Living Wood 2 ft / two doors → 34 × 34 ft; Stone override 5 ft / one door → 40 × 40 ft. Each floor is 300 × 300 map pixels within floating-point tolerance and each room has its own visible unlocked layer.
- Browser creation Undo removed the entire third room/layer; Redo restored exact objects. Selected the heavy wall through Objects, changed 5 → 3 ft in normal Properties, applied, undid, redid, saved and reopened. Exact native objects and opening metadata survived; every floor stayed unchanged. Restored 5 ft through Properties for the benchmark exports.
- Normal PNG exports passed at 2000 × 2000 (1×) and 4000 × 4000 (2×). Final mean channel difference after downsampling: 0.025751 / 255. Captured editor versus scaled export: 0.345749 / 255. No browser JavaScript errors.
- Inspected the comparison images. Additional PNG pixel assertions passed for all three rooms: clear interior corners, filled outer joins, no overhang beyond the physical footprint, and background visible through each door near both inner and outer faces. The native door leaf remains visible in the middle of each opening as intended.
- Additional native Circle (30-ft diameter) and Oval (30 × 20 ft) previews with 5-ft walls and four openings were inspected. A sampled outer-clip nick at curve extrema was found and corrected for solid styles; they now retain exact native stroke curves. Preview checks were cancelled without creating further objects.

## Evidence

Local artifacts, deliberately outside version control:

- `deliverables.local/Room-Wall-Controls/01-timber-wizard.png`
- `deliverables.local/Room-Wall-Controls/02-living-wood-wizard.png`
- `deliverables.local/Room-Wall-Controls/03-stone-wizard.png`
- `deliverables.local/Room-Wall-Controls/04-three-rooms.png`
- `deliverables.local/Room-Wall-Controls/05-native-wall-properties.png`
- `deliverables.local/Room-Wall-Controls/06-thin-medium-thick.png` — left Timber, middle Living Wood, right Stone; same image scale and same interior.
- `deliverables.local/Room-Wall-Controls/07-editor-canvas.png`
- `deliverables.local/Room-Wall-Controls/08-circle-preview.png`, `08-oval-preview.png`
- `deliverables.local/Room-Wall-Controls/rooms-1x.png`, `rooms-2x.png`
- `deliverables.local/Room-Wall-Controls/saved-project.json`, `validation.json`, `pixel-validation.json`

The repeatable local checks are `.qa.local/room-wall-controls-browser.mjs` and `.qa.local/room-wall-pixels.mjs`.

## Important files and limitations

`wallPresets.ts` and `wallAlignment.ts` centralize presets and alignment; `roomGenerator.ts` builds interior geometry; `RoomGeneratorWizard.tsx` and `WallFields.tsx` expose controls. `drawWall.ts`, `PathPaint.tsx`, `openings.ts`, `useOpeningPlacement.tsx`, model/validation/bounds changes keep the native renderer and editing path consistent. The guide and ADR 0046 document the optional format-12 field and compatibility behavior.

Floors are not live-linked to later path-node edits. Rooms are placed at the viewport center without collision avoidance or auto-repositioning; export clips portions outside the map. Curved floors retain the existing adaptive polygon approximation. Arbitrary self-crossing edited paths and texture phase seams in arbitrary imported artwork retain existing native limitations. Old binaries are not promised forward compatibility with newly aligned walls. No furniture, semantic furnishing, corridors, decoration, procedural damage or AI was added.

No Windows package was built, and no push, merge, publication, deployment or other external action was performed. Existing user projects/databases were not used for validation.

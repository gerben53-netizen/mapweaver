# Battlemap Room Generator Wizard v1 — 27 September 2026

## Acceptance goal

Create one correctly scaled, editable room with floor, walls and 0–4 doors through a compact wizard. Every successful creation must add exactly one new normal layer, assign all room objects exclusively to it, and be one undoable action. Preview must remain temporary and use the existing renderer. Preserve existing objects, layers and serialization. Validate the four shapes, units, safe seeded doors, layer isolation, history, persistence and normal PNG export.

## Delivered implementation

- Entry: **Map → Generate Room…**, gated by the existing `mapCapabilities(...).rooms` capability. No new permanent tool, capability or World-map entry.
- Fields: optional Room name; Rectangle/Square/Circle/Oval; Width/Height, Size or Diameter in map feet/metres/cells; floor fill pattern or solid color; native pattern scale; wall preset/material; 0–4 doors; Single/Double/Passage; door width in the same map units; unsigned 32-bit Seed; Randomize; Regenerate; Cancel; Create Room.
- Geometry: rectangle/square use four straight nodes; circle/oval use four cubic Bézier quarters with relative handles. One native closed Wall is the perimeter. The floor is a native Area sampled from that same centerline. Width/height describe the centerline, not clear interior dimensions. No GeneratedRoom object or new persistent metadata/schema.
- Floor: Project fill patterns and compatible Battlemap Library fill patterns, searchable/paginated through the existing library API. Native repeat scale/offset/rotation fields and the ordinary renderer are retained. Solid color is available when no material is selected.
- Wall: existing Simple/Stone presets, the current editor style, and already imported wall sets. Material defaults determine wall thickness; selection adopts the ordinary atlas asset on commit. Existing native painters render the wall, joins and cutouts.
- Doors: at most one per eligible straight side or curved quarter, with actual opening width. End clearance is the greater of half wall thickness + 1 px and the smaller of approximately 5 ft (one cell without physical scale) or 20% of the shorter room dimension. This leaves twice that clearance between adjacent openings along the perimeter. The existing native Opening validator rejects invalid attachments/overlaps. Insufficient eligible segments produce validation, never silently reduce the requested count.
- Determinism: fixed unsigned 32-bit LCG, Fisher–Yates eligible-segment ordering, then a uniform valid distance per selected segment. Wall-set variation receives the same seed. Randomize/Regenerate always changes the seed. IDs remain ordinary unique IDs, independent of geometry randomness.
- Preview: 150 ms debounce, temporary recipe/native objects, shared `exportScene`/`buildScene`, bounded 600 × 420 thumbnail. No preview store mutations. Image leases and canvas/root resources are released, outdated results ignored. Temporary source identities distinguish project and library assets even when their imported IDs collide. Decode/material failures disable creation with an explanation.
- Placement: exact current viewport center converted to map coordinates, independent of zoom/pan and without snapping or overlap avoidance.
- Dedicated layer: one new ordinary root layer, named as requested or first unused Room N, visible/unlocked/active. Layer Solo ends. Existing layer membership, objects and groups remain intact. All generated IDs occur only in the new layer, ordered Floor → Walls → Doors. No optional group was needed.
- Atomic history: preflight validates geometry, available assets, limits and layer capacity before opening a single `Create room` transaction. One combined state change writes objects/layer. Undo removes all of them, redo restores the exact saved snapshot. Failed commits cannot activate an absent layer. Normal native layer editing remains authoritative.
- Persistence/export: unchanged native project parser, local save/reopen and normal PNG renderer. No separate room persistence or export path.

## Changed files

| File | Responsibility |
| --- | --- |
| `src/domain/roomGenerator.ts` | Logical dimensions, native geometry, validation, seeds, door distribution, naming |
| `src/store/projectStore.ts` | Atomic generation into a dedicated normal layer |
| `src/app/RoomGeneratorWizard.tsx` | Capability-gated entry, compact wizard, materials, validation, commit |
| `src/app/RoomGeneratorWizard.module.css` | Desktop layout, scrollable fields, preview and fixed action row |
| `src/app/roomPreview.ts` | Temporary native scene through the normal renderer |
| `src/app/MapSettingsPanel.tsx` | Existing Map inspector entry point |
| `src/domain/roomGenerator.test.ts` | Shape/scale/style/perimeter/door/seed/invalid-input tests |
| `src/store/roomGenerator.test.ts` | Layer isolation, history, failures, existing content, parser/export tests |
| `src/app/RoomGeneratorWizard.test.tsx` | Capability, temporary preview/cancel, seed and invalid form behavior |
| `docs/room-generator.md`, `README.md` | User instructions and limitations |

## Validation

- `npm test -- src/domain/roomGenerator.test.ts src/store/roomGenerator.test.ts src/app/RoomGeneratorWizard.test.tsx src/domain/rooms.test.ts src/domain/openings.test.ts`: **51 tests pass**, five files. Includes existing room detection/opening regressions.
- `npm run typecheck`: passes. Final production build repeats both client and service TypeScript checks.
- Scoped ESLint for the eight changed TypeScript/TSX implementation/test files: passes.
- `npm run build`: passes client build, service build and eight-family font resource/license verification. Vite retains its non-blocking >500 kB chunk warning; no unrelated bundling refactor.
- Production-browser validation: isolated disposable local service/database, Chrome, 1280 × 720, existing wooden fill fixture and imported Timber wall set. No user database was opened or changed. See `deliverables.local/Room-Generator/validation.json` for exact measurements and checks.
- Browser scenarios: Bibliotheek 40 × 30 ft / two doors; Maelyra's werkkamer 30 × 25 ft / one door at another viewport center; separate active layers and untouched Objects layer; hide only Bibliotheek; lock and attempt to drag Maelyra; create circle third room and immediately undo; redo and undo again; save/reload retaining geometry, styles and layer states; normal 1×/2× PNG downloads and downsampled parity. No browser JavaScript errors or horizontal page overflow.
- Screenshots: `deliverables.local/Room-Generator/01-wizard-1280.png`, `02-two-rooms.png`, `03-hidden-locked.png`, `04-reopened.png`.
- Export artifacts: `deliverables.local/Room-Generator/rooms-1x.png` (2000²) and `rooms-2x.png` (4000²); saved document and validation JSON in the same directory. Local repeatable scenario script: `.qa.local/room-generator-browser.mjs`.
- No full unrelated test suite, Windows package, external push/release/upload/deployment, or application-wide refactor.

## Limits and deferred work

Native geometric/image/document/export limits still apply; the padded preview also respects export limits. Large or very small footprints and doors are explicitly rejected. Imported wall materials must already be available; the wizard does not add a second import system. Decorative door stamps are deferred; native Single/Double/Passage openings are editable after creation. Floor and wall are independent editable objects, not live linked. No post-creation Edit generated room wizard is provided. Preview generation is asynchronous and creation waits for successful current rendering.

Viewport-center placement can put part of a room outside map bounds if the user has panned there. Normal map/export clipping applies; generation does not silently shift or resize the room. The preview shows the room itself, not the surrounding map or other rooms. No collision avoidance or automatic connections are claimed.

Deferred v2/out-of-scope items: furnishing for bedrooms/libraries/studies; furniture, stamps, scatter and decorations; wear/dirt/texture painting; encounters, NPCs and monsters; puzzles and clues; secret doors; corridors, multi-room/dungeon generation and automatic connections; AI. All four requested v1 shapes shipped.

The intended short workflow is available: open wizard, name/size/style/door choices, Create Room. Automated timings are recorded separately and are not a human usability study. Creation itself leaves a correctly scaled native editable room completely isolated in one normal layer.

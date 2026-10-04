# Ceiling / Sky Exposure acceptance — 2026-10-04

Result: **PASS**. Canonical contract v3 is available and is the only source of contract types, schema and validation. Campfire files were not modified; local derived provenance verification passes.

## Implemented

Native polygon-based ceilings, distinct tool/Scene type/inspector, existing transforms and vertex editing, cancellation and undo/redo. Optional format-12 ceiling marker and explicit exposure flag persist through SQLite/autosave and portable files. IDs remain stable; object duplicates get new IDs. Old maps remain legacy unknown; new maps explicitly have no ceilings. All authored coverage exports as canonical v3 root `ceilingRegions`, sorted deterministically, independently of the authoring overlay and hierarchy visibility.

Ceilings describe a union blocking direct sky/environment illumination only. Walls, doors, windows, point lights, authored ambient light, movement and LOS are unchanged. PNG export excludes ceiling guides. Courtyard/ruin openings are gaps between simple polygons; the cave example is concave.

## Validation executed

- 52 tests in 7 files: `ceilings`, `ceilingDrawing`, existing contract/windowLights, sceneTree, materialApplication and patternDrawing regressions. All passed.
- TypeScript client and service checks passed.
- ESLint over all changed TypeScript/TSX/MJS plus new source/test/canonical derived files passed.
- `git diff --check` passed.
- `npm run build` passed, including read-only canonical provenance, client/service and font-resource checks. Existing large-chunk/dynamic-import warnings remain; no build errors.
- Actual Chrome editor QA with isolated disposable SQLite data, nonstandard ports 48414/48415, after inspecting running processes/ports. Own service/browser closed afterward. No user data used or changed.
- Actual tool clicks + Enter, vertex editing transaction/cancel, duplicate/delete/history, courtyard/ruin/cave authoring overlays, inspector rename, SQLite save/reopen, autosave/reload, portable ZIP and 1280×720 layout all passed; no browser page errors. PNG bytes match exactly with overlay on/off.
- Six actual producer JSON examples validate against canonical v3: outdoor, covered-room, courtyard, ruin, covered-window and cave.

Screenshots, QA results, clean courtyard PNG and editable cave example: `deliverables.local/Ceiling-Sky-Exposure/`. Local QA script/data are in `.qa.local/ceilings/`, excluded from Git.

## Limits and handoff

Canonical ceiling limits: 64 regions, 3–128 vertices each, inclusive image bounds, map sides up to 8192 pixels; no polygon holes. Invalid edits/resize retain valid data. Authoring is exposed in the Battlemap workspace alongside physical Wall/Opening tools. Shared overlays are diagnostic, not a runtime darkness preview.

Campfire owns runtime sky masking/environment profiles and must preserve missing, empty and nonempty coverage on ingest/re-import. No Campfire renderer/API/runtime code or Windows package was built. No remote is configured, so the requested push cannot be performed; the sprint has one local commit on `develop`.

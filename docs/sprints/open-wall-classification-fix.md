# Open Wall classification fix — 2026-09-29

Loading a project inherited the first wall's complete style for the Wall Tool, including `alignment: outside` from a room boundary. Selecting Living Root retained that classification. Finishing an open path therefore correctly failed the domain validator, but with an incorrectly classified new wall.

`wallDrawingStyle` now creates a separate centerline drawing style without boundary alignment. Project loading, Wall controls, draft preview and new-path finalization use it. Stored walls, extension of existing walls, room generation and strict Outside validation are unchanged. No format migration, width change or artwork change is involved.

## Validation

- 62 tests passed across `openWalls.test.tsx`, `walls.test.ts`, `generatedWalls.test.ts`, `continuousWallMaterial.test.ts`, `roomGenerator.test.ts`, `roomWallControls.test.ts` and `pathDrawing.test.tsx`.
- Regression coverage includes loading an Outside wall before selecting Living Root; Enter, double-click and start-node closure; stale editor styles; generated/continuous/simple open and closed walls; strict Outside closure and thickness rules; serialization and undo/redo.
- Typecheck, scoped ESLint for all changed TypeScript files and production client/service build passed. Build retains the existing large-chunk warning. No full unrelated test suite was run.
- Isolated Chrome interaction check passed: load a genuine closed Outside wall, draw two independent curved Living Root walls at exactly 1 ft = 10 map pixels, finish with Enter/double-click, explicitly close a third wall, insert a manual passage, keyboard undo/redo and local save/reload. Original Outside wall remained identical. No Area or Room was generated. No page errors.
- Exported PNG before/after reload is byte-identical; visual inspection confirms open endpoints, the passage gap and closed loop. Evidence: `deliverables.local/Open-Wall-Classification-Fix/`.

## Windows delivery

Package: `distribution.local/Mapweaver-OpenWallFix-20260929/Mapweaver.exe`. Keep the complete folder together. Save and stop a running older Mapweaver before starting it. User data is outside the package and was not reset. No external actions were performed.

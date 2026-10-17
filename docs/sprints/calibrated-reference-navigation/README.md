# Calibrated Reference Navigation

Implemented on codex/calibrated-reference-navigation from local develop e7e25e0d32bf39c7039671ea5efb5cf58efd1734. The prior Northreach acceptance audit is administratively complete at d2f9bf91d6fe2d219ef8964ded93e6672a72ed22 on its separate local auditbranch; it is not silently merged into develop. The existing unrelated audit ZIP remains excluded. No push or merge is authorized for this sprint.

## Acceptance and use

On World/Regional maps open Ref, load an image, and select Calibrate. Add a point pair, click a recognizable landmark in the image and the same landmark in the map. Repeat at another well-separated location. Recalculate fits a uniform scale/rotation/translation; add a third or later pair to see residuals. Pick image / Pick map correct a pair; Remove pair removes it. Changes require Recalculate before relinking. Clear calibration retains the image. Show point pairs controls both editor marker sets.

Choose Independent, Reference → Map or Map → Reference. Only a valid calibration in Edit enables linking. Reference → Map uses reference drag/arrows/wheel/buttons; Map → Reference follows existing canvas navigation. Align Views matches geographical centres and scale, using the selected direction (Reference → Map when Independent). Different pane sizes show different extents; neither camera is rotated. The reported rotation belongs to the coordinate mapping. A follower at a zoom limit reports that it cannot match scale exactly.

The controls scroll inside the existing bounded panel; no additional permanent sidebar is introduced. Hide returns to Independent, preserves image/pairs for this editor session and cancels point picking. Preview pauses linking and excludes map markers. Reopen Edit and explicitly select a linked mode to resume. Clear reference, replacing its image, project switching or browser reload clears calibration. Map dimension changes require recalculation. Session-only status is visible in the panel. Nothing is added to project assets, archives or PNG.

When picking, Escape cancels; focus the indicated viewport and Enter chooses its centre. Normal drawing/editing remains available as soon as the pending point is placed or canceled. Middle/Space pan and regular viewport controls are unchanged. Arrow keys in the reference never become map drawing actions.

## Evidence and implementation

- [Implementation](implementation-report.md), [architecture](architecture-decisions.md), [tests](test-results.md), [UX and limitations](ux-assessment.md), [Northreach validation](northreach-validation.md).
- screenshots/ contains the actual editor, pair selection, invalid/valid calibration, both modes, Align Views, editing and native Preview/export.
- evidence/ contains point coordinates/transform/residuals, recorded viewport states, exact native PNGs and the editable QA result.
- [QA evidence gallery](index.html).

Reproduction uses the real App and normal UI controls for calibration and the bay correction. The QA harness only imports a new isolated copy, frames views, records visible view state and calls existing native export/history/archive/storage operations. No contour tracing or reference pixel matching.

The source acceptance archive is read from the committed auditbranch into ignored .qa.local/calibrated-reference/northreach-input.mapweaver; old audits and user projects are not altered. QA reuses the verified isolated service on 49571 (QA profile, .qa.local/land-precision/data) and a separate frontend on 49592. Existing listeners were checked before startup. Start the frontend with `npx vite --config docs/sprints/calibrated-reference-navigation/reproduction/vite.config.mjs`. Its proxy preserves the QA service's accepted development Origin 49572. Restart only this frontend after source edits: audit file watching is disabled to avoid broad local evidence scanning. Never point this harness at Primary.

Capture Native isolation proof with image and valid calibration before leaving the session. It compares visible image/markers, hidden markers and hidden panel without changing project data. The ordinary Export PNG → Download PNG was independently captured and must match. UI Undo/Redo was checked with native PNGs; the final save/archive proof waits for stable autosave, validates those earlier history hashes, then compares normal database and archive reopening. `reproduction/verify.mjs` checks the delivered geometry, viewport correspondence, archive and hashes without changing source projects.

# Implementation report

The acceptance criteria were point-pair calibration with explicit error handling; three directional modes; one-shot alignment; editable paired markers; session-only isolation; unaffected geometry/history/export; real Northreach evidence; relevant tests, full build/typecheck/lint/contract verification and one local commit.

- canvas/referenceCalibration.ts: centred similarity fitting, finite/bounds/separation/scale validation, inverse mapping, residuals and follower viewport computation. Reuses viewport conversion, pointer-anchored zoom and zoom bounds.
- store/referenceViewStore.ts: editor-only pairs, pending picks, calibration, mode, view dimensions and viewport. Guarded directional subscriptions move only editor viewports. Pair edits invalidate stale fits. No serialized fields.
- canvas/ReferenceMapOverlay.tsx and MapCanvas integration: non-exported numbered DOM markers and an explicit temporary point-picking layer. Capture-phase interception prevents normal drawing during a pick. Unmounting Edit pauses linking; normal canvas interaction otherwise passes through.
- app/ReferenceView.tsx/CSS: existing validated file loading and object URL lifecycle, compact scrolling calibration controls, per-pair re-picking/removal, error measurements, mode selector and Align Views. Independent reference drag/wheel/keyboard remains. Reference resize preserves its geographical centre; follower subscriptions use current pane dimensions. Hidden/switch/reload semantics are explicit.
- Tests: pure fit/inverse/rotation/invalid data, linked scale/centres/zoom bounds, state isolation, directional loop guard, point management and real component picking against map viewport transforms. Existing land, protected-point, history, Area, archive and viewport suites are rerun.

No Campfire files, fingerprints, schema, serializer, persistent format, smoothing, geography generation, artwork or renderer changes. Primary Development was not opened or written. Native export uses the unmodified exportPng/currentRenderRequest pipeline and was cross-checked with an actual UI download.

Development exposed two test defects: exact floating-point equality in an inverse test and an incorrectly shaped parameter table. These were corrected to assert numerical tolerance and to pass each complete invalid fixture, respectively. A component query was disambiguated from the pre-existing zoom output's implicit status role. These were new-test implementation issues, not suppressed product failures. Typecheck also removed an unused type import. No permanent Vitest setting changed.

The QA frontend initially scanned local files too broadly; its watcher was disabled as in earlier proof harnesses. One proof attempt tested save status before autosave had settled. The harness now waits for stable Saved instead of treating an intermediate status as data loss. Actual UI Undo/Redo native PNGs are preserved separately. No storage implementation was changed. No new unresolved product defect was identified during this proof.

Final review disables calibration picking in read-only Preview as well as linked navigation. Edit restores availability; calibration is retained until session replacement. No Preview renderer change.

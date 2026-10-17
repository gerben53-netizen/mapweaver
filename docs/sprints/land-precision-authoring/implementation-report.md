# Implementation report

Implemented on codex/land-precision-authoring, based on 363a347619108825d25e347c551294ef11e3216d. Starting tracked tree was clean; the existing untracked map-types audit ZIP remains untouched. Existing auditbranches and archives are preserved. One featurebranch, no parallel sprint/worktree, no push/merge/package.

- Domain: landPrecision.ts defines selected-ring precision smoothing and safety; landAreas.ts shares the existing Laplacian step without changing global smoothing arithmetic.
- UI: LandPrecision.tsx/.module.css extends Geographic role & contour with endpoint selection, clickable/keyboard points, focused segment view, protected landmarks, original/proposed preview, explicit Apply/Cancel. It fits 1280×720. LandAreaProperties adds the scoped entry point.
- Brush: LandBrushTools explains Smoothing Off; landBrushInput refuses that no-op before worker execution. Existing Add/Remove/Roughen semantics are unchanged.
- Reference: ReferenceView.tsx/.module.css and referenceViewStore.ts add editor-only file loading, fit, independent wheel/button zoom, drag/keyboard pan, width, hide and clear. ToolRail exposes Ref only for geographic workspaces; App mounts the optional pane beside the canvas.
- Tests: domain, component, store/history and archive coverage; related old fixtures corrected. No persistent model, serializer, artwork, exporter or contract changes.
- Validation tooling/docs: this folder contains native exports, true App screenshots, reusable QA harness and actual portable output archives. Evidence only came from isolated QA.

The true App imported a QA copy of Northreach through importLocalProject and saved it through normal local autosave/Save. Native UI Apply, Undo and Redo were exercised. The output was saved and reopened through the QA service, then encoded/decoded through the normal portable archive path. The map ID belongs to that new QA copy, not the unchanged source audit.

Northreach range 31–61, protected point 46, strength 50: 24 vertices changed, the rest of the main ring and all 35 other Areas stayed exact. Start/end tangent pairs and the protected point/neighbours stayed exact. The PNG changed as expected and remained identical after database/archive reopen. Source audit PNG reproduced byte-identically before editing.

The bridge fixture protects vertices 5 and 14. Strength 50 is safely rejected by the 3% area guard; strength 15 is previewed/applied with the bridge and pinned coordinates intact. Both PNGs and its saved archive are included.

The first strong preview exposed excessive oscillation from weighting neighbour sums like averages. This was corrected before Apply/final evidence; a bending-reduction regression was added. Final local tests pass. This visual check was necessary: valid topology alone did not prove useful smoothing.

Reference view is absent from the export: native north-after.png and reference-visible.png have exactly the same SHA-256. No reference bytes/assets enter either portable archive.

Remaining scope: session-only landmarks and independent, uncalibrated reference navigation. Full production build is blocked by external canonical contract drift; see architecture-decisions.md and test-results.md. The sprint cannot claim every Definition-of-Done check is green while that guard fails.

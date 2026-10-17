# Land Precision Authoring — architecture decisions

17 October 2026. No project-format or SQLite schema change.

## Canonical geometry and local edits

Native Area polygon rings remain the only land geometry (ADR-0007 / ADR-0015 / ADR-0034). landPrecision.ts extends the existing contour workflow. It does not introduce a second land engine, mask, renderer or subdivision system. The existing Laplacian step is extracted as smoothContourPoints in landAreas.ts; global editContour uses exactly the previous arithmetic. Precision uses the paired positive/negative smoothing coefficients already used by Land Smooth, with a bounded per-vertex weight.

A range is one stored ring's directed start/end interval, including wraparound. Reverse range selects the complementary direction. No resampling, simplify or point insertion occurs. Vertices outside the range, the two endpoint tangent pairs, protected vertices and their immediate neighbours remain numerically exact. A taper makes the interior transition gradual. Existing angular geometry is not claimed to become a mathematical spline.

Motion is conservatively bounded to 20% of original clearance to nonlocal boundaries, including holes. Existing normalizeGeometry validates self-intersection, ring containment and polygon relationships. A normalization that would remove/reorder vertices is rejected, never silently adopted. A >3% net area change is refused. Existing polygon-clipping detects any newly added overlap against other landmasses, including hidden/locked ones. The domain guard is rerun against current objects at Apply. These are conservative guards, not an assertion of automatic geographic understanding of every bay.

commitLandStroke performs the existing protected-layer admission, canonical validation, landEditing revision, label-position preservation and one history transaction. The source identity is checked before Apply. Preview uses existing editor.areaPreview, never saved project data. No Campfire schema/types/generated artifacts are changed.

## Protected landmarks: explicit bounded session

Before implementation the bounded choice was explained to the user: protection belongs only to the unchanged object/ring editing session. The component key includes object ID and exact geometry. Apply, direct point editing, simplify, undo/reload or changing the source discards the selection. Changing ring clears ring-local point references. Hide/cancel cannot alter map geometry.

Permanent vertex IDs would require maintaining identity through all existing Boolean merges, simplify, drawing, transforms, normalisation and project codecs. That persistent topology identity is disproportionate for this local smoothing operation. There is therefore no silent schema extension or second copy of persistent geometry. The dialog states the limitation. To deliberately move/delete a protected vertex, close the dialog and use the existing Edit points tool; the old transient protection cannot become a stale restriction.

## Editor-only reference

ReferenceView holds the validated file, object URL, viewport and width in component state; only panel visibility is a separate transient Zustand flag. It reuses readImage limits/decoding and the existing viewport fit/zoom helpers. No file enters the asset store, project snapshot, archive or export scene. Hide retains the image/crop; Clear/replacement/unmount revokes its URL. A project-generation remount or browser reload ends this reference session.

Pointer dragging uses capture; wheel zoom is pointer anchored and prevents scroll. Arrow keys provide an accessible independent pan path; pointer capture cancellation and window blur end dragging. Width is bounded and the closed aside has display:none. The pane is optional, not permanent chrome.

Calibrated coupled navigation is deferred explicitly: this sprint supplies independent navigation only. A reference may have a different crop, scale, orientation or projection; guessing a transform would be wrong. A two-correspondence calibration UX and invalidation policy deserve a separate small feature, not implicit coordinate changes.

## Validation maintenance

Existing Land history tests assumed Campfire revision equality after undo. They now follow history.test.ts: compare all authored content, while excluding monotonically increasing campfireRevision, and reacquire the current snapshot for the subsequent stroke. The Area fixture now resets its layer tree/groups with its replacement layer IDs. Product history semantics were not changed.

Full lint initially included frozen historical audit .mjs recipes without their Node environment and with archived unused variables (54 errors). Those historical recipe snapshots are now explicitly outside maintained source lint; application sources and new sprint recipes remain checked. New sprint .mjs recipes receive Node/browser globals. Existing audit files are not edited.

## Accepted provenance refresh and closure

Campfire's only package.json change adds --import ../../scripts/test-isolation-preload.mjs to its test command. Removing that exact substring in memory reproduces the old pinned hash. All other 21 canonical fingerprints match. The user accepted this tooling-only change; only Mapweaver's package.json fingerprint was refreshed from c8dbe7eaf9df8368d93eecf13caad5053e5eff432f04c2e2ade79358d2b1bf5b to 2af57b2b3685b9525040b1b820fe3209fe806818250f853da362449f44c73177. No regeneration, contract edits or guard changes. Full build now passes.

Vitest recovery uses process-scoped TEMP/TMP under ignored .qa.local, with serial isolation first and normal parallel execution second. No permanent concurrency setting or isolation relaxation was necessary. See test-results.md.

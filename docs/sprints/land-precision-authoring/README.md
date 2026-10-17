# Land Tool — Precision Authoring & Workflow

Implemented: **local contour smoothing, preview, protected session landmarks, optional editor-only Reference View, and Smoothing Off feedback**. Existing Area/Land geometry, history, serialization and PNG rendering are reused.

**88/88 targeted tests, typecheck, lint and client build pass. Full build remains blocked by canonical Campfire contract fingerprint drift**, independently of these land changes. This sprint therefore does not claim a fully green Definition of Done. Contract/guard/derived artifacts were not changed.

[Evidence gallery](index.html) · [Implementation](implementation-report.md) · [Architecture/scope decisions](architecture-decisions.md) · [Tests and build blocker](test-results.md) · [UX/final evaluation](ux-assessment.md) · [Before/after](before-after-comparison.md) · [Validation JSON](evidence/validation.json).

## Use

1. Select a native Landmass on a World/Regional map.
2. Properties → Terrain → Geographic role & contour → Local contour precision.
3. Choose a ring and directed start/end points (numbers or clickable points); Reverse range chooses the other arc. At least seven points are required.
4. Optionally choose Protect / release landmark and click important points. Pink points and immediate neighbours stay exact. Endpoint tangents stay exact too.
5. Set strength, Preview, inspect original/proposal in the focused segment view, then Apply or Cancel. Apply is one ordinary undo step.
6. Ref on the geographic tool rail opens Reference View. Load PNG/JPEG/WebP, zoom with wheel/buttons, pan by drag/arrows, resize width, Hide or Clear. It never enters map/library/export.

Landmarks are explicitly **not persisted**: they are scoped to the unchanged contour session and clear on geometry change/Apply, selection/source change or reopen. Close the dialog to deliberately move/delete a point using ordinary Edit points. No project-format extension is introduced. Reference navigation is independent; calibrated linked navigation is deferred.

## Proven results

The QA Northreach copy changes only 24 selected interior vertices. The protected northcape, endpoints/tangents, the other main-ring vertices and all 35 other Areas remain exact. Native before-export matches the original audit PNG; after-export survives QA database save/reload and portable archive reopen identically. Opening Reference View produces the same native PNG hash.

The narrow bridge fixture shows both refusal of excessive movement and safe application with two protected shores. Real UI screenshots and native outputs are in screenshots/ and evidence/. The source Northreach/Elyra audits and all Primary data remain unchanged. More precise authoring is demonstrated; premium whole-map quality and measured human-time savings are not claimed.

## Outputs

- [Editable Northreach QA result](evidence/northreach-result.mapweaver), map ID 9e7b860f-9d86-45ba-8392-f0eff9b4f127.
- [Native Northreach after](evidence/north-after.png), [before](evidence/north-before.png), [reference-visible export](evidence/reference-visible.png).
- [Editable bridge result](evidence/bridge-result.mapweaver), [native bridge after](evidence/bridge-after.png).
- [Northreach roundtrip](evidence/northreach-roundtrip.json), [bridge roundtrip](evidence/bridge-roundtrip.json).

## Reproduction and isolation

Work used profile qa, .qa.local/land-precision/data, backend 49571 and frontend 49572, after checking existing instances and ports. The small empty campaign DB was consistently copied from the earlier isolated QA root, never from Primary. QA imports/saves use normal application functions. The source archives are read-only inputs; no user projects are overwritten.

reproduction/ contains the App harness, Vite receiver, bridge fixture builder and artifact verifier. Copy editor.tsx/index.html/vite.config.mjs to .qa.local/land-precision/ and start an explicit isolated QA backend with MAPWEAVER_RUNTIME_PROFILE=qa, MAPWEAVER_DATA_DIR set to that absolute QA root, MAPWEAVER_PORT=49571, MAPWEAVER_DEV_ORIGIN=http://127.0.0.1:49572. Start Vite with that copied config. Never substitute a Primary root.

Load a QA copy with the harness, perform the ordinary UI actions above and use Export PNG → Download PNG. The receiver copies only the unchanged Blob URL emitted by that native download; it is not a second renderer. The roundtrip button uses normal QA save/reload plus gather/encode/decode and exports before/after. Evidence files preserve the actual accepted outputs; rebuilding a fixture/importing creates a new QA identity.

Run node docs/sprints/land-precision-authoring/reproduction/verify.mjs to recheck delivered archive geometry and hashes. The input audit path is preserved in the script. No Windows executable, push, merge, Campfire publication or external action was performed.

Branch: codex/land-precision-authoring. Base: 363a347619108825d25e347c551294ef11e3216d. One local sprint commit contains only this implementation and its documentation/validation; pre-existing unrelated untracked audit ZIP remains excluded.

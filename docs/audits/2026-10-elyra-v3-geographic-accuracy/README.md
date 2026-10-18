# Elyra V3 — geographic accuracy proof

**Technical production proof complete; premium quality rejected.** Runtime recovery, three native UI exports, real user-assisted Freehand, protected local contour editing, undo/redo and archive/database PNG parity are documented.

- [Runtime diagnosis](runtime-recovery.md): sandbox connect EACCES; approved local loopback context works on backend49571/frontend49602. No security/product configuration workaround.
- [Production scope](production-plan.md), [workflow](workflow-findings.md), [quality assessment and eight conclusions](quality-assessment.md), [tests](test-results.md).
- [Current editable candidate](elyra-v3-geography.mapweaver), [native UI-identical PNG](elyra-v3-native-export.png), [geometry/roundtrip evidence](geometry-validation.json), [calibration](calibration-results.json).
- Native stages: [macro](stages/macro-native-export.png), [meso](stages/meso-ui-download.png), [micro](stages/micro-ui-download.png).
- [Same study window across five versions](comparison/study-window.png), [overview](comparison/reference-v2-northreach-v3.png), [macro detail](comparison/macro-detail.png), [meso detail](comparison/meso-detail.png), [micro detail](comparison/micro-detail.png).

Reopened QA map identity: `e642903e-7a3b-40df-9e8c-44ae3eb5611b`. Original prepared macro archive identity remains unchanged in stages/macro.mapweaver. Existing Primary Development, Campfire and older maps are untouched; all resume edits occurred in the existing explicit QA root. The unrelated pre-existing audit ZIP remains excluded.

Current source branch: codex/elyra-v3-geographic-accuracy, base develop539f2ef. No product code, merge, push or package. Reproduction helpers are audit-only; the Meso Add/Remove scripted authoring button was not used. Native UI downloads were independently captured. Comparison crops are labelled resampling/composites, not native map exports.

Closure: the user confirmed the Freehand gesture. Its nine-point native Area was found in the QA database, with all prior 36 objects exact. The existing UI converted it to Landmass without changing geometry. Final micro PNG/archive/validation/comparisons were refreshed. One local audit commit; no merge or push. The island remains an approximate, oversized interpretation, so procedural completion does not imply premium acceptance. See [visual gallery](index.html).

# Northreach practical validation

Input: committed Northreach acceptance output from auditbranch d2f9bf9, copied read-only to an ignored QA input path. Working copy was imported through normal importLocalProject into the existing isolated QA dataset. New map identity: **02b5f714-d02c-47ce-a438-9003fd191d72**. Previous QA maps, old audits, Campfire and Primary remain unchanged.

## Three real UI correspondences

| Pair | Feature | Image coordinates actually recorded | Map coordinates actually recorded |
|---|---|---|---|
| 1 | Northern cape | 500.000, 54.306 | 1027.273, 90.909 |
| 2 | Westmere/Golden Marches bay depth | 435.556, 404.444 | 863.636, 959.091 |
| 3 | Southern cape | 606.667, 557.778 | 1290.909, 1340.909 |

The intended source clicks were visually interpreted landmarks, not traced masks. Browser screen-coordinate rounding at reference zoom .45 and map zoom .22 affects their recorded precision. Two pairs first fit exactly; a deliberate duplicate third pair was rejected, then re-picked on the southern cape. Three-pair least-squares result: scale 2.48344489 map pixels per image pixel, rotation 0.091570°, translation approximately (-214.7220, -46.5666), mean residual 1.269118 map pixels, max 1.780620. Residuals are not held-out geographic accuracy.

The actual UI was used for every image/map pick, invalid calibration, re-pick, recalculation, navigation selection and Align Views. Recorded visible view state in evidence/navigation.json checks corresponding centres and scale numerically. Reference arrow pan and zoom buttons, map zoom/Fit, inspector width changes and the source viewport adjustment for bay inspection were exercised. No claim that a physical middle-mouse drag was separately automated in this proof; pan propagation is additionally covered by store tests. Different pane sizes show different extents at the same geographical scale.

## Editable bay proof

The existing Local contour precision UI selects indices 198–224, protects point 215 and uses strength 25. This is an additional small softening of the acceptance map's already refined bay. It is not a premium reconstruction or automatic improvement in reference fit. Original/proposed preview and Apply are actual editor controls; the existing algorithm is unchanged. The rest of the coast and all other 35 Areas remain exact; verifier checks all moved indices and protected neighbours.

The paired view makes the bay's blunt depth and long polygon edges easier to locate against the illustrated source. The modest smoothing does not add missing coves or prove greater overall geographic accuracy. No manually corrected coordinates, automatic tracing, generated assets or reference pixels enter the map.

UI Undo returns the initial PNG SHA-256 a85158eaba13008ec0da0f33b6cb3624a83422a819a655380ac18ec7ea737120. Redo restores a1c0e092fef350c700729426e5db705cd0c06704fb826cc373bffd1b42090c57. Both match the corresponding native captures exactly. The same after hash is produced by the ordinary Export PNG → Download PNG action, by the audit native renderer, and after database/archive reopening. The archive has zero image assets and no reference background/metadata.

## Screenshots

01: loaded reference without calibration. 02: first point pair in progress. 03: three valid pairs and residuals. 04: invalid coincident points. 05: Reference → Map. 06: Map → Reference. 07: Align Views. 08: editable Northreach with reference. 09: actual native export dialog and Preview without editor markers. 10: protected bay preview. 11: applied bay. Session reset after reopening is recorded separately.

All screenshots originate from the real App. Native PNG evidence is not screenshot output. Coordinates and transforms exist only in the editor session and audit report; the native map never serializes them. This is technical workflow acceptance, not a premium cartography claim or a measured human-time comparison.

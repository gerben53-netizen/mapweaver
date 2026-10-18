# Existing genuine native exports

These PNGs are byte-for-byte copies of actual Mapweaver **Export PNG → Download PNG** results from the refinement sprint at commit `e502a937f283be4c6e503b3603e28dc1fcae7c71`. They are not new exports or diagnostic SVG renders. Settings: 1625×1425, 1×, ARL OFF, no grid/scale bar, opaque background. This research opens no runtime or project database.

| Copy | Exact original path | SHA-256 |
|---|---|---|
| `organic-rugged-existing-native.png` | `docs/sprints/organic-land-brush-refinement/comparison/organic-rugged.png` | `392b91a8120eaa9654ad22c94204c7976e3d1dd146dbf4bcd43c385427c8bf3d` |
| `round-existing-native.png` | `docs/sprints/organic-land-brush-refinement/comparison/round.png` | `57d99d383144c3d1b15675d7161d08fdddaef8c6e012f3a6fcfa7c286d34ac6c` |

Hashes are checked against the original `projects/*-validation.json` before copying. The three sequential native Rugged operations reproduce the stored source project's geometry exactly (36 Areas, 720 nodes). Diagnostic Round-per-case trials share the individual Rugged case's initial geometry; the archived full Round UI export is the separate original Round sequence baseline. They must not be confused.

All images in `../visuals/` are separately labelled diagnostic plots. Existing prototype/refinement exports, project archives and original V3 data remain unchanged.

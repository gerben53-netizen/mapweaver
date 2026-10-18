# Native export provenance

`round.png`, `organic-soft.png`, `organic-rugged.png`, `organic-fine.png` and `combined.png` are actual **Export PNG → Download PNG** files from the real Mapweaver App at `http://127.0.0.1:49616/docs/sprints/organic-stroke-cap-refinement/reproduction/index.html`, using the existing isolated QA service at 49571. They were generated with the code now recorded in `e6d4d91`.

Settings: 1×, 1625×1425 map pixels, ARL OFF, no grid, no corner scale bar, opaque background. These files are not screenshots or script-generated stand-ins. The separately named `*-function.png` files are witnesses from the native renderer called by the QA parity harness; they do not replace the actual UI downloads. All five sets have identical SHA-256 across UI download, archive reload and database reload. Hashes and QA map identities are in `../projects/*-validation.json` and `../performance-results.json`.

`combined-restored.png` is a further actual UI download after a separate actual pointer gesture, Undo, Redo, final Undo and Save. It is byte-identical to the original `combined.png`. The gesture is excluded from the controlled trial.

The previous baseline images remain read-only in `docs/sprints/organic-land-brush-refinement/comparison/`. Comparison sheets only crop those genuine before/after PNGs at identical origin and scale. `../details/` files are explicitly labelled diagnostic geometry plots, not native exports. No export artwork is repainted or beautified.

Visual status: **REJECT** for this policy despite exact technical parity. No merge/push/package or Primary Development use.

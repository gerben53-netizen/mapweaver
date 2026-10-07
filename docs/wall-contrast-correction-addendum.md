# Premium Wall Contrast Correction — technical addendum

This is the binding technical supplement to `Premium-Wall-Contrast-Correction-Spec.zip`. The original artistic briefs remain unchanged. This addendum resolves anchors, revision/replacement identities, exact pack layout and reproducible native proofs. It covers exactly **33 components**: Pale Palace Stone 6, Marble 6, Natural Cave Rock 9, Refined Timber 6, Rustic/Heavy Timber 6. Living Root/Rough Stone KEEP and reference-only Sung Wood are outside this correction contract.

## Inventory and anchors

`component-contract.json` is derived from the actual registered definitions, original PNG headers and the audit inventory. Every source SHA-256 equals the audit hash. `registrationSource` names the authoritative registry input; role, physical dimensions, weights and defaults are binding.

All 33 use **normalized anchor (0.5, 0.5) on the entire PNG canvas**, not on its visible alpha bounding box. `pixel` gives the exact `(pixelWidth/2, pixelHeight/2)` in continuous image-edge coordinates. A 384×128 canvas is anchored at (192,64), not at the pixel-index midpoint (191.5,63.5). This comes directly from native `drawImage(...,-placement.width/2,-placement.height/2,placement.width,placement.height)`. Do not trim, pad, rescale or recenter artwork to its silhouette. Preserve exact canvas dimensions and existing alpha bounding rectangle/safe envelope. Safe bounds here bind the audit's actual nonzero-alpha envelope; they are not a newly invented inset/mask used by the runtime. Intrinsic painted pixels may change inside that envelope.

Masonry/linear terminal remainders may use `sourceFraction`: the source rectangle starts at x=0 and spans `naturalWidth×sourceFraction`, with full source height; that cropped rectangle is centred in its destination. Do not move edge details to another anchor to compensate. Source +X is horizontal, +Y down. Placement angles are radians, clockwise visually in Y-down Canvas coordinates; arbitrary rotation must remain lighting-neutral. No Generated Wall mirroring occurs in this draw path. Exact positions, positive destination widths/heights, source fractions and draw order are supplied; Work does not need to reproduce generator choices.

## Revision and replacement lifecycle

For **each of the five material IDs**, current revision is `production-1`, correction target is **`production-2`**. Material IDs, all 33 component IDs/roles, weights, physical dimensions, defaults, strategy, footprints and anchors stay stable. Only artwork bytes/hashes, image URLs and the new revision change. Generated Walls use an immutable bundled definition registry, not the normal stamp/fill-pattern ZIP importer or replace-in-place assets. `replacement-contract.json` records this explicitly.

The later Codex integration must retain the original `production-1` registration and PNG bytes; saved native walls store `wall.generated.id/revision` and keep resolving those historical bytes during load/export. Never silently relabel old walls as production-2. Corrected artwork supersedes new authoring choices, not saved document references. Placement-preserving explicit revision upgrades can be considered separately; no automatic migration is authorized.

Two **known later integration preflights** are binding: the current registry contains 15 definitions with a limit of 16; adding five requires capacity at least 20. The current `generatedWallChoices` predicate exposes every non-DEV/non-reference-only revision, so it does not automatically prefer the latest. Later integration must hide superseded production-1 from new authoring while still admitting an exact current/saved production-1 reference. Leave old immutable definitions intact; use selection policy rather than editing old bytes or definitions. No live registry, limit or picker change is made by this addendum.

## Exact Work ZIP layout

Return `Premium-Wall-Contrast-Corrected-Production-2.zip`, with no enclosing folder:

```text
manifest.json                         # replacement.schema.json
README.md                             # corrections, ownership/license, output commands
quality-review.json                   # one material review + 33 component reviews; KEEP/FIX/REJECT with reason
validation-results.json               # actual proof tool output, no hand-authored simulated shadow results
materials/
  pale-palace-stone/definition.json
  marble/definition.json
  natural-cave-rock/definition.json
  refined-timber/definition.json
  rustic-heavy-timber/definition.json
artwork/
  pale-palace-stone-production-2/<six exact filenames>.png
  marble-production-2/<six exact filenames>.png
  natural-cave-rock-production-2/<nine exact filenames>.png
  refined-timber-production-2/<six exact filenames>.png
  rustic-heavy-timber-production-2/<six exact filenames>.png
proofs/
  placements.json                     # exact supplied fixture, unchanged
  <materialId>/before/<context>-<zoom>-<shadow>.png
  <materialId>/after/<context>-<zoom>-<shadow>.png
```

For each material/side, contexts are `light`, `mid`, `dark`; zooms `100`, `75`, `50`; shadows `off`, `on`. Example pairing: `proofs/marble/before/light-50-on.png` and `proofs/marble/after/light-50-on.png`. Exactly 90 pairs / 180 primary proof PNGs. The composite fixture itself is the geometry proof: long/short straight, corner, broad/tighter curves, opening and endpoints at both widths. Optional environmental proof supplements must be separately labelled; do not replace the primary proofs.

The supplied `materials/*/definition.json` files are exact target definition templates. They are metadata only; no corrected production artwork is included or installed. Use the order in `replacement-example.json` and the binding schema. That example is complete and valid but explicitly `exampleOnly:true`, with unchanged source hashes and FIX statuses: it is **not** accepted corrected artwork. Set actual corrected hashes, actual producer/licensing/change provenance and reviewed statuses. Production acceptance requires `exampleOnly:false`, all 33 KEEP, five material KEEP, valid native proofs and later visual review. FIX/REJECT may document an incomplete return but must not be integrated as accepted content.

## Run proofs without Mapweaver

Requirements: Node.js 22+ and a modern Chromium browser with Canvas2D/PNG/crypto. **No Mapweaver application, backend, database, npm install or procedural generator is required.** The Node tool serves only the explicit image inputs and frozen harness resources on loopback and writes only isolated proof paths. It does not launch a browser automatically. Open the printed URL and click **Render proofs**; the page must end with PASS.

Extract this addendum ZIP. Have the 33 verified original source PNGs available under an originals directory with `<materialId>-production-1/<filename>.png`, matching `sourceIdentity` minus `/generated-walls/`. The originals are already available to the Work session that verified them; they are not duplicated here. The three exact floor PNGs are included because arbitrary substitute floors are prohibited.

From the addendum root:

```sh
# Stability run: unchanged originals on both sides; writes only isolated QA output.
node harness/serve.mjs --before ../original-generated-walls --after ../original-generated-walls --output ../unchanged-proof-output --dry-run --port 49326

# Real correction: manifest.json plus artwork/ already exist in the proposed output.
node harness/serve.mjs --before ../original-generated-walls --after ../work-output --output ../corrected-proof-output --port 49326
```

Run one server at a time; stop with Ctrl+C. Do not choose Mapweaver's development/service ports. After the real run, copy `corrected-proof-output/proofs/` and `validation-results.json` into the Work ZIP root, and copy the supplied `placements.json` to `proofs/placements.json`. Complete the README and quality review. Before ZIP creation:

```sh
node harness/validate-work.mjs --pack ../work-output
```

The portable validator checks current/source identities, component dimensions and 8-bit RGBA PNG headers/hashes, exact target definitions, complete proof geometry/names/resolutions and validation coverage. The browser run additionally decodes all 66 input images and enforces exact alpha bounds. JSON Schema validation is independently tested in the repository; a standard Draft-07 validator may also validate `manifest.json`. `--allow-example` is solely a technical dry-run option, never production approval. Final visual/alpha/metadata acceptance belongs to the later integration sprint.

## Exact floors, scale, camera and filtering

`floor-contexts.json` binds these originals by library ID and SHA-256; these library assets have no separate Generated Wall-style revision. Do not invent a revision or substitute visually similar imagery:

| Context | Library asset ID | Original |
|---|---|---|
| light | 20a7bf67-f532-4f35-a2f9-6d7933d7043c | stone-pale.png |
| mid | 310e7f7d-1da4-4054-bc4f-3a429787c30c | wood-natural.png |
| dark | 0f16b583-70e2-4c38-8ef8-30ffa30aaf4f | wood-heartwood.png |

All are 1254×1254; repeat scale is exactly 200/1254, with origin (0,0), opacity 1, source-over on white. The same 640×400 map, origin (0,0), 10 px/ft and seed-1 placement fixtures are used for every pair. Grid is not painted. Widths 10/20 map pixels = 1/2 ft. Material geometry/overhang differs by strategy; each set's exact BEFORE placement is frozen and reused AFTER.

100% means Canvas 640×400, transform scale 1. 75% means 480×300, transform .75. 50% means 320×200, transform .5. These are explicit output pixels, independent of display DPR/browser CSS zoom. They are native draws of the same cached 2× wall surfaces, not screenshots or post-resized PNGs. Individual source pixel/foot relationships and all destination scales are in the component/placement contracts. Standard Canvas2D `imageSmoothingEnabled:true`, `imageSmoothingQuality:'low'` (original audit default), sRGB, source-over. No sharpening, contrast enhancement, nearest-neighbour substitution or changed placements. PNG encoding metadata may differ across browsers, so determinism compares decoded RGBA SHA-256 as well as numeric pixel deltas; pair comparisons must use one Chromium build.

## Actual contact shadow

`harness/renderer.js` bundles the **actual unchanged** `composeGeneratedContactShadow` and `clipWallOpenings` modules. It does not approximate the shadow in Work. The fixed placement replayer follows the native cached surface assembly and matches the original audit. OFF bypasses only the shadow composition; bounds/padding/sampling stay identical. ON uses one native draw over the assembled alpha, not one shadow per component.

Binding settings: blur **2 map pixels**, padding **6 map pixels**, tone `rgba(20, 23, 20, 0.16)`, opacity .16, X/Y offsets 0. At surface ratio 2, Canvas `shadowBlur` is 4 raster pixels. The resulting surface scales with the final viewport/export transform; no extra constant screen-size radius is added. Softness/falloff is the browser's Canvas2D shadow algorithm; there is no custom curve or separate tunable softness parameter. Genuine opening exclusions are reapplied after blur with hitExtra = wall.strokeWidth×4. `contact-shadow.json` and `harness-integrity.json` identify the exact source/bundle. Do not manually render/strengthen shadows, add fixed light or use future Campfire lighting to pass these proofs.

## Evidence and boundaries

The packaged validation report must show 90 unchanged-artwork pairs pixel-identical, 66 exact decoded alpha checks, and 90 pixel-identical comparisons with the original audit. Those checks were performed using the isolated tool; no Primary Development project/asset data was written. `dry-run-validation.json` records the result and browser version. It validates reproducibility, **not** corrected visual quality.

Cross-browser Canvas shadow/colour implementations may differ; use the same Chromium build for both sides and record it. The original 10-px/ft, two-width, fixed-seed benchmark is intentionally bounded, not an exhaustive generator sweep. Original artistic correction instructions remain solely in the existing correction-spec ZIP and must not be edited by this tool. Do not change geometry, defaults, anchor, alpha bounds, component vocabulary, floor bytes/scale, Contact Shadow, registry or user maps. No correction candidates, new live revisions, installer, Campfire change or push belongs to this addendum.

## Repository reproducibility

Reusable source lives in `scripts/wall-contrast/`; renderer/fixture code imports the actual native modules. Build the standalone fixture/bundle with `node scripts/wall-contrast/build.mjs`, derive contracts/schema with `node scripts/wall-contrast/export-addendum.mjs`, then assemble the handoff with `node scripts/wall-contrast/package.mjs` after the successful dry run. Generated proof data/ZIP stay ignored. The schema is tracked and pins this exact five-set 33-component correction contract; it is not a generic replacement importer or a fork of any Campfire contract.

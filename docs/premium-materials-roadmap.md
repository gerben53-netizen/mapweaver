# Premium materials and wall families roadmap

Canonical target roadmap, audited 3 October 2026. This is a production plan, not a runtime registry or permission to replace saved resources. The [Premium quality standard](mapweaver-premium-asset-quality-standard.md) applies. Evidence and the standalone producer pack are generated under `deliverables.local/Premium-Materials-Requirements/` and are not committed.

## Current state and first delivery

The current local-library snapshot contains 594 assets, including 31 fill-pattern records: 27 surface images and four wall atlases. The renderer also has 32 immutable painterly terrain images, 11 classic procedural terrain styles and five procedural water appearances. Two authoring-template surfaces are instructional references. These sources have different intended scales; a cartographic terrain image is not automatically a physically scaled battlemap floor.

The first **ARTWORK READY** batch contains nine opaque seamless 2048 × 2048 PNGs, each describing a 20 × 20 ft tile:

| Stable proposed material ID | Dutch display name | Intent |
| --- | --- | --- |
| `premium.floor.v1.wood-pale` | Lichte houten vloer | Quiet pale interior timber |
| `premium.floor.v1.wood-natural` | Natuurlijke houten vloer | Medium natural timber |
| `premium.floor.v1.wood-worn` | Versleten houten vloer | Restrained wear, not dominant dark damage |
| `premium.floor.v1.wood-heartwood` | Kernhout- en wortelvloer | Grown floor fibers, distinct from sawn furniture |
| `premium.floor.v1.stone-pale` | Lichte stenen vloer | Neutral limestone slabs |
| `premium.floor.v1.stone-palace` | Paleisstenen vloer | Refined dressed construction |
| `premium.floor.v1.marble-neutral` | Marmeren vloer | Quiet veins, no simulated reflections |
| `premium.floor.v1.earth-restrained` | Rustige aarden vloer | Fine soil beneath objects |
| `premium.floor.v1.wood-parquet` | Paleisparket | Refined herringbone, no ornamental carpet |

These IDs identify production requirements, not existing library UUIDs or new manifest fields. Ordinary image import assigns asset identity by role/hash. Do not add a parallel material registry simply to preserve these proposed names.

At 10 map px/ft the repeat scale is `200 / 2048 = 0.09765625`. Fill-pattern packages support `patternScale` for newly selected Battlemap Texture Brush materials. It does **not** set an Area's scale: Area settings must explicitly use the same value. Do not invent world `defaultSize` for fill patterns; only native sizing is accepted. At another physical map scale use `(20 × pixelsPerFoot) / 2048`.

One seamless image per material is sufficient. Current Area fills support rotation/offsets and Repeat/Stretch; brush images use a fixed map origin without random tile variants. Require opposite-edge/corner continuity, 4 × 4 proofs and 40 × 30 / 60 × 40 ft proofs at canonical scale, then context comparison at 100/75/50% with premium furniture, production Living Root and normal soft contact shadow. Recognizable repeated knots, stains, clusters or a tonal checkerboard block Premium acceptance even when the PNG decodes successfully.

## Benchmark evidence and taxonomy

Both current PQA benchmarks reference `b64d2ea2-ebab-4a7f-bd9a-475b297251c6`, a 1254 × 1254 anonymous pale plank image at repeat scale 0.1, not a named parket asset. Its pale palette is usable but horizontal grain/board rhythms recur in the large repeat proof; name and physical tile scale are not specified. The older 1024 px textures often repeat ornate/speckled clusters and fall below the premium furniture/wall fidelity. The first batch therefore includes both a corrected pale timber floor and Premium Parket. Parket is an immediate palace capability gap, rather than a claim that the existing benchmark tile is parquet.

Use `Materialen → Vloeren → Hout / Steen / Natuurlijke bodem`; keep wall materials in a separate `Muren` branch. Map English Stone/Marble/Wood and Dutch Steen/Marmer/Hout to one semantic family, not separate parallel categories. Existing library names/categories remain untouched by this audit. Similar pale plank images have different hashes; visual similarity is not byte duplication. Preserve old references; adding corrected artwork creates a new asset/revision. No automatic map replacement or deactivation is authorized.

## Second floor batch

| Candidate | Decision |
| --- | --- |
| Donkere houten vloer | Optional after worn/natural floor review demonstrates a distinct use; not another dark palette merely to increase count |
| Ruwe kerkersteen | Next reusable stone floor; coarse construction must remain subordinate |
| Grotvloer | Next natural cave floor; not cave wall-top art |
| Bosvloer | Optional outdoor battlemap surface; keep leaf/root marks quiet |
| Gepolijste stenen vloer | Defer unless visually/functionally distinct from palace stone and marble |

World painterly terrain remains a separate cartographic collection. Its names or historical “premium” labels do not certify interior use. Any improved built-in image needs a new immutable texture ID and a corresponding registry integration; ordinary Area/Texture Brush fill artwork is already importable.

## Wall strategy and engineering gates

Living Root `production-1` is **KEEP** and the successful **bundle** reference. Its 28 component IDs, roles, nominal length/width ratios and weights are immutable inputs to deterministic placement on one native Wall. It supports curves, open/closed paths and linked openings. Production artwork must not be redesigned for this audit. Development `dev-1` remains compatibility-only. The registered continuous Living Root RC is a separate texture material, not the production component pack.

| Priority | Target | Existing capability | Gate and engineering outcome |
| --- | --- | --- | --- |
| 1 | Masonry: rough, pale, palace, marble | Masonry strip atlas, shared native path/openings; no individual stone course generator | **ENGINE REQUIRED** for generated courses. One masonry strategy and four data packs; freeze component roles, dimensions, scale/seed/joins and opening rules before commissioning consumable components |
| 2 | Rock / cave | Segment wall sets already place overlapping cluster variants | **BOTH**: compatible segment artwork is ready now; reuse segment placement first. Add large/medium/small physical sizing and corner/end/junction rules only if benchmark evidence requires it |
| 3 | Linear / timber | Timber strips and generic path-aligned textures | **ENGINE REQUIRED** for ordered beams/posts. Improved strip artwork is separately **ARTWORK READY**; no promise it becomes a structural generator |

Use existing native path geometry, physical scale, immutable definitions, deterministic seed, linked openings and render caches. Prefer one shared placement foundation with masonry/rock/linear policies over independent engines for each material. The current generated-definition validator accepts only `living-root`; a proposed name or component PNG cannot install a new generator. Continuous material channels offer coverage/textural variation and optional end/corner/tee/crossing/opening detail, not independently laid stones or beams.

Floor texture is never a substitute for wall-top structure. New masonry must show individual top-down stones defining the wall silhouette; cave components must show top-down rock masses without vertical cliff faces; linear components must show structural beams/posts without frontal plank walls. Do not assign exact future footprints or new metadata as supported fields before the engineering gate is closed. The producer pack includes exact current strip/segment footprints and Living Root references, explicitly separating production quality from development geometry.

## Installer policy

Keep production Living Root and the existing cartographic terrain available. The current installer seeds no interior fill pack; wall-set example URLs are exposed by the picker but their `public/wall-sets` directory is absent from the production content manifest. This is an engineering backlog item: remove unavailable development choices or ship licensed, approved production replacements before advertising them. Do not modify the installer during this audit.

Recommend the nine accepted, generic first-batch floors as standard content after visual approval, physical-scale proof and redistribution review. Masonry then follows as standard production packs, rock/timber as subsequent accepted families. Personal Eryndor textures, continuous RC artwork with unspecified license, instructional tiles and development atlases remain optional/private/development-only. AI/source notices are provenance, not an independent guarantee of copyright or redistribution rights; require a truthful producer grant and retain all third-party notices.

## Acceptance and preservation

Artwork acceptance is distinct from importer validation. Record KEEP/FIX/REPLACE/REJECT/DUPLICATE per source, compare large-area proofs, and apply at most one targeted correction to a new candidate before rejecting it. Review 40 × 30 ft minimum and 60 × 40 ft stress scenes, then native renderer proof before adding defaults. Never overwrite immutable revisions, rename/delete old references or reset user data. This roadmap changes documentation only.

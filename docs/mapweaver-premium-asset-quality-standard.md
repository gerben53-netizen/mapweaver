Mapweaver Premium Asset Quality Standard
Status: Canonical quality standard for premium Mapweaver asset packs
Scope: Battlemap stamps and semantic assets
Canonical battlemap scale: 50 px = 5 ft / 10 px = 1 ft
1. Purpose
This document defines the minimum visual, semantic and technical quality required for an asset to be accepted as a Premium Mapweaver Asset.
The objective is not merely to create attractive isolated PNGs. Premium assets must combine into a battlemap that reads as one professionally illustrated environment at normal editor and Roll20 play zoom, rather than as a collection of unrelated images placed on a floor texture.
These rules are mandatory when commissioning or generating a premium asset pack. An asset that fails the semantic or visual acceptance criteria must not be included merely to complete a requested asset count.
2. Core quality principles
2.1 Immediate semantic readability
A semantic asset must be recognisable without its filename, tooltip or category label.
At normal battlemap zoom, a viewer should generally be able to identify the object within approximately one second.
Examples:
- a bookshelf must visibly contain shelves/books/scrolls;
- a cabinet must visibly read as storage through doors, drawers, shelves or contents;
- a workbench must show a usable work surface and appropriate functional detail;
- a bed must visibly contain a sleeping surface, bedding and/or pillows;
- a forge must visibly contain the forge/firebox/anvil or other unmistakable smithing features.
Decorative motifs do not substitute for functional information. A brown curved shape with leaf decoration is not an acceptable premium bookshelf unless it actually reads as a bookshelf.
2.2 Silhouette first
The broad silhouette must remain useful when fine detail disappears at lower zoom.
Test the asset at typical Roll20 play size. The object category should remain legible even if individual books, papers, herbs or tools are no longer distinguishable.
2.3 Function before ornament
Visual hierarchy should normally be:
silhouette → material → function → secondary detail → ornament
For Eryndor, leaves, vines and organic carving can reinforce the setting, but may not be used to disguise an otherwise generic or semantically unclear object.
2.4 Scene cohesion
A premium asset must look credible beside other premium assets from the same environment.
Reject assets that are individually attractive but visibly belong to a simpler, flatter, more cartoon-like or otherwise incompatible illustration style.
3. Camera and projection
Premium battlemap assets must be authored for true 90° top-down / orthographic use.
Required:
- no baked perspective;
- no pseudo-isometric front faces unless genuinely visible from above;
- no camera tilt;
- no directional scene lighting baked into the object;
- no long cast shadows.
Subtle, direction-independent internal shading or ambient/contact shading may be present when needed to communicate form, but it must remain valid after rotation and mirroring.
Mapweaver may add scene-level soft shadow separately. Source stamps must therefore remain lighting-neutral.
4. Material fidelity
Materials must be visually distinguishable.
Examples:
- living wood must not read like sawn furniture timber;
- furniture timber must show appropriate grain and construction;
- stone must read as stone rather than a flat grey/brown fill;
- metal must have enough tonal/material information to read as metal;
- cloth, paper, leather, food and vegetation must have distinct surface character.
Large uniform colour fields should be avoided unless physically appropriate.
For Eryndor specifically:
living/grown wood ≠ manufactured furniture wood.
Organic furniture may be grown or root-shaped, but its actual function must remain immediately readable.
5. Internal detail density
Use enough internal detail to communicate the object at the canonical scale, but do not fill every asset with decorative clutter.
Detail must be purposeful.
Good detail examples:
- varied book spines in a bookshelf;
- shelves and empty compartments;
- handles and drawers on cabinetry;
- tools on a workbench;
- bowls/ingredients on a preparation surface;
- folded fabric on linen storage;
- joints, grain and wear on furniture.
Avoid meaningless micro-noise, repetitive decorative lines, oversized ornamental motifs replacing functional detail, and detail that only works far above normal map zoom.
6. Premium rendering style
Premium assets should favour a painted/semi-realistic fantasy battlemap style over a flat icon/vector appearance.
Prefer nuanced local colour variation, material texture, organic imperfections, restrained edge definition, natural variation in shape, believable construction/growth, and sufficient tonal separation to remain readable on a map.
Avoid heavy uniform black outlines, large flat colour areas, perfectly sterile geometry unless required, clip-art appearance, and iconographic simplification inconsistent with the premium pack.
7. Clean and dressed variants
For high-use furniture, prefer a reusable clean base asset plus one or more dressed variants.
Example:
- Preparation Table — Clean
- Preparation Table — Vegetables
- Preparation Table — Baking
- Preparation Table — Meat
- Preparation Table — Messy
This prevents visible repetition and allows scenes to be composed naturally.
8. Semantic asset classes
Where metadata supports it, classify assets by functional behaviour.
Suggested classes:
- furniture
- large_fixture
- floor_fixture
- tabletop_prop
- storage
- decoration
- floor_decal
- vegetation
Examples: desk → furniture; oven → large_fixture; cooking hearth → floor_fixture; cheese board → tabletop_prop; rug → floor_decal.
9. Soft-shadow compatibility
Premium physical stamps should be compatible with Mapweaver's directionless soft contact shadow.
Required:
- clean alpha silhouette;
- no opaque background;
- no large transparent padding without reason;
- no baked directional cast shadow;
- no coloured halo around alpha edges.
Recommended defaults:
- physical furniture/fixtures: softShadowDefault: true;
- rugs, stains, floor decals and painted markings: softShadowDefault: false.
10. Alpha and edge quality
Reject white halos, dark matte fringes, coloured edge contamination, jagged unintended alpha boundaries, accidental opaque pixels, and excessive empty transparent bounds.
Organic foliage and fine roots may use softer alpha where appropriate, but must remain clean on both light and dark floors.
11. Scale and metadata
All assets must respect the canonical battlemap scale:
10 px = 1 ft.
The intended physical footprint must be explicitly defined in metadata rather than inferred from PNG dimensions alone.
Scale should reflect real functional use. When an object cannot remain readable at plausible physical size, redesign the asset rather than silently increasing its world-space size.
12. Variation and repetition
Repeated use must not immediately expose copy/paste patterns.
For frequently repeated objects, provide meaningful variants where useful: different contents, clean/dressed states, modest silhouette variation, alternate arrangement, or subtle material variation.
Do not create fake variety merely by rotating an asset when its internal contents make repetition obvious.
13. Pack cohesion
Assets within one premium pack must share comparable rendering fidelity, compatible colour treatment, comparable edge treatment, consistent top-down projection, compatible material rendering, appropriate relative scale, and similar detail density at play zoom.
Do not include low-fidelity filler assets merely to increase pack size.
14. Required visual tests
14.1 Silhouette test
View at reduced/play size. Can the object category still be recognised?
14.2 Function test
Hide filename and metadata. Can a viewer identify what this object does within approximately one second?
14.3 Fidelity test
Place the candidate beside established premium reference assets. Do they look as though they belong to the same professionally illustrated asset pack?
14.4 Context test
Place the asset in a real 40×30 ft test room with premium floor, premium walls, several other premium stamps, normal Mapweaver scale, and soft shadow where appropriate.
Review at 100%, 50%, normal editor zoom, and typical Roll20 play zoom.
An asset that only looks good as a large isolated PNG is not premium-ready.
15. Quality classification
KEEP / PREMIUM
Meets the standard and can ship.
FIX
Core artwork is strong, but one targeted correction is required, e.g. alpha cleanup, scale correction, excessive contrast, minor material mismatch, insufficient detail, or metadata correction.
REPLACE
Fundamentally fails semantic readability, rendering fidelity or pack cohesion.
Examples: bookshelf that does not visibly read as a bookshelf; furniture represented mainly by a flat brown shape and decorative motif; strongly cartoon/vector asset inside a painted premium pack; incorrect perspective that cannot be cleanly corrected.
16. One-correction rule
For newly generated premium assets:
1. create candidate;
2. run visual/context proof;
3. if insufficient, perform at most one targeted correction;
4. if still insufficient, reject and generate/design a new candidate.
17. Reference quality tiers
- <60% — Legacy / insufficient: functional but visually simplified, unclear or inconsistent.
- 60–75% — Standard production: usable and recognisable, but visibly below premium reference quality.
- 75–85% — Premium-ready candidate: strong semantic readability and material quality; suitable after context validation.
- 85–90% — Premium production quality: rich, coherent, immediately readable and convincing in a finished battlemap.
- 90%+ — Target fidelity: at normal Roll20 zoom the scene approaches one professionally illustrated environment rather than an assembly of editor assets.
The target is not pixel-identical reproduction of AI reference art. True 90° top-down readability and reusable editor assets remain requirements.
18. Pack acceptance criteria
A premium asset pack is accepted only when:
1. all semantic assets pass the function test;
2. all assets are true top-down and lighting-neutral;
3. materials are readable and appropriately differentiated;
4. alpha edges are clean;
5. scale metadata is correct;
6. pack style is internally coherent;
7. weak filler assets have been removed rather than shipped;
8. high-use furniture has useful variation where appropriate;
9. assets have been tested in a representative room;
10. typical Roll20 zoom remains readable;
11. physical assets work with Mapweaver soft shadow;
12. the pack reaches at least premium-ready quality as a whole.
19. Recommended deliverables for an asset-pack assignment
Require:
- final PNG assets;
- Mapweaver metadata;
- intended world-space dimensions;
- semantic category;
- soft-shadow default;
- clean/dressed variant relationships;
- contact sheet of all assets;
- representative 40×30 ft scene proof;
- proof at typical Roll20 zoom;
- KEEP / FIX / REJECT review result for each candidate;
- list of rejected candidates (do not import them).
20. Final rule
Do not judge premium assets by how attractive they look in isolation. Judge them by how clearly they communicate their function and how convincingly they combine into a finished Mapweaver battlemap.

## Stamp families

Varianten van één semantisch object moeten dezelfde footprint, gecentreerde anchor, canvasafmetingen, functioneel silhouet, neutrale verlichting en art direction delen. Variatie verandert inhoud, niet plaatsingsgeometrie. Nieuwe pixels vereisen een nieuwe variant-ID. Zie [familie-authoring](stamp-importer.md#stamp-families-en-varianten). Deze mogelijkheid voert geen automatische REPLACE-consolidatie uit.

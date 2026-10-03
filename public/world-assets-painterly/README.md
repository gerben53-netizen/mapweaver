# Painterly World

46 transparent atlas stamps in eight collections. Import `mapweaver-world-painterly.zip`
through **Asset library → Import assets**, then choose **Painterly Fantasy** when
generating a World map. Regional maps can place these stamps manually.

| Collection | Images |
| --- | ---: |
| Mountains | 10 |
| Snow & Alpine | 5 |
| Broadleaf Forest | 9 |
| Conifer Forest | 6 |
| Swamp | 5 |
| Hills & Rocks | 6 |
| Volcanic | 4 |
| Landmarks | 1 |

Art direction: elevated oblique fantasy-atlas miniatures, northwest light,
cool southeast shadows, muted limestone/slate, olive/moss greens, warm dry ochres
and restrained volcanic orange. Dense, edge and sparse forest silhouettes are
separate artwork. Snow mountains have exposed dark rock and snow-filled gullies.
Assets were individually generated with the built-in imagegen tool, without
third-party reference images; see `provenance.json` and `LICENSE.txt`.

Forty-five terrain assets use the existing version-1 generator schema, including
semantic type, roles, biomes, `painterlyFantasy` theme, positive weight, scale
within their declared hierarchy-tier bounds, rotation disabled and bounded spacing. The product theme ID is
`world.painterlyFantasy`. The optional tower is a manually placed stamp, not a
new generator semantic type or a Smart Marker replacement. Peaks and active
volcanoes have lower selection weights. Generated placements retain their
existing map-scale calculation; manual defaults are intentionally symbolic
atlas widths, not the physical diameter of an individual tree or tower.

The original 42 sources remain 512 × 384 RGBA. New support sources are 384 × 256; new detail sources have a longest edge of 256 pixels. Original artwork is retained locally under
`.qa.local/world-asset-quality/sources/` and `.qa.local/asset-hierarchy/sources/`; package construction downsamples with
aspect ratio preserved and transparent padding. No vector artwork or painted
detail is substituted by the packaging script. Normalized images support the
small stamps in Velanth's 1× and 2× exports; greatly enlarging a stamp can still
expose raster resolution. The pack has fewer variants than the sprint's suggested
counts. Tropical forests and a complete settlement/landmark family are not included.

The old Engraved family remains separate. Importing this pack does not automatically
change existing projects. Use native asset replacement or theme application
explicitly; the benchmark copy was remapped separately with transforms preserved.

Repackage retained sources with `node scripts/package-painterly-assets.mjs`.
Metadata, hashes, transparency, semantic queries and ZIP roundtrips are checked by
`npm run test:service -- service/painterlyAssets.test.ts`.

## Hierarchy edition

46 images: 7 hero, 13 primary, 16 support, 9 detail, and one manual tower. Four new sources add a frost detail tree, open broadleaf fringe, low diagonal ridge connector and alpine scree. The original 42 image bytes and paths are unchanged. `hierarchy-catalog.png` labels every tier. Full prompts and new source hashes are in `hierarchy-prompts.json` and `hierarchy-provenance.json`; original provenance and licensing remain applicable.

Import normally for a new library; choose Overwrite to upgrade existing generator metadata without replacing image identities. Keep deliberately retains earlier metadata. Choose Painterly Fantasy for generation and adjust Mountains/Forests/Details density. Existing maps remain unchanged. Metadata is editable through Asset Library → Generator metadata, including Visual hierarchy, Lighting and Authored ridge direction.

Heroes are globally capped and not repeated per source. High density adds support/detail first. Upright artwork remains upright; ridge direction guides source selection. There is no tropical-family fallback into temperate vegetation. Some small/dense regions cannot accommodate every tier within existing footprint/count limits.

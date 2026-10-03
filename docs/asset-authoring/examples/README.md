# Complete example ZIPs

**REQUIRED:** import these ZIPs through Asset library, not Open project. Their root manifests and image bytes are tested against the current runtime. **OPTIONAL:** unzip to inspect the complete JSON. **RECOMMENDED:** copy a template rather than editing examples in place.

| ZIP | Contents |
| --- | --- |
| [minimal-stamp-pack.zip](minimal-stamp-pack.zip) | Original desk with 5 ft width, category, collection, provenance and checksum |
| [minimal-fill-pattern-pack.zip](minimal-fill-pattern-pack.zip) | Neutral periodic diagnostic Area tile |
| [minimal-terrain-texture-pack.zip](minimal-terrain-texture-pack.zip) | Green terrain Area tile; **not Terrain Brush compatible** because custom brush images are unsupported |
| [generator-ready-world-pack.zip](generator-ready-world-pack.zip) | Real Engraved mountain + forest metadata/images, explicit categories and subset collection |
| [painterly-real-example.zip](painterly-real-example.zip) | One unchanged image/entry from the real Painterly pack with its usage notice |

The first four ZIPs reproduce their corresponding [template folders](../templates). The Painterly provenance record is copied in [painterly-provenance.json](painterly-provenance.json); it covers the original full pack, not just this subset. Original complete packs: [Engraved](../../../public/world-assets/mapweaver-assets.json) and [Painterly](../../../public/world-assets-painterly/mapweaver-assets.json).

Example images are instructional; the tile examples demonstrate packaging and scale rather than a premium material art standard. See [validation](../validation.md) to regenerate or test them. Do not keep example license/author claims when replacing artwork with unrelated images.

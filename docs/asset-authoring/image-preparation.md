# Image preparation

## REQUIRED runtime rules

Images must decode as single-frame PNG, JPEG or WebP, with matching encoded/decoded dimensions. Animated/multipage images are rejected. SVG, GIF, TIFF and AVIF are not asset import formats; rasterize authoring SVGs first. Extra SVG sources may travel as ignored ZIP resources, never as the referenced asset image.

Each image must be nonempty, ≤20 MiB, 1–8,192 pixels on each axis and ≤24,000,000 pixels total. The service checks actual bytes, not just filename extension. It decodes with Sharp, applies EXIF orientation for dimensions and thumbnail generation, and hashes the original bytes. A malformed header, decoder warning/error or dimension mismatch can reject an image. A valid image's extension should describe its format even though content detection is authoritative.

There is no specific enforced color profile, PNG bit depth, power-of-two size, square aspect, minimum alpha margin or alpha-channel requirement. Do not confuse recommendations below with validation.

## RECOMMENDED production preparation

Use sRGB, 8-bit channels and PNG RGBA for predictable transparent artwork. JPEG cannot preserve alpha. WebP transparency is supported, but inspect compression artifacts. Flatten unwanted editor layers, not intended transparency. Render vector sources at the resolution needed for intended placement/export.

Crop to the visible artwork with a small transparent safety margin so strokes/shadows are not clipped. Avoid vast invisible borders: scale and generator spacing use the entire image rectangle. Do not bake in the editor grid or selection handles. Avoid map labels unless text is intentionally part of the object. Keep perspective, light direction, shadow softness, palette and outline weight consistent across a family. Decide whether to bake a subtle shadow or use map-object effects; avoid doubling both.

Check cutouts on light, dark and saturated backgrounds for colored fringes. Use several variants where repeated symbols otherwise look stamped. Evaluate both at working zoom and the intended export scale. Huge source resolution does not improve a symbol rendered at a few pixels.

## Stamp checklist — RECOMMENDED

- Clean transparency where needed; no unwanted matte or rectangular background.
- Tight crop with unclipped edges/shadow and no large invisible margin.
- No grid, guides, unintended words or watermarks.
- Consistent perspective, palette, light direction and visual scale.
- Deliberate native/grid/world default; verify against actual map settings.
- Useful title, category, tags, applicability and collection.
- Source/author/license accurately recorded; third-party notices retained separately.
- Generator metadata only where appropriate; check [generator checklist](generator-metadata.md).
- Repeat import and export smoke check; visual check after placement.

For surfaces use the separate [fill-pattern](fill-patterns.md) and [terrain](terrain-textures.md) checklists. **OPTIONAL:** include authoring source files as ZIP extras, within limits; retain an original distribution copy because import/export does not preserve extras.

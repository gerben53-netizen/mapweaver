# Fill patterns

**REQUIRED:** use manifest `type: "fillPattern"`, with a valid PNG/JPEG/WebP. A fill pattern is an image sampled inside an editable Area; a stamp is a separately placed image object. **OPTIONAL:** use the same file once in each role; metadata remains independent. Alpha is supported and reveals underlying map content. An opaque image is valid too.

The entry supports the ordinary category, collection, map applicability and provenance fields. It does not support generator metadata or non-native defaultSize. **RECOMMENDED:** omit defaultSize for patterns. Optional `patternScale` (finite 0.01–100) initializes the Battlemap Texture Brush repeat scale when choosing this library material. It does not change existing paint or Area defaults. Rotation/offset and `tileSize`/brush presets remain map/tool settings, not package fields.

## Pattern behavior on an Area

**OPTIONAL map controls:** Repeat tiles the image; Stretch fits one image to the retained Area frame. Repeat scale, rotation and offsets are retained when switching modes. Defaults are repeat, scale 1, rotation 0, offsets 0, opacity 1. The Area retains its pattern frame/transform; its local origin is initialized with its creation frame, rather than the screen or pointer. Editing its boundary does not deliberately restart the pattern. Pattern rotation and offsets move the sampled texture relative to that frame; moving an object carries its pattern. View zoom and PNG export scale do not change logical tile size.

**REQUIRED range for object repeat scale:** 0.01–100 inclusive, fractional values supported. Rotation accepts finite degrees and normalizes them; offsets are finite within ±1e9 logical pixels; opacity is 0–1. These are map validation rules, not package fields.

| Scale | 128 px source tile | Effect |
| --- | --- | --- |
| 0.5 | 64 logical px | Half-size tile, twice as many repeats along each axis |
| 1.0 | 128 logical px | Native image size |
| 2.0 | 256 logical px | Double-size tile, half as many repeats along each axis |

**RECOMMENDED:** start between 0.25 and 4, then inspect at working zoom. Very small scale loses detail/aliases; large scale exposes source pixels. Native CanvasPattern repetition does not create an object per tile. Nevertheless, huge source images consume decoder/cache memory, and complex Area geometry still costs rendering time. Stretch disables the repeat-scale control and fits the stored frame.

## Repeat-safe authoring checklist — RECOMMENDED

- Test a 3 × 3 tiled preview; left/right and top/bottom edges must join, including corners.
- Avoid recognizable repeated objects and large diagonal stripes. Vary detail without a dominant repeated landmark.
- Prefer even material lighting; baked spotlights or strong edge shadows make a checkerboard.
- Match detail frequency to world/regional or battlemap scale. Inspect 0.5, 1 and 2 in Mapweaver.
- Use sufficient source resolution for the intended largest tile, rather than maximizing dimensions by default.
- For alpha textures, check both light and dark backgrounds and avoid matte-colored edge halos.
- Keep color/palette consistent with adjoining materials; record source and license.

Complete example: [fill template](templates/minimal-fill-pattern-pack/mapweaver-assets.json). The terrain version is the same asset mechanism, not another role.

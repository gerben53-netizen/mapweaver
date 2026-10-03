# Generator-aware terrain stamps

First import a semantic world asset pack through **Asset library**. The bundled [Mapweaver Engraved pack](../public/world-assets/mapweaver-world-engraved.zip) provides a compact genericFantasy family. See [generator assets](generator-assets.md) for metadata and default sizes.

Create a World map and choose **Generate world map…**. Under **Terrain stamps**, choose Off, Low, Medium or High independently for Mountain chains, Forest clusters, and Hills, rocks and wetlands. All default to Off, preserving the existing terrain-only workflow. Choose the asset family matching your library. Unsupported/missing combinations are skipped with a placement note; no pack is silently imported.

**Generate preview** and **Regenerate preview** are disposable. They include enabled stamps and report the count, skipped families and limits. A changed setting requires regeneration before Create. Cancel leaves the current project and campaign unchanged. Preview has a 15-second deadline, including library preparation.

**Create generated map** saves a new editable map. The terrain stamps are normal selectable objects on a few named layers within Generated World. Undo removes the initial stamp pass; Redo restores it. Move, resize, rotate, delete or relayer individual stamps normally. Save and portable `.mapweaver` export embed the required images; PNG renders normal native objects. Renaming a layer does not remove provenance.

Mountains follow local elevation ridges; snow/cold highlands request snow assets. Peaks favor larger allowed scales and foothills favor smaller ones. Forests follow biome masks with fewer symbols at boundaries and patches in the interior. Swamp vegetation stays in wetland masks. Rocks are sparse in suitable uplands/arid terrain. The current geography generator does not classify volcanic terrain, so regular worlds intentionally have no volcanoes; explicit volcanic terrain providers are supported by the engine.

Spacing permits modest visual overlap but avoids near-identical centres. Whole stamp rectangles remain on land. Conservative footprint exclusions protect lakes, rivers, map edges and existing Place markers. These rules may leave narrow mountain ranges or small islands undecorated. This is a fantasy illustration heuristic, not a tectonic model or alpha-perfect collision engine.

Counts are based on the fixed logical terrain field, not raw pixels. Caps are 180 mountain/volcanic stamps, 240 forest clusters and 120 hill/rock/swamp details. Reaching a cap is reported. Assets retain their physical default footprints and declared scale/rotation limits; sources too large/small for the current world scale are skipped with a note. Change map scale or library defaults when necessary. Upright artwork stays upright.

Given the same engine, seed, terrain, settings and asset IDs/metadata, selection and placement are deterministic. Library edits can change later generation; they never alter an already saved map. The stored fingerprint and per-object ownership identify the original pass, but do not restore missing historical library metadata. Selective regeneration is a later feature.

No river styling, visual effects, borders, automatic labels or theme-wide appearance changes are part of this sprint. See [ADR 0029](adr/0029-generator-aware-world-scatter.md) and the [validation report](sprints/generator-scatter-report.md).

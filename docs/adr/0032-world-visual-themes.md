# ADR 0032 — World visual themes and field ownership

Status: accepted for Sprint F, 2026-09-25.

## Decision

`src/domain/worldThemes.ts` is the central registry for five stable, built-in World/Regional themes. Presets compose the existing terrain, coast, water, river, effects, border, font and cartographic registries. There is no theme editor, remote resource dependency, renderer-specific theme branch, or automatic labeling.

Rendering continues to use direct document values. Optional format-12 `map.theme` contains `{version:1,id,map,managed}`. `map` maps managed map-property paths to fingerprints; `managed` maps object IDs to the equivalent path/fingerprint records. Fingerprints are two deterministic 32-bit accumulators over the last applied JSON value, encoded as 16 hexadecimal digits. They are comparison markers, not security hashes or embedded theme definitions. Object and map ownership have separate namespaces.

An ordinary switch updates a field only if it still equals its previous theme fingerprint. Changing a field through any existing Properties editor automatically makes it an override. Reset updates visual fields regardless of fingerprints. First application explicitly initializes semantic visual styles; existing annotations require opt-in. Once adopted, annotations follow later switches without repeated opt-in. Newly created annotations register matching theme defaults. A removed optional style is retained as an override. Hidden and locked objects, imported Fill Patterns, textured rivers and marker symbols remain untouched. First application and Reset never change geometry, text, IDs, physical scale, semantic classifications, layer/group membership or generation provenance.

Label metrics are recalculated around the existing anchor after font changes; linked offsets are reconciled without moving the text anchor. River paint bounds can change, but nodes, handles, taper, width references, direction and smoothing remain unchanged. Minimal Political reduces managed semantic stamp opacity to 0.18 instead of deleting stamps; generating with that theme initially disables scatter.

Terrain appearance gains optional validated six-digit `color`, overriding the registered base color in the shared painter. Existing terrain styles and textures remain the source of terrain behavior. This lets themes retain recognizably different biome palettes without a filter or multiplying low-level preset IDs.

Unknown theme IDs load as Custom and retain direct visual values. Unknown ownership versions, malformed paths/fingerprints and oversized ownership records are rejected. Maps with no `theme` remain unchanged. The current format version stays 12, consistent with the optional fields from Sprints A–E; old application binaries are not promised support for these additional fields.

## Applying and resolving assets

`applyWorldTheme` is pure and produces a complete proposed snapshot. Metadata candidates come from the existing local generator queries. Replacements require matching semantic type, overlapping roles, compatible biome, the exact target family, and map applicability. Stable object-ID-based weighted selection makes remapping deterministic independent of candidate order. Position, dimensions, scale, orientation and object identity remain unchanged. A missing family keeps the original image and reports a warning; there is no filename inference or implicit scatter regeneration.

`projects/applyTheme.ts` prepares only needed replacement resources using existing project asset adoption and collision handling. It checks image budgets, document identity, asset-context generation and active edits before one history transaction. Failures leave the map unchanged. Old resources remain reachable by undo/redo. Generation provenance intentionally records original generation; it is not rewritten as if the world were regenerated.

Generator theme selection filters the candidate family before the existing scatter fallback algorithm, then applies style defaults to its output. The preview uses the shared export scene painter. Assets missing from the library are reported rather than substituted from unrelated visual families.

## Consequences and boundaries

Direct values make export and unknown-theme fallback independent of registry availability. Ownership has bounded metadata overhead, subject to the existing document/history budget. Returning a field exactly to its last themed value resumes inheritance. There is no separate "lock this identical value" state.

Existing arbitrary Area styling without semantic land metadata and stamps without available generator metadata are not guessed. Custom terrain uses its explicit appearance style as a semantic hint. Asset ID collisions or detached imported copies can lose the link to library semantic metadata; their images are retained. Themes ship no new art packs: Painterly/Parchment/Dark replacements require matching local assets, while Minimal/Elven use the existing generic family.

Sprint G should consume `themeText` role defaults and use ordinary label creation/ownership registration. It must not infer label identity from the displayed name, regenerate geography, or conflate theme switching with label placement.

# World-map visual themes

Open **Map → Visual theme → Choose visual theme** on a World or Regional map. Select a preview card, review the options, then **Apply theme**. Choosing a card or Cancel does not change the map. Apply is one Undo/Redo action.

Existing maps show **Custom** until you apply a theme. The first application sets semantic terrain, water, river paint and map effects. Subsequent switches preserve manually changed fields by default. Choose **Reset visual properties to theme defaults** to reset those visual fields; content and geometry remain intact. Use the separate checkbox to adopt existing labels and map elements. Already-managed elements follow subsequent switches. New labels and elements start with theme defaults.

Semantic stamp replacement uses local asset metadata, preserving placement and dimensions. If an appropriate family is missing, images remain and a note explains it. Uncheck replacement to apply without querying the library. Imported Fill Patterns, textured rivers, hidden/locked objects and marker symbols keep their appearance. Themes do not create labels or rebuild the world.

**Generate world map → Visual style** chooses a theme before generation. Scatter uses that theme's family; Minimal Political starts with scatter off. The previous generator appearance remains available as **Current generator style**. Preview remains disposable until **Create generated map**.

## Exact preset composition

| Theme ID | Water | Coast | River | Asset family | Label / title font | Title | Compass, legend, scale bar, info panel | Frame |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `world.painterlyFantasy` | `calm` | `fantasy` | `fantasyRiver` | `painterlyFantasy` | `ebgaramond` / `cinzel` | `fantasy` | `ornate` | `border.fantasyOrnate` |
| `world.classicParchment` | `parchment` | `parchment` | `parchmentRiver` | `parchment` | `imfellenglish` / same | `scroll` | `parchment` | `border.parchment` |
| `world.darkFantasy` | `dark` | `contrast` | `darkWater` | `darkFantasy` | `spectral` / `cinzel` | `plaque` | `ornate` | `border.darkOrnamental` |
| `world.minimalPolitical` | `minimal` | `minimal` | `minimalRiver` | `genericFantasy` | `sourcesans3` / same | `simple` | `minimal` | `border.minimal` |
| `world.elvenElegant` | `calm` | `fantasy` | `brightWater` | `genericFantasy` | `cormorantgaramond` / `cinzel` | `cartouche` | `ornate` | `border.elven` |

Every theme maps generic land → `land`, grassland → `grassland`, forest → `forest`, desert → `desert`, tundra → `tundra`, snow → `snow`, swamp → `swamp`, rocky upland/mountains → `rocky`, volcanic → `volcanic`, coast → `shallow`, and ocean → `ocean`. The theme supplies a distinct eleven-color palette to these existing texture presets. Exact colors, label inks and all numeric values are centralized in [worldThemes.ts](../src/domain/worldThemes.ts).

| Theme | Terrain texture / feather px | Vignette | Fog | Semantic stamp effects |
| --- | --- | --- | --- | --- |
| Painterly Fantasy | .25 / 3 | `vignette.subtleDark`, .22 | off | `shadow.softTerrain` |
| Classic Parchment | .12 / 1 | `vignette.parchmentEdge`, .32 | off | off |
| Dark Fantasy | .17 / 3 | `vignette.dramaticDark`, .30 | `fog.coldMist`, .10 opacity | `shadow.softTerrain` |
| Minimal Political | 0 / 0 | off | off | off; managed stamps .18 opacity |
| Elven / Elegant Fantasy | .10 / 2 | `vignette.parchmentEdge`, .16 | off | `glow.arcane`, .12 opacity / 4px radius |

Landmass feather is zero; the coast preset paints its shoreline. Existing river widths and smoothing are preserved even when selecting the Minimal theme. Region/city/title labels use bold, water labels italic and water ink, marker/legend defaults regular; font sizes and text stay intact on theme application.

Built-in themes are immutable choices, but individual Properties remain editable. Bundled example artwork includes genericFantasy and painterlyFantasy. Rich miniature previews use the real renderer and canonical geography. Separate Parchment/Dark families still require compatible local library assets; those samples explicitly retain engraved stamps. Unknown theme references reopen as Custom with the last stored appearance intact.

See [ADR 0032](adr/0032-world-visual-themes.md) for persistence and [Sprint F report](sprints/world-themes-report.md) for validation and screenshots.

## New Map and rich previews

New Map chooses the visual theme before creation. World and Regional default to Painterly Fantasy; Battlemap retains its neutral background without unsupported world themes. Blank maps receive their complete style before saving. Generate world carries the selection into the existing disposable generator preview, including asset-family filtering before scatter. Theme changes in that preview require regeneration. Existing projects are never silently restyled.

The same keyboard-accessible rich cards are used in New Map and Visual Theme. They render one canonical miniature through actual terrain, water, river, annotation, effects and frame painters, then cache static images for the session. Preview artwork is illustrative; it does not install stamps or alter the user's library. See [ADR 0045](adr/0045-new-map-themes-and-previews.md) and the [delivery report](sprints/new-map-themes.md) for resource boundaries, scope gaps, validation and screenshots.

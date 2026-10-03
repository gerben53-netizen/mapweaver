# Game Cartography Visual Personality — delivery report

## Direction and acceptance

Keep Mapweaver's dark, canvas-first editor and all existing workflows. Warm its graphite surfaces, retain muted teal for interaction, and use a small brass signature for cartographic identity. Success means clearer tools and grouping, a calm creative-workstation feel, distinct keyboard focus, unchanged map data, usable 1280×720 and large-desktop layouts, six matching before/after views, passing targeted checks and no external actions.

The result keeps the current navigation, tool order, panel widths, inspector tabs, modal sequence, numeric precision and information architecture. No map renderer, project format, history, asset storage or export logic changed. The working branch remains the existing `develop`.

## Shared theme tokens and palette

All new personality colors are centralized in `src/styles/global.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--color-shell` | `#1d201d` | Warm graphite application base |
| `--color-canvas-shell` | `#171a17` | Quiet, darkest canvas surround |
| `--color-toolbar` | `#2b302b` | Navigation and inspector header |
| `--color-panel` | `#252a25` | Standard panel |
| `--color-surface` | `#343b33` | Raised controls |
| `--color-hover` | `#424c41` | Neutral creative hover |
| `--color-input` | `#1d231e` | Precision input surface |
| `--color-border` / `--color-border-hover` | `#53604f` / `#879580` | Softer neutral separators |
| `--color-text` / `--color-muted` | `#f1eee4` / `#bec2b5` | Warm readable text |
| `--color-disabled` | `#a4ac9d` | Legible disabled labels |
| `--color-sidebar` | `#222722` | Explorer, rail and help strip |
| `--color-inspector` | `#292f29` | Inspector and dialog group surfaces |
| `--color-palette` | `#272e28` | Contextual tool palette |
| `--color-control-group` | `#30382f` | Related controls and swatches |
| `--color-brass` | `#c4ab78` | Small cartographic signatures and active-tool edge |
| `--color-divider` | `#686049` | Restrained warm section rules |
| `--color-highlight` | `#e3d8b31a` | Quiet inset highlight |
| `--color-backdrop` | `#111710c7` | Modal backdrop |
| Thumbnail light/dark | `#343b34` / `#2e342e` | Neutral checkerboard, separate from asset artwork |

The primary teal `#80bdb3`, selected surface `#233b3b` and keyboard-focus color `#b1e8de` remain unchanged. Danger retains its separate muted-red treatment. Corners use 6 px controls, 8 px cards and 9 px tools. Hover/color transitions last 120 ms and become zero-duration with `prefers-reduced-motion`. The existing 2 px focus outline stays independent of active state and brass decoration. Forced-colors selection gets a system Highlight border.

## Component changes

- **Brand/tool rail:** small compass signature replaces the plain M tile. Active tools keep teal and gain a narrow brass edge plus a quiet inset highlight. Rail remains 56 px wide. Land/Water now uses a coastline-and-wave icon; Water Depth uses stacked water lines; the compass has a restrained four-point silhouette. Existing brush, winding path, terrain and pin icons remain because they are already recognizable at 18 px.
- **Context palette:** active-tool identity gains a compact matching icon and warm divider. Land/Terrain/Water controls use small tonal groups, concise labels, teal native sliders and gently differentiated advanced disclosures. No controls move to a new workflow. Path/opening/pattern bars reuse the palette surface.
- **Panels/Properties:** separate sidebar and inspector tones, restrained section rules and warmer title hierarchy. Selection identity gets a small brass edge. Coordinate groups stay compact on a subdued surface; primary dimensions and creative choices retain prominence. Panel widths are unchanged.
- **Campaign Explorer:** consistent folded-map and folder SVGs, a tiny heading diamond, rounded rows and a warm current-map edge/dot. Teal selected-folder state remains independent of the currently open map. Existing indentation, tree keyboard handling and drag/drop are unchanged. The empty folder copy suggests starting a map or organizing a campaign.
- **Asset Library:** warmer thumbnail checkerboard, softer card frames, selected-card brass micro-edge with teal selection, clearer details surface and rounded metadata groups. Sidebar selection remains teal. Empty results offer a concise mapmaking-oriented next step. Artwork stays unobscured.
- **Dialogs/pickers:** one small title diamond, a quiet top accent and layered choice groups. Marker icon choices, theme cards and material swatches share the selection language; focus remains a separate outline. Marker preview still shows actual map typography, while all editor controls retain Segoe UI/system fonts.
- **Inputs/buttons/status:** primary teal buttons gain a quiet top highlight; secondary/tertiary/destructive hierarchy remains intact. Native controls opt into dark color scheme. Sliders and checks use teal. Status/help stays subdued and readable. No textures, wood, UI parchment, fantasy display fonts, runes or animated effects were introduced.

## Files

Components: `src/app/App.tsx`, `Icon.tsx`, `SelectionToolbar.tsx`, new `SelectionToolbar.module.css`; `src/campaigns/CampaignWorkspace.tsx`; `src/library/LibraryWorkspace.tsx`.

Styles: `src/styles/global.css`; CSS Modules for App, MapCanvas, TerrainBrushTools, ObjectProperties, LayersPanel, ObjectsPanel, MapSettingsPanel, CampaignExplorer, Assets, LibrarySidebar, Modal, Markers, WorldThemePicker, MapElementsMenu, PathTools, OpeningTools and PatternTools.

Validation: expanded `src/app/visual-hierarchy.test.tsx`; `scripts/validate-cartography-personality.mjs`; `scripts/cartography-personality-comparisons.mjs`. This report and the README document the result. No persistent-format ADR is needed for this reversible presentation-only change.

## Before/after evidence

Local evidence is in `deliverables.local/Cartography-Personality/`. Both runs use the same native Velanth map and real library artwork in disposable local service datasets. Original benchmark maps are not modified.

Each view has full-size **before** and **after** screenshots at **1280×720** and **1600×1000**:

| View | Full-size 1280 comparison |
| --- | --- |
| Editor, Land/Water active | [Active tool](../../deliverables.local/Cartography-Personality/active-tool-comparison.png) |
| Properties selection | [Properties](../../deliverables.local/Cartography-Personality/properties-comparison.png) |
| Campaign Explorer | [Campaign](../../deliverables.local/Cartography-Personality/campaign-explorer-comparison.png) |
| Asset Library | [Library](../../deliverables.local/Cartography-Personality/asset-library-comparison.png) |
| Marker wizard | [Wizard](../../deliverables.local/Cartography-Personality/marker-wizard-comparison.png) |
| Water Depth context palette | [Brush context](../../deliverables.local/Cartography-Personality/brush-context-comparison.png) |

The `before/` and `after/` directories also contain independent screenshots, keyboard-focus screenshots and machine-readable `results.json` files. Visual review confirms a warmer cartographic identity with restrained decorative details; the large map remains the dominant colored content. The large desktop view retains a single Land/Water control row; 1280 retains two rows as before.

## Validation results

- **64 Vitest tests passed in nine targeted files:** visual hierarchy/tabs/contrast/save-state semantics; UX/tool activation; tool intent; Selection Inspector; Objects Panel; marker wizard; theme picker; library selection/removal; campaign session behavior. The five added contrast tests cover new surfaces, brass versus focus, and reduced-motion styling. No full test suite was run.
- **Scoped ESLint passed** for all changed TS/TSX and the two new scripts.
- **`npm run typecheck` passed** for client and service. **`npm run build` passed**, including client/service production bundles and eight font-family/license checks. The existing >500 kB chunk warning remains.
- Browser checks ran in installed headless Chrome with real local-service import and local Vite UI. Representative asset selection, rail activation, wizard autofocus/Escape/focus restoration, campaign folder selection versus open-map identity and unchanged native map snapshots passed.
- Actual computed styles verify teal selected fill, brass active edge, separate mint keyboard outline, neutral hover, teal slider accent and zero-duration reduced motion.
- **Axe color-contrast: zero reported violations on all six before and all six after views.** Token checks require >=4.5:1 text contrast and >=3:1 focus/active-edge contrast on the tested surfaces. This is not a full WCAG audit: axe leaves glyph/artwork/canvas-related checks incomplete in each view, recorded verbatim in `results.json`; visual review supplements them.
- No horizontal document overflow at either viewport. With Land/Water active, the 1280 canvas is **720×399 px**, compared with **720×403 px** before: 4 px extra control height. At 1600, it is **1040×740.5 px**, compared with **1040×743.5 px** before. Rail, explorer and inspector widths are unchanged.

## Limits

Browser/native control rendering was checked in Chrome on this Windows host; Firefox, other OS control themes, full screenreader navigation and forced-colors mode were not exhaustively audited. Every possible wizard/tool combination was not screenshot-tested. The chosen palette is intentionally restrained; decorative details are limited to small edges, rules, compass and diamond motifs. Canvas/game-map fonts and artwork remain independent of editor styling.

No push, merge, deployment, release, upload or cloud action was performed. No Windows executable/package was built. Existing packages therefore retain their earlier UI until a new package is explicitly requested.

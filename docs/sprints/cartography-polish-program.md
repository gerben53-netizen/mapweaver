# World cartography polish — staged program

The supplied program is delivered as separate, verifiable sprints. No develop branch exists in this checkout (unborn master, existing files untracked); work remains in the supplied checkout without a branch reset, commit or external action.

| Delivery | Acceptance checkpoint | Status |
| --- | --- | --- |
| P0 Terrain rendering | Editable textured Areas; controllable inward feather; five derived coastline presets; five water styles; shared preview/editor/export; safe validation, persistence and undo | Complete — [report](terrain-rendering-report.md) |
| P0 Semantic world assets | Versioned role/biome/theme metadata and curated consistent mountain, forest, rock, volcano and swamp groups | Complete — [report](semantic-world-assets-report.md) |
| P0 Generator scatter | Seeded semantic selection, ridge alignment, clustered forests, spacing/readability limits, editable output | Complete — [report](generator-scatter-report.md) |
| P1 Paths | Gap analysis against existing route taper, Bézier editing, bank and halo; river style presets and controlled generated smoothing | Complete — [report](river-styling-report.md) |
| P1 Effects and border | Bounded non-destructive fog, vignette, shadow and glow; map-bound built-in border presets; explicit ordering | Complete — [report](map-effects-report.md) |
| P2 Themes | Centralized one-click semantic styling with explicit override/reset behavior | Pending |
| P2 Labels | Native editable semantic labels with bounded collision-aware placement | Pending |

Each checkpoint uses targeted tests, relevant TypeScript, scoped lint, production build and visual/export checks. No Windows package is built unless separately requested. Final program completion and comparison with polished fantasy tools must wait for all checkpoints; the first terrain delivery is not the complete program.

## First-delivery acceptance

- Eleven central terrain presets, including ocean/shallow water, with fractional pattern scale and texture opacity.
- Existing Fill Patterns, frames, object geometry and holes retained.
- Feather width and blend strength remain independent of zoom, with no paint outside biome geometry.
- Coast None, Minimal, Fantasy Soft Coast, Parchment Coast and High Contrast derive from landmass contours.
- Calm Fantasy Ocean, Deep Ocean, Parchment Sea, Minimal Blue and Dark Sea share editor/export code.
- Generator preview and Create agree; plain generation remains available.
- Properties edits and disabling styling support undo/redo; save/reload and portable archive preserve metadata; unstyled documents remain unchanged.
- Measured cache/render bounds and 1×/2× PNG validation are reported, with limitations disclosed.

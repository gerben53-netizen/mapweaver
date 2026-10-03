# Sprint G — Automatic cartographic labels

## Acceptance criteria

- Explicit World/Regional action, category/density choices, reviewable preview and one-step apply/update.
- Existing names from region, settlement, river, water, mountain-region and landmark sources produce native editable labels using central theme-aware hierarchy.
- Multiple candidates, interior region placement, readable river orientation, collision/edge/frame avoidance and explicit suppression.
- Existing manual/linked labels and overrides remain intact; stale auto labels can be cleaned, detached labels remain manual.
- Current format validation, undo/redo, local save/reopen/project transfer; exact editor/export 1×/2× parity.
- Targeted tests, typecheck, scoped lint, build, representative browser densities/screenshots and measured hundreds-of-sources layout.
- No name generation, geography regeneration, Windows package or external actions.

## Delivered architecture and behavior

One central service (`domain/automaticLabels.ts`) reads named semantic objects and creates ordinary editable Labels. There is no raster text, duplicate renderer, generated naming system or geography change. The explicit dialog under Map actions selects six categories and Low/Medium/High density. Preview renders an isolated proposed snapshot through the existing PNG renderer; Apply performs one history transaction. Reopen the same dialog to update. Preview cancellation and category/density changes do not mutate the document. Stale previews are rejected.

Supported sources are named region/territory Areas, Places/Smart Markers, River Paths, water Areas and mountain-region Areas. Explicit `land.labelKind` can distinguish a sea/ocean, lake/bay, region or mountain range. Default generic names are skipped. Unnamed scatter chains are not assigned range names. Existing world titles are protected Map Elements; the class hierarchy includes a title level but this action does not create another title.

The central hierarchy defines major region > region > capital > major city > settlement > landmark, with separate major/minor water, river and mountain-range classes. Theme font, ink, paper/halo, bold/italic and tracking are reused; Minimal Political uses a smaller scale. Water labels are italic and boxless. Fonts, style values and glyph metrics remain native; theme ownership registers new automatic labels. Density primarily omits minor sources and does not scale text to fit.

Placement offers eight marker offsets, up to 32 spatially distributed interior samples for Areas, and several low-curvature river-span candidates. Region candidates are ranked by distance to contour edges and holes rather than trusting a potentially exterior centroid. Rotated straight river labels stay readable left-to-right. Named mountain Areas use their bounds and optionally a moderate angle for tall ranges. A spatial hash queries padded rotated bounds against existing/manual labels, markers, title/cartouche, compass, legend and scale bar. Map edges and frame margins are hard constraints; stamp/scatter overlap is a soft penalty. Higher priority wins. Failed candidates remain native hidden labels with an explicit suppression flag and can be revealed in Objects for manual placement.

Automatic metadata stores source ID, version, category, class, baseline fingerprint, overridden and suppressed flags. Direct movement, rotation, styling, text or visibility edits become protected overrides. Repeated final drag samples retain the override flag. Native owner-follow movement refreshes the baseline without becoming a manual override. Existing linked marker labels, including hidden manual labels, are preserved without duplicates; explicit marker label opt-out is respected. Detach removes automatic ownership without changing artwork or a marker link. Update preserves manual overrides, updates non-overridden text/layout, adds new sources and removes unmodified orphan labels. Unselected categories and hidden/locked sources remain untouched.

Format 12 gains validated optional Label automatic metadata, Area label category and marker label-enabled metadata. No SQLite/container version or migration is needed. Existing documents without these fields retain their behavior. Autosave, Save, reopen, project ZIP and verified backup/restore preserve native labels. See ADR-0035 for exact model and limits.

## Files changed

- New domain modules: `automaticLabelMetadata.ts`, `automaticLabelStyle.ts`, `automaticLabels.ts`.
- Model admission: annotations, landAreas and markerRegistry; creation/settings in markers and projectStore.
- Store: automaticLabelActions for proposed snapshots, stale guards and atomic history; central manual-override tracking in projectStore.
- UI: AutomaticLabels dialog, MapCanvas action, small Label Properties metadata/detach and Area label-category selector.
- Themes: applyWorldTheme consumes automatic semantic typography and registers ordinary field ownership.
- Tests/QA: domain/store/dialog tests, local service persistence test, representative semantic fixture and isolated browser acceptance script.
- ADR-0035, README, AGENTS glossary, changelog and this report.

No font files, painting engines, image dependencies, remote services or Windows packaging were added.

## Validation results

- **56 targeted client tests passed**: automaticLabels (10), automaticLabelActions (9), AutomaticLabels StrictMode UI (2), existing annotation/marker/world-theme regressions (35).
- **1 service test passed**: SQLite write/update/reopen, invalid-metadata rejection, project ZIP import/export and verified full-backup restore with document equality.
- TypeScript/typecheck passed. Production build passed for client and service, including bundled-font hashes/licenses. Existing Vite chunk-size advisory remains.
- Scoped ESLint passed for changed code and QA scripts. No unrelated full test suite or format sweep was run.
- Browser acceptance: `node tests/persistence/automatic-labels.mjs` passed against isolated local service data, with no browser errors.

The representative themed map contains four named regions, capitals/cities/towns/villages, three added rivers plus existing routes, a sea, lake, named mountain Area, landmarks, title/cartouche, compass, legend, frame and existing manual text. All previews left the original snapshot and history unchanged. Low produced 10 visible labels; Medium produced 19 visible and 2 suppressed; High produced 21 visible and 2 suppressed. Existing manual labels were unchanged. Native mouse dragging marked an override and Update retained it exactly. Standard Label Properties exposed Detach; detach and Undo both worked. Autosave, Save and browser reload preserved labels; cancellation at 1280×720 remained non-mutating.

1× (1200×800) and 2× (2400×1600) exports were compared against cloned editor artwork, excluding selection chrome. Both had **maximum RGBA difference 0 and mean difference 0**. Font, halo, rotation, opacity, water/terrain, hidden state and normal map effects therefore matched on the tested scene.

## Performance

A 4096×2800 fixture with 250 named settlements completed five layouts in 45.0, 14.2, 11.2, 11.3 and 10.9 ms, placing all 250 labels. The first measurement includes cold setup. Placement is bounded to 300 named sources per operation and uses a spatial hash for exclusion lookup. PNG preview rendering has its own existing image/export costs; the layout numbers do not include PNG encoding and are not a guarantee for every complex polygon map.

## Screenshots and machine evidence

Local ignored QA directory: `.qa.local/automatic-labels-1790401741888/`.

- [Low density](../../.qa.local/automatic-labels-1790401741888/low-editor.png)
- [Medium density](../../.qa.local/automatic-labels-1790401741888/medium-editor.png)
- [High density](../../.qa.local/automatic-labels-1790401741888/high-editor.png)
- [Preview dialog](../../.qa.local/automatic-labels-1790401741888/high-preview.png)
- [Manual override retained](../../.qa.local/automatic-labels-1790401741888/manual-override.png)
- [Native Properties](../../.qa.local/automatic-labels-1790401741888/native-properties.png)
- [1280×720 layout](../../.qa.local/automatic-labels-1790401741888/layout-1280x720.png)
- [1× PNG](../../.qa.local/automatic-labels-1790401741888/labels-1x.png), [2× PNG](../../.qa.local/automatic-labels-1790401741888/labels-2x.png), [machine results](../../.qa.local/automatic-labels-1790401741888/results.json).

## Known limits and remaining visual-fidelity gaps

- River labels are rotated straight text; curved/path-following typography remains future work.
- Candidate sampling and AABBs are conservative. Thin, tiny, highly concave or crowded Areas may need manual placement. Junction/background-readability analysis is limited to geometry candidates and existing hard/soft obstacles, not a global cartographic optimizer.
- Mountain names require a named semantic Area. There is no inferred name/ridge graph over unnamed generated peaks. Large ocean labels require a named water Area; water backgrounds have no semantic name record.
- Existing manual marker labels are not silently adopted or repositioned. Unlinked manual text cannot be reliably matched to a source by name alone, so a similarly named semantic source may still receive a separate label.
- Theme changes after label generation are conservatively treated as preserved visual differences during later auto-layout. Detach gives complete manual control; no force-reset command was added.
- Generic placeholder names are skipped. Name generation, small caps, complex-script shaping and automatic semantic enrichment remain outside scope. Existing unsupported glyph fallback and export pixel limits still apply to previews/exports.
- First-class river text paths, richer named ridge/sea semantics and finer collision optimization are possible follow-ups. No further automatic theme, terrain or geography changes are implied.

No push, merge, publication, upload, deployment or Windows package was performed. The repository has no existing develop branch or committed baseline; all existing files and the current checkout were retained.

# Velanth — Reference atlas validation

26 September 2026. Capability exercise; no product features changed.

## Outcome

A native, editable original map was created and successfully saved, reopened, edited and exported. **The visual target was not reached.** This result is a coherent illustrative world map, but it is visibly below the supplied painterly fantasy atlas. In particular, the existing mountain/forest artwork, terrain relief, generated drainage and decorative richness prevent an honest claim of comparable finished-atlas quality. Acceptance criterion 14 (finished atlas rather than demonstration appearance) is not accepted at the reference's quality level. Technical editability and export success do not substitute for that visual criterion.

## Deliverables and opening the map

All delivery files are in `deliverables.local/Velanth/` in this repository:

- `Velanth.mapweaver`: portable format-12 project, with all 15 used image assets embedded.
- `Velanth-1x.png`: 2400 × 1600.
- `Velanth-2x.png`: 4800 × 3200.
- `editor-reopened.png`: saved map reopened in the real editor at 1600 × 1100.
- `editable-marker.png`: native marker selected with Properties visible.
- `first-finished.png`: first completed composition, before the single refinement pass.
- `validation.json`: measured counts, checks, timings and generator warnings.

Open Mapweaver, choose **Projects → Import map as campaign**, and select `Velanth.mapweaver`. Alternatively use **Project → Import map file** within a chosen campaign. The validation campaign **Visual Fidelity Reference**, containing **Velanth — The Tidebound Realms**, was created in a separate local service dataset at `.qa.local/reference-atlas/data`. It was deliberately not written into or substituted for the user's existing application dataset. Importing the portable file is the simple way to use it in the normal application.

The validation service was stopped after delivery. Its dataset and authoring/evidence files remain in `.qa.local/reference-atlas`. No Windows package was created.

## Composition and native content

Landscape 3:2, 2400 × 1600 map units/pixels. Physical map width 30,000 km; the native scale bar spans 3,000 km. Painterly Fantasy theme, manually refined with the existing Deep Ocean water preset, softer biome boundaries, native terrain paint and restrained atmosphere. The theme supplies settings, not painterly artwork: the available **Mapweaver Engraved** symbol family was explicitly retained as the best available bundled world-map set. Existing local library assets were inspected; they primarily contain interior furniture/floor materials rather than a better world-map family.

The map has a broad dominant continent, a secondary arid island/landmass, scattered smaller islands, a bay/strait and inland lakes. Generator seed `Velanth tidebound 7`, two continental seeds, water .36, roughness .7, islands .65, mountains/forests .8, 16 generated rivers. Generator-aware semantic scatter is retained as ordinary editable stamps and historical provenance. Two major mountain/forest regions and an alpine patch remain editable Areas. Manually added swamp symbols, a volcano and southern hills/rocks extend the distinctive regional character.

Six committed native Land/Water operations added and cut southern geography and exercised roughen/smooth; additional native Area contour/style editing softened the coarse generated shoreline. Seven paint materials in 77 sparse paint tiles demonstrate rocky variation, forest floor, snow, marsh, desert/grass transition and volcanic ground. Paint remains editable coverage; historical individual strokes are not separate saved objects. Swamp and volcanic refinements are paint/symbols, not a new semantic biome graph.

Three authored river Paths supplement the generated drainage: The Vey, Silverrun and Merewater. They connect a tributary and the western lake/outlet, using downstream widths, smoothing, outline and restrained halo. Generated tributaries remain independently editable; the product does not provide a coupled hydrology network. Some long straight/angled generated reaches remain visibly weak.

Eight Smart Markers use existing marker-wizard model constructors and curated icons: capital, harbor, fortress, town, city, ruin, another town, and landmark. Capital/city/minor importance differs. Automatic Labeling supplied the initial pass; manual edits removed generic generated names, repositioned labels and refined hierarchy. There are 18 visible native labels, using the theme's bundled serif/display fonts with italic sea names. Title/cartouche, ornate compass, map-bound ornate frame and a meaningful scale bar are native. A legend was omitted because eight differentiated named sites did not warrant another large panel in this composition.

Localized marsh mist, modest vignette and subtle stamp shadows are native effects. The map has **no raster background**. It contains **537 objects: 68 Areas, 19 Paths, 421 stamps, eight Places, 18 Labels, one Title, one Compass and one Scale bar**. Invisible-fill naming/mist Areas are purposeful native controls, not debug graphics. The 421 stamps share 15 embedded source images; they are not 421 independent image files.

## Authoring method and refinement

Composition was scripted through the existing Mapweaver modules and editor stores in the running Vite/Chrome application. Native generator, scatter, brush, marker, annotation, history, save and export implementations were used. This is evidence of native capability and editable output, **not** evidence that a nontechnical user can compose this map efficiently using only mouse-driven panels. The full Marker Wizard dialog workflow and end-to-end manual authoring effort were not separately retested in this exercise.

The first completed export exposed five problems addressed in one refinement pass:

1. Generic labels such as `River 14`, `Hills`, `Dense forest`, `Alpine` and the mist-mask name: removed from the composition.
2. Over-heavy text halos: reduced; water names changed to light italic text. Increased widths corrected wrapping introduced by the larger water typography.
3. Marker placement at shorelines: the capital was moved inland and representative label positions refined.
4. Bare southern landmass: native arid terrain, foothill/rock symbols and a named region added; marsh/volcanic detail reinforced elsewhere.
5. Low compass/scale contrast: light warm ink now separates them from the deep ocean.

The before/after exports intentionally retain visible remaining shortcomings. No external art was created to conceal them.

## Validation actually performed

- Imported the existing bundled world-symbol ZIP into the isolated service; created a new campaign and generated project.
- Saved through the local service, reloaded the browser into the saved project, and compared the complete map/object/layer/group snapshot using structural equality: **identical**. JSON property order changes on admission, so string order was not mistaken for a data difference.
- Compared the final 1× PNG with a fresh post-reload PNG: **identical pixel bytes**.
- After reload, exercised six native store/domain edit actions: move a marker, edit label text, change a river node, remove a stamp, paint terrain, edit coast. Each changed the intended content; each undo restored the exact pre-edit snapshot. Test edits were undone before final save.
- Compared separate PNG exports against the editor's native map artwork/water render at 1× and 2×: **zero differing RGBA channels at either resolution**. Selection UI, brush previews and editor controls were excluded by the normal artwork/export boundary.
- Opened/decoded the actual downloadable `.mapweaver` through the browser's existing archive parser: **537 objects and 15 assets accepted**, no background image. Independently verified all embedded source image SHA-256 hashes.
- Inspected full-map exports, the editor after reopen, and selected-marker Properties screenshots. No debug text is present in the final image.

These are targeted browser/store/serialization checks. No product source code changed, so TypeScript/lint/build and the broad Vitest/Playwright suites were not rerun. No new dependencies were added. The validation used the already available local build/service and development modules.

### Performance observations

One local headless Chrome run, not a cross-hardware benchmark:

| Measurement | Observation |
|---|---:|
| Reload until map-canvas shell visible | 882 ms |
| Portable archive decode, including 15 images | 213 ms |
| 1× PNG export | 1.28 s |
| 2× PNG export | 1.99 s |
| Representative edit plus exact undo | 26–52 ms |
| 39 warmed scripted viewport update intervals | median 131 ms, p95 148 ms, max 151 ms |

The shell-open measurement does not claim time until all painting has completed. The viewport measurement includes rendering on headless Chrome and is not a manual pointer-latency measurement. Nevertheless, it is too slow to call smooth; this realistic 421-stamp painted/effected map should be used for profiling before assuming production responsiveness.

## Structured comparison with the supplied reference

Ratings concern the delivered image, not theoretical feature availability. Every below-target rating names its principal cause; no numeric aesthetic score is implied.

| Aspect | Rating | Main cause category | Exact remaining gap |
|---|---|---|---|
| Landmass quality | Noticeably behind | poor generator behavior; manual workflow issue | Broad plausible continent, but a narrow connecting middle and capsule-like secondary mass still read as generated/brush-shaped. |
| Coastline quality | Noticeably behind | weak default preset; renderer limitation | Fine roughening helps, but halos are uniform and some edges look serrated or softened rather than naturally eroded. |
| Terrain richness | Major gap | renderer limitation; insufficient asset quality | Grain and flat color do not supply painted relief, geological shading or layered material detail. |
| Biome transitions | Noticeably behind | weak default preset; renderer limitation | Feather/brush removes hard polygons, but the result is uniformly blurry rather than convincing ecological transitions. |
| Mountain quality | Major gap | insufficient asset quality; poor generator behavior | Simple triangular symbols, sparse alignment and limited ridge continuity; no sculpted rock lighting or detailed alpine forms. |
| Forest quality | Major gap | insufficient asset variety; insufficient asset quality | Repeated small tree clusters, limited canopy variation and insufficient painterly depth. |
| River quality | Noticeably behind | poor generator behavior; missing functionality | Several generated reaches remain long and angular; no coherent branch-aware drainage/widening graph. Native smoothing alone does not fix upstream geometry. |
| Water quality | Noticeably behind | weak default preset; renderer limitation | Repeating line texture and broad dark shading lack reference-like depth variations, shoals and turbulent coastal water. |
| Labels | Noticeably behind | missing functionality; manual workflow issue | Readable hierarchy but small settlements and straight river text; no true curved labels. Generic generated source names needed manual cleanup. |
| Markers | Noticeably behind | insufficient asset quality; weak default preset | Functional prominence/icons, but circular vector badges feel less integrated than illustrated buildings/landmarks. |
| Cartographic elements | Noticeably behind | weak default preset; insufficient asset quality | The vector cartouche/compass are clean but far simpler than weathered engraved parchment ornaments. |
| Effects | Noticeably behind | renderer limitation; weak default preset | Mist/shadows work, but single-mask atmosphere has hard geometric support and lacks richly layered directional clouds. |
| Border | Major gap | weak default preset; insufficient asset quality | Thin repeated vector flourishes do not approach the intricate embossed reference frame. |
| Overall cohesion | Noticeably behind | insufficient asset quality; manual workflow issue | Palette is coherent, but simple engraved symbols and softened terrain form visibly different levels of detail. |
| Finished fantasy atlas feel | Major gap | insufficient asset quality; poor generator behavior; renderer limitation | Native systems coexist successfully; the result still lacks the reference's density, material depth and convincing geographic/artistic integration. |

Generator warnings also document missing tropical/conifer tree candidates, fallback forest/rock choices and the 120-detail cap. A visual theme cannot compensate for those asset-family gaps.

## Recommended next work (not implemented)

1. **World asset quality/variation sprint:** one coherent, production-quality mountain/ridge/foothill, broadleaf/conifer/swamp and landmark family with consistent light, scale and richer silhouettes. Supply theme-matching metadata and natural edge/interior variants. Compare on this same saved map before adding more systems.
2. **Geography and terrain finish sprint:** improve actual ridge/drainage geometry and density, terrain relief/material blending, coast falloff and ocean depth presets. Add curved river/range labeling only where it materially improves this reference exercise.
3. **Composition/preset and performance sprint:** refine title/frame/marker presets and label-source defaults; profile this map's 131 ms viewport intervals, then repeat the exact map/export/reload comparisons. Treat authoring-panel usability as a separate manual workflow test.

No external image generation, pre-rendered full-map import, full-map flattening, uploads, pushes, release, deployment or Windows packaging were performed. Existing user projects and assets were not deleted or overwritten. The repository has no existing committed develop branch; this exercise retained the current checkout and created no branch or commit.

# Pipeline analysis

## Observation method and controls

`analyze.mjs` loads two instances of the same source: ordinary Vite SSR and an observed in-memory transform. Asserted, single-occurrence anchors add only state capture and expose internal helpers. With normal sampling, every returned result is asserted deeply equal to the unmodified function; all cases are repeated for determinism. The two density experiments alone intentionally override sampled positions in the observed copy. No source or build artifact is rewritten. Their saved Areas are validated but they are not claimed equivalent to the default-sampling production call.

Seven core cases, each with Round and Rugged, plus eight sensitivity cases give **22 captures**. Stored `input` and `observation` objects in `diagnostic-stages.json` contain all exact geometries, IDs, settings and stages. `reproduction-parameters.json` carries source/archive hashes and case inputs.

The three native cases replay the exact refinement sequence: first Remove (seed 713), Add cape (714), Remove bay (715), diameter 60, irregularity .65, softness 0, smoothing off. Each uses the exact preceding native geometry. Round is compared against the same initial geometry *for that individual case*, rather than silently substituting a different prior Round sequence. The final Rugged sequence equals the prior native project's stored geometry.

Long/sharp/repeat cases deliberately use a diagnostic rectangle `(150,100)–(550,950)` in a 1100×1050 map. This exposes the full body and caps without ambiguous original coastal junctions. Long: diameter 120, seed 713, seven path nodes, 59 samples, distance 14.4. Sharp: four nodes and 43 samples. Repeated uses the long result as its next starting land; the overlapping variant then uses seed 714. These are research fixtures, not replacements for Northreach or edits to QA/Primary data.

## A — individual footprints

Existing `resampleLandStroke` carries distance remainder across polyline segments and appends the endpoint. Spacing is `max(2, diameter × .12)`; coordinates are quantized to six decimals by the existing helper. Each Rugged sample yields a 72-point positive radial contour. The final point is implicitly connected to the first by the polygon representation. Radius normalizes to at most half the selected diameter.

Rugged uses the seed's orientation and position-dependent phase drift. It ignores the supplied path-tangent angle, demonstrated by exact equality at angles 0, .7 and π. Orange ticks in stage A show the tangent passed by the pipeline; they do **not** indicate that Rugged rotates to follow it. The orange centerline, white sample points/indices and green footprint boundaries reveal the overlap. Dashed blue/pink circles indicate nominal start/end radius, not a fit to the irregular footprint.

There is no explicit terminal taper, clipped cap, end-pressure or body-versus-cap distinction. Every sample, including first and last, retains full footprint extent. The fine lobes are present in individual contours; the broad terminal extent is built into those contours.

## B — raw stroke mask

The actual pipeline unions footprints in batches of 16 using the existing polygon-clipping engine, then clips to actual map bounds. The observer captures that mask directly. No land geometry or RDP has been used yet. The long Rugged mask has 527 vertices; Round has 279. Both already have rounded terminal caps. Native short Remove has just three samples: the endpoint footprints dominate its perimeter.

For every tested raw mask boundary segment, the midpoint can be attributed to an input footprint edge within 1e-5 map pixel: no unattributed length. This is measured inheritance, not evidence that the union invented a smooth curve. Union hides internal overlaps and removes concavities covered by neighbors. At outside bends, interior footprints remain exposed as local shoulders.

## C — land boolean before optional reduction

The transform records the exact raw `clipping.union(mask, touched land)` or `clipping.difference(land, mask)` input to `contours`. Therefore C is separately observable without disabling validation or changing production behavior. Unchanged land is included for context. Raw per-Area boolean values are retained in `observation.raw`.

For diagrams and boundary/area comparison only, land Areas are combined into a display union. This can coalesce touching boundaries; counts under `rawLand`/`finalLand` describe those display unions. **`savedAreas` and `savedNodes` describe actual saved objects**, preserved separately in `final`. The Northreach final has 36 Areas and 720 stored nodes, while its display union has 719 vertices. This distinction is intentional and not data loss.

## D — normal stored result

`contours` drops components below the existing size-derived threshold, performs iterative RDP on rings, then normalizes/validates. Tolerance at diameter 60 is .24 px; at 120 it is .48 px. On validation failure it can try factors .5 and .1. All observed cases succeed at factor 1. Normalization removes duplicate neighbors, sets ring orientation and validates boundaries/holes; it does not add smoothing curves.

| Rugged case | Samples | Raw B vertices | Raw C display vertices | D saved nodes | Cap C→D vertex distance |
|---|---:|---:|---:|---:|---:|
| Native first Remove | 6 | 110 | 703 | 683 | .223 px |
| Native Add cape | 6 | 108 | 723 | 703 | .230 px |
| Native Remove bay | 3 | 90 | 747 | 720 | .223 px |
| Long multiple turns | 59 | 527 | 387 | 189 | .478 px |
| Sharp turn | 43 | 256 | 206 | 119 | .437 px |
| Repeated same seed | 59 | 527 | 374 | 189 | .478 px |
| Overlap next seed | 59 | 550 | 255 | 208 | .418 px |

C→D distances are vertex-to-segment checks, not an exact continuous Hausdorff maximum. Symmetric difference uses polygon-clipping and is separately recorded. In the native short cases its changed area is below .001% of total land; this denominator includes unchanged land, so the local distance and overlay are stronger cap evidence than that global percentage. On the long case the C→D difference is .03184% of total land. B and C already carry the same broad cap, visible before those subpixel changes.

## Validity limits

Every individual footprint and saved Area passes full existing native validation. Additional raw checks detect no strict same-ring self-crossings, non-finite points or ≤1e-9 zero-length edges in B/C. These checks do not certify all touching/collinear or inter-ring configurations. Native normalization of the diameter-60 long raw C is refused by the existing 512-point ring budget; the normal reduced result has 466 valid nodes. This is an intermediate complexity limit, not evidence of self-intersection, and no limit was changed.

The high-density mask comparison fails despite separate raw land operations succeeding. Its difference area remains unknown. No conclusion in this audit depends on inventing that missing value.

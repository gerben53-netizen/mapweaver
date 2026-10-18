# Visual quality assessment — ADJUST

Assessment is based on the five actual native UI exports and equal 400×430 pixel crops (origin 550,800). Scores are comparative engineering judgments, not a user study or premium approval. The starting V3 coastline is already angular in untouched places; this prototype only changes the three local target strokes. Flat colors intentionally expose geometry rather than conceal it with texture.

| Criterion (1–5) | Round | Soft | Rugged | Fine | Combined |
|---|---:|---:|---:|---:|---:|
| Natural coastline | 2 | 3 | 3 | 2 | 3 |
| Absence of brush lobes | 1 | 2 | 3 | 1 | 2 |
| Multiscale structure | 1 | 2 | 3 | 2 | 3 |
| Continuity | 4 | 4 | 4 | 4 | 4 |
| Geographic control | 2 | 2 | 2 | 2 | 3 |
| Avoidance of identical repetition | 2 | 4 | 4 | 3 | 4 |
| Native editability | 5 | 5 | 5 | 5 | 5 |
| Processing performance | 4 | 4 | 4 | 4 | 4 |
| Geometric safety in tested cases | 5 | 5 | 5 | 5 | 5 |

Visible evidence: Round's lower bay is a near-circular cutout and its central Add creates a semicircular cap. Soft makes the lower bay asymmetric but still bulbous. Rugged adds shoulders to that bay and a less circular central cap without a regular sawtooth edge. Fine's restrained amplitude remains very close to Round at this diameter. Combined makes the upper bay broader and uses smaller corrections below; the junction near the upper-right edge is still pinched. No discrete chain of islands appears along these strokes, but absence of a chain does not mean terminal brush lobes have been eliminated.

## Required final assessment

1. **Visibly better than Round?** Soft and Rugged show modest improvement in asymmetric terminal shapes. Fine does not demonstrate a convincing overall gain at equal diameter. No blanket premium claim.
2. **Best natural coastline?** Rugged has the clearest improvement in this local comparison. Soft is useful for broad arcs, but remains rounded.
3. **Do round brush lobes disappear?** No. They are reduced in Rugged, not eliminated; Fine especially retains them. This visual acceptance criterion remains unmet for production.
4. **Does mixing help?** Some geographic control improves through smaller detail sizes and a broader bay. This costs an additional stroke; it is not proof that mixing alone outperforms equal effort. The pinched junction still needs correction.
5. **Difficult geographic forms?** Narrow straits, fjords, needle capes, deliberate island separation and exact reference matching. The common Add merges an island in every variant. Native contour precision remains necessary for exact landmarks.
6. **Performant and reliable?** All tested operations produce valid editable geometry with net 22–43 additional nodes, not thousands. Native exports take roughly tens of milliseconds in this small asset-free fixture. Larger maps and pointer-to-pixel latency were not benchmarked; one cold ordered run cannot rank variants by speed.
7. **Simple enough?** Yes for selecting shape, diameter and Add/Remove. Real pointer/worker integration works. No ordinary-user usability study was performed.
8. **Defaults?** Keep Round/legacy behavior unchanged. Prototype defaults: softness 0, irregularity .65, smoothing off; Soft/Rugged preset diameter 180, Fine 60 map pixels. Smaller diameter is necessary around islands and straits. Do not promote organic shapes as the application default yet.
9. **Which are ready for definitive production?** None is proven premium-ready by this test. Rugged is the strongest candidate; Soft needs terminal-shape refinement, Fine needs a more useful distinct local signature.
10. **Required improvements?** Reduce broad terminal lobes without adding high-frequency noise; make Fine visibly useful at small correction scale; evaluate junctions and island separation with longer mixed-direction strokes and several seeds. Repeat the equal-input native comparison before production promotion. These are proposed follow-ups, not unrequested changes to the boolean engine.

**ADJUST:** technically reliable prototype, limited visual gain. Do not merge or represent it as a finished premium coastline solution without explicit review and further focused correction.

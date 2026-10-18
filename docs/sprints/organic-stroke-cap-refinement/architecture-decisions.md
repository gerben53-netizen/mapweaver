# Architecture decisions

1. Extend the existing **coverage stage**, not the boolean engine or native Area model. Only three organic Add/Remove shapes opt in. Round's code path, controls, defaults and serialization are unchanged.
2. Use bounded, positive affine longitudinal contraction. Preserve radial source detail, transverse width and topology of each individual footprint. Preserve centers, sampling and point count. Combined geometry remains subject to existing normal validation and rejection.
3. Use arc distance from the nearer endpoint, with a .6-diameter neighbor zone. A .45 terminal factor is fixed for this single experiment, not exposed as a new setting. No visually motivated second tuning round is permitted.
4. Let tiny-gesture strength fade to zero and keep a directionless dab exact. On short strokes both endpoint zones overlap; choose the nearest end instead of multiplying scales. No guarantee of a separate unchanged body where the stroke is too short to have one.
5. Persist only resulting native Area geometry. Existing projects, undo snapshots, archives and exports use the existing paths. No schema version, migration, contract artifact or ADR with a new lasting product architecture is required for this rejected prototype.
6. Keep diagnostic plots distinct from native outputs. The fixture builder observes masks only in memory and checks baseline replay; UI exports, archives and database reload renders provide independent final-image parity evidence. Pixel differences avoid the known diagnostic mask-difference failure.

**Decision:** retain the experiment and evidence locally for review; **REJECT production acceptance**. Do not promote or merge. A possible continuous-envelope experiment needs a separate explicit sprint, its own cap/join/short-stroke semantics and equivalent regressions.

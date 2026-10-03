# Editable world generation — delivery report

## Acceptance and delivered workflow

The acceptance target is an offline, reproducible preview that becomes an ordinary editable world-map only after explicit creation. Seed/preset controls, continent/water/terrain/climate controls, simplified native geometry, non-mutating Cancel, normal persistence/export, bounded work and preserved existing maps are implemented. Optional settlements/labels and in-place regeneration are deferred.

Entry: **+ Map → World map → Generate world map…**. Six editable presets populate controls. Generate/Regenerate runs a disposable worker; Randomize changes the seed. Changed controls invalidate Apply until another preview completes. Cancel terminates work without saving. Create saves through the existing local service and closes the wizard.

## Implementation

- `src/world/model.ts`: parameter validation, presets, versioned provenance and bounded ownership IDs.
- `src/world/generate.ts`: UTF-16 seed hashing + existing counter PRNG, warped continent masks, layered value noise, ridge elevation, priority-flood basins and descending D8 drainage. Major rivers join ocean, emitted lakes or previous rivers. Latitude/elevation/moisture classify biomes; forests cluster in suitable climate and mountains follow high ridged terrain.
- `src/world/contours.ts`: triangle contours with stable edge identities, hole assignment, smoothing/simplification, native validation. Biomes/lakes clip to emitted land; tiny/invalid/over-budget regions are omitted and reported.
- `src/world/WorldWizard.tsx`, its CSS Module and worker: isolated preview, progress, cancellation and timeout. Preview uses native Area/Path painters; synchronous painting and a stable readback canvas keep same-seed preview comparison reliable.
- `src/app/ProjectControls.tsx` and `src/projects/localSession.ts`: world-only creation entry and explicit save/open. Existing unsaved edits must save successfully before creating another map.
- `src/domain/models.ts`, `mapSettings.ts`, `src/projects/format.ts`: optional validated `map.generation` in current format 12. Existing documents without metadata remain valid. No service schema or endpoint changes.
- `src/app/GeographicSettings.tsx`: read-only Generation source, original seed/settings/version.
- README and ADR-0025 document behavior, limits and ownership semantics.

The ocean is the normal background colour. Land, Biomes, Mountains, Forests and Lakes are normal Areas; Rivers are native river Paths. Six ordinary layers sit inside Generated World and retain normal visibility, locking, order and editing. Scale uses the explicitly supplied world width. No raster, imported assets or remote services are required.

## Validation

- `npm test -- src/world src/domain/mapSettings.test.ts src/domain/geography.test.ts`: **32 passed**, four files. Covers deterministic document output and seed sensitivity; parameter effects; water threshold; valid bounded geometry and holes; descending acyclic rivers and termination; climate rules; all six preset serialization round-trips; metadata; wizard cancellation, stale previews, Apply and errors.
- Scoped ESLint on `src/world` and all changed existing TypeScript files: **passed**.
- `npm test -- src/projects/localSession.test.ts`: **12 passed** for existing local-session behavior.
- `npm test -- src/projects/archive.test.ts`: **6 passed** for existing editable-project archive behavior. Total targeted unit/component tests: **50 passed**.
- `npm run build`: **passed**, including client and service TypeScript compilation and both production bundles. No separate redundant typecheck was needed.
- `node tests/persistence/world-generation.mjs`: **four workflow checks passed** against an isolated local service and real Chrome at 1280 × 720. Same-seed preview pixels match, preview/cancel create no campaign map, Create persists native objects/metadata, ordinary PNG export and reload work, and a generated river can be edited in Properties, undone, redone and saved. No browser errors.
- Preview/editor screenshots and exported PNG inspected. Evidence: [results](evidence/world-generation/results.json), [preview](evidence/world-generation/preview-1280.png), [editor](evidence/world-generation/world-editor.png), [PNG](evidence/world-generation/world.png).
- Full unrelated suite, Windows packaging and external actions were not run.

The representative browser map contains **79 objects and 1,510 total Area/Path nodes**. The preview default contains 71 objects and 1,201 Area nodes. The focused test run took approximately 4.75 seconds including environment startup; its three-generation/validation performance guard passes below 10 seconds. This is a local smoke measurement, not a hardware-wide benchmark. Worker timeout is 15 seconds. Hard output caps are 240 objects, 9,000 Area nodes and 40 rivers; fixed terrain sampling prevents canvas pixel dimensions from multiplying generation cost.

## Limitations and follow-ups

The model approximates fantasy geography, with visible polygonal terrain and grid-derived river bends; it does not simulate tectonics, erosion or physical climate. Continent count means major centres, and water level is a threshold rather than a requested coverage percentage. Some small/complex regions are intentionally omitted. Mountains and forests are editable coloured regions, not automatically chosen stamps or scatter symbols. Automatic labels, settlements and lore are absent.

Post-creation regeneration is deferred to avoid overwriting manual edits. Metadata retains original ownership IDs as provenance, even if content is later deleted or duplicated; it is not permission to replace changed objects. Future work could add safe ownership-aware replacement, erosion, style presets and optional scatter decoration.

Repository note: the supplied checkout has an unborn `master` and no existing `develop` branch. Existing untracked work was preserved without checkout/reset/commit. No push, merge, publication, deployment, upload or Windows package was performed.

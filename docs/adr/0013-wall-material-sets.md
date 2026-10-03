# ADR 0013 — Immutable wall materials on existing asset storage

Status: accepted for Sprint 17.1.

The centerline and nominal thickness remain canonical. Optional wall material settings contain an immutable, validated set definition, seed and roughness. Imported PNG/WebP components are losslessly packed into one transparent PNG atlas, registered as an existing fillPattern asset. Source rectangles, anchors and tight alpha silhouettes describe its parts. The wall's existing texture asset reference owns that atlas; existing reference protection, clipboard, history and project archives therefore apply without a parallel blob database or multiple implicit dependencies.

The local library stores immutable definition/revision registrations referencing the asset register. Preview is read-only; confirmation validates again and commits atlas metadata and registration together. Set identity/version conflicts never overwrite existing definitions. Project objects embed their definition so portable projects do not require the original library registration. No absolute paths, tessellation, render instances or image bytes enter object metadata.

Format 8 adds these wall settings. SQLite schema 4 adds only the wall-set registration table; full database backups retain it. Older walls keep their original renderer and bounds. The renderer separates nominal body, visual material parts and opening clipping, and shares deterministic placement with PNG. Explicit snapped junction markers use stable node annotations, not global overlap inference.

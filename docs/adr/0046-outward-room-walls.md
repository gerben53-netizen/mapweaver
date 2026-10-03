# ADR 0046 — Opt-in outward native walls for usable room dimensions

Accepted 27 September 2026 for Room Generator v1.1.

Room dimensions now describe usable interior space, for straight and curved rooms. Moving rectangle centerlines outward could preserve rectangular interiors, but expanding ellipse radii is not a constant-distance offset. Rebuilding walls whenever thickness changes would also couple ordinary Wall Properties to generator-only metadata. Instead the native Wall model supports an explicit boundary alignment.

## Native contract

`WallSettings` gains optional `alignment: 'outside'`. It is permitted only on closed walls, with physical `strokeWidth` between 0.5 and 512 map pixels. The stored path is the interior boundary for these walls; thickness extends entirely outward. Missing alignment means the existing centered stroke, with unchanged limits and rendering. This is an explicit extension of ADR 0011, not a reinterpretation of existing nodes. Reversing winding derives the exterior again; no persisted winding flag is needed.

The existing project format 12 accepts this optional wall field through the central Wall validator. No schema/table/asset-manifest/container changes or migrations are needed. Current readers retain old rooms/walls unchanged. Older application binaries that reject unknown wall fields cannot read newly aligned walls; forward compatibility with those binaries is not promised. Persist concrete preset values, unit reference, stroke width, nodes and openings, not a mutable preset dependency or a room object.

## Shared rendering and openings

The native Wall painter derives a doubled centered stroke and clips away the exact cubic interior. Solid styles retain exact native outer curves and miter/round/bevel joins (miter limit 2). The existing bounded ribbon clips textured/material and outlined styles; imported material pieces are backed by their core color, avoiding protruding beams or empty geometry at corners. Optional outlines stay inside the band. Editor, hit testing, preview and PNG export use this same path. Old centered walls take the unchanged painter branch.

Openings retain their width and normalized distance along the stored boundary. The symbol anchor moves outward by half the wall thickness; the cutout covers the entire outer band. Placement hit tolerance includes the outer face. Seeded generator placement retains segment selection and requires endpoint clearance of at least thickness + 1 map pixel, in addition to its existing scale-based clearance. Normal property edits reconcile opening bounds without resizing their width.

The floor remains an independent native Area derived from the original interior boundary (curves use existing adaptive path samples). Its geometry and pattern frame do not depend on thickness. No live floor link is added. Native path edits can therefore diverge from the floor, just as before.

## Presets, limits and history

Seven reusable solid styles provide color, join and thickness defaults. Physical map units are captured in `wall.unit/pixelsPerUnit`; metric conversion is exact and unscaled maps use grid cells. Wizard selection resets to the preset default, then accepts an override. Normal Wall Properties expose the same presets and thickness. Existing imported materials remain available; this is not a new artwork pipeline.

One generated room still creates one ordinary root layer with native floor/wall/opening objects in a single history action. Native property edits use existing history; serialization and PNG use the existing document pipeline.

Limits are bounded native renderer limits, not promises of arbitrary topology: simple rectangle/square/circle/oval generation is supported. Self-crossing or pathological user-edited loops and seamless arbitrary imported artwork remain subject to existing Path/Wall limitations. No semantic furnishing, corridors or procedural damage is added.

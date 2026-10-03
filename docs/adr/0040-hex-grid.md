# ADR 0040 — Shared axial hex grids

Accepted 26 September 2026.

## Contract and compatibility

Extend existing `map.grid` with optional `type`: `square`, `hex-flat`, `hex-pointy`. Missing means square; parsing preserves the absence rather than rewriting old projects. Format 12 remains the current container version. Older readers that reject unknown fields will safely reject new hex documents; new readers retain old square documents. No SQLite schema change or per-cell records.

For hex grids, existing `cellSize` is the opposite-corner diameter D in logical map pixels. R = D/2. World/Regional distance is derived from the existing geographic scale, never viewport zoom. Square physical scale metadata is retained when switching types. Existing offsetX/Y locate the center of axial (0,0), including negative offsets; square offset normalization is unchanged. Existing visibility, opacity, color, above/below and snapEnabled fields are reused.

## Geometry

`src/domain/hexGrid.ts` owns axial q,r (cube s=-q-r), six neighbors, cube rounding and conversions. Flat: x=3Rq/2, y=√3R(r+q/2). Pointy: x=√3R(q+r/2), y=3Rr/2. Add origin offsets to both. Fractional inverse coordinates are cube-rounded by correcting the component with the greatest error. Exact ties use a deterministic branch order.

Grid cell vertices use integer lattice coefficients, so neighboring shared vertices are bit-identical. Free rotated hex land footprints reuse the shared corner helper. No UI implements separate hex mathematics.

## Rendering and snapping

Reuse the existing Konva grid Shape and PNG drawing function. Three consistently directed edges per axial cell avoid doubled shared edges. One clipped path and one stroke apply the existing style. The bounded map-wide edge list has a single-entry cache; there are no per-cell DOM/Konva nodes. Lines remain one screen pixel in the editor and one logical map pixel in export, matching existing square conventions.

At fewer than six screen pixels per diameter, the editor hides hex lines with an explicit density message rather than suggesting incorrect coarse cells. Axial enumeration is capped at 40,000 candidates, including padding. Above that limit the grid is hidden; export with grid rejects excessive density and logical diameters below six pixels. Increase diameter or omit the grid. Snapping remains exact regardless of line visibility.

`snapPoint` selects the nearest axial cell center. All existing point-placement consumers inherit it, including stamps and smart markers. Selection movement uses its existing center anchor and existing object-guide precedence; Alt bypass is retained. World/Regional square geographic-graticule behavior is unchanged; hex mode instead uses the shared map grid and permits grid snapping. Returning to Square restores prior geographic guides/settings.

## Land integration

Transient brush settings `snapHex` and `matchHex` resolve against the active grid once at gesture start. Snap locks orientation and rotation; Match additionally derives diameter. Exact matched land uses shared lattice vertices, native boolean union/difference and existing one-stroke history. Edge-adjacent aligned hexes merge, including protection checks on touched land. Soft/Rough retain the common anchors with bounded inward variation. Alt bypasses center snap while preserving the existing Add/Remove inversion. Stored results are ordinary Landmass Areas. Smooth/Roughen Coast keep circular falloff.

No cell ownership, gameplay, database or routefinding system is introduced. A later Paint hex cells feature should consume these same coordinates and decide explicitly whether it needs semantic cell records.

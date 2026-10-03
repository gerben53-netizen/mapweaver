import clipping from 'polygon-clipping'
import type { MultiPolygon } from 'polygon-clipping'
import type { AreaGeometry } from './models'
import { allRings, AREA_LIMITS, normalizeGeometry } from './areas'
export function combineGeometry(
  operation: 'union' | 'subtract' | 'intersect',
  inputs: AreaGeometry[],
): AreaGeometry | null {
  if (
    inputs.length < 2 ||
    inputs.length > AREA_LIMITS.booleanObjects ||
    inputs.reduce(
      (n, g) => n + allRings(g).reduce((s, r) => s + r.length, 0),
      0,
    ) > AREA_LIMITS.booleanPoints
  )
    throw new Error('Combine 2–16 areas with at most 4,096 input points.')
  const values: MultiPolygon[] = inputs.map((g) =>
    normalizeGeometry(g).polygons.map((p) =>
      [p.outer, ...p.holes].map((r) => r.map((p) => [p.x, p.y])),
    ),
  )
  const result =
    operation === 'union'
      ? clipping.union(values[0], ...values.slice(1))
      : operation==='intersect' ? clipping.intersection(values[0],...values.slice(1)) : clipping.difference(values[0], ...values.slice(1))
  if (!result.length) return null
  return normalizeGeometry({
    polygons: result.map((p) => ({
      outer: p[0].map(([x, y]) => ({ x, y })),
      holes: p.slice(1).map((r) => r.map(([x, y]) => ({ x, y }))),
    })),
  })
}

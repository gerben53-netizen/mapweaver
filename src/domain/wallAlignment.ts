import type { PathObject } from './models'
import { pathGeometry } from './paths'
export const outsideWall = (p: Pick<PathObject, 'wall' | 'closed'>) => p.closed && p.wall?.alignment === 'outside'
/** Exterior is independent of winding, including reflected or reversed closed paths. */
export function wallWinding(p: PathObject) {
  const points = pathGeometry(p).samples.map(s => s.point)
  return Math.sign(points.reduce((sum, a, i) => { const b = points[(i + 1) % points.length]; return sum + a.x * b.y - b.x * a.y }, 0)) || 1
}
const cache = new WeakMap<PathObject, PathObject>()
export function wallPaintPath(p: PathObject): PathObject {
  if (!outsideWall(p)) return p
  let result = cache.get(p)
  if (!result) { result = { ...p, strokeWidth: p.strokeWidth * 2, wall: { ...p.wall!, alignment: undefined } }; cache.set(p, result) }
  return result
}

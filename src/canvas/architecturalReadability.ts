import type { AreaObject, MapDocument, MapObject, PathObject } from '../domain/models'
import type { ArlMode } from '../store/arlStore'
import { pointAtPosition } from '../domain/paths'
import type { Point } from './viewport'
const SUPPORTED_MATERIALS = new Set(['pale-palace-stone', 'marble', 'natural-cave-rock', 'refined-timber', 'rustic-heavy-timber', 'living-root', 'rough-stone'])

export const ARL_PROFILES = {
  refinedStone: { shadowWidth: 3, shadowOpacity: .48, edgeWidth: .5, edgeOpacity: .22, massWidth: 1.2, massOpacity: .1 },
  roughStone: { shadowWidth: 2.5, shadowOpacity: .4, edgeWidth: 0, edgeOpacity: 0, massWidth: 0, massOpacity: 0 },
  timber: { shadowWidth: 2.5, shadowOpacity: .42, edgeWidth: .4, edgeOpacity: .12, massWidth: 1, massOpacity: .08 },
  organic: { shadowWidth: 2, shadowOpacity: .32, edgeWidth: 0, edgeOpacity: 0, massWidth: 0, massOpacity: 0 },
} as const
export function arlProfile(wall: PathObject) {
  const id = wall.wall?.generated?.id
  return ARL_PROFILES[id === 'living-root' ? 'organic' : id === 'natural-cave-rock' || id === 'rough-stone' ? 'roughStone' : id === 'marble' || id === 'pale-palace-stone' ? 'refinedStone' : 'timber']
}
export function arlWall(o: MapObject): o is PathObject {
  // Unknown/translucent/rotated scopes retain the native baseline. No guessed alpha semantics.
  return o.kind === 'path' && o.pathKind === 'wall' && !!o.wall?.generated && SUPPORTED_MATERIALS.has(o.wall.generated.id) && o.opacity === 1 && o.rotation === 0
}
export function arlFloor(o: MapObject): o is AreaObject {
  return o.kind === 'area' && !o.ceiling && !o.land && o.fill.kind !== 'none' && o.opacity === 1
}
export interface ArlBatch { start: number; walls: PathObject[]; floors: AreaObject[] }
/** Contiguous walls only: never move a wall over intervening stamps/doors/decals. */
export function arlBatches(map: MapDocument, objects: MapObject[], mode: ArlMode, breakBefore: readonly number[] = []): ArlBatch[] {
  if (mode === 'OFF' || map.mapType && map.mapType !== 'battlemap') return []
  const batches: ArlBatch[] = []
  for (let i = 0; i < objects.length;) {
    if (!arlWall(objects[i])) { i++; continue }
    const start = i, walls: PathObject[] = []
    while (i < objects.length && (i === start || !breakBefore.includes(i)) && arlWall(objects[i])) walls.push(objects[i++] as PathObject)
    const floors = objects.slice(0, start).filter(arlFloor)
    // Safe fallback: backgrounds, colored canvas and empty/transparent Areas do not imply a floor.
    if (floors.length) batches.push({ start, walls, floors })
  }
  return batches
}
export function arlEnds(wall: PathObject) {
  return wall.closed ? [] : [pointAtPosition(wall, 0), pointAtPosition(wall, 1)]
}
/** Only exclude the local cap neighborhood, not a returning curved path elsewhere. */
export function beyondArlEnd(point: Point, ends: ReturnType<typeof arlEnds>, width: number) {
  return ends.some((end, i) => {
    const dx = point.x - end.point.x, dy = point.y - end.point.y
    return dx * dx + dy * dy <= (width * 2 + 4) ** 2 && (dx * end.tangent.x + dy * end.tangent.y) * (i ? 1 : -1) > 0
  })
}

/** Two bounded linear scans; labels propagate from the closest composed wall pixel.
 * Equal-distance ties retain the topmost source owner. No per-neighbor closure allocations.
 */
export function arlDistance(seeds: Uint16Array, width: number, height: number, limit: number) {
  const distance = new Float32Array(seeds.length), owner = seeds.slice()
  for (let i = 0; i < seeds.length; i++) distance[i] = seeds[i] ? 0 : limit
  const relax = (i: number, n: number, cost: number) => {
    const d = distance[n] + cost
    if (owner[n] && (d < distance[i] || d === distance[i] && owner[n] > owner[i])) { distance[i] = d; owner[i] = owner[n] }
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x
    if (x) relax(i, i - 1, 1)
    if (y) { relax(i, i - width, 1); if (x) relax(i, i - width - 1, Math.SQRT2); if (x + 1 < width) relax(i, i - width + 1, Math.SQRT2) }
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x
    if (x + 1 < width) relax(i, i + 1, 1)
    if (y + 1 < height) { relax(i, i + width, 1); if (x) relax(i, i + width - 1, Math.SQRT2); if (x + 1 < width) relax(i, i + width + 1, Math.SQRT2) }
  }
  return { distance, owner }
}

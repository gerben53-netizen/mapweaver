import type { AreaFill, MapDocument, PathNode, DoorObject } from './models'
import type { Point } from '../canvas/viewport'
import { createArea, validateArea } from './areas'
import { createWall, type WallStyle } from './walls'
import { pathGeometry } from './paths'
import { createOpening, deriveOpening, reconcileOpenings } from './openings'
import { mapCapabilities } from './mapCapabilities'

export type RoomShape = 'rectangle' | 'square' | 'circle' | 'oval'
export interface RoomRecipe {
  name: string
  shape: RoomShape
  width: number
  height: number
  floor: AreaFill
  walls: WallStyle
  doors: number
  doorWidth: number
  doorType: DoorObject['doorType']
  seed: number
}
export function roomUnits(map: MapDocument) {
  const scale = map.grid.physicalScale
  return { unit: scale?.unit ?? 'cells' as const, pixels: map.grid.cellSize / (scale?.distancePerCell ?? 1) }
}
export function nextRoomName(names: string[], requested: string) {
  const name = requested.trim()
  if (name.length > 120 || [...name].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw Error('Room name must be at most 120 printable characters.')
  if (name) return name
  let n = 1
  while (names.includes(`Room ${n}`)) n++
  return `Room ${n}`
}
export function randomRoomSeed(previous: number) {
  const value = crypto.getRandomValues(new Uint32Array(1))[0]
  return value === previous ? (value + 1) >>> 0 : value
}
/** Native geometry only. IDs are injected for temporary preview; seed controls placement, never identity. */
export function generateRoom(map: MapDocument, recipe: RoomRecipe, center: Point, id: () => string = () => crypto.randomUUID()) {
  if (!mapCapabilities(map.mapType).rooms) throw Error('Room generation requires a Battlemap.')
  if (!['rectangle', 'square', 'circle', 'oval'].includes(recipe.shape)) throw Error('Choose a room shape.')
  nextRoomName([], recipe.name)
  const units = roomUnits(map), w = recipe.width * units.pixels
  const h = (recipe.shape === 'square' || recipe.shape === 'circle' ? recipe.width : recipe.height) * units.pixels
  const thickness = recipe.walls.strokeWidth, doorWidth = recipe.doorWidth * units.pixels
  if (![w, h, units.pixels, center.x, center.y].every(Number.isFinite) || units.pixels <= 0 || Math.min(w, h) < 16 || w + 2 * thickness > map.width || h + 2 * thickness > map.height || Math.max(w, h) > 8192) throw Error('Room interior must span at least 16 map pixels; the complete outer footprint must fit the map.')
  if (!Number.isInteger(recipe.doors) || recipe.doors < 0 || recipe.doors > 4) throw Error('Choose between 0 and 4 doors.')
  if (!Number.isInteger(recipe.seed) || recipe.seed < 0 || recipe.seed > 0xffffffff) throw Error('Seed must be a whole number from 0 to 4294967295.')
  if (!['single', 'double', 'passage'].includes(recipe.doorType)) throw Error('Choose a door style.')
  if (recipe.doors && (!Number.isFinite(doorWidth) || doorWidth < 4 || doorWidth > 4096)) throw Error('Door width must be between 4 and 4096 map pixels.')
  const x = center.x - w / 2, y = center.y - h / 2, curved = recipe.shape === 'circle' || recipe.shape === 'oval', k = 0.5522847498307936
  const nodes: PathNode[] = curved ? [
    { id: id(), x: center.x, y, mode: 'smooth', in: { x: -w * k / 2, y: 0 }, out: { x: w * k / 2, y: 0 } },
    { id: id(), x: x + w, y: center.y, mode: 'smooth', in: { x: 0, y: -h * k / 2 }, out: { x: 0, y: h * k / 2 } },
    { id: id(), x: center.x, y: y + h, mode: 'smooth', in: { x: w * k / 2, y: 0 }, out: { x: -w * k / 2, y: 0 } },
    { id: id(), x, y: center.y, mode: 'smooth', in: { x: 0, y: h * k / 2 }, out: { x: 0, y: -h * k / 2 } },
  ] : [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }].map(p => ({ ...p, id: id(), mode: 'corner' }))
  if (!Number.isFinite(thickness) || thickness < .5 || thickness > 512) throw Error('Wall thickness must be between 0.5 and 512 map pixels.')
  const style = structuredClone(recipe.walls)
  style.wall = { ...style.wall, alignment: 'outside', unit: units.unit, pixelsPerUnit: units.pixels }
  if (style.wall.material) style.wall.material.seed = recipe.seed
  const wall = { ...createWall(nodes, true, style), id: id(), name: 'Walls' }
  const geometry = pathGeometry(wall)
  const ring = geometry.samples.map(s => s.point).filter((p, i, list) => !i || Math.hypot(p.x - list[i - 1].x, p.y - list[i - 1].y) > 1e-6)
  if (Math.hypot(ring[0].x - ring[ring.length - 1].x, ring[0].y - ring[ring.length - 1].y) < 1e-6) ring.pop()
  const floor = validateArea({ ...createArea({ polygons: [{ outer: ring, holes: [] }] }, structuredClone(recipe.floor)), id: id(), name: 'Floor' })
  // One opening per side/quarter. Two end clearances guarantee separation across adjacent segments.
  const fiveFeet = units.unit === 'm' ? 1.524 * units.pixels : units.unit === 'ft' ? 5 * units.pixels : map.grid.cellSize
  const clearance = Math.max(thickness + 1, Math.min(fiveFeet, Math.min(w, h) * .2))
  const eligible = geometry.segments.filter(s => s.length >= doorWidth + 2 * clearance)
  if (eligible.length < recipe.doors) throw Error(`Only ${eligible.length} doors fit safely. Reduce the door count/width or increase room dimensions.`)
  let state = recipe.seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  for (let i = eligible.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [eligible[i], eligible[j]] = [eligible[j], eligible[i]] }
  const doors = eligible.slice(0, recipe.doors).map((segment, i) => {
    const distance = segment.start + clearance + doorWidth / 2 + random() * (segment.length - 2 * clearance - doorWidth)
    return deriveOpening({ ...createOpening(wall, distance / geometry.length, 'door', doorWidth), kind: 'door', status: 'closed', id: id(), name: `Door ${i + 1}`, doorType: recipe.doorType }, wall)
  })
  const objects = [floor, wall, ...doors]
  reconcileOpenings(objects)
  return { objects, floor, wall, doors, width: w, height: h, outerWidth: w + 2 * thickness, outerHeight: h + 2 * thickness, clearance, perimeter: geometry.length }
}





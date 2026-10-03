import { describe, expect, it } from 'vitest'
import { generateRoom, nextRoomName, randomRoomSeed, roomUnits, type RoomRecipe } from './roomGenerator'
import { defaultMapStyle } from './mapSettings'
import { SIMPLE_WALL, STONE_WALL } from './walls'
import { openingPlacement, reconcileOpenings, validateOpening } from './openings'
import { validateArea } from './areas'
import { pathGeometry } from './paths'
const map = { ...defaultMapStyle(), width: 2000, height: 2000, background: null }
map.grid = { ...map.grid, cellSize: 50, physicalScale: { distancePerCell: 5, unit: 'ft' } }
export const recipe: RoomRecipe = { name: '', shape: 'rectangle', width: 40, height: 30, floor: { kind: 'solid', color: '#bbaa99' }, walls: SIMPLE_WALL, doors: 2, doorType: 'single', doorWidth: 3, seed: 48217 }
const make = (patch: Partial<RoomRecipe> = {}) => { let n = 0; return generateRoom(map, { ...recipe, ...patch }, { x: 500, y: 500 }, () => `id${n++}`) }
it('uses logical feet, metres or grid cells independently from the viewport', () => {
  expect(make()).toMatchObject({ width: 400, height: 300, perimeter: 1400 })
  const metric = { ...map, grid: { ...map.grid, physicalScale: { distancePerCell: 1.524, unit: 'm' as const } } }
  expect(generateRoom(metric, { ...recipe, width: 12.192, height: 9.144, doorWidth: .9144 }, { x: 500, y: 500 }).width).toBeCloseTo(400)
  expect(roomUnits({ ...map, grid: { ...map.grid, physicalScale: undefined } })).toEqual({ unit: 'cells', pixels: 50 })
})
it('builds rectangular, square, circle and oval floors along native straight/cubic wall centerlines', () => {
  const rect = make(); expect(rect.floor).toMatchObject({ kind: 'area', x: 300, y: 350, width: 400, height: 300 }); expect(rect.wall).toMatchObject({ kind: 'path', pathKind: 'wall', closed: true }); expect(rect.wall.nodes).toHaveLength(4)
  expect(make({ shape: 'square', height: -1 })).toMatchObject({ width: 400, height: 400, perimeter: 1600 })
  for (const shape of ['circle', 'oval'] as const) { const r = make({ shape }); expect(r.floor.width).toBeCloseTo(400); expect(r.floor.height).toBeCloseTo(shape === 'circle' ? 400 : 300); expect(r.floor.geometry.polygons[0].outer.length).toBeGreaterThan(30); expect(() => validateArea(r.floor)).not.toThrow(); expect(r.wall.nodes.every(n => n.in && n.out)).toBe(true) }
  expect(make({ shape: 'circle' }).perimeter / (Math.PI * 400)).toBeCloseTo(1, 3)
})
it('preserves floor pattern parameters, normal wall presets and opening styles', () => {
  const floor = { kind: 'pattern' as const, assetId: 'floor', mode: 'repeat' as const, scale: .5, rotation: 20, offsetX: 8, offsetY: 4 }
  const r = make({ floor, walls: STONE_WALL, doorType: 'double' })
  expect(r.floor.fill).toEqual(floor); expect(r.wall.stroke).toEqual(STONE_WALL.stroke); expect(r.wall.strokeWidth).toBe(STONE_WALL.strokeWidth); expect(r.doors[0]).toMatchObject({ kind: 'door', doorType: 'double' })
})
describe.each(['rectangle', 'square', 'circle', 'oval'] as const)('%s doors', shape => {
  it.each([0, 1, 2, 3, 4])('places %i valid doors, with corner and inter-door clearances', doors => {
    const r = make({ shape, doors }), g = pathGeometry(r.wall)
    expect(r.doors).toHaveLength(doors)
    const intervals = r.doors.map(o => { expect(validateOpening(o)).toEqual(o); const p = openingPlacement(o, r.wall), segment = g.segments[p.segmentIndex]; expect(p.start - segment.start).toBeGreaterThanOrEqual(r.clearance - 1e-6); expect(segment.start + segment.length - p.end).toBeGreaterThanOrEqual(r.clearance - 1e-6); return p }).sort((a, b) => a.start - b.start)
    if (doors > 1) intervals.forEach((p, i) => { const next = intervals[(i + 1) % doors]; expect(next.start + (i === doors - 1 ? r.perimeter : 0) - p.end).toBeGreaterThanOrEqual(2 * r.clearance - 1e-6) })
    expect(() => reconcileOpenings(r.objects)).not.toThrow()
  })
})
it('uses seed deterministically; randomize changes the seed and door variation', () => {
  expect(make()).toEqual(make()); expect(make({ seed: 123 }).doors.map(d => d.position)).not.toEqual(make().doors.map(d => d.position)); expect(randomRoomSeed(48217)).not.toBe(48217)
})
it('rejects invalid or unsafe requests and unsupported maps before creation', () => {
  for (const width of [0, -1, NaN, Infinity, .1, 100000]) expect(() => make({ width })).toThrow()
  for (const patch of [{ doors: 5 }, { doors: -1 }, { seed: -1 }, { seed: .5 }, { width: 6, height: 6, doors: 4, doorWidth: 5 }]) expect(() => make(patch)).toThrow()
  expect(() => generateRoom({ ...map, mapType: 'world-map' }, recipe, { x: 0, y: 0 })).toThrow(/Battlemap/)
  expect(nextRoomName(['Room 1', 'Room 3'], '')).toBe('Room 2'); expect(nextRoomName([], ' Bibliotheek ')).toBe('Bibliotheek'); expect(() => nextRoomName([], 'a'.repeat(121))).toThrow()
})

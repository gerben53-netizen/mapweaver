import { afterEach, expect, it } from 'vitest'
import { ARL_PROFILES, arlBatches, arlContactOpacity, arlDistance, arlEnds, arlFloor, arlProfile, beyondArlEnd, arlOpeningCuts, inArlOpening } from './architecturalReadability'
import { arlKey, setArlEffectDiagnostic } from './drawArchitecturalReadability'
import { useArlStore } from '../store/arlStore'
import { createArea, rectangleGeometry, offsetObject } from '../domain/areas'
import { createWall, SIMPLE_WALL } from '../domain/walls'
import { generatedWallStyle } from '../domain/generatedWalls'
import { createOpening } from '../domain/openings'
import { defaultMapStyle } from '../domain/mapSettings'
import { projectObjects } from '../domain/projectView'
import { exportScene } from '../export/scene'
const map = { ...defaultMapStyle(), width: 600, height: 400, background: null }
const floor = () => createArea(rectangleGeometry({ x: 0, y: 0, width: 600, height: 380 }))
const wall = (id = 'marble') => createWall([{ id: 'a', x: 40, y: 100, mode: 'corner' }, { id: 'b', x: 350, y: 100, mode: 'corner' }], false, generatedWallStyle(SIMPLE_WALL, map, id, 'production-1'))
afterEach(() => { useArlStore.getState().setMode(undefined); setArlEffectDiagnostic() })
it('a doorway excludes its own wall contact but does not erase contact on a neighboring corridor wall', () => {
  const parent = wall('sung-wood'), neighbor = { ...wall('sung-wood'), id: 'corridor' }, door = createOpening(parent, .5, 'door', 40)
  const point = { x: 195, y: 105 }
  expect(inArlOpening(point, arlOpeningCuts(parent, [door]))).toBe(true)
  expect(inArlOpening(point, arlOpeningCuts(neighbor, [door]))).toBe(false)
  expect(inArlOpening({ x: 50, y: 105 }, arlOpeningCuts(parent, [door]))).toBe(false)
})
it('inherits the Battlemap default independently of temporary diagnostics without modifying snapshots', () => {
  expect(useArlStore.getState().mode).toBeUndefined()
  const f = floor(), w = wall(), p = { map, objects: [f, w], layers: [{ id: 'objects', name: 'Objects', visible: true, locked: false, objectIds: [f.id, w.id] }] }, before = JSON.stringify(p)
  expect(arlBatches(map, p.objects, 'OFF')).toEqual([])
  useArlStore.getState().setMode('C')
  expect(exportScene(p, { scale: 1, transparent: false, includeGrid: false }).arlMode).toBe('C')
  expect(exportScene(p, { scale: 2, transparent: false, includeGrid: false, arlMode: 'B' }).arlMode).toBe('B')
  expect(JSON.stringify(p)).toBe(before)
})
it('wall batches are independent of floor polygons, visibility and background', () => {
  const f = floor(), w = wall()
  expect(arlBatches(map, [f, w], 'B')[0].floors).toEqual([f])
  expect(arlBatches(map, [w, f], 'B')).toHaveLength(1)
  expect(arlBatches({ ...map, background: { id: 'unknown', name: 'background', width: 600, height: 400 } }, [w], 'C')).toHaveLength(1)
  for (const a of [{ ...f, fill: { kind: 'none' as const } }, { ...f, opacity: .5 }, { ...f, ceiling: true as const }]) expect(arlFloor(a)).toBe(false)
  const p = { objects: [f, w], layers: [{ id: 'floor', name: 'Floor', visible: false, locked: false, objectIds: [f.id] }, { id: 'walls', name: 'Walls', visible: true, locked: false, objectIds: [w.id] }] }
  expect(arlBatches(map, projectObjects(p, true), 'B')).toHaveLength(1)
})
it('keeps stamps, openings, render-strata and alpha scopes in original z order', () => {
  const f = floor(), a = wall(), b = wall('refined-timber'), door = createOpening(a, .5, 'door', 30)
  expect(arlBatches(map, [f, a, b], 'C')).toHaveLength(1)
  expect(arlBatches(map, [f, a, door, b], 'C').map(s => s.start)).toEqual([1, 3])
  expect(arlBatches(map, [f, a, b], 'C', [2]).map(s => s.start)).toEqual([1, 2])
  expect(arlBatches(map, [f, { ...a, opacity: .5 }, b], 'B')[0].walls).toEqual([b])
  const unknown = { ...a, wall: { ...a.wall!, generated: { ...a.wall!.generated!, id: 'unbenchmarked-material' } } }
  expect(arlBatches(map, [f, unknown], 'C')).toEqual([])
})
it.each(['living-root', 'natural-cave-rock', 'rough-stone', 'sung-wood'])('C does not contour or darken organic/rough %s artwork', id => {
  const p = arlProfile(wall(id)); expect(p.edgeOpacity).toBe(0); expect(p.massOpacity).toBe(0)
})
it('activates the organic ARL profile for saved production Sung Wood walls', () => {
  const w = wall('sung-wood'), f = floor()
  expect(arlBatches(map, [f, w], 'C')[0].walls).toEqual([w])
  expect(arlProfile(w)).toBe(ARL_PROFILES.organic)
})
it.each(Object.entries(ARL_PROFILES))('%s contact has a continuous gradient and bounded monotonic map-space falloff', (_, p) => {
  expect(arlContactOpacity(0, p)).toBe(p.shadowOpacity)
  expect(arlContactOpacity(.5, p)).toBeLessThan(p.shadowOpacity)
  expect(arlContactOpacity(p.shadowWidth, p)).toBe(0)
  expect(arlContactOpacity(p.shadowWidth + 1, p)).toBe(0)
  expect(arlContactOpacity(NaN, p)).toBe(0)
  let previous: number = p.shadowOpacity
  for (let distance = 0; distance <= p.shadowWidth; distance += .1) {
    const opacity = arlContactOpacity(distance, p)
    expect(opacity).toBeGreaterThanOrEqual(0); expect(opacity).toBeLessThanOrEqual(previous)
    expect(arlContactOpacity(distance * 2 / 2, p)).toBe(opacity)
    previous = opacity
  }
})
it('isolates diagnostic cache entries without changing the wall or normal rendering mode', () => {
  const w = wall(), f = floor(), batch = { start: 1, walls: [w], floors: [f] }, objects = [f, w], before = JSON.stringify(objects)
  const normal = arlKey(batch, map, objects, 'C')
  const keys = new Set<string>()
  for (const effect of ['contact', 'edge', 'mass'] as const) { setArlEffectDiagnostic(effect); keys.add(arlKey(batch, map, objects, 'C')) }
  expect(keys.size).toBe(3); expect(keys.has(normal)).toBe(false)
  setArlEffectDiagnostic(); expect(arlKey(batch, map, objects, 'C')).toBe(normal)
  expect(JSON.stringify(objects)).toBe(before)
})
it('cache keys invalidate geometry, curve, movement, width, material, revision, opening width and mode; not zoom/name/door state', () => {
  const f = floor(), w = wall(), door = createOpening(w, .5, 'door', 30), batch = { start: 1, walls: [w], floors: [f] }, all = [f, w, door], key = arlKey(batch, map, all, 'B')
  for (const next of [offsetObject(w, 10, 0), { ...w, strokeWidth: w.strokeWidth + 1 }, { ...w, nodes: [{ ...w.nodes[0], out: { x: 20, y: -40 } }, w.nodes[1]] }, wall('living-root'), { ...w, wall: { ...w.wall!, generated: { ...w.wall!.generated!, revision: 'test', seed: 13 } } }]) expect(arlKey({ ...batch, walls: [next] }, map, [f, next, door], 'B')).not.toBe(key)
  expect(arlKey({ ...batch, floors: [offsetObject(f, 0, 1)] }, map, all, 'B')).toBe(key)
  expect(arlKey(batch, map, [f, w, { ...door, openingWidth: 40 }], 'B')).not.toBe(key)
  expect(arlKey(batch, map, all, 'C')).not.toBe(key)
  expect(arlKey(batch, map, [f, { ...w, name: 'Renamed' }, door.kind === 'door' ? { ...door, status: 'open-left' } : door], 'B')).toBe(key)
  expect(arlKey(batch, map, [f], 'B')).not.toBe(key)
})
it('bounded world-distance field labels material transitions once with stable topmost ties', () => {
  const seeds = new Uint16Array(25); seeds[11] = 1; seeds[13] = 2
  const a = arlDistance(seeds, 5, 5, 8), b = arlDistance(seeds, 5, 5, 8)
  expect(a.owner[12]).toBe(2); expect(a.distance[12]).toBe(1); expect(a).toEqual(b)
  expect(a.owner[11]).toBe(1); expect(a.distance[11]).toBe(0)
  expect(arlDistance(new Uint16Array(9), 3, 3, 5).owner.every(o => o === 0)).toBe(true)
})
it('excludes shadow past free endpoints; closed rooms have no endpoint exclusions', () => {
  const w = wall(), ends = arlEnds(w)
  expect(beyondArlEnd({ x: 38, y: 105 }, ends, w.strokeWidth)).toBe(true)
  expect(beyondArlEnd({ x: 353, y: 103 }, ends, w.strokeWidth)).toBe(true)
  expect(beyondArlEnd({ x: 100, y: 105 }, ends, w.strokeWidth)).toBe(false)
  expect(arlEnds({ ...w, closed: true })).toEqual([])
})

import { expect, it } from 'vitest'
import { buildSnapTargets, snapSelection } from './objectSnapping'
import { DEFAULT_GRID } from './mapSettings'
import { createLayeredContent } from './layers'
import type { StampObject } from './models'
const stamp = (id: string, x: number, locked = false): StampObject => ({ id, kind: 'stamp', assetId: 'image', x, y: 100, width: 40, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, locked })
const map = { width: 1000, height: 800 }
it('offers bounded equal-gap guidance when no edge match is nearby', () => {
  const targets = { x: [], y: [], gapX: [{ position: 200, start: 0, end: 200, gap: 120 }] }
  const result = snapSelection({ x: 175, y: 40, width: 40, height: 40 }, targets, { ...DEFAULT_GRID, snapEnabled: false }, 1, true, false)
  expect(result.delta.x).toBe(5)
  expect(result.guides[0].label).toBe('Equal gaps: 40 px')
})
it('excludes individually hidden objects from snap targets', () => {
  const state = createLayeredContent([{ ...stamp('hidden', 100), visible: false }])
  expect(buildSnapTargets(state.objects, state.layers, [], map).x.map(t => t.position)).toEqual([500])
})
it('uses one joint correction and bypasses grid and objects with Alt', () => {
  const state = createLayeredContent([stamp('target', 100)])
  const targets = buildSnapTargets(state.objects, state.layers, [], map)
  const box = { x: 63, y: 62, width: 40, height: 40 }
  const snapped = snapSelection(box, targets, { ...DEFAULT_GRID, snapEnabled: true }, 1, true, false)
  expect(snapped.delta).toEqual({ x: -3, y: -2 })
  expect(snapped.guides).toHaveLength(2)
  expect(snapSelection(box, targets, { ...DEFAULT_GRID, snapEnabled: true }, 1, true, true)).toEqual({ delta: { x: 0, y: 0 }, guides: [] })
})
it.each([.25, 1, 4])('keeps tolerance at eight screen pixels at zoom %s', zoom => {
  const targets = { x: [{ position: 100, start: 0, end: 400 }], y: [] }
  const close = snapSelection({ x: 100 + 7 / zoom, y: 0, width: 40, height: 40 }, targets, DEFAULT_GRID, zoom, true, false)
  expect(close.delta.x * zoom).toBeCloseTo(-7)
  const far = snapSelection({ x: 100 + 9 / zoom, y: 0, width: 40, height: 40 }, targets, DEFAULT_GRID, zoom, true, false)
  expect(far.delta.x).toBe(0)
})
it('excludes selection and locked/hidden targets while retaining the map center', () => {
  const state = createLayeredContent([stamp('selected', 10), stamp('locked', 100, true), stamp('hidden', 200)])
  const layers = [{ ...state.layers[0], objectIds: ['selected', 'locked'] }, { ...state.layers[0], id: 'hidden', visible: false, objectIds: ['hidden'] }]
  const targets = buildSnapTargets(state.objects, layers, ['selected'], map)
  expect(targets.x.map(target => target.position)).toEqual([500])
  expect(targets.y.map(target => target.position)).toEqual([400])
})
it('can turn object snapping off independently of grid snapping', () => {
  const targets = { x: [{ position: 100, start: 0, end: 400 }], y: [] }
  const result = snapSelection({ x: 102, y: 90, width: 40, height: 40 }, targets, { ...DEFAULT_GRID, snapEnabled: true }, 1, false, false)
  expect(result.delta).toEqual({ x: -22, y: -10 }); expect(result.guides).toEqual([])
})

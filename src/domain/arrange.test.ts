import { describe, expect, it } from 'vitest'
import { arrangeObjects } from './arrange'
import type { ArrangeAction } from './arrange'
import type { StampObject } from './models'
import { selectionBounds } from './layers'
import { createPath } from './paths'

const map = { width: 1000, height: 800 }
const stamp = (id: string, x: number, y: number, width = 40, height = 20, rotation = 0): StampObject => ({ id, kind: 'stamp', assetId: 'image', x, y, width, height, rotation, scaleX: 1, scaleY: 1, opacity: 1 })
describe('visual arrangement', () => {
  it('matches stroked path width and height by scaling geometry and stroke together', () => {
    const path = createPath([{ id: 'a', x: 200, y: 200, mode: 'corner' }, { id: 'b', x: 260, y: 250, mode: 'corner' }], false, 20)
    const source = [stamp('primary', 0, 0, 140, 180), path]
    expect(selectionBounds([arrangeObjects(source, 'same-width', map)[1]]).width).toBeCloseTo(140)
    expect(selectionBounds([arrangeObjects(source, 'same-height', map)[1]]).height).toBeCloseTo(180)
    const exact = selectionBounds([arrangeObjects(source, 'same-size', map)[1]])
    expect(exact.width).toBeCloseTo(140); expect(exact.height).toBeCloseTo(180)
  })
  it.each<ArrangeAction>(['left', 'center-x', 'right', 'top', 'center-y', 'bottom'])('aligns %s to the primary rotated bounds', action => {
    const source = [stamp('primary', 100, 100, 60, 30, 37), stamp('second', 400, 200, 40, 20, 70)]
    const result = arrangeObjects(source, action, map)
    const [a, b] = result.map(object => selectionBounds([object]))
    const horizontal = ['left', 'center-x', 'right'].includes(action)
    const axis = horizontal ? 'x' : 'y', dimension = horizontal ? 'width' : 'height'
    const factor = action.startsWith('center') ? .5 : ['right', 'bottom'].includes(action) ? 1 : 0
    expect(a[axis] + a[dimension] * factor).toBeCloseTo(b[axis] + b[dimension] * factor)
    expect(result[0]).toEqual(source[0])
    expect(source[1].x).toBe(400)
  })
  it('distributes centers, preserves endpoints and selection order', () => {
    const source = [stamp('last', 400, 300), stamp('first', 0, 0), stamp('middle', 20, 30, 80)]
    const result = arrangeObjects(source, 'distribute-x', map)
    expect(result.map(object => object.id)).toEqual(['last', 'first', 'middle'])
    expect(result[0]).toEqual(source[0]); expect(result[1]).toEqual(source[1])
    expect(result[2].x + result[2].width / 2).toBe(220)
    const vertical = arrangeObjects(source, 'distribute-y', map)
    expect(vertical[2].y + vertical[2].height / 2).toBe(160)
  })
  it('centers the entire selection without changing internal distances', () => {
    const source = [stamp('a', 0, 0), stamp('b', 100, 50)]
    const result = arrangeObjects(arrangeObjects(source, 'map-x', map), 'map-y', map)
    const bounds = selectionBounds(result)
    expect(bounds.x + bounds.width / 2).toBe(500)
    expect(bounds.y + bounds.height / 2).toBe(400)
    expect(result[1].x - result[0].x).toBe(100)
    expect(result[1].y - result[0].y).toBe(50)
  })
  it('matches visual width proportionally and exact size for representable rotations', () => {
    const source = [stamp('a', 0, 0, 80, 40), stamp('b', 100, 100, 20, 40, 90)]
    const proportional = arrangeObjects(source, 'same-width', map)
    expect(selectionBounds([proportional[1]]).width).toBeCloseTo(80)
    expect(proportional[1].width / proportional[1].height).toBe(.5)
    const exact = arrangeObjects(source, 'same-size', map)
    expect(selectionBounds([exact[1]]).width).toBeCloseTo(80)
    expect(selectionBounds([exact[1]]).height).toBeCloseTo(40)
  })
  it('rejects the whole operation for locks, overflow and impossible rotated sizes', () => {
    expect(() => arrangeObjects([stamp('a', 0, 0), { ...stamp('b', 100, 100), locked: true }], 'left', map)).toThrow('Unlock')
    expect(() => arrangeObjects([stamp('a', 0, 0), stamp('b', 100, 100, 40, 20, 45)], 'same-size', map)).toThrow('cannot match')
    expect(() => arrangeObjects([stamp('a', 0, 0)], 'map-x', { ...map, width: 1e12 })).toThrow('limits')
  })
})

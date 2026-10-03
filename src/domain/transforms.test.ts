import { describe, expect, it, vi } from 'vitest'
import { Util } from 'konva/lib/Util'
import { Group } from 'konva/lib/Group'
import { Rect } from 'konva/lib/shapes/Rect'
import { Transformer } from 'konva/lib/shapes/Transformer'
import { boundTransformBox, flipTransform, MIN_OBJECT_SIZE, normalizeNodeTransform, normalizeRotation, objectNodeProps, parseNumericProperty, proportionalSize, snapRotation } from './transforms'

const original = { x: 200, y: 100, width: 100, height: 200, rotation: 30, scaleX: 1, scaleY: 1 }
describe('object transforms', () => {
  it.each([[-30, 330], [360, 0], [725, 5], [-720, 0]])('normalizes %s degrees to %s', (input, expected) => expect(normalizeRotation(input)).toBe(expected))
  it('snaps only with Shift, including wraparound', () => {
    expect(snapRotation(23, true)).toBe(30)
    expect(snapRotation(353, true)).toBe(0)
    expect(snapRotation(-16, true)).toBe(345)
    expect(snapRotation(23, false)).toBe(23)
  })
  it('scales proportionally and bounds both dimensions', () => {
    expect(proportionalSize(100, 200, 1.5)).toEqual({ width: 150, height: 300 })
    expect(proportionalSize(100, 200, 0.001)).toEqual({ width: MIN_OBJECT_SIZE, height: MIN_OBJECT_SIZE * 2 })
    expect(() => proportionalSize(100, 200, -1)).toThrow()
    expect(() => proportionalSize(100, 200, 0)).toThrow()
  })
  it('bakes temporary positive Konva scale into dimensions and preserves center and mirror signs', () => {
    const next = normalizeNodeTransform({ ...original, scaleX: -1 }, { x: 400, y: 300, width: 100, height: 200, scaleX: 2, scaleY: 2, rotation: -10 })
    expect(next).toEqual({ x: 300, y: 100, width: 200, height: 400, rotation: 350, scaleX: -1, scaleY: 1 })
    expect(objectNodeProps(next)).toMatchObject({ x: 400, y: 300, offsetX: 100, offsetY: 200, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 })
    expect(() => normalizeNodeTransform(original, { x: 0, y: 0, width: 100, height: 200, scaleX: -1, scaleY: 1, rotation: 0 })).toThrow()
  })
  it('does not enlarge an existing tiny stamp when only moving or rotating it', () => {
    const tiny = { ...original, width: 1, height: 2 }
    expect(normalizeNodeTransform(tiny, { x: 10, y: 20, width: 1, height: 2, scaleX: 1, scaleY: 1, rotation: 90 }, 'rotate')).toMatchObject({ width: 1, height: 2, rotation: 90 })
  })
  it.each(['horizontal', 'vertical'] as const)('flips %s in place and is reversible', (axis) => {
    const flipped = flipTransform(original, axis)
    expect(objectNodeProps(flipped)).toEqual(objectNodeProps(original))
    expect(flipTransform(flipped, axis)).toEqual(original)
    expect(flipped.scaleX).toBe(axis === 'horizontal' ? -1 : 1)
    expect(flipped.scaleY).toBe(axis === 'vertical' ? -1 : 1)
  })
  it.each(['', ' ', 'NaN', 'Infinity', '-Infinity', '1e999', '12x'])('rejects invalid numeric input %j', (input) => expect(parseNumericProperty(input)).toBeNull())
  it('accepts finite coordinates outside the map', () => { expect(parseNumericProperty('-123.5')).toBe(-123.5); expect(parseNumericProperty('0')).toBe(0) })
  it('keeps a real Konva Transformer aligned through zoom, pan and normalized resize', () => {
    // Disable only Konva's browser pixel-fingerprinting probe; use real geometry. 
    vi.spyOn(Util, 'isCanvasFarblingActive').mockReturnValue(false)
    const viewport = new Group({ x: -50, y: 80, scaleX: 0.4, scaleY: 0.4 })
    const object = new Group(objectNodeProps({ ...original, rotation: 0 }))
    const imageBounds = new Rect({ width: original.width, height: original.height })
    object.add(imageBounds); viewport.add(object)
    const transformer = new Transformer({ nodes: [object] })
    viewport.add(transformer)
    expect(transformer.getClientRect().width).toBeGreaterThan(0)
    expect(transformer.width()).toBeCloseTo(40)
    viewport.setAttrs({ x: 200, y: -100, scaleX: 2, scaleY: 2 })
    expect(transformer.width()).toBeCloseTo(200)
    expect(transformer.getAbsolutePosition().x).toBeCloseTo(200 + original.x * 2)
    object.setAttrs(objectNodeProps({ ...original, width: 300, height: 600, rotation: 0 }))
    imageBounds.size({ width: 300, height: 600 }); transformer.forceUpdate()
    expect(transformer.width()).toBeCloseTo(600)
    transformer.nodes([]); expect(transformer.nodes()).toEqual([])
    viewport.destroy()
  })
})



it('bounds Transformer resizing in map units at fractional zoom without blocking rotation of small imported stamps', () => {
  const previous = { width: 50, height: 100 }
  expect(boundTransformBox(previous, { width: 3, height: 6 }, 0.5, false)).toBe(previous)
  expect(boundTransformBox(previous, { width: 4, height: 8 }, 0.5, false)).toEqual({ width: 4, height: 8 })
  expect(boundTransformBox(previous, { width: -4, height: 8 }, 0.5, false)).toBe(previous)
  expect(boundTransformBox(previous, { width: 0.5, height: 1 }, 0.5, true)).toEqual({ width: 0.5, height: 1 })
})


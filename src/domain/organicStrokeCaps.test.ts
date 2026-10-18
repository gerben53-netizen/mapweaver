import { describe, expect, it } from 'vitest'
import { organicCapScales, shapeOrganicCap } from './organicStrokeCaps'
import { applyLandStroke, defaultLandBrush, landFootprint, resampleLandStroke } from './landBrush'
import { allRings, createArea, normalizeGeometry, rectangleGeometry, validateArea } from './areas'
import { defaultLandArea } from './landAreas'

const shapes = ['organicSoft', 'organicRugged', 'organicFine'] as const
const center = { x: 500, y: 350 }
const paths = [
  [center], [center, { x: 500.001, y: 350 }], [center, { x: 505, y: 350 }],
  [center, { x: 900, y: 350 }], [center, { x: 550, y: 360 }, { x: 600, y: 400 }, { x: 650, y: 450 }],
  [center, { x: 600, y: 350 }, { x: 600, y: 500 }, { x: 590, y: 360 }],
]

describe('organic stroke caps', () => {
  it('keeps a dab unchanged and approaches it continuously for tiny gestures', () => {
    expect(organicCapScales([center], 120)).toEqual([1])
    expect(organicCapScales([center, { x: 500.001, y: 350 }], 120)[0]).toBeGreaterThan(.999)
  })
  it('treats both ends and neighbours by distance while leaving the body exact', () => {
    const points = resampleLandStroke([center, { x: 1100, y: 350 }], 120)
    const scales = organicCapScales(points, 120)
    expect(scales[0]).toBeCloseTo(.45); expect(scales.at(-1)).toBeCloseTo(.45)
    expect(scales[1]).toBeLessThan(1); expect(scales.at(-2)!).toBeLessThan(1)
    expect(scales[10]).toBe(1)
    const ring = landFootprint(points[10], { ...defaultLandBrush, shape: 'organicRugged' }, 713)
    expect(shapeOrganicCap(ring, points[10], 0, scales[10])).toBe(ring)
    const reverse = organicCapScales([...points].reverse(), 120).reverse()
    scales.forEach((v, i) => expect(v).toBeCloseTo(reverse[i], 12))
  })
  it.each([0, Math.PI / 2, Math.PI, -.8])('uses local tangent %s without changing transverse width', angle => {
    const rotate = (p: { x: number; y: number }) => ({ x: center.x + p.x * Math.cos(angle) - p.y * Math.sin(angle), y: center.y + p.x * Math.sin(angle) + p.y * Math.cos(angle) })
    const ring = [{ x: -30, y: -15 }, { x: 30, y: -15 }, { x: 30, y: 15 }, { x: -30, y: 15 }].map(rotate)
    const shaped = shapeOrganicCap(ring, center, angle, .45)
    shaped.forEach((p, i) => {
      const dx = p.x - center.x, dy = p.y - center.y, original = ring[i]
      expect(-dx * Math.sin(angle) + dy * Math.cos(angle)).toBeCloseTo(-(original.x - center.x) * Math.sin(angle) + (original.y - center.y) * Math.cos(angle), 10)
    })
    expect(() => normalizeGeometry({ polygons: [{ outer: shaped, holes: [] }] })).not.toThrow()
  })
  it.each(shapes)('%s has deterministic valid Add/Remove for short, long, curved, sharp and reversed strokes', shape => {
    for (const action of ['add', 'remove'] as const) for (const path of paths) for (const points of [path, [...path].reverse()]) {
      const land = { ...createArea(rectangleGeometry({ x: 100, y: 100, width: 400, height: 700 })), id: 'land', land: defaultLandArea('landmass') }
      const input = { lands: [land], editable: ['land'], map: { width: 1400, height: 1200 }, points, brush: { ...defaultLandBrush, shape, action, size: 120, softness: 0, smoothing: 'off' as const }, seed: 713, newId: 'new' }
      const result = applyLandStroke(input)
      expect(result).toEqual(applyLandStroke(input))
      expect(result.replacements).toHaveLength(1); expect(result.added).toHaveLength(0)
      result.replacements.forEach(o => { validateArea(o); expect(allRings(o.geometry).flat().length).toBeLessThanOrEqual(2048) })
    }
  })
})

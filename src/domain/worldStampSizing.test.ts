import { describe, expect, it } from 'vitest'
import { DEFAULT_GRID } from './mapSettings'
import { createPlacedObject, resolvePlacementSize } from './placement'
import { objectNodeProps, normalizeNodeTransform } from './transforms'
import { selectionBounds } from './layers'
import type { StampAsset } from './models'
const stamp: StampAsset = { id: 'desk', kind: 'stamp', name: 'Desk', categoryId: 'uncategorized', naturalWidth: 50, naturalHeight: 25, mimeType: 'image/png', contentHash: 'a'.repeat(64), createdAt: '', sizing: { sizingMode: 'world', defaultWidth: 10, defaultHeight: null, sizingUnit: 'ft', aspectRatioLocked: true, sizingScope: 'any', applicableMapTypes: [] } }
const map = (distancePerCell = 5, cellSize = 50, unit: 'ft' | 'm' = 'ft') => ({ width: 800, height: 600, grid: { ...DEFAULT_GRID, cellSize, physicalScale: { distancePerCell, unit } } })
describe('world stamp geometry in logical map pixels', () => {
  it.each([50, 100, 140])('converts world widths with a %s px grid', cellSize => {
    for (const [width, distance, cells] of [[2.5,5,.5],[5,5,1],[10,5,2],[15,5,3],[20,5,4],[10,10,1],[20,10,2]]) {
      const object = createPlacedObject({ ...stamp, sizing: { ...stamp.sizing!, defaultWidth: width } }, { x: 400, y: 300 }, map(distance, cellSize))
      expect(object.width).toBeCloseTo(cells * cellSize)
      expect(object.height).toBeCloseTo(cells * cellSize / 2)
      expect(object.x + object.width / 2).toBe(400)
      expect(selectionBounds([object]).width).toBeCloseTo(object.width)
      const node = objectNodeProps(object)
      expect(node.width).toBe(object.width)
      expect(normalizeNodeTransform(object, node, 'move').width).toBe(object.width)
    }
  })
  it.each([[10,'ft',1.524,'m'],[3.048,'m',5,'ft'],[3,'m',1.5,'m']] as const)('converts %s %s on %s %s per cell', (width, unit, distance, mapUnit) => {
    expect(resolvePlacementSize({ ...stamp, sizing: { ...stamp.sizing!, defaultWidth: width, sizingUnit: unit } }, map(distance,50,mapUnit)).width).toBeCloseTo(100)
  })
  it.each([[50,50,100],[100,25,25],[25,100,400]])('derives locked height from %s × %s source', (naturalWidth,naturalHeight,height) => {
    expect(resolvePlacementSize({ ...stamp,naturalWidth,naturalHeight },map())).toEqual({width:100,height})
  })
  it('supports height-only and independent unlocked dimensions', () => {
    expect(resolvePlacementSize({ ...stamp,sizing:{...stamp.sizing!,defaultWidth:null,defaultHeight:5} },map())).toEqual({width:100,height:50})
    expect(resolvePlacementSize({ ...stamp,sizing:{...stamp.sizing!,aspectRatioLocked:false,defaultHeight:15} },map())).toEqual({width:100,height:150})
  })
  it('explains native fallback for missing or inapplicable scale', () => {
    expect(resolvePlacementSize(stamp,{...map(),grid:DEFAULT_GRID})).toMatchObject({width:50,height:25,reason:expect.stringContaining('physical map scale')})
    expect(resolvePlacementSize({...stamp,sizing:{...stamp.sizing!,applicableMapTypes:['world-map']}},map())).toMatchObject({width:50,height:25,reason:expect.stringContaining('does not apply')})
  })
})

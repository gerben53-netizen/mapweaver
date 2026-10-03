import { describe, expect, it } from 'vitest'
import { createPlacedObject, dropPoint, placementSize } from './placement'
import { filterAssets } from '../library/filterAssets'
import type { StampAsset } from './models'
const asset: StampAsset = { id: 'tree', name: 'Oak Tree', categoryId: 'trees', naturalWidth: 800, naturalHeight: 1600, mimeType: 'image/png', createdAt: '', contentHash: 'abc' }
describe('stamp placement and filtering', () => {
  it.each([0.1, 0.5, 1, 4])('converts a screen drop to map coordinates at zoom %s', (zoom) => {
    const pan = { x: -50, y: 70 }, origin = { x: 240, y: 125 }
    expect(dropPoint({ x: 500 * zoom + pan.x + origin.x, y: 400 * zoom + pan.y + origin.y }, origin, { zoom, pan }, { width: 1600, height: 1000 })).toEqual({ x: 500, y: 400 })
  })
  it.each([{ x: -1, y: 0 }, { x: 1001, y: 40 }, { x: 2, y: 701 }, { x: 5, y: -1 }])('rejects drops outside the map', (point) => {
    expect(dropPoint(point, { x: 0, y: 0 }, { zoom: 1, pan: { x: 0, y: 0 } }, { width: 1000, height: 700 })).toBeNull()
  })
  it('limits both dimensions to a quarter of the map, preserves ratio and never upscales', () => {
    expect(placementSize(asset, { width: 1000, height: 800 })).toEqual({ width: 100, height: 200 })
    expect(placementSize({ naturalWidth: 20, naturalHeight: 10 }, { width: 1000, height: 800 })).toEqual({ width: 20, height: 10 })
  })
  it('centers independent placed objects referencing a shared asset', () => {
    const a = createPlacedObject(asset, { x: 300, y: 400 }, { width: 1000, height: 800 })
    const b = createPlacedObject(asset, { x: 300, y: 400 }, { width: 1000, height: 800 })
    expect(a.x + a.width / 2).toBe(300); expect(a.y + a.height / 2).toBe(400)
    expect(a.assetId).toBe(b.assetId); expect(a.id).not.toBe(b.id)
    expect(a).toMatchObject({ rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 })
  })
  it('combines case-insensitive name search and category filters', () => {
    const assets = [asset, { ...asset, id: 'pine', name: 'Pine', categoryId: 'forest' }]
    expect(filterAssets(assets, ' OAK ', '')).toEqual([asset])
    expect(filterAssets(assets, 'oak', 'forest')).toEqual([])
    expect(filterAssets(assets, '', 'forest')).toHaveLength(1)
    expect(filterAssets(assets, '', '')).toHaveLength(2)
  })
})

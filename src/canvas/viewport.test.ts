import { describe, expect, it } from 'vitest'
import { clampZoom, fitToMap, mapToScreen, screenToMap, zoomAtPoint, wheelZoom, MIN_ZOOM, MAX_ZOOM } from './viewport'

 describe('viewport geometry', () => {
  it('clamps zoom at both limits', () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM)
    expect(clampZoom(100)).toBe(MAX_ZOOM)
    expect(clampZoom(0.75)).toBe(0.75)
  })
  it('converts map coordinates with nonzero pan and fractional zoom in both directions', () => {
    const viewport = { zoom: 0.4, pan: { x: -80, y: 30 } }
    expect(mapToScreen({ x: 500, y: 250 }, viewport)).toEqual({ x: 120, y: 130 })
    expect(screenToMap({ x: 120, y: 130 }, viewport)).toEqual({ x: 500, y: 250 })
  })
  it.each([0.001, 0.5, 2, 100])('keeps the map point under the pointer when zooming to %s', (zoom) => {
    const viewport = { zoom: 0.8, pan: { x: -125, y: 43 } }
    const pointer = { x: 713, y: 219 }
    const anchor = screenToMap(pointer, viewport)
    const next = zoomAtPoint(viewport, pointer, zoom)
    expect(mapToScreen(anchor, next).x).toBeCloseTo(pointer.x)
    expect(mapToScreen(anchor, next).y).toBeCloseTo(pointer.y)
    expect(viewport).toEqual({ zoom: 0.8, pan: { x: -125, y: 43 } })
  })
  it.each([{ width: 850, height: 550 }, { width: 600, height: 900 }])('fits the entire map with padding and centers it in $width x $height', (canvas) => {
    const map = { width: 1600, height: 1000 }
    const result = fitToMap(map, canvas)
    expect(result.pan.x).toBeGreaterThanOrEqual(48)
    expect(result.pan.y).toBeGreaterThanOrEqual(48)
    expect(mapToScreen({ x: 800, y: 500 }, result)).toEqual({ x: canvas.width / 2, y: canvas.height / 2 })
    expect(result).toEqual(fitToMap(map, canvas))
  })
  it('uses current dimensions and bounds extreme fit requests', () => {
    const map = { width: 1600, height: 1000 }
    expect(fitToMap(map, { width: 1200, height: 900 }).zoom).toBeGreaterThan(fitToMap(map, { width: 800, height: 600 }).zoom)
    expect(fitToMap(map, { width: 0, height: 0 }).zoom).toBe(MIN_ZOOM)
    expect(fitToMap(map, { width: 100000, height: 100000 }).zoom).toBe(MAX_ZOOM)
  })
  it('normalizes wheel lines and pages and bounds large wheel input', () => {
    expect(wheelZoom(1, 1, 1, 500)).toBe(wheelZoom(1, 16, 0, 500))
    expect(wheelZoom(1, 0.1, 2, 500)).toBe(wheelZoom(1, 50, 0, 500))
    expect(wheelZoom(MIN_ZOOM, 10000, 0, 500)).toBe(MIN_ZOOM)
    expect(wheelZoom(MAX_ZOOM, -10000, 0, 500)).toBe(MAX_ZOOM)
  })
})

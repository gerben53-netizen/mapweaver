import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWall, SIMPLE_WALL } from '../domain/walls'
import { generatedWallStyle } from '../domain/generatedWalls'
import { createOpening } from '../domain/openings'
import { defaultMapStyle } from '../domain/mapSettings'
import { clearGeneratedSurfaces, generatedRenderStats, loadGeneratedWall, paintGeneratedWall } from './drawGeneratedWall'

const contexts: CanvasRenderingContext2D[] = []
const map = { ...defaultMapStyle(), width: 600, height: 400, background: null }
function context() {
  return new Proxy({ drawImage: vi.fn(), clip: vi.fn(), shadowColor: '', shadowBlur: 0 }, {
    get(target, key) { return key in target ? target[key as keyof typeof target] : vi.fn() },
  }) as unknown as CanvasRenderingContext2D
}
beforeEach(() => {
  clearGeneratedSurfaces(); contexts.length = 0
  vi.stubGlobal('Image', class { src = ''; naturalWidth = 128; naturalHeight = 128; async decode() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => {
    const c = context(); contexts.push(c); return c
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
const shapes = {
  straight: [[40, 100], [350, 100]],
  corner: [[40, 100], [250, 100], [250, 260]],
  irregular: [[40, 100], [180, 130], [250, 260]],
  closed: [[40, 100], [250, 100], [250, 260], [40, 260]],
  broadCurve: [[40, 100], [350, 100]],
  tightCurve: [[40, 100], [140, 100]],
}
it.each(Object.entries(shapes))('grounds %s using one cached visual silhouette across widths and materials', async (name, coordinates) => {
  for (const material of ['pale-palace-stone', 'rough-stone', 'natural-cave-rock', 'refined-timber']) {
    for (const width of [5, 10, 30]) {
      const nodes = coordinates.map(([x, y], i) => ({ id: String(i), x, y, mode: 'corner' as const,
        ...(name.includes('Curve') ? i === 0 ? { out: { x: 30, y: -60 } } : { in: { x: -30, y: -60 } } : {}),
      }))
      const p = createWall(nodes, name === 'closed', { ...generatedWallStyle(SIMPLE_WALL, map, material, 'production-1'), strokeWidth: width })
      await loadGeneratedWall(p.wall!.generated!)
      const openings = name === 'closed' ? [] : [createOpening(p, .25, 'door', 20)]
      const out = context(), builds = generatedRenderStats.builds, first = contexts.length
      paintGeneratedWall(out, p, openings)
      const composed = contexts.slice(first).filter(c => c.shadowColor === 'rgba(20, 23, 20, 0.16)')
      expect(composed).toHaveLength(1)
      expect(composed[0].drawImage).toHaveBeenCalledTimes(1)
      expect(composed[0].shadowBlur).toBeCloseTo(4)
      expect(composed[0].clip).toHaveBeenCalledTimes(openings.length)
      paintGeneratedWall(out, p, openings)
      expect(generatedRenderStats.builds).toBe(builds + 1)
      expect(out.drawImage).toHaveBeenCalledTimes(2)
    }
  }
})

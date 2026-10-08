import { afterEach, expect, it, vi } from 'vitest'
import { paintArlBatch, clearArlCache, arlCacheStats } from './drawArchitecturalReadability'
import { generatedSurface, paintGeneratedWall } from './drawGeneratedWall'
import { createArea, rectangleGeometry } from '../domain/areas'
import { createWall, SIMPLE_WALL } from '../domain/walls'
import { generatedWallStyle } from '../domain/generatedWalls'
import { defaultMapStyle } from '../domain/mapSettings'
import { useAssetContext } from '../projects/assets'
vi.mock('./drawGeneratedWall', () => ({
  generatedSurface: vi.fn(() => ({ canvas: { width: 2_097_152, height: 1 }, x: 40, y: 90, width: 310, height: 20 })),
  generatedSurfaceKey: vi.fn(() => 'source-key'), paintGeneratedWall: vi.fn(),
}))
const map = { ...defaultMapStyle(), width: 600, height: 400, background: null }
const floor = createArea(rectangleGeometry({ x: 0, y: 0, width: 600, height: 400 }))
const wall = createWall([{ id: 'a', x: 40, y: 100, mode: 'corner' }, { id: 'b', x: 350, y: 100, mode: 'corner' }], false, generatedWallStyle(SIMPLE_WALL, map, 'marble', 'production-1'))
const context = { save: vi.fn(), translate: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D
afterEach(() => { clearArlCache(); vi.clearAllMocks() })
it('caps retained raw sources before raster allocation and reuses the safe fallback until mode/reload invalidation', () => {
  const walls = Array.from({ length: 9 }, (_, i) => ({ ...wall, id: 'wall-' + i })), batch = { start: 1, floors: [floor], walls: [walls[0]] }, objects = [floor, ...walls]
  paintArlBatch(context, batch, map, objects, 'B')
  expect(generatedSurface).toHaveBeenCalledTimes(9)
  expect(paintGeneratedWall).toHaveBeenCalledTimes(1)
  paintArlBatch(context, batch, map, objects, 'B')
  expect(generatedSurface).toHaveBeenCalledTimes(9)
  expect(paintGeneratedWall).toHaveBeenCalledTimes(2)
  expect(arlCacheStats()).toEqual({ entries: 0, pixels: 0 })
  paintArlBatch(context, batch, map, objects, 'C')
  expect(generatedSurface).toHaveBeenCalledTimes(18)
  const generation = useAssetContext.getState().generation
  useAssetContext.setState({ generation: generation + 1 })
  paintArlBatch(context, batch, map, objects, 'B')
  expect(generatedSurface).toHaveBeenCalledTimes(27)
  useAssetContext.setState({ generation })
})
it('rejects oversized ownership scopes before acquiring any raw surface and leaves OFF on the original path', () => {
  const walls = Array.from({ length: 257 }, (_, i) => ({ ...wall, id: 'wall-' + i })), batch = { start: 1, floors: [floor], walls: [walls[0]] }
  paintArlBatch(context, batch, map, [floor, ...walls], 'C')
  expect(generatedSurface).not.toHaveBeenCalled()
  expect(paintGeneratedWall).toHaveBeenCalledTimes(1)
  paintArlBatch(context, batch, map, [floor, wall], 'OFF')
  expect(generatedSurface).not.toHaveBeenCalled()
  expect(paintGeneratedWall).toHaveBeenCalledTimes(2)
})

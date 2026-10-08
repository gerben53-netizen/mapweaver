import { expect, it, vi } from 'vitest'
import { drawEnvironmentalDetail, clearEnvironmentalCache } from './drawEnvironmentalDetail'
import { applyDetailStroke, makeDetailStroke, defaultDetailBrush } from '../domain/environmentalDetail'
import { defaultMapStyle } from '../domain/mapSettings'
it('uses the same world-space offscreen raster at Edit, 1× and 2×; seeds and coordinates remain intact', () => {
  const map = { ...defaultMapStyle(), width: 600, height: 400, background: null }
  const data = applyDetailStroke(undefined, makeDetailStroke([{ x: 125.5, y: 130.25 }], { ...defaultDetailBrush, mode: 'surface', presetId: 'dev.surface.dirt' }, map, [], 913, 'same-stroke'))
  const before = JSON.stringify(data), targets: { width: number; height: number }[] = []
  const context = new Proxy({ createRadialGradient: () => ({ addColorStop: () => {} }) }, { get: (o, name) => name in o ? o[name as keyof typeof o] : () => {}, set: () => true })
  const nativeCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag !== 'canvas') return nativeCreate(tag)
    const target = { width: 0, height: 0, getContext: () => context }; targets.push(target); return target
  }) as typeof document.createElement)
  try {
    for (const scale of [1, 2] as const) { clearEnvironmentalCache(); drawEnvironmentalDetail(context as unknown as CanvasRenderingContext2D, data, 600, 400, 'floor', scale) }
    expect(targets.length).toBeGreaterThan(0); expect(targets.every(t => t.width === 512 && t.height === 512)).toBe(true)
    expect(JSON.stringify(data)).toBe(before)
  } finally { clearEnvironmentalCache(); vi.restoreAllMocks() }
})

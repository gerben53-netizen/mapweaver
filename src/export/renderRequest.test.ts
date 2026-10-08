import { afterEach, expect, it, vi } from 'vitest'
import { exportPng } from './render'
import { highQualityCache } from './renderCache'
import { currentRenderRequest } from './currentRender'
import { currentSnapshot, useProjectSession } from '../projects/session'
import { useArlStore } from '../store/arlStore'
import { useProjectStore } from '../store/projectStore'
import { invalidateAssetImages } from '../images/imageCache'
afterEach(() => { vi.restoreAllMocks(); useArlStore.getState().setMode('OFF') })
it('temporary C Preview cannot silently change the Battlemap default export; explicit B is forwarded', async () => {
  useArlStore.getState().setMode('C')
  const get = vi.spyOn(highQualityCache, 'get').mockResolvedValue(new Blob(['png']))
  const options = { scale: 1 as const, includeGrid: false, transparent: false }
  await exportPng(useProjectStore.getState(), options)
  expect(JSON.parse(get.mock.calls[0][0])[3][0]).toBe('C')
  await exportPng(currentSnapshot(), { ...options, arlMode: 'B' })
  expect(JSON.parse(get.mock.calls[1][0])[3][0]).toBe('B')
})
it('interactive input guards invalidate on map edit and session switch', () => {
  const first = currentRenderRequest(); expect(first.isCurrent?.()).toBe(true)
  useProjectStore.setState(s => ({ map: { ...s.map, backgroundColor: s.map.backgroundColor === '#fff' ? '#000' : '#fff' } }))
  expect(first.isCurrent?.()).toBe(false)
  const second = currentRenderRequest(); useProjectSession.setState(s => ({ generation: s.generation + 1 }))
  expect(second.isCurrent?.()).toBe(false)
})
it('asset removal/replacement invalidates pending requests and cached render outputs', async () => {
  await highQualityCache.get('fixture', {}, async () => new Blob(['cached']))
  const request = currentRenderRequest(); invalidateAssetImages(new Set(['fixture-image']))
  expect(request.isCurrent?.()).toBe(false); expect(highQualityCache.stats().entries).toBe(0)
})

it('checks currentness again after a cached output settles', async () => {
  let current = true
  vi.spyOn(highQualityCache, 'get').mockImplementation(async () => { current = false; return new Blob(['old']) })
  await expect(exportPng(currentSnapshot(), {scale:1,includeGrid:false,transparent:false},undefined,{isCurrent:()=>current})).rejects.toThrow('gewijzigd')
})
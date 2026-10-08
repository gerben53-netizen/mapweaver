import { expect, it, vi } from 'vitest'
import { RenderCache, renderKey, StaleRenderError } from './renderCache'
import { defaultMapStyle } from '../domain/mapSettings'
const project = { map: { ...defaultMapStyle(), width: 600, height: 400, background: null }, objects: [], layers: [] }
const options = { scale: 1 as const, includeGrid: false, transparent: false }
it('keys invalidate content, identity, assets, profile, resolution and composition options', () => {
  const first = renderKey(project, options, 1, 'map-a')
  for (const next of [renderKey(project, options, 1, 'map-b'), renderKey(project, options, 2, 'map-a'), renderKey(project, { ...options, arlMode: 'B' }, 1, 'map-a'), renderKey(project, { ...options, scale: 2 }, 1, 'map-a'), renderKey(project, { ...options, transparent: true }, 1, 'map-a'), renderKey({ ...project, map: { ...project.map, backgroundColor: '#000000' } }, options, 1, 'map-a')]) expect(next).not.toBe(first)
  expect(renderKey(project, options, 1, 'map-a')).toBe(renderKey(project, { ...options, arlMode: 'OFF' }, 1, 'map-a'))
})
it('reuses outputs but does not accept stale cache hits', async () => {
  const cache = new RenderCache(), produce = vi.fn(async () => new Blob(['current']))
  const a = await cache.get('a', {}, produce)
  expect(await cache.get('a', {}, produce)).toBe(a); expect(produce).toHaveBeenCalledOnce()
  await expect(cache.get('a', { isCurrent: () => false }, produce)).rejects.toBeInstanceOf(StaleRenderError)
})
it('serializes concurrent render work and coalesces identical requests via the cache', async () => {
  const cache = new RenderCache(); let finish!: (blob: Blob) => void
  const first = cache.get('same', {}, () => new Promise(r => { finish = r }))
  const secondProducer = vi.fn(async () => new Blob(['wrong'])), second = cache.get('same', {}, secondProducer)
  await Promise.resolve(); finish(new Blob(['right']))
  expect(await second).toBe(await first); expect(secondProducer).not.toHaveBeenCalled()
})
it.each(['edit', 'cleanup'] as const)('suppresses a completed result after %s during rendering', async reason => {
  const cache = new RenderCache(); let current = true, finish!: (blob: Blob) => void
  const pending = cache.get('snapshot', { isCurrent: () => current }, () => new Promise(r => { finish = r }))
  await Promise.resolve(); if (reason === 'edit') current = false; else cache.clear()
  finish(new Blob(['stale'])); await expect(pending).rejects.toBeInstanceOf(StaleRenderError)
  expect(cache.stats().entries).toBe(0)
})
it('failed work is retryable and never caches an error', async () => {
  const cache = new RenderCache()
  await expect(cache.get('x', {}, async () => { throw Error('missing image') })).rejects.toThrow('missing image')
  expect((await cache.get('x', {}, async () => new Blob(['fixed']))).size).toBe(5)
})
it('bounds retained bytes and entries, and releases everything on cleanup', async () => {
  const cache = new RenderCache(10, 2), producer = async () => new Blob(['abc'])
  for (const key of ['a', 'b', 'c']) await cache.get(key, {}, producer)
  expect(cache.stats()).toMatchObject({ entries: 2, bytes: 10 })
  await cache.get('too large', {}, async () => new Blob(['1234567']))
  expect(cache.stats()).toMatchObject({ entries: 2, bytes: 10 })
  cache.clear(); expect(cache.stats()).toMatchObject({ entries: 0, bytes: 0 })
})

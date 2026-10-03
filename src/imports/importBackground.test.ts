import { defaultMapStyle } from '../domain/mapSettings'
import { beforeEach, expect, it, vi } from 'vitest'
import { importBackground } from './importBackground'
import { useProjectStore } from '../store/projectStore'
import { MAP_SIZE } from '../canvas/map'
const read = vi.fn(async () => ({ blob: new Blob(['image']), width: 400, height: 250, mimeType: 'image/png' }))
beforeEach(() => { useProjectStore.setState({ map: { ...defaultMapStyle(), ...MAP_SIZE, background: null }, objects: [] }); read.mockClear() })
it('uses natural dimensions and confirms only when replacing a validated background', async () => {
  const confirm = vi.fn(() => true)
  await importBackground(new File(['x'], 'map.png'), confirm, read)
  const old = useProjectStore.getState().map
  expect(old).toMatchObject({ width: 400, height: 250, background: { name: 'map.png' } })
  expect(confirm).not.toHaveBeenCalled()
  await importBackground(new File(['x'], 'new.png'), confirm, read)
  expect(confirm).toHaveBeenCalledOnce()
  expect(useProjectStore.getState().map.background?.id).not.toBe(old.background?.id)
})
it('preserves the current background on rejection or cancellation', async () => {
  await importBackground(new File(['x'], 'map.png'), () => true, read)
  const old = useProjectStore.getState().map
  const confirm = vi.fn(() => false)
  await expect(importBackground(new File(['x'], 'bad.png'), confirm, async () => { throw new Error('Decode failed') })).rejects.toThrow()
  expect(confirm).not.toHaveBeenCalled()
  expect(await importBackground(new File(['x'], 'cancel.png'), confirm, read)).toBe(false)
  expect(useProjectStore.getState().map).toBe(old)
})


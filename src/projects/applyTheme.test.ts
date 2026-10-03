import { beforeEach, expect, it, vi } from 'vitest'
import { applyTheme } from './applyTheme'
import { currentSnapshot } from './session'
import { loadWorldScatterAssets } from '../world/scatterResources'
import { useProjectStore } from '../store/projectStore'
import { history, useHistoryStore } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
vi.mock('../world/scatterResources', () => ({ loadWorldScatterAssets: vi.fn() }))
const options = { reset: false, elements: false, assets: true }
beforeEach(() => {
  useProjectStore.setState({ map: { ...defaultMapStyle(), width: 1200, height: 800, background: null, mapType: 'world-map', geography: defaultGeography('world-map') }, objects: [{ kind: 'stamp', id: 'stamp', assetId: 'asset', x: 10, y: 10, width: 20, height: 20, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }], layers: [{ id: 'layer', name: 'Map', visible: true, locked: false, objectIds: ['stamp'] }], objectGroups: [], layerTree: null })
  history.reset(); vi.mocked(loadWorldScatterAssets).mockReset()
})
it('does not overwrite edits made while the semantic library lookup is pending', async () => {
  let resolve!: (value: []) => void
  vi.mocked(loadWorldScatterAssets).mockReturnValue(new Promise(r => { resolve = r }))
  const pending = applyTheme('world.darkFantasy', options)
  useProjectStore.setState({ map: { ...useProjectStore.getState().map, width: 1500 } })
  const changed = currentSnapshot(); resolve([])
  await expect(pending).rejects.toThrow('map changed'); expect(currentSnapshot()).toEqual(changed); expect(useHistoryStore.getState().undoCount).toBe(0)
})
it('keeps the complete document and history intact when the library request fails', async () => {
  vi.mocked(loadWorldScatterAssets).mockRejectedValue(Error('Library is unavailable'))
  const before = currentSnapshot()
  await expect(applyTheme('world.darkFantasy', options)).rejects.toThrow('Library is unavailable')
  expect(currentSnapshot()).toEqual(before); expect(useHistoryStore.getState().undoCount).toBe(0)
})

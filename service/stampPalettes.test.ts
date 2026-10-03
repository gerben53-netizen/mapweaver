import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Storage } from './storage'
import { createCampaign } from './campaigns'
import { readStampPalettes, writeStampPalettes } from './stampPalettes'
import { paletteAdd } from '../src/domain/stampPalettes'
let store: Storage | undefined, directory = ''
afterEach(() => { store?.close(); if (directory.startsWith(path.join(os.tmpdir(), 'mapweaver-palettes-'))) rmSync(directory, { recursive: true, force: true }) })
it('persists campaign-specific names/order/active choice and missing references across reopen, with conflict protection', () => {
  directory = mkdtempSync(path.join(os.tmpdir(), 'mapweaver-palettes-')); store = new Storage(directory)
  const a = createCampaign(store, 'A').campaign.id, b = createCampaign(store, 'B').campaign.id
  const initial = readStampPalettes(store, a), value = paletteAdd(initial, ['missing-bookcase', 'chair'])
  const saved = writeStampPalettes(store, a, { ...value, palettes: [...value.palettes, { id: 'room', name: 'Library', assetIds: ['plant'] }], activeId: 'room' })
  expect(() => writeStampPalettes(store!, a, value)).toThrow(/another window/)
  expect(readStampPalettes(store, b)).toEqual(initial)
  store.close(); store = new Storage(directory)
  expect(readStampPalettes(store, a)).toEqual(saved)
  const renamed = writeStampPalettes(store, a, { ...saved, palettes: saved.palettes.map(p => p.id === 'room' ? { ...p, name: 'Reading room', assetIds: [] } : p) })
  expect(renamed.palettes[1].name).toBe('Reading room')
  expect(store.db.prepare('SELECT COUNT(*) n FROM assets').get()).toEqual({ n: 0 })
  expect(() => writeStampPalettes(store!, a, { version: 500 })).toThrow(/Invalid/)
  expect(() => readStampPalettes(store!, 'unknown')).toThrow(/not found/)
})

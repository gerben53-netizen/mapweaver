import { expect, it } from 'vitest'
import { emptyStampPalettes, paletteAdd, paletteMove, validateStampPalettes } from './stampPalettes'
it('adds references without duplication, reorders and preserves other named palettes', () => {
  const original = emptyStampPalettes(), added = paletteAdd(original, ['chair', 'table', 'chair', 'missing'])
  expect(original.palettes[0].assetIds).toEqual([])
  expect(added.palettes[0].assetIds).toEqual(['chair', 'table', 'missing'])
  const named = validateStampPalettes({ ...added, palettes: [...added.palettes, { id: 'library', name: ' Library ', assetIds: [] }] })
  const moved = paletteMove(named, 'missing', 0)
  expect(moved.palettes[0].assetIds).toEqual(['missing', 'chair', 'table'])
  expect(moved.palettes[1]).toEqual({ id: 'library', name: 'Library', assetIds: [] })
  expect(validateStampPalettes(JSON.parse(JSON.stringify(moved)))).toEqual(moved)
})
it('rejects malformed records, duplicate IDs, excessive references and invalid active palettes', () => {
  for (const value of [null, {}, { ...emptyStampPalettes(), activeId: 'missing' }, { ...emptyStampPalettes(), revision: -1 }, { ...emptyStampPalettes(), palettes: [{ id: '../unsafe', name: 'Name', assetIds: [] }] }]) expect(() => validateStampPalettes(value)).toThrow()
  expect(() => paletteAdd(emptyStampPalettes(), Array.from({ length: 65 }, (_, i) => `a${i}`))).toThrow(/64/)
})

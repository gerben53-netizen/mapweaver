export interface StampPalette { id: string; name: string; assetIds: string[] }
export interface StampPalettes { version: 1; revision: number; activeId: string; palettes: StampPalette[] }
export const emptyStampPalettes = (): StampPalettes => ({ version: 1, revision: 0, activeId: 'working', palettes: [{ id: 'working', name: 'Working palette', assetIds: [] }] })
export function validateStampPalettes(input: unknown): StampPalettes {
  const value = input as StampPalettes
  const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v)
  if (!value || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.palettes) || !value.palettes.length || value.palettes.length > 32) throw Error('Invalid stamp palettes (maximum 32 palettes).')
  const palettes = value.palettes.map(p => {
    if (!p || !id(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || !Array.isArray(p.assetIds) || p.assetIds.length > 64 || !p.assetIds.every(id) || new Set(p.assetIds).size !== p.assetIds.length) throw Error('Invalid palette. Use a name of 1–80 characters and at most 64 distinct assets.')
    return { id: p.id, name: p.name.trim(), assetIds: [...p.assetIds] }
  })
  if (new Set(palettes.map(p => p.id)).size !== palettes.length || !palettes.some(p => p.id === value.activeId)) throw Error('Invalid active palette.')
  return { version: 1, revision: value.revision, activeId: value.activeId, palettes }
}
export function paletteAdd(value: StampPalettes, ids: string[]): StampPalettes {
  return validateStampPalettes({ ...value, palettes: value.palettes.map(p => p.id === value.activeId ? { ...p, assetIds: [...new Set([...p.assetIds, ...ids])] } : p) })
}
export function paletteMove(value: StampPalettes, id: string, index: number): StampPalettes {
  return { ...value, palettes: value.palettes.map(p => {
    if (p.id !== value.activeId || !p.assetIds.includes(id)) return p
    const assetIds = p.assetIds.filter(a => a !== id)
    assetIds.splice(Math.max(0, Math.min(index, assetIds.length)), 0, id)
    return { ...p, assetIds }
  }) }
}

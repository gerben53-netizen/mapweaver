import type { ProjectFile } from './types'
import type { AssetKind } from '../domain/models'
export function splitAssetId(id: string, used: Set<string>) {
  let index = 0, candidate = `${id.slice(0, 65)}-fill`
  while (used.has(candidate)) candidate = `${id.slice(0, 65)}-fill-${++index}`
  used.add(candidate); return candidate
}
// Called only after full structural v1 validation; original byte paths remain readable.
export function migrateAssetKinds(document: ProjectFile): ProjectFile {
  if (document.formatVersion !== 1) return document
  const used = new Set(document.assets.map((a) => a.id)), patterns = new Set(document.objects.filter((o) => o.kind === 'patternFill').map((o) => o.assetId)), stamps = new Set(document.objects.filter((o) => o.kind === 'stamp').map((o) => o.assetId))
  const aliases = new Map<string, string>()
  const assets = document.assets.flatMap((asset) => {
    const kind: AssetKind = patterns.has(asset.id) && !stamps.has(asset.id) ? 'fillPattern' : 'stamp'
    if (!patterns.has(asset.id) || !stamps.has(asset.id)) return [{ ...asset, kind }]
    const id = splitAssetId(asset.id, used); aliases.set(asset.id, id)
    return [{ ...asset, kind: 'stamp' as const }, { ...asset, id, kind: 'fillPattern' as const }]
  })
  return { ...document, formatVersion: 2, assets, objects: document.objects.map((o) => o.kind === 'patternFill' && aliases.has(o.assetId) ? { ...o, assetId: aliases.get(o.assetId)! } : o) }
}

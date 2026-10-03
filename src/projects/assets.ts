import { PROJECT_LIMITS as L } from './limits'
import type { AssetKind, TypedAsset } from '../domain/models'
import { create } from 'zustand'
import { libraryRepository } from '../storage/libraryRepository'
import { backgroundBlob } from '../images/backgroundAssets'
import type { ProjectAsset } from './types'
const resources = new Map<string, { hash: string; bytes: number; pixels: number }>()
export function registerResource(id: string, hash: string, bytes: number, pixels: number) { resources.set(id, { hash, bytes, pixels }) }
export function resourcesFit(ids: Set<string>) {
  const unique = new Map([...ids].flatMap(id => { const resource = resources.get(id); return resource ? [[resource.hash, resource] as const] : [] }))
  return [...unique.values()].reduce((sum, r) => sum + r.pixels, 0) <= L.pixels && [...unique.values()].reduce((sum, r) => sum + r.bytes, 0) <= L.unpacked - L.json
}
const kinds = new Map<string, AssetKind>()
let embedded = new Map<string, ProjectAsset>()
let backgroundOnly: string | undefined
export const useAssetContext = create(() => ({ generation: 0 }))
export function installProjectAssets(assets: Map<string, ProjectAsset>, backgroundOnlyId?: string) { embedded = assets; backgroundOnly = backgroundOnlyId; kinds.clear(); resources.clear(); assets.forEach((a, id) => { registerResource(id, a.manifest.hash, a.blob.size, a.manifest.width * a.manifest.height); if (a.manifest.kind) kinds.set(id, a.manifest.kind) }); useAssetContext.setState(({ generation }) => ({ generation: generation + 1 })) }
export async function resolveAsset(id: string, background = false, expected?: AssetKind): Promise<{ blob: Blob; name: string; thumbnail?: Blob; kind?: AssetKind }> {
  const owned = embedded.get(id)
  if(owned?.unavailable)throw new Error('Image unavailable. Restore the source or replace the missing scatter asset/wall material before saving/exporting.')
  if (owned && expected && owned.manifest.kind !== expected) throw new Error(`This image is not a ${expected}.`)
  if (owned) return { kind: owned.manifest.kind, blob: owned.blob, name: owned.manifest.fileName, thumbnail: owned.thumbnail }
  if (background) return { blob: await backgroundBlob(id), name: id }
  const [blob, meta] = await Promise.all([libraryRepository.getBlob(id), libraryRepository.getAsset(id)])
  if (expected && meta?.kind !== expected) throw new Error(`This image is not a ${expected}.`)
  return { blob, name: meta?.name || id, kind: meta?.kind }
}
export async function assetName(id: string) { return (await resolveAsset(id)).name }
// Object lists need names, never image bytes or thumbnail decoding.
export async function assetMetadataName(id: string) { return embedded.get(id)?.manifest.fileName || (await libraryRepository.getAsset(id))?.name || null }
export async function resolveThumbnail(id: string) { const owned = embedded.get(id); if(owned?.unavailable)throw new Error('Image unavailable.'); return owned ? owned.thumbnail || owned.blob : libraryRepository.getThumbnail(id) }

// A library image with a colliding imported ID must not silently replace a project's image.
export async function adoptLibraryAsset(asset: import('../domain/models').StampAsset) {
  if (asset.kind !== 'stamp' && asset.kind !== 'fillPattern') throw new Error('Asset type is missing.')
  const generation = useAssetContext.getState().generation
  const blob = await libraryRepository.getBlob(asset.id)
  if (generation !== useAssetContext.getState().generation) throw new Error('Project changed; choose the image again.')
  const owned = embedded.get(asset.id)
  if (!owned || (owned.manifest.hash === asset.contentHash && owned.manifest.kind === asset.kind)) { if (!owned) embedded.set(asset.id, { blob, manifest: { id: asset.id, kind: asset.kind, fileName: asset.name, mimeType: asset.mimeType, width: asset.naturalWidth, height: asset.naturalHeight, hash: asset.contentHash, path: `assets/${asset.id}.${asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/jpeg' ? 'jpg' : 'webp'}` } }); registerResource(asset.id, asset.contentHash, blob.size, asset.naturalWidth * asset.naturalHeight); kinds.set(asset.id, asset.kind); return asset }
  const thumbnail = await libraryRepository.getThumbnail(asset.id)
  if (generation !== useAssetContext.getState().generation) throw new Error('Project changed; choose the image again.')
  const id = crypto.randomUUID(), ext = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/jpeg' ? 'jpg' : 'webp'
  embedded.set(id, { blob, thumbnail, manifest: { id, kind: asset.kind, fileName: asset.name, mimeType: asset.mimeType, width: asset.naturalWidth, height: asset.naturalHeight, hash: asset.contentHash, path: `assets/${id}.${ext}` } })
  registerResource(id, asset.contentHash, blob.size, asset.naturalWidth * asset.naturalHeight)
  kinds.set(id, asset.kind)
  return { ...asset, id }
}

export function assetHasKind(id: string, kind: AssetKind) { return kinds.get(id) === kind }
export function projectAssets(): TypedAsset[] {
  return [...embedded.values()].filter((a) => a.manifest.kind && a.manifest.id !== backgroundOnly).map(({ manifest: a }) => ({ id: a.id, kind: a.kind!, name: a.fileName, mimeType: a.mimeType, naturalWidth: a.width, naturalHeight: a.height, categoryId: 'project', createdAt: '', contentHash: a.hash }))
}

let clipboardAssets = new Map<string, ProjectAsset>()
export function captureClipboardAssets(ids: string[]) { clipboardAssets = new Map(ids.flatMap(id => embedded.has(id) ? [[id, embedded.get(id)!] as const] : [])) }
export function restoreClipboardAssets() {
  const remap = new Map<string,string>()
  for (const [id, asset] of clipboardAssets) {
    const current=embedded.get(id)
    const next=current && (current.manifest.hash!==asset.manifest.hash || current.manifest.kind!==asset.manifest.kind) ? crypto.randomUUID() : id
    embedded.set(next,{...asset,manifest:{...asset.manifest,id:next}})
    registerResource(next,asset.manifest.hash,asset.blob.size,asset.manifest.width*asset.manifest.height)
    if(asset.manifest.kind)kinds.set(next,asset.manifest.kind)
    remap.set(id,next)
  }
  return remap
}

export function forgetRemovedAssets(ids: Set<string>, clipboardIds: Set<string>) {
  for (const id of ids) { embedded.delete(id); kinds.delete(id); resources.delete(id) }
  for (const id of clipboardAssets.keys()) if (!clipboardIds.has(id)) clipboardAssets.delete(id)
  useAssetContext.setState(({generation}) => ({generation:generation+1}))
}

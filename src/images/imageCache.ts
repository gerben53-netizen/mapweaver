import type { AssetKind } from '../domain/models'
import { libraryRepository } from '../storage/libraryRepository'
import { resolveAsset, resolveThumbnail, useAssetContext } from '../projects/assets'

interface Entry { refs: number; url?: string; promise: Promise<HTMLImageElement> }
const entries = new Map<string, Entry>()
/** One decoded image and object URL per visible asset, shared by every placement. */
export function acquireImage(key: string, load: () => Promise<Blob>) {
  let entry = entries.get(key)
  if (!entry) {
    const created: Entry = { refs: 0, promise: Promise.resolve(null as unknown as HTMLImageElement) }
    created.promise = load().then(async (blob) => {
      const url = URL.createObjectURL(blob)
      created.url = url
      const image = new Image()
      image.src = url
      try { await image.decode(); return image }
      catch {
        if (created.url) { URL.revokeObjectURL(created.url); created.url = undefined }
        throw new Error('Image data is missing or unreadable.')
      }
      finally { if (created.refs === 0 && created.url) { URL.revokeObjectURL(created.url); created.url = undefined } }
    })
    entry = created
    entries.set(key, created)
  }
  const retained = entry
  retained.refs++
  let released = false
  return {
    promise: retained.promise,
    release() {
      if (released) return
      released = true
      retained.refs--
      if (retained.refs === 0) {
        if (retained.url) { URL.revokeObjectURL(retained.url); retained.url = undefined }
        if (entries.get(key) === retained) entries.delete(key)
      }
    },
  }
}
export function acquireAssetImage(id: string, expected?: AssetKind) { return acquireImage(`asset:${useAssetContext.getState().generation}:${id}:${expected || "any"}`, async () => (await resolveAsset(id, false, expected)).blob) }
export function acquireBackgroundImage(id: string) { return acquireImage(`background:${useAssetContext.getState().generation}:${id}`, async () => (await resolveAsset(id, true)).blob) }

export function acquireThumbnail(id: string) { return acquireImage(`thumbnail:${useAssetContext.getState().generation}:${id}`, () => resolveThumbnail(id)) }



export function acquireLibraryThumbnail(id: string) { return acquireImage(`library-thumbnail:${id}`, () => libraryRepository.getThumbnail(id)) }


export function invalidateAssetImages(ids: Set<string>) {
  // Existing consumers release their own leases; new consumers must load afresh.
  for (const key of entries.keys()) if (key.split(':').some(part => ids.has(part))) entries.delete(key)
  if (ids.size) useAssetContext.setState(s => ({ generation: s.generation + 1 }))
}

/** Read-only profiling counters; does not retain images or URLs. */
export const imageCacheStats=()=>({entries:entries.size,leases:[...entries.values()].reduce((n,e)=>n+e.refs,0)})

import { liveQuery } from 'dexie'
import { LibraryDatabase } from './database'
import type { StampAsset, StampCategory, AssetKind, TypedAsset } from '../domain/models'

export const UNCATEGORIZED_ID = 'uncategorized'
export interface LibrarySnapshot { assets: TypedAsset[]; categories: StampCategory[] }
export class LibraryRepository {
  constructor(private db: LibraryDatabase) {}
  async initialize() {
    await this.db.transaction('rw', this.db.categories, async () => {
      if (!await this.db.categories.get(UNCATEGORIZED_ID)) await this.db.categories.add({ id: UNCATEGORIZED_ID, name: 'Uncategorized', normalizedName: 'uncategorized', createdAt: new Date().toISOString() })
    })
  }
  async category(name: string): Promise<StampCategory> {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 80) throw new Error('Category names must contain 1–80 characters.')
    const normalizedName = trimmed.toLocaleLowerCase('en-US')
    return this.db.transaction('rw', this.db.categories, async () => {
      const existing = await this.db.categories.where('normalizedName').equals(normalizedName).first()
      if (existing) return existing
      const category = { id: crypto.randomUUID(), name: trimmed, normalizedName, createdAt: new Date().toISOString() }
      await this.db.categories.add(category)
      return category
    })
  }
  async add(asset: StampAsset, blob: Blob, thumbnail?: Blob): Promise<boolean> {
    return this.db.transaction('rw', this.db.assets, this.db.blobs, this.db.categories, async () => {
      if (asset.kind !== 'stamp' && asset.kind !== 'fillPattern') throw new Error('Choose an asset type before importing.')
      if (await this.db.assets.where('[kind+contentHash]').equals([asset.kind, asset.contentHash]).count()) return false
      if (!await this.db.categories.get(asset.categoryId)) throw new Error('The selected category no longer exists.')
      const shared = await this.db.assets.where('contentHash').equals(asset.contentHash).first()
      const blobId = shared?.blobId || shared?.id || asset.id
      await this.db.assets.add({ ...asset, blobId })
      if (!shared) await this.db.blobs.add({ id: blobId, blob, thumbnail })
      return true
    })
  }
  async snapshot(): Promise<LibrarySnapshot> {
    return { assets: await this.db.assets.toArray() as TypedAsset[], categories: await this.db.categories.orderBy('normalizedName').toArray() }
  }
  getAsset(id: string) { return this.db.assets.get(id) }
  async getBlob(id: string): Promise<Blob> {
    const asset = await this.db.assets.get(id)
    const row = await this.db.blobs.get(asset?.blobId || id)
    if (!row?.blob || typeof row.blob.arrayBuffer !== 'function' || row.blob.size === 0) throw new Error('Image data is missing or unreadable.')
    return row.blob
  }
  async getThumbnail(id: string): Promise<Blob> {
    const asset = await this.db.assets.get(id)
    const row = await this.db.blobs.get(asset?.blobId || id)
    if (!row?.blob || row.blob.size === 0) throw new Error('Image data is missing.')
    return row.thumbnail || this.getBlob(id)
  }
  observe(next: (snapshot: LibrarySnapshot) => void, error: (error: unknown) => void) {
    return liveQuery(() => this.snapshot()).subscribe({ next, error })
  }
  async update(id: string, name: string, categoryId: string) {
    if (!name.trim() || name.trim().length > 120) throw new Error('Name must contain 1–120 characters.')
    if (!await this.db.categories.get(categoryId)) throw new Error('Choose an existing category.')
    await this.db.assets.update(id, { name: name.trim(), categoryId })
  }
  async copyAs(id: string, kind: AssetKind) {
    const asset = await this.getAsset(id)
    if (!asset) throw new Error('This asset no longer exists.')
    return this.add({ ...asset, id: crypto.randomUUID(), kind, createdAt: new Date().toISOString() }, await this.getBlob(id), await this.getThumbnail(id))
  }
  async usage(id: string): Promise<string[]> {
    const rows = await this.db.recoveryProjects.toArray(), asset = await this.getAsset(id)
    return rows.filter((r) => r.document.assets.some((a) => a.id === id || a.hash === asset?.contentHash)).map((r) => `Recovery: ${r.name}`)
  }
  async remove(id: string, inUse: () => string[]) {
    await this.db.transaction('rw', this.db.assets, this.db.blobs, this.db.recoveryProjects, async () => {
      const used = [...inUse(), ...await this.usage(id)]
      if (used.length) throw new Error(`Asset is still used by: ${[...new Set(used)].join(', ')}. Keep it or remove those references first.`)
      const asset = await this.getAsset(id)
      if (!asset) return
      const blobId = asset.blobId || id
      await this.db.assets.delete(id)
      if (!await this.db.assets.where('blobId').equals(blobId).count()) await this.db.blobs.delete(blobId)
    })
  }
}
export { RemoteLibrary } from './remoteLibrary'
import { RemoteLibrary } from './remoteLibrary'
export const libraryRepository = new RemoteLibrary()


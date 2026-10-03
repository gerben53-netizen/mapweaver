import type { RecoveryRow, RecoveryAssetRow } from '../projects/recoveryTypes'
import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { StampAsset, StampCategory } from '../domain/models'
import { parseProject } from '../projects/format'
import { splitAssetId } from '../projects/migrateAssets'

export class LibraryDatabase extends Dexie {
  recoveryProjects!: Table<RecoveryRow, string>
  projectAssets!: Table<RecoveryAssetRow, [string, string]>
  assets!: Table<StampAsset, string>
  blobs!: Table<{ id: string; blob: Blob; thumbnail?: Blob }, string>
  categories!: Table<StampCategory & { normalizedName: string }, string>
  constructor(name = 'mapweaver-library') {
    super(name)
    this.version(1).stores({
      assets: 'id, &contentHash, categoryId, name, createdAt',
      blobs: 'id',
      categories: 'id, &normalizedName',
    })
    this.version(2).stores({ recoveryProjects: 'id, modifiedAt, savedAt', projectAssets: '[projectId+assetId], projectId' })
    this.version(3).stores({ assets: 'id, contentHash, &[kind+contentHash], kind, blobId, categoryId, name, createdAt' }).upgrade(async (tx) => {
      const rows = await tx.table<RecoveryRow>('recoveryProjects').toArray()
      const stamps = new Set(rows.flatMap((r) => r.document.objects.filter((o) => o.kind === 'stamp').map((o) => o.assetId)))
      const patterns = new Set(rows.flatMap((r) => r.document.objects.filter((o) => o.kind === 'patternFill').map((o) => o.assetId)))
      const assets = await tx.table<StampAsset>('assets').toArray(), ids = new Set(assets.map((a) => a.id))
      for (const asset of assets) {
        await tx.table('assets').put({ ...asset, blobId: asset.blobId || asset.id, kind: patterns.has(asset.id) && !stamps.has(asset.id) ? 'fillPattern' : 'stamp' })
        if (patterns.has(asset.id) && stamps.has(asset.id)) await tx.table('assets').put({ ...asset, id: splitAssetId(asset.id, ids), blobId: asset.blobId || asset.id, kind: 'fillPattern' })
      }
      for (const row of rows) {
        const document = parseProject(row.document)
        const old = await tx.table<RecoveryAssetRow>('projectAssets').where('projectId').equals(row.id).toArray()
        for (const manifest of document.assets) {
          const source = old.find((a) => a.manifest.path === manifest.path && a.manifest.hash === manifest.hash)
          if (!source?.blob) throw new Error(`Cannot migrate recovery ${row.name}: missing ${manifest.fileName}.`)
          await tx.table('projectAssets').put({ projectId: row.id, assetId: manifest.id, manifest, blob: source.blob })
        }
        await tx.table('recoveryProjects').put({ ...row, document })
      }
      // All new references commit together. Existing source blobs are never deleted here.
    })
  }
}




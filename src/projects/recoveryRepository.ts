import { liveQuery } from 'dexie'
import { LibraryDatabase } from '../storage/database'
import { PROJECT_LIMITS as L } from './limits'
import type { PreparedProject } from './types'
import type { RecoveryRow } from './recoveryTypes'
export class RecoveryRepository {
  constructor(private db = new LibraryDatabase()) {}
  observe(next: (rows: RecoveryRow[]) => void, error: () => void) { return liveQuery(() => this.list()).subscribe({ next, error }) }
  async list(): Promise<RecoveryRow[]> { return this.db.recoveryProjects.orderBy('savedAt').reverse().limit(L.recents).toArray() }
  async save(prepared: PreparedProject, downloadedAt: string | null) {
    const d = prepared.document
    await this.db.transaction('rw', this.db.recoveryProjects, this.db.projectAssets, async () => {
      await this.db.projectAssets.where('projectId').equals(d.id).delete()
      await this.db.projectAssets.bulkPut([...prepared.assets.values()].map((a) => ({ projectId: d.id, assetId: a.manifest.id, manifest: a.manifest, blob: a.blob })))
      await this.db.recoveryProjects.put({ id: d.id, name: d.name, modifiedAt: d.modifiedAt, savedAt: new Date().toISOString(), downloadedAt, document: d })
      const rows = await this.db.recoveryProjects.orderBy('savedAt').reverse().toArray()
      for (const old of rows.slice(L.recents)) { await this.db.recoveryProjects.delete(old.id); await this.db.projectAssets.where('projectId').equals(old.id).delete() }
    })
  }
  async read(id: string): Promise<PreparedProject> {
    return this.db.transaction('r', this.db.recoveryProjects, this.db.projectAssets, async () => {
      const row = await this.db.recoveryProjects.get(id)
      if (!row) throw new Error('This local recovery copy no longer exists.')
      const assets = await this.db.projectAssets.where('projectId').equals(id).toArray()
      return { document: row.document, assets: new Map(assets.map((a) => [a.assetId, { manifest: a.manifest, blob: a.blob }])) }
    })
  }
  async remove(id: string) { await this.db.transaction('rw', this.db.recoveryProjects, this.db.projectAssets, async () => { await this.db.recoveryProjects.delete(id); await this.db.projectAssets.where('projectId').equals(id).delete() }) }
}
export const recoveryRepository = new RecoveryRepository()


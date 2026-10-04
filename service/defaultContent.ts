import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Storage } from './storage'
import { previewPack, commitPack } from './libraryPacks'

// Release installation preserves existing libraries. Primary Development uses
// additive, revision-receipted imports and never reactivates existing assets.
export async function initializeDefaultContent(store: Storage, frontend: string, existingDatabase: boolean, additive?: { manifest: string; contentRoot: string }) {
  const file = additive?.manifest || path.join(frontend, 'default-content.json')
  if (!existsSync(file)) return
  const key = 'installed-default-content'
  const receipt = store.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined
  if (!additive && receipt && receipt.value !== 'pending') return
  if (!additive && existingDatabase && !receipt) {
    store.db.prepare('INSERT INTO settings VALUES(?,?)').run(key, 'existing-library-preserved')
    return
  }
  if (!additive) store.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key, 'pending')
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as { libraryRevision: string; libraryPacks: { file: string; assets: number }[] }
  for (const pack of manifest.libraryPacks) {
    if (!/^(world-assets-painterly|settlement-assets-painterly|premium-core-interior-materials)\/[-a-z]+\.zip$/.test(pack.file)) throw Error('Invalid bundled content path.')
    const packKey = 'primary-default-pack:' + pack.file
    const applied = store.db.prepare('SELECT value FROM settings WHERE key=?').get(packKey) as {value: string} | undefined
    if (additive && applied?.value === manifest.libraryRevision) continue
    const preview = await previewPack(store, readFileSync(path.join(additive?.contentRoot || frontend, pack.file)))
    if (preview.errors.length) throw Error('Bundled asset pack validation failed: ' + preview.errors.join('; '))
    const result = commitPack(store, { token: preview.token, revision: preview.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true })
    if (result.entries.length !== pack.assets) throw Error('Bundled asset count differs from the distribution inventory.')
    if (additive) store.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(packKey, manifest.libraryRevision)
  }
  if (!additive) store.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key, manifest.libraryRevision)
}

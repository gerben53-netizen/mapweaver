import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Storage } from './storage'
import { previewPack, commitPack } from './libraryPacks'

// Only the installer supplies this allowlisted manifest. Existing libraries and
// deleted defaults are never repopulated on upgrades or reinstalls.
export async function initializeDefaultContent(store: Storage, frontend: string, existingDatabase: boolean) {
  const file = path.join(frontend, 'default-content.json')
  if (!existsSync(file)) return
  const key = 'installed-default-content'
  const receipt = store.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined
  if (receipt && receipt.value !== 'pending') return
  if (existingDatabase && !receipt) {
    store.db.prepare('INSERT INTO settings VALUES(?,?)').run(key, 'existing-library-preserved')
    return
  }
  store.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key, 'pending')
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as { libraryRevision: string; libraryPacks: { file: string; assets: number }[] }
  for (const pack of manifest.libraryPacks) {
    if (!/^(world-assets-painterly|settlement-assets-painterly)\/[-a-z]+\.zip$/.test(pack.file)) throw Error('Invalid bundled content path.')
    const preview = await previewPack(store, readFileSync(path.join(frontend, pack.file)))
    if (preview.errors.length) throw Error('Bundled asset pack validation failed: ' + preview.errors.join('; '))
    const result = commitPack(store, { token: preview.token, revision: preview.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true })
    if (result.entries.length !== pack.assets) throw Error('Bundled asset count differs from the distribution inventory.')
  }
  store.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key, manifest.libraryRevision)
}

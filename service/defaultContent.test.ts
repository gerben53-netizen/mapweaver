import { afterEach, expect, it } from 'vitest'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import inventory from '../docs/distribution/default-content.json'
import { Storage } from './storage'
import { initializeDefaultContent } from './defaultContent'
const roots: string[] = [], stores: Storage[] = []
afterEach(() => { stores.forEach(s => { if (s.db.open) s.close() }); roots.forEach(r => rmSync(r, { recursive: true, force: true })); stores.length = roots.length = 0 })
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mw-default-content-')); roots.push(root)
  const frontend = path.join(root, 'frontend'); mkdirSync(frontend)
  writeFileSync(path.join(frontend, 'default-content.json'), JSON.stringify(inventory))
  for (const pack of inventory.libraryPacks) { const dest = path.join(frontend, pack.file); mkdirSync(path.dirname(dest), { recursive: true }); copyFileSync(path.join('public', pack.file), dest) }
  const store = new Storage(path.join(root, 'data')); stores.push(store)
  return { store, frontend }
}
it('installs the 77 deliberate standard stamps once and never revives an inactive existing asset', async () => {
  const { store, frontend } = fixture()
  await initializeDefaultContent(store, frontend, false)
  const before = store.db.prepare('SELECT id,sha256 FROM assets ORDER BY id').all()
  expect(before).toHaveLength(77)
  const id = (before[0] as { id: string }).id
  const quality = JSON.stringify({ classification: 'REJECT', reason: 'User deactivated', semanticClass: null, softShadowDefault: null })
  store.db.prepare('UPDATE assets SET quality=? WHERE id=?').run(quality, id)
  await initializeDefaultContent(store, frontend, true)
  expect(store.db.prepare('SELECT id,sha256 FROM assets ORDER BY id').all()).toEqual(before)
  expect((store.db.prepare('SELECT quality FROM assets WHERE id=?').get(id) as { quality: string }).quality).toBe(quality)
  expect((store.db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number }).v).toBe(10)
})
it('preserves an existing database, including an intentionally empty library', async () => {
  const { store, frontend } = fixture()
  await initializeDefaultContent(store, frontend, true)
  await initializeDefaultContent(store, frontend, true)
  expect(store.db.prepare('SELECT * FROM assets').all()).toEqual([])
})
it('resumes a partially completed first install without duplicating its imported IDs', async () => {
  const { store, frontend } = fixture(), second = inventory.libraryPacks[1].file
  rmSync(path.join(frontend, second))
  await expect(initializeDefaultContent(store, frontend, false)).rejects.toThrow()
  const first = store.db.prepare('SELECT id FROM assets ORDER BY id').all()
  expect(first).toHaveLength(46)
  copyFileSync(path.join('public', second), path.join(frontend, second))
  await initializeDefaultContent(store, frontend, true)
  expect(store.db.prepare('SELECT id FROM assets').all()).toHaveLength(77)
  for (const row of first) expect(store.db.prepare('SELECT id FROM assets WHERE id=?').get((row as { id: string }).id)).toEqual(row)
})

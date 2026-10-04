import { afterEach, expect, it } from 'vitest'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import inventory from '../docs/distribution/default-content.json'
import { Storage } from './storage'
import { initializeDefaultContent } from './defaultContent'
import { primaryDirectory } from '../scripts/runtime.mjs'
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
it('installs the standard stamps, nine floors and 22 Wave 2 families once without reviving inactive assets', async () => {
  const { store, frontend } = fixture()
  await initializeDefaultContent(store, frontend, false)
  const before = store.db.prepare('SELECT id,sha256 FROM assets ORDER BY id').all()
  expect(before).toHaveLength(155)
  const id = (before[0] as { id: string }).id
  const quality = JSON.stringify({ classification: 'REJECT', reason: 'User deactivated', semanticClass: null, softShadowDefault: null })
  store.db.prepare('UPDATE assets SET quality=? WHERE id=?').run(quality, id)
  await initializeDefaultContent(store, frontend, true)
  expect(store.db.prepare('SELECT id,sha256 FROM assets ORDER BY id').all()).toEqual(before)
  expect((store.db.prepare('SELECT quality FROM assets WHERE id=?').get(id) as { quality: string }).quality).toBe(quality)
  expect((store.db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number }).v).toBe(12)
}, 60000)
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
  expect(store.db.prepare('SELECT id FROM assets').all()).toHaveLength(155)
  for (const row of first) expect(store.db.prepare('SELECT id FROM assets WHERE id=?').get((row as { id: string }).id)).toEqual(row)
}, 60000)

it('additive Primary installation preserves legacy quality and IDs across restarts', async () => {
  const { store, frontend } = fixture()
  await initializeDefaultContent(store, frontend, false)
  const before = store.db.prepare('SELECT id,sha256 FROM assets ORDER BY id').all()
  const id = (before[0] as {id: string}).id
  const quality = JSON.stringify({classification:'REPLACE',reason:'Retain for existing maps',semanticClass:null,softShadowDefault:null})
  store.db.prepare('UPDATE assets SET quality=? WHERE id=?').run(quality, id)
  const options = {manifest:path.join(frontend,'default-content.json'),contentRoot:frontend}
  await initializeDefaultContent(store, frontend, true, options)
  await initializeDefaultContent(store, frontend, true, options)
  expect(store.db.prepare('SELECT id,sha256 FROM assets ORDER BY id').all()).toEqual(before)
  expect((store.db.prepare('SELECT quality FROM assets WHERE id=?').get(id) as {quality:string}).quality).toBe(quality)
}, 60000)

it('test storage rejects Primary Development before opening its database', () => {
  expect(() => new Storage(primaryDirectory())).toThrow('Tests require isolated storage')
  expect(() => new Storage()).toThrow('Tests require isolated storage')
})

it('a distribution revision change does not rewrite unchanged Primary packs with old receipts', async () => {
  const {store, frontend} = fixture()
  const options = {manifest:path.join(frontend,'default-content.json'),contentRoot:frontend}
  await initializeDefaultContent(store,frontend,false,options)
  const before = store.db.prepare('SELECT * FROM assets ORDER BY id').all()
  for(const pack of inventory.libraryPacks)store.db.prepare('UPDATE settings SET value=? WHERE key=?').run('previous-distribution','primary-default-pack:'+pack.file)
  writeFileSync(options.manifest,JSON.stringify({...inventory,libraryRevision:'another-wave'}))
  await initializeDefaultContent(store,frontend,true,options)
  expect(store.db.prepare('SELECT * FROM assets ORDER BY id').all()).toEqual(before)
},60000)

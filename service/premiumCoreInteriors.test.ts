import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'
import provenance from '../public/premium-core-interior-materials/provenance.json'
import manifest from '../public/premium-core-interior-materials/mapweaver-assets.json'
import inventory from '../docs/distribution/default-content.json'
import { Storage, hash } from './storage'
import { previewPack, commitPack } from './libraryPacks'
import { libraryQuery, patchAsset, publicAsset } from './library'
import type { LibraryAsset } from './library'

it('registers all nine canonical floors with unchanged bytes, physical scale, stable references and inactive legacy resolution', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mw-core-interiors-'))
  let store = new Storage(root)
  try {
    const file = 'premium-core-interior-materials/mapweaver-premium-core-interiors.zip'
    expect(inventory.libraryPacks.find(p => p.file === file)?.assets).toBe(9)
    expect(inventory.publicDirectories).toContain('premium-core-interior-materials')
    const bytes = readFileSync(path.join('public', file)), files = unzipSync(bytes)
    expect(manifest.assets).toHaveLength(9)
    expect(new Set(provenance.assets.map(a => a.id)).size).toBe(9)
    const preview = await previewPack(store, bytes)
    expect(preview.errors).toEqual([]); expect(preview.warnings).toEqual([])
    const first = commitPack(store, { token: preview.token, revision: preview.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true })
    expect(first.entries).toHaveLength(9); expect(libraryQuery(store, { type: 'fill-pattern' }).total).toBe(9)
    for (const a of provenance.assets) {
      const row = store.db.prepare('SELECT id FROM assets WHERE sha256=?').get(a.sha256) as { id: string }
      const registered = publicAsset(store.asset(row.id) as LibraryAsset)
      expect(registered.name).toBe(a.title); expect(registered.tags).toContain(a.id)
      expect([registered.width, registered.height]).toEqual([1254, 1254])
      expect(registered.patternScale).toBe(200 / 1254)
      expect(registered.applicableMapTypes).toEqual(['battlemap'])
      expect(registered.quality).toMatchObject({ classification: 'KEEP', softShadowDefault: false })
      expect(hash(files[a.file])).toBe(a.sha256)
      expect(store.bytes(store.asset(row.id))).toEqual(Buffer.from(files[a.file]))
    }
    const again = await previewPack(store, bytes)
    const second = commitPack(store, { token: again.token, revision: again.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true })
    expect(second.entries.map(a => a.id).sort()).toEqual(first.entries.map(a => a.id).sort())
    const id = first.entries[0].id, original = store.bytes(store.asset(id))
    patchAsset(store, id, { quality: { classification: 'REPLACE', reason: 'Inactive resolution regression', semanticClass: 'interior_floor', softShadowDefault: false } })
    expect(libraryQuery(store, { type: 'fill-pattern' }).total).toBe(8)
    store.close(); store = new Storage(root)
    expect(libraryQuery(store, { type: 'fill-pattern' }).total).toBe(8)
    expect(store.bytes(store.asset(id))).toEqual(original)
    expect(publicAsset(store.asset(id) as LibraryAsset).quality?.classification).toBe('REPLACE')
  } finally { store.close(); rmSync(root, { recursive: true, force: true }) }
}, 120_000)

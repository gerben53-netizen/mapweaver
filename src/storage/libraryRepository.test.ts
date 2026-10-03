// @vitest-environment node
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LibraryDatabase } from './database'
import { LibraryRepository, UNCATEGORIZED_ID } from './libraryRepository'
import type { StampAsset } from '../domain/models'
import { importStamps } from '../imports/importStamps'

let db: LibraryDatabase
let repository: LibraryRepository
const asset = (id = 'asset', hash = 'hash'): StampAsset => ({ kind: 'stamp', id, name: 'Tree', mimeType: 'image/png', naturalWidth: 100, naturalHeight: 200, categoryId: UNCATEGORIZED_ID, createdAt: '2026-09-22T00:00:00.000Z', contentHash: hash })
beforeEach(async () => { db = new LibraryDatabase(`test-${crypto.randomUUID()}`); repository = new LibraryRepository(db); await repository.initialize() })
afterEach(async () => { await db.delete() })
describe('library storage and imports', () => {
  it('creates Uncategorized once and deduplicates category names', async () => {
    await repository.initialize()
    const category = await repository.category(' Trees ')
    expect(await repository.category('trees')).toEqual(category)
    expect((await repository.snapshot()).categories).toHaveLength(2)
    expect(db.verno).toBe(3)
  })
  it('persists metadata, original blobs and thumbnails across database reopen', async () => {
    await repository.add(asset(), new Blob(['original'], { type: 'image/png' }), new Blob(['thumbnail']))
    const name = db.name
    db.close()
    db = new LibraryDatabase(name); repository = new LibraryRepository(db)
    expect(await repository.getAsset('asset')).toEqual({ ...asset(), blobId: 'asset' })
    expect(await (await repository.getBlob('asset')).text()).toBe('original')
    expect(await (await repository.getThumbnail('asset')).text()).toBe('thumbnail')
    expect((await repository.snapshot()).categories[0].name).toBe('Uncategorized')
    expect((await repository.snapshot()).assets[0]).not.toHaveProperty('blob')
  })
  it('skips identical hashes, preserves same names with different content, and commits atomically', async () => {
    expect(await repository.add(asset('a', 'one'), new Blob(['one']))).toBe(true)
    expect(await repository.add(asset('b', 'one'), new Blob(['one']))).toBe(false)
    expect(await repository.add(asset('c', 'two'), new Blob(['two']))).toBe(true)
    await expect(repository.add({ ...asset('d', 'three'), categoryId: 'missing' }, new Blob(['three']))).rejects.toThrow(/category/)
    expect((await repository.snapshot()).assets).toHaveLength(2)
    expect(await db.blobs.count()).toBe(2)
  })
  it('reports a missing blob without losing the rest of the library', async () => {
    await repository.add(asset(), new Blob(['ok']))
    await db.blobs.delete('asset')
    await expect(repository.getBlob('asset')).rejects.toThrow(/missing/)
    expect((await repository.snapshot()).assets).toHaveLength(1)
  })
  it('continues after invalid files and reports duplicates without overwriting', async () => {
    const files = [new File(['one'], 'tree.png'), new File(['bad'], 'broken.png'), new File(['two'], 'tree.png'), new File(['one'], 'copy.png')]
    const progress: number[] = []
    const report = await importStamps(files, UNCATEGORIZED_ID, repository, (done) => progress.push(done), async (file) => {
      if (file.name === 'broken.png') throw new Error('Damaged image')
      return { blob: file, width: 40, height: 60, mimeType: 'image/png' }
    })
    expect(report.added).toBe(2)
    expect(report.skipped).toEqual([{ name: 'broken.png', reason: 'Damaged image' }, { name: 'copy.png', reason: 'This exact image is already in the library.' }])
    expect(progress).toEqual([1, 2, 3, 4])
    const assets = (await repository.snapshot()).assets
    expect(assets.map((item) => item.name)).toEqual(['tree', 'tree'])
    expect(new Set(assets.map((item) => item.id)).size).toBe(2)
  })
})

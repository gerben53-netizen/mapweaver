import { objectAssetId, migratePattern } from '../domain/areas'
// @vitest-environment node
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { expect, it } from 'vitest'
import { LibraryDatabase } from '../storage/database'
import { LibraryRepository } from '../storage/libraryRepository'
import { fixture, validateFixture } from './fixtures.test-support'
import { parseProject } from './format'
import { decodeProject, encodeProject } from './archive'
import { writeZip, strToU8 } from './zip'
it('upgrades v2 assets by persisted usage, shares blobs, preserves recovery references and reopens idempotently', async () => {
  const name = `sprint10-${crypto.randomUUID()}`, old = new Dexie(name), prepared = await fixture()
  old.version(2).stores({ assets: 'id, &contentHash, categoryId, name, createdAt', blobs: 'id', categories: 'id, &normalizedName', recoveryProjects: 'id, modifiedAt, savedAt', projectAssets: '[projectId+assetId], projectId' })
  const ids = ['shared', 'stamp-only', 'pattern-only', 'unused']
  await old.table('assets').bulkAdd(ids.map((id, index) => ({ id, name: id, contentHash: String(index).repeat(64), naturalWidth: 1, naturalHeight: 1, mimeType: 'image/png', categoryId: 'uncategorized', createdAt: prepared.document.createdAt })))
  await old.table('blobs').bulkAdd(ids.map((id) => ({ id, blob: new Blob([id]), thumbnail: new Blob([id]) })))
  const document = structuredClone(prepared.document)
  if(document.objects[0].kind !== 'stamp' || document.objects[1].kind !== 'patternFill') throw new Error('Expected legacy fixture')
  document.objects.push({ ...document.objects[0], id: 's2', assetId: 'stamp-only' }, { ...document.objects[1], id: 'p2', assetId: 'pattern-only' })
  document.layers[0].objectIds.push('s2', 'p2')
  document.assets.push(...['stamp-only', 'pattern-only'].map((id) => ({ ...document.assets[0], id, path: `assets/${id}.png` })))
  await old.table('recoveryProjects').add({ id: document.id, name: document.name, modifiedAt: document.modifiedAt, savedAt: document.modifiedAt, downloadedAt: null, document })
  await old.table('projectAssets').bulkAdd(document.assets.map((manifest) => ({ projectId: document.id, assetId: manifest.id, manifest, blob: prepared.assets.get('shared')!.blob })))
  old.close()
  let db = new LibraryDatabase(name)
  try {
    await db.open()
    const assets = await db.assets.toArray(), shared = assets.filter((a) => a.contentHash === '0'.repeat(64))
    expect(assets.find((a) => a.id === 'stamp-only')?.kind).toBe('stamp')
    expect(assets.find((a) => a.id === 'pattern-only')?.kind).toBe('fillPattern')
    expect(assets.find((a) => a.id === 'unused')?.kind).toBe('stamp')
    expect(shared.map((a) => a.kind).sort()).toEqual(['fillPattern', 'stamp']); expect(shared.every((a) => a.blobId === 'shared')).toBe(true)
    expect(await db.blobs.count()).toBe(4)
    expect(await (await db.blobs.get('shared'))!.blob.text()).toBe('shared')
    const migrated = (await db.recoveryProjects.get(document.id))!.document
    expect(migrated.objects[0]).toEqual(document.objects[0]); expect(objectAssetId(migrated.objects[1])).toBe('shared-fill')
    expect(migrated.objects[1]).toEqual(migratePattern({ ...document.objects[1], assetId: 'shared-fill' }))
    for (const manifest of migrated.assets) expect(await db.projectAssets.get([document.id, manifest.id])).toBeDefined()
    await expect(new LibraryRepository(db).remove('shared-fill', () => [])).rejects.toThrow(/Recovery/)
    db.close(); db = new LibraryDatabase(name); await db.open()
    expect(await db.assets.toArray()).toEqual(assets); expect((await db.recoveryProjects.get(document.id))!.document).toEqual(migrated)
  } finally { await db.delete() }
})
it('reads old mixed v1 archives without changing appearance, writes shared v3 bytes and rejects wrong source types', async () => {
  const original = await fixture(), blob = original.assets.get('shared')!.blob
  const bytes = await writeZip({ 'project.json': strToU8(JSON.stringify(original.document)), 'assets/shared.png': new Uint8Array(await blob.arrayBuffer()) })
  const migrated = await decodeProject(bytes, validateFixture)
  expect(migrated.document.formatVersion).toBe(10)
  expect(migrated.document.assets.map((a) => a.kind)).toEqual(['stamp', 'fillPattern'])
  expect(migrated.assets.get('shared')!.blob).toBe(migrated.assets.get('shared-fill')!.blob)
  expect(parseProject(migrated.document)).toEqual(migrated.document)
  expect((await decodeProject(await encodeProject(migrated), validateFixture)).document).toEqual(migrated.document)
  const wrong = structuredClone(migrated.document); wrong.assets[0].kind = 'fillPattern'
  expect(() => parseProject(wrong)).toThrow(/asset kind/)
  delete wrong.assets[0].kind; expect(() => parseProject(wrong)).toThrow(/asset kind/)
})
it('rolls back an incomplete v2 recovery migration without modifying original asset metadata', async () => {
  const name = `rollback-${crypto.randomUUID()}`, old = new Dexie(name), prepared = await fixture()
  old.version(2).stores({ assets: 'id, &contentHash, categoryId, name, createdAt', blobs: 'id', categories: 'id, &normalizedName', recoveryProjects: 'id, modifiedAt, savedAt', projectAssets: '[projectId+assetId], projectId' })
  const original = { id: 'shared', name: 'Preserve', contentHash: 'a'.repeat(64), naturalWidth: 1, naturalHeight: 1, mimeType: 'image/png', categoryId: 'uncategorized', createdAt: prepared.document.createdAt }
  await old.table('assets').add(original)
  await old.table('recoveryProjects').add({id:prepared.document.id,name:'Broken copy',document:prepared.document,modifiedAt:prepared.document.modifiedAt,savedAt:prepared.document.modifiedAt,downloadedAt:null})
  old.close(); const next = new LibraryDatabase(name)
  await expect(next.open()).rejects.toThrow(/missing/); next.close()
  const unchanged = new Dexie(name)
  try { await unchanged.open(); expect(unchanged.verno).toBe(2); expect(await unchanged.table('assets').get('shared')).toEqual(original); expect((await unchanged.table('recoveryProjects').get(prepared.document.id)).document).toEqual(prepared.document) } finally { await unchanged.delete() }
})


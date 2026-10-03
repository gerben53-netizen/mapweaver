// @vitest-environment node
import { parseProject } from './format'
import { beforeEach, expect, it, vi } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { fixture, validateFixture } from './fixtures.test-support'
import { decodeProject, encodeProject, gatherProject } from './archive'
import { readZip } from './zip'
import { installProjectAssets, resolveAsset } from './assets'
import { libraryRepository } from '../storage/libraryRepository'
import { currentSnapshot } from './session'
import { PROJECT_LIMITS as L } from './limits'
beforeEach(() => installProjectAssets(new Map()))
it('ZIP roundtrip preserves the complete model and original bytes, packaging each used asset once', async () => {
  const original = await fixture(), bytes = await encodeProject(original), files = await readZip(bytes)
  expect([...files.keys()]).toEqual(['project.json', 'assets/shared.png'])
  const parsed = await decodeProject(bytes, validateFixture)
  expect(parsed.document).toEqual(parseProject(original.document))
  expect(new Uint8Array(await parsed.assets.get('shared')!.blob.arrayBuffer())).toEqual(files.get('assets/shared.png'))
  expect(Object.keys(parsed.document)).not.toEqual(expect.arrayContaining(['viewport', 'history', 'clipboard']))
})
it('embedded assets resolve and can be saved without any general library presence or import', async () => {
  const prepared = await decodeProject(await encodeProject(await fixture()), validateFixture)
  installProjectAssets(prepared.assets)
  const library = vi.spyOn(libraryRepository, 'getBlob').mockRejectedValue(new Error('No library'))
  const add = vi.spyOn(libraryRepository, 'add')
  expect((await resolveAsset('shared')).blob.size).toBeGreaterThan(0)
  const { map, objects, layers, id, name, createdAt, modifiedAt } = prepared.document
  const saved = await gatherProject({ map, objects, layers }, { id, name, createdAt, modifiedAt }, validateFixture)
  expect(saved.document.assets.map((asset) => ({ ...asset, path: undefined }))).toEqual(prepared.document.assets.map((asset) => ({ ...asset, path: undefined }))); expect(library).not.toHaveBeenCalled(); expect(add).not.toHaveBeenCalled()
})
it('rejects incorrect manifest, missing bytes and wrong hashes without changing the live project', async () => {
  const prepared = await fixture(), before = currentSnapshot(), files = await readZip(await encodeProject(prepared))
  for (const failure of ['manifest', 'missing', 'hash']) {
    const doc = structuredClone(prepared.document)
    if (failure === 'manifest') doc.layers[0].objectIds.push('missing-object')
    if (failure === 'hash') doc.assets[0].hash = '0'.repeat(64)
    const entries: Record<string, Uint8Array> = { 'project.json': strToU8(JSON.stringify(doc)) }
    if (failure !== 'missing') entries['assets/shared.png'] = files.get('assets/shared.png')!
    await expect(decodeProject(zipSync(entries), validateFixture)).rejects.toThrow()
    expect(currentSnapshot()).toEqual(before)
  }
})
it('rejects future versions through the central format entry point', async () => {
  const data = { ...(await fixture()).document, formatVersion: 99 }
  await expect(decodeProject(zipSync({ 'project.json': strToU8(JSON.stringify(data)) }), validateFixture)).rejects.toThrow('Unsupported project format version 99')
})
it('rejects traversal, too many entries, excessive output and a forged ZIP size/CRC', async () => {
  await expect(readZip(zipSync({ '../project.json': strToU8('{}') }))).rejects.toThrow()
  const many: Record<string, Uint8Array> = { 'project.json': strToU8('{}') }
  for (let i = 0; i < L.entries; i++) many[`assets/a${i}.png`] = new Uint8Array([1])
  await expect(readZip(zipSync(many))).rejects.toThrow()
  await expect(readZip(zipSync({ 'project.json': new Uint8Array(L.json + 1) }))).rejects.toThrow()
  const damaged = await encodeProject(await fixture()); damaged[14] ^= 255
  await expect(readZip(damaged)).rejects.toThrow()
})
it('rejects adversarial JSON boundaries and references without mutating the current document', async () => {
  const prepared = await fixture(), before = currentSnapshot()
  const mutations: Array<(d: typeof prepared.document) => void> = [
    d => { Object.defineProperty(d, '__proto__', { value: { polluted: true }, enumerable: true }) },
    d => { d.objects[0].x = Infinity },
    d => { d.objects[0].opacity = 2 },
    d => { d.objects[1].id = d.objects[0].id },
    d => { d.layers[0].objectIds.push(d.objects[0].id) },
    d => { d.assets[0].mimeType = 'image/svg+xml' },
    d => { d.assets[0].path = 'https://example.invalid/a.png' },
    d => { d.assets[0].width = 100000 },
  ]
  for (const mutate of mutations) { const doc = structuredClone(prepared.document); mutate(doc); expect(() => parseProject(JSON.parse(JSON.stringify(doc)))).toThrow(); expect(currentSnapshot()).toEqual(before) }
  expect(Object.prototype).not.toHaveProperty('polluted')
})

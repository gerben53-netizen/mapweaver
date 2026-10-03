import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { validateAssetPack } from './assetPackValidation'
import { commitPack, exportLibrary, previewPack, unpackAssets } from './libraryPacks'
import { Storage } from './storage'
import { libraryQuery } from './library'
import { validateDefaultSize } from '../src/domain/library'
import { GENERATOR_BIOMES, GENERATOR_ROLES, GENERATOR_THEMES, SEMANTIC_TYPES } from '../src/domain/generatorAssets'
import { TERRAIN_STYLES } from '../src/domain/terrainStyles'

const root = 'docs/asset-authoring'
const templateNames = readdirSync(`${root}/templates`)
const zipNames = readdirSync(`${root}/examples`).filter(n => n.endsWith('.zip'))
function removeTestDirectory(directory: string, parent: string) {
  if (path.dirname(directory) !== path.resolve(parent) || !path.basename(directory).startsWith('mw-authoring-test-')) throw Error('Unsafe test cleanup.')
  rmSync(directory, { recursive: true, force: true })
}
function folderFiles(directory: string, prefix = ''): Record<string, Uint8Array> {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name), relative = prefix + entry.name
    return entry.isDirectory() ? Object.entries(folderFiles(file, relative + '/')) : [[relative, readFileSync(file)]]
  }))
}
it.each(templateNames)('validates and roundtrips complete template %s without metadata drift', async name => {
  const files = folderFiles(`${root}/templates/${name}`)
  const bytes = Buffer.from(zipSync(files, { level: 0 }))
  expect(await validateAssetPack(bytes)).toMatchObject({ valid: true, errors: [], warnings: [] })
  const shipped = await unpackAssets(readFileSync(`${root}/examples/${name}.zip`))
  expect([...shipped.keys()].sort()).toEqual(Object.keys(files).sort())
  for (const [file, contents] of Object.entries(files)) expect(shipped.get(file)).toEqual(Buffer.from(contents))
  const parent = os.tmpdir(), directory = mkdtempSync(path.join(parent, 'mw-authoring-test-'))
  const a = new Storage(path.join(directory, 'a')), b = new Storage(path.join(directory, 'b'))
  const query = { limit: '200', type: name.includes('pattern') || name.includes('texture') ? 'fill-pattern' : 'stamp' }
  async function importInto(s: Storage, value: Buffer) {
    const p = await previewPack(s, value)
    expect(p.errors).toEqual([])
    commitPack(s, { token: p.token, revision: p.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true })
  }
  try {
    await importInto(a, bytes); await importInto(a, bytes)
    const before = libraryQuery(a, query).assets
    expect(before).toHaveLength(JSON.parse(Buffer.from(files['mapweaver-assets.json']).toString()).assets.length)
    await importInto(b, exportLibrary(a, before.map(v => v.id)))
    const summarize = (s: Storage) => libraryQuery(s, query).assets.map(v => ({
      name: v.name, sha256: v.sha256, generator: v.generator, defaultSize: v.defaultSize,
      applicableMapTypes: v.applicableMapTypes, author: v.author, source: v.source, license: v.license,
    })).sort((x, y) => x.name.localeCompare(y.name))
    expect(summarize(b)).toEqual(summarize(a))
    expect(b.db.prepare('SELECT COUNT(*) n FROM library_members').get()).toEqual(a.db.prepare('SELECT COUNT(*) n FROM library_members').get())
  } finally {
    a.close(); b.close()
    removeTestDirectory(directory, parent)
  }
})
it.each(zipNames)('validates distributable example %s using the real importer', async name => {
  expect(await validateAssetPack(readFileSync(`${root}/examples/${name}`))).toMatchObject({ valid: true, errors: [], warnings: [] })
})

const image = readFileSync(`${root}/templates/minimal-stamp-pack/images/desk.png`)
function pack(entry: Record<string, unknown> = {}, envelope: Record<string, unknown> = {}, extra: Record<string, Uint8Array> = {}) {
  return Buffer.from(zipSync({
    'mapweaver-assets.json': strToU8(JSON.stringify({ schemaVersion: 3, assets: [{ file: 'images/desk.png', type: 'stamp', ...entry }], ...envelope })),
    'images/desk.png': image, ...extra,
  }, { level: 0 }))
}
it.each([
  ['path', { file: '../desk.png' }, {}, 'Unsafe relative asset path.'],
  ['missing file', { file: 'missing.png' }, {}, 'Missing exact path'],
  ['future schema', {}, { schemaVersion: 4 }, 'Unsupported asset manifest'],
  ['map type', { applicableMapTypes: ['world'] }, {}, 'Invalid applicable map types.'],
  ['size unit', { defaultSize: { mode: 'world', width: 5, unit: 'km', lockAspectRatio: true } }, {}, 'Unknown size unit.'],
  ['checksum', { sha256: '0'.repeat(64) }, {}, 'SHA-256 does not match image.'],
  ['member', {}, { collections: [{ title: 'Bad', members: [{ file: 'absent.png', type: 'stamp' }] }] }, 'Collection references a missing asset entry.'],
  ['semantic type', { generator: { version: 1, semanticType: 'castle' } }, {}, 'Invalid generator semantic type'],
  ['generator scale', { generator: { version: 1, semanticType: 'mountain', roles: ['ridge'], biomes: ['generic'], themes: ['genericFantasy'], scale: { min: 2, max: 1 } } }, {}, 'Generator scale must be an ordered range'],
  ['aspect', { defaultSize: { mode: 'world', width: 5, height: 5, unit: 'ft', lockAspectRatio: true } }, {}, 'Locked dimensions conflict'],
  ['category', { categoryPath: Array(9).fill('Deep') }, {}, 'Category path supports at most eight names.'],
] as const)('reports runtime error for %s', async (_name, entry, envelope, message) => {
  const result = await validateAssetPack(pack(entry, envelope))
  expect(result.valid).toBe(false)
  expect(result.errors.join('\n')).toContain(message)
})
it('reports duplicates and unsafe ZIP paths, while preserving runtime image-only fallback', async () => {
  const duplicate = { file: 'images/desk.png', type: 'stamp' }
  expect((await validateAssetPack(pack({}, { assets: [duplicate, duplicate] }))).errors.join()).toContain('duplicate entry for the same role')
  expect((await validateAssetPack(pack({}, {}, { 'IMAGES/desk.png': image }))).errors.join()).toContain('Windows-normalized ZIP paths collide')
  const fallback = Buffer.from(zipSync({ 'nested/mapweaver-assets.json': strToU8('{}'), 'nested/desk.png': image }, { level: 0 }))
  expect(await validateAssetPack(fallback)).toMatchObject({ valid: true, assets: 1 })
})
it('runs the author CLI with meaningful success/failure exit codes', () => {
  const parent = os.tmpdir(), directory = mkdtempSync(path.join(parent, 'mw-authoring-test-'))
  try {
    const valid = spawnSync(process.execPath, ['scripts/validate-asset-pack.mjs', `${root}/examples/minimal-stamp-pack.zip`], { encoding: 'utf8' })
    expect(valid.status, valid.stderr).toBe(0)
    expect(JSON.parse(valid.stdout)).toMatchObject({ valid: true, assets: 1, errors: [] })
    const invalidPath = path.join(directory, 'invalid.zip')
    writeFileSync(invalidPath, pack({ sha256: '0'.repeat(64) }))
    const invalid = spawnSync(process.execPath, ['scripts/validate-asset-pack.mjs', invalidPath], { encoding: 'utf8' })
    expect(invalid.status, invalid.stderr).toBe(1)
    expect(JSON.parse(invalid.stdout).errors.join()).toContain('SHA-256 does not match image.')
    const usage = spawnSync(process.execPath, ['scripts/validate-asset-pack.mjs'], { encoding: 'utf8' })
    expect(usage.status).toBe(1)
    expect(JSON.parse(usage.stderr).errors.join()).toContain('Usage:')
  } finally { removeTestDirectory(directory, parent) }
}, 30000)
it('documents all current fields, vocabulary and valid exact sizing snippets', () => {
  const guide = readFileSync(`${root}/package-format.md`, 'utf8')
  const schema = JSON.parse(readFileSync('public/asset-templates/mapweaver-assets-v3.schema.json', 'utf8'))
  for (const key of [...Object.keys(schema.properties), ...Object.keys(schema.properties.assets.items.properties)]) expect(guide).toContain('`' + key + '`')
  const generator = readFileSync(`${root}/generator-metadata.md`, 'utf8')
  for (const value of [...SEMANTIC_TYPES, ...GENERATOR_ROLES, ...GENERATOR_BIOMES, ...GENERATOR_THEMES]) expect(generator).toContain(value)
  const terrain = readFileSync(`${root}/terrain-textures.md`, 'utf8')
  for (const value of Object.keys(TERRAIN_STYLES)) expect(terrain).toContain(`| ${value} |`)
  for (const match of readFileSync(`${root}/stamps.md`, 'utf8').matchAll(/```json\n([\s\S]*?)\n```/g)) expect(() => validateDefaultSize(JSON.parse(match[1]))).not.toThrow()
})

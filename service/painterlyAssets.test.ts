import { unzipSync,zipSync,strToU8 } from 'fflate'
import { HIERARCHY_SCALE } from '../src/world/assetHierarchy'
import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { Storage } from './storage'
import { previewPack, commitPack, exportLibrary } from './libraryPacks'
import { libraryQuery } from './library'
import { queryGeneratorAssets } from './generatorAssets'
import { parseAssetManifest } from '../src/domain/assetManifest'
import { createGeneratorSelector, validateGeneratorMetadata, type GeneratorAssetQuery } from '../src/domain/generatorAssets'
import { themeWorldAssets } from '../src/world/themeWorld'
import type { WorldScatterAsset } from '../src/world/scatterModel'

const root = 'public/world-assets-painterly/'
const raw = JSON.parse(readFileSync(root + 'mapweaver-assets.json', 'utf8'))
const pack = readFileSync(root + 'mapweaver-world-painterly.zip')
const stores: Storage[] = []
const store = () => { const s = new Storage(mkdtempSync(path.join(os.tmpdir(), 'mw-painterly-'))); stores.push(s); return s }
afterEach(() => { for (const s of stores.splice(0)) { s.close(); rmSync(s.root, { recursive: true, force: true }) } })
async function imported(s: Storage, bytes: Uint8Array) {
  const p = await previewPack(s, bytes)
  expect(p.errors).toEqual([])
  return commitPack(s, { token: p.token, revision: p.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true })
}
it('ships unique transparent bounded images, verified hashes and complete semantics for all terrain', async () => {
  const { manifest, warnings } = parseAssetManifest(raw)
  expect(warnings).toEqual([])
  expect(manifest.assets).toHaveLength(46)
  expect(manifest.collections).toHaveLength(8)
  expect(new Set(manifest.assets.map(a => a.sha256)).size).toBe(46)
  expect(manifest.assets.filter(a => a.generator)).toHaveLength(45)
  for (const a of manifest.assets) {
    expect(a.defaultSize).toMatchObject({ mode: 'world', unit: 'm', lockAspectRatio: true })
    expect(a.applicableMapTypes).toEqual(['world-map', 'regional-map'])
    expect(a.categoryPath).toHaveLength(3)
    expect(a.source).toBeTruthy(); expect(a.license).toBeTruthy()
    if (a.generator) {
      const g = validateGeneratorMetadata(a.generator)
      expect(g.themes).toEqual(['painterlyFantasy'])
      expect(g.hierarchy).toBeTruthy(); expect(g.lighting).toBe('northwest');expect(g.scale).toEqual(HIERARCHY_SCALE[g.hierarchy!])
      expect(g.rotation).toEqual({ allowed: false, min: 0, max: 0 })
      expect(g.spacing).toBeGreaterThan(0)
    } else expect(a.file).toBe('assets/landmark-tower-01.png')
    const bytes = readFileSync(root + a.file)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256)
    const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true })
    expect(info.channels).toBe(4);expect(info.width).toBeLessThanOrEqual(512);expect(info.height).toBeLessThanOrEqual(384)
    const alpha = Array.from({ length: info.width * info.height }, (_, i) => data[i * 4 + 3])
    expect(alpha.some(v => v === 0)).toBe(true)
    expect(alpha.some(v => v === 255)).toBe(true)
    expect(alpha[0]).toBe(0)
  }
}, 30000)
it('roundtrips the standard pack without duplicates and preserves the installed old family', async () => {
  const s = store()
  await imported(s, readFileSync('public/world-assets/mapweaver-world-engraved.zip'))
  const old = libraryQuery(s, { limit: '200' }).assets
  await imported(s, pack); await imported(s, pack)
  const all = libraryQuery(s, { limit: '200' })
  expect(all.total).toBe(70)
  expect(all.assets.filter(a => old.some(b => b.id === a.id))).toEqual(old)
  const assets = all.assets.filter(a => !old.some(b => b.id === a.id))
  const other = store(), exported = exportLibrary(s, assets.map(a => a.id))
  await imported(other, exported); await imported(other, exported)
  const result = libraryQuery(other, { limit: '200' })
  expect(result.total).toBe(46); expect(result.collections).toHaveLength(8)
  const stable = (values: typeof assets) => values.map(a => ({ name: a.name, sha256: a.sha256, generator: a.generator, defaultSize: a.defaultSize, applicableMapTypes: a.applicableMapTypes })).sort((a, b) => a.name.localeCompare(b.name))
  expect(stable(result.assets)).toEqual(stable(assets))
  expect(other.db.prepare('SELECT COUNT(*) n FROM library_members').get()).toEqual({ n: 46 })
}, 30000)
it('answers every family query at exact theme/biome/role level and keeps weighted selection deterministic', async () => {
  const s = store(); await imported(s, pack)
  const queries: Pick<GeneratorAssetQuery, 'semanticType' | 'biome' | 'roles'>[] = [
    { semanticType: 'mountain', biome: 'temperate', roles: ['ridge'] },
    { semanticType: 'snowMountain', biome: 'snow', roles: ['peak'] },
    { semanticType: 'forestCluster', biome: 'deciduous', roles: ['forestInterior'] },
    { semanticType: 'forestCluster', biome: 'deciduous', roles: ['forestEdge'] },
    { semanticType: 'forestCluster', biome: 'conifer', roles: ['forestInterior'] },
    { semanticType: 'tree', biome: 'conifer', roles: ['forestEdge'] },
    { semanticType: 'swampVegetation', biome: 'swamp', roles: ['swampInterior'] },
    { semanticType: 'swampVegetation', biome: 'wetland', roles: ['swampEdge'] },
    { semanticType: 'marshCluster', biome: 'wetland', roles: ['swampEdge'] },
    { semanticType: 'volcano', biome: 'volcanic', roles: ['landmark'] },
    { semanticType: 'hill', biome: 'arid', roles: ['foothill'] },
    { semanticType: 'rockCluster', biome: 'generic', roles: ['rockScatter'] },
  ]
  for (const q of queries) {
    const result = queryGeneratorAssets(s, { ...q, theme: 'painterlyFantasy', mapType: 'world-map' })
    expect(result.level).toBe(1); expect(result.candidates.length).toBeGreaterThan(0)
  }
  const candidates = queryGeneratorAssets(s, { semanticType: 'volcano', mapType: 'world-map' }).candidates
  const select = createGeneratorSelector(candidates), reverse = createGeneratorSelector([...candidates].reverse())
  const draws = Array.from({ length: 1000 }, (_, i) => select(123, i)!.id)
  expect(draws).toEqual(Array.from({ length: 1000 }, (_, i) => reverse(123, i)!.id))
  const active = candidates.find(a => a.name.includes('Active'))!
  expect(draws.filter(id => id === active.id).length).toBeGreaterThan(100)
  expect(draws.filter(id => id === active.id).length).toBeLessThan(250)
  const all = libraryQuery(s, { limit: '200' }).assets.filter(a => a.generator) as WorldScatterAsset[]
  expect(themeWorldAssets(all, 'world.painterlyFantasy')).toHaveLength(45)
  expect(themeWorldAssets(all, 'world.classicParchment')).toHaveLength(0)
}, 30000)

it('upgrades metadata from the original artwork pack without replacing asset IDs or hashes',async()=>{
 const s=store(),old=structuredClone(raw),archive=unzipSync(pack)
 old.assets=old.assets.slice(0,42);const files=new Set(old.assets.map((a:{file:string})=>a.file))
 for(const c of old.collections)c.members=c.members.filter((m:{file:string})=>files.has(m.file))
 for(const a of old.assets)if(a.generator){delete a.generator.hierarchy;delete a.generator.ridgeAxis;delete a.generator.lighting;a.generator.scale={min:.88,max:1.15}}
 archive['mapweaver-assets.json']=strToU8(JSON.stringify(old));for(const file of Object.keys(archive))if(file.startsWith('assets/')&&!files.has(file))delete archive[file]
 await imported(s,Buffer.from(zipSync(archive)));const before=libraryQuery(s,{limit:'200'}).assets
 const preview=await previewPack(s,pack);expect(preview.errors).toEqual([]);commitPack(s,{token:preview.token,revision:preview.revision,duplicate:'overwrite',createCategories:true,useExistingCategories:true})
 const after=libraryQuery(s,{limit:'200'}).assets;expect(after).toHaveLength(46)
 for(const a of before){const b=after.find(b=>b.id===a.id)!;expect(b.sha256).toBe(a.sha256);if(a.generator)expect(b.generator?.hierarchy).toBeTruthy()}
},30000)

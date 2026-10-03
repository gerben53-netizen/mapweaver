import { afterEach,expect,it } from 'vitest'
import { mkdtempSync,rmSync,readFileSync,readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { Storage } from './storage'
import { previewPack,commitPack,exportLibrary } from './libraryPacks'
import { libraryQuery,libraryCommand,libraryRevision } from './library'
import { queryGeneratorAssets,generatorAssetReadiness } from './generatorAssets'
import { parseAssetManifest } from '../src/domain/assetManifest'
import { validateGeneratorMetadata } from '../src/domain/generatorAssets'
const roots:string[]=[],stores:Storage[]=[]
function store(){const root=mkdtempSync(path.join(os.tmpdir(),'mw-generator-'));roots.push(root);const s=new Storage(root);stores.push(s);return s}
afterEach(()=>{stores.forEach(s=>{if(s.db.open)s.close()});stores.length=0;roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true}))})
const pack=readFileSync('public/world-assets/mapweaver-world-engraved.zip')
async function imported(s:Storage,bytes=pack){const p=await previewPack(s,bytes);expect(p.errors).toEqual([]);return commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})}
it('validates complete bundled metadata and transparent unique images across every family',async()=>{
  const raw=JSON.parse(readFileSync('public/world-assets/mapweaver-assets.json','utf8')),m=parseAssetManifest(raw).manifest
  expect(m.assets).toHaveLength(24);expect(m.collections).toHaveLength(6)
  const types=new Set<string>()
  for(const a of m.assets){const g=validateGeneratorMetadata(a.generator);types.add(g.semanticType);expect(a.generator?.scale).toBeDefined();expect(a.generator?.rotation).toBeDefined();expect(a.generator?.weight).toBeGreaterThan(0);expect(a.applicableMapTypes).toEqual(['world-map','regional-map']);expect(a.defaultSize?.mode).toBe('world');expect(a.defaultSize?.unit).toBe('m')
    const {data,info}=await sharp('public/world-assets/'+a.file).ensureAlpha().raw().toBuffer({resolveWithObject:true});expect(info.channels).toBe(4);const alpha=Array.from({length:info.width*info.height},(_,i)=>data[i*4+3]);expect(alpha.some(v=>v===0)).toBe(true);expect(alpha.some(v=>v===255)).toBe(true);expect(alpha[0]).toBe(0)
  }
  for(const type of ['mountain','hill','tree','forestCluster','snowMountain','volcano','rock','rockCluster','swampVegetation','marshCluster'])expect(types.has(type)).toBe(true)
},20000)
it('imports, exports and reimports semantics/categories/collections without duplicate records',async()=>{
  const s=store();await imported(s);const initial=libraryQuery(s,{limit:'200'});expect(initial.total).toBe(24)
  const bytes=exportLibrary(s,initial.assets.map(a=>a.id)),other=store();await imported(other,bytes);await imported(other,bytes)
  const result=libraryQuery(other,{limit:'200'});expect(result.total).toBe(24);expect(result.collections).toHaveLength(6)
  expect(result.assets.map(a=>[a.name,a.generator,a.defaultSize,a.applicableMapTypes])).toEqual(initial.assets.map(a=>[a.name,a.generator,a.defaultSize,a.applicableMapTypes]))
  expect(result.categories.map(c=>c.name).sort()).toEqual(initial.categories.map(c=>c.name).sort())
  expect(other.db.prepare('SELECT COUNT(*) n FROM library_members').get()).toEqual({n:24})
  const ready=generatorAssetReadiness(other);expect(ready.families.every(f=>f.count>0)).toBe(true)
  const query=queryGeneratorAssets(other,{semanticType:'snowMountain',roles:['ridge'],biome:'snow',theme:'genericFantasy',mapType:'world-map'});expect(query.level).toBe(1);expect(query.candidates.map(a=>a.name)).toEqual(['Snow ridge'])
})
it('validates edits transactionally, supports undo and clears semantics when copied into a fill pattern',async()=>{
  const s=store();await imported(s);const a=libraryQuery(s,{limit:'200'}).assets[0]
  const run=(patch:object)=>libraryCommand(s,{op:'metadata',revision:libraryRevision(s),ids:[a.id],patch})
  expect(()=>run({generator:{...a.generator,weight:0}})).toThrow(/weight/)
  expect(JSON.parse(s.asset(a.id).generator!)).toEqual(a.generator)
  const changed=run({generator:{...a.generator,weight:2}});expect(JSON.parse(s.asset(a.id).generator!).weight).toBe(2)
  libraryCommand(s,{op:'undo',revision:libraryRevision(s),token:changed.token});expect(JSON.parse(s.asset(a.id).generator!)).toEqual(a.generator)
  libraryCommand(s,{op:'copy-role',revision:libraryRevision(s),ids:[a.id]});expect(libraryQuery(s,{type:'fill-pattern'}).assets[0].generator).toBeNull()
  run({generator:null});expect(queryGeneratorAssets(s,{semanticType:a.generator!.semanticType,mapType:'world-map'}).candidates.some(v=>v.id===a.id)).toBe(false);expect(s.asset(a.id).sha256).toBe(a.sha256)
})
it('upgrades a schema-7 library with a recovery backup while preserving IDs, images and metadata',async()=>{
  const s=store();await imported(s);const before=libraryQuery(s,{limit:'200'}).assets.map(a=>({id:a.id,name:a.name,sha256:a.sha256,defaultSize:a.defaultSize}))
  s.db.exec('DROP INDEX assets_generator_type; ALTER TABLE assets DROP COLUMN generator; DELETE FROM schema_migrations WHERE version=8;');const root=s.root;s.close();const upgraded=new Storage(root);stores.push(upgraded)
  expect(libraryQuery(upgraded,{limit:'200'}).assets.map(a=>({id:a.id,name:a.name,sha256:a.sha256,defaultSize:a.defaultSize}))).toEqual(before)
  expect(libraryQuery(upgraded,{limit:'200'}).assets.every(a=>a.generator===null)).toBe(true);expect(readdirSync(path.join(root,'backups')).some(n=>n.startsWith('pre-generator-assets-'))).toBe(true)
})
it('queries thousands of metadata records through the semantic index without loading image blobs',async()=>{
  const s=store();await imported(s)
  const first=queryGeneratorAssets(s,{semanticType:'mountain',mapType:'world-map'}).candidates[0],source=s.asset(first.id),columns=Object.keys(source)
  const insert=s.db.prepare(`INSERT INTO assets(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`)
  s.db.transaction(()=>{for(let i=0;i<9990;i++){const row={...source,aspectRatioLocked:Number(source.aspectRatioLocked),id:`performance-${i}`,sha256:i.toString(16).padStart(64,'0')};insert.run(...columns.map(k=>(row as unknown as Record<string,unknown>)[k]))}})()
  const start=performance.now(),result=queryGeneratorAssets(s,{semanticType:'mountain',mapType:'world-map'}),ms=performance.now()-start
  expect(result.candidates).toHaveLength(9995);expect(ms).toBeLessThan(3000)
  const plan=s.db.prepare("EXPLAIN QUERY PLAN SELECT * FROM assets WHERE generator IS NOT NULL AND deletedAt IS NULL AND type='stamp' AND json_extract(generator,'$.semanticType')=?").all('mountain') as {detail:string}[]
  expect(plan.some(p=>p.detail.includes('assets_generator_type'))).toBe(true);console.log('SQL_GENERATOR_QUERY_9995_MS',ms)
},20000)

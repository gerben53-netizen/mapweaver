import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import { Storage } from './storage'
import { previewPack, commitPack, exportLibrary } from './libraryPacks'
import { libraryQuery } from './library'
const stores: Storage[] = []
const storage = () => { const s = new Storage(mkdtempSync(path.join(os.tmpdir(), 'stamp-families-'))); stores.push(s); return s }
afterEach(() => { for (const s of stores.splice(0)) { s.close(); rmSync(s.root, {recursive:true,force:true}) } })
async function pack(count = 6, revision = 1, override: object = {}) {
  const files: Record<string,Uint8Array> = {}
  const variants = await Promise.all(Array.from({length:count},async (_,i) => {
    const file = `shelf-${i}.png`
    files[file] = await sharp({create:{width:120,height:60,channels:4,background:{r:100+i*15,g:60,b:20,alpha:1}}}).png().toBuffer()
    return {id:`shelf-${i}`,file,weight:i+1,label:`Bookshelf ${i+1}`}
  }))
  files['mapweaver-assets.json'] = strToU8(JSON.stringify({schemaVersion:3,pack:{id:'bookshelf-test',revision},assets:[],families:[{id:'bookshelf',displayName:'Bookshelf family',categoryId:'bookcases',tags:['library'],semanticClass:'storage',softShadowDefault:true,defaultSize:{mode:'world',width:10,height:5,unit:'ft',lockAspectRatio:true},variants,...override}]}))
  return Buffer.from(zipSync(files,{level:0}))
}
async function imported(s:Storage,bytes:Buffer) { const p=await previewPack(s,bytes);expect(p.errors).toEqual([]);return commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep'}) }
it('imports six variants as one family, preserves taxonomy and transfers its ZIP',async()=>{
  const s=storage();await imported(s,await pack());const q=libraryQuery(s,{});expect(q.total).toBe(1);expect(q.assets[0].family?.variants).toHaveLength(6);expect(q.assets[0].categoryId).toBe('bookcases');expect(libraryQuery(s,{search:'storage'}).total).toBe(1)
  const target=storage();await imported(target,exportLibrary(s,[q.assets[0].id]));expect(libraryQuery(target,{}).assets[0].family?.variants).toHaveLength(6)
})
it('adds variants with immutable IDs, retains removed variants as deprecated, rejects conflicting revisions',async()=>{
  const s=storage();await imported(s,await pack());const first=libraryQuery(s,{}).assets[0].family!;await imported(s,await pack(7,2));const second=libraryQuery(s,{}).assets[0].family!;expect(second.variants.slice(0,6)).toEqual(first.variants);expect(second.variants).toHaveLength(7)
  await imported(s,await pack(6,3));const third=libraryQuery(s,{}).assets[0].family!;expect(third.variants.find(v=>v.id==='shelf-6')?.deprecated).toBe(true);expect(s.bytes(s.asset(second.variants[6].assetId)).length).toBeGreaterThan(0)
  const exported=exportLibrary(s,[libraryQuery(s,{}).assets[0].id]);expect((await previewPack(s,exported)).errors).toEqual([]);await imported(storage(),exported)
  const changed=unzipSync(await pack(7,4));changed['shelf-6.png']=await sharp({create:{width:120,height:60,channels:4,background:'blue'}}).png().toBuffer();expect((await previewPack(s,Buffer.from(zipSync(changed,{level:0})))).errors.join()).toMatch(/retired images/)
  expect((await previewPack(s,await pack(7,3))).errors.join()).toMatch(/immutable family revision/)
})
it('rejects duplicate family IDs, invalid cover, missing image and invalid weight without writes',async()=>{
  const s=storage();for(const override of [{coverVariantId:'missing'},{variants:[]},{variants:[{id:'x',file:'missing.png',weight:1}]},{variants:[{id:'x',file:'shelf-0.png',weight:0}]}]) {expect((await previewPack(s,await pack(6,1,override))).errors.length).toBeGreaterThan(0);expect(libraryQuery(s,{}).total).toBe(0)}
})

it('keeps exact family reimports idempotent and rejects duplicate family or variant identities',async()=>{
  const s=storage(),bytes=await pack(4),first=await imported(s,bytes)
  const repeat=await imported(s,bytes)
  expect(repeat.summary.imported).toBe(0);expect(repeat.summary.skipped).toBe(4)
  expect(repeat.entries.map(a=>a.id)).toEqual(first.entries.map(a=>a.id))
  const before=libraryQuery(s,{})
  for(const duplicate of ['family','variant']) {
    const files=unzipSync(bytes),manifest=JSON.parse(new TextDecoder().decode(files['mapweaver-assets.json']))
    if(duplicate==='family')manifest.families.push(structuredClone(manifest.families[0]))
    else manifest.families[0].variants[1].id=manifest.families[0].variants[0].id
    files['mapweaver-assets.json']=strToU8(JSON.stringify(manifest))
    const preview=await previewPack(s,Buffer.from(zipSync(files,{level:0})))
    expect(preview.errors.length).toBeGreaterThan(0)
    expect(()=>commitPack(s,{token:preview.token,revision:preview.revision,duplicate:'keep'})).toThrow()
    expect(libraryQuery(s,{})).toEqual(before)
  }
})

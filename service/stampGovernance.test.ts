import {afterEach,expect,it} from 'vitest'
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {zipSync,strToU8} from 'fflate'
import {Storage} from './storage'
import {previewPack,commitPack,exportLibrary} from './libraryPacks'
import {categories,libraryQuery,patchAsset,libraryRevision,putCategory} from './library'
import {resolveStampCategory,normalizeStampTags} from '../src/domain/stampTaxonomy'
import {parseAssetManifest} from '../src/domain/assetManifest'
const stores:Storage[]=[]
function storage(fail?:()=>void){const s=new Storage(mkdtempSync(path.join(os.tmpdir(),'stamp-governance-')),fail);stores.push(s);return s}
afterEach(()=>{for(const s of stores.splice(0)){s.close();rmSync(s.root,{recursive:true,force:true})}})
async function pack(extra:object={},revision=1,color='red'){
 const png=await sharp({create:{width:30,height:20,channels:4,background:color}}).png().toBuffer()
 return Buffer.from(zipSync({'image.png':png,'mapweaver-assets.json':strToU8(JSON.stringify({schemaVersion:3,pack:{id:'test',revision},collection:{title:'Eldric Palace Library'},assets:[{id:'shelf',file:'image.png',type:'stamp',categoryId:'bookcases',title:'Boekenkast',tags:[' Palace ','palace','Paleis','Eldric'],semanticClass:'storage',softShadowDefault:true,...extra}]}))},{level:0}))
}
const options=(p:Awaited<ReturnType<typeof previewPack>>)=>({token:p.token,revision:p.revision,duplicate:'keep' as const})
it('resolves reviewed object aliases and context tags without guessing unknown categories',()=>{
 expect(resolveStampCategory('Furniture').categoryId).toBe('furniture')
 expect(resolveStampCategory(['Eryndor','Palace','Opslag','Boekenkasten'])).toEqual({categoryId:'bookcases',tags:['Eryndor','paleis']})
 expect(resolveStampCategory('Library')).toEqual({categoryId:null,tags:['bibliotheek']})
 expect(resolveStampCategory('made-up').categoryId).toBeNull()
 expect(normalizeStampTags(['PALACE',' paleis ','Eldric','eldric','Novel Style'])).toEqual(['paleis','Eldric','novel style'])
})
it('blocks unresolved categories even with category creation flags; explicit canonical mapping works atomically',async()=>{
 const s=storage(),p=await previewPack(s,await pack({categoryId:'palace-furniture'})),before=categories(s),revision=libraryRevision(s)
 expect(p.categoryMappings[0].categoryId).toBeNull();expect(p.errors).toEqual([])
 expect(()=>commitPack(s,{...options(p),createCategories:true})).toThrow('Unresolved category')
 expect(categories(s)).toEqual(before);expect(libraryRevision(s)).toBe(revision);expect(readdirSync(path.join(s.root,'assets/originals'))).toEqual([])
 const result=commitPack(s,{...options(p),categoryMappings:{'palace-furniture':'bookcases'}})
 expect(result.summary.imported).toBe(1);expect(result.entries[0].tags).toEqual(['paleis','Eldric']);expect(categories(s).map(c=>c.name)).not.toContain('Palace')
 expect(result.entries[0].quality?.semanticClass).toBe('storage')
 expect(()=>libraryQuery(s,{search:'x'.repeat(120)})).not.toThrow()
})
it('retains old image identities across newer immutable revisions; conflicts and duplicate IDs fail safely',async()=>{
 const s=storage(),p=await previewPack(s,await pack()),first=commitPack(s,options(p)).entries[0],old=s.bytes(s.asset(first.id))
 const duplicate=await previewPack(s,await pack());expect(commitPack(s,options(duplicate)).summary.skipped).toBe(1)
 const conflict=await previewPack(s,await pack({},1,'blue'));expect(conflict.errors.join()).toContain('Conflicting immutable');expect(()=>commitPack(s,options(conflict))).toThrow()
 const next=await previewPack(s,await pack({},2,'blue')),second=commitPack(s,options(next)).entries[0]
 expect(second.id).not.toBe(first.id);expect(s.bytes(s.asset(first.id))).toEqual(old)
 expect(s.db.prepare('SELECT * FROM pack_asset_revisions').all()).toHaveLength(2)
 const transfer=storage(),portable=await previewPack(transfer,exportLibrary(s,[first.id,second.id]));expect(portable.errors).toEqual([]);expect(commitPack(transfer,options(portable)).entries).toHaveLength(2)
})
it('preserves inactive quality and rolls back registry, identities, assets and files after a failed write',async()=>{
 let fail=false;const s=storage(()=>{if(fail)throw Error('Injected rollback')}),p=await previewPack(s,await pack()),a=commitPack(s,options(p)).entries[0]
 patchAsset(s,a.id,{quality:{classification:'REPLACE',reason:'review',semanticClass:'storage',softShadowDefault:true}})
 const exact=await previewPack(s,await pack());commitPack(s,options(exact));expect(libraryQuery(s,{}).total).toBe(0)
 const overwrite=await previewPack(s,await pack());expect(()=>commitPack(s,{...options(overwrite),duplicate:'overwrite'})).toThrow('cannot be reactivated')
 const before=categories(s),count=s.db.prepare('SELECT COUNT(*) AS n FROM assets').get(),next=await previewPack(s,await pack({categoryId:'plants'},2,'blue'));fail=true
 expect(()=>commitPack(s,options(next))).toThrow('Injected rollback');expect(categories(s)).toEqual(before);expect(s.db.prepare('SELECT COUNT(*) AS n FROM assets').get()).toEqual(count);expect(readdirSync(path.join(s.root,'assets/originals'))).toHaveLength(1)
})
it('rejects duplicate IDs, missing files, malformed semantics and conflicting category declarations before writes',async()=>{
 const s=storage()
 for(const extra of [{file:'missing.png'},{semanticClass:'not a class'},{softShadowDefault:'yes'},{categoryId:'bookcases',categoryPath:['Meubilair']}]){
  const p=await previewPack(s,await pack(extra));expect(p.errors.length).toBeGreaterThan(0);expect(()=>commitPack(s,options(p))).toThrow();expect(libraryQuery(s,{}).total).toBe(0)
 }
 const a={id:'same',file:'one.png',type:'stamp'}
 expect(()=>parseAssetManifest({schemaVersion:3,pack:{id:'p',revision:1},assets:[a,{...a,file:'two.png'}]})).toThrow('Duplicate asset ID')
 const empty=await previewPack(s,Buffer.from(zipSync({'mapweaver-assets.json':strToU8(JSON.stringify({schemaVersion:1,assets:[],categories:[{path:['Palace'],sortOrder:0}]}))})))
 expect(empty.errors.join()).toContain('category-only packs');expect(()=>commitPack(s,{...options(empty),createCategories:true})).toThrow();expect(categories(s).map(c=>c.name)).not.toContain('Palace')
})
it('keeps user-guide examples and every quick-reference category synchronized with the runtime registry',async()=>{
 const {STAMP_CATEGORIES}=await import('../src/domain/stampTaxonomy')
 for(const file of ['docs/stamp-importer.md','docs/stamp-pack-quick-reference.md']){
  const text=readFileSync(file,'utf8'),example=text.match(/```json\r?\n([\s\S]*?)\r?\n```/)!
  expect(parseAssetManifest(JSON.parse(example[1])).warnings).toEqual([])
 }
 const quick=readFileSync('docs/stamp-pack-quick-reference.md','utf8');for(const c of STAMP_CATEGORIES)expect(quick).toContain('| '+c.id+' |')
})
it('reuses historical object-alias IDs and projects Dutch picker labels without rewriting rows',async()=>{
 const s=storage(),legacy=putCategory(s,{name:'Furniture'}),before=categories(s),p=await previewPack(s,await pack({categoryId:'furniture'}))
 const result=commitPack(s,options(p));expect(result.entries[0].categoryId).toBe(legacy.id);expect(categories(s)).toEqual(before)
 const query=libraryQuery(s,{category:'furniture'});expect(query.total).toBe(1);expect(query.categories.find(c=>c.id===legacy.id)?.name).toBe('Meubilair')
})

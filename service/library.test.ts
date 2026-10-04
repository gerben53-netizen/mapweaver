import {defaultMapStyle} from '../src/domain/mapSettings'
import {createApp} from './app'
import {createBackup,extractArchive} from './archives'
import {generation} from './safety'
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { zipSync, strToU8 } from 'fflate'
import { Storage,hash } from './storage'
import { removalPreview, usage, categories, libraryCommand, libraryQuery, libraryRevision, patchAsset, publicAsset, putCategory } from './library'
import type { LibraryAsset } from './library'
import { commitPack, exportLibrary, previewPack } from './libraryPacks'
const roots:string[]=[],stores:Storage[]=[]
function store(fail?:()=>void){const root=mkdtempSync(path.join(os.tmpdir(),'mw-library-'));roots.push(root);const s=new Storage(root,fail);stores.push(s);return s}
afterEach(()=>{stores.splice(0).forEach(s=>{if(s.db.open)s.close()});roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true}))})
async function image(color='red'){return sharp({create:{width:20,height:10,channels:4,background:color}}).png().toBuffer()}
async function pack(extra:object={},bytes?:Buffer){return Buffer.from(zipSync({'meubilair/06_desk.png':bytes||await image(),'mapweaver-assets.json':strToU8(JSON.stringify({schemaVersion:1,assets:[{file:'meubilair/06_desk.png',type:'stamp',title:'Desk',description:'A desk',categoryPath:['Eryndor','Sylvenglen','Paleis','Meubilair','Tafels & bureaus'],tags:['Study'],defaultSize:{mode:'grid',width:2,height:1,unit:'cells',lockAspectRatio:false},...extra}],categories:[{path:['Eryndor','Empty'],sortOrder:3}]}))},{level:0}))}
async function imported(s:Storage,extra:object={}){const p=await previewPack(s,await pack(extra));expect(p.errors).toEqual([]);return commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})}
const cmd=(s:Storage,b:object)=>libraryCommand(s,{revision:libraryRevision(s),...b} as Parameters<typeof libraryCommand>[1])
describe('advanced local library',()=>{
 it('normalizes nested metadata; parent search and All assets; rejects arbitrary categories and round-trips bytes',async()=>{
  const s=store();await imported(s);const root=categories(s).find(c=>c.name==='Meubilair')!,query=libraryQuery(s,{category:root.id,search:'STUDY'})
  expect(query.total).toBe(1);expect(libraryQuery(s,{search:'desk'}).total).toBe(1);expect(libraryQuery(s,{type:'fill-pattern'}).total).toBe(0)
  expect(query.assets[0].defaultSize).toMatchObject({width:2,height:1});const bytes=exportLibrary(s,[query.assets[0].id],root.id),other=store(),preview=await previewPack(other,bytes)
  expect(preview.errors).toEqual([]);commitPack(other,{token:preview.token,revision:preview.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})
  const restored=libraryQuery(other,{}).assets[0];expect(restored.name).toBe('Desk');expect(restored.tags).toEqual(['studie','Eryndor','Sylvenglen','paleis']);expect(restored.sha256).toBe(query.assets[0].sha256);expect(categories(other).some(c=>c.name==='Empty')).toBe(false)
 })
 it('rejects cycles, depth nine and conflicting deletion without partial writes',()=>{
  const s=store();let parent:string|null=null;const chain:string[]=[]
  for(let i=0;i<8;i++){parent=putCategory(s,{name:`Level ${i}`,parentId:parent}).id;chain.push(parent)}
  const before=JSON.stringify(categories(s));expect(()=>cmd(s,{op:'category',category:{name:'Nine',parentId:parent}})).toThrow(/eight/);expect(()=>cmd(s,{op:'category',category:{id:chain[0],parentId:chain[7]}})).toThrow();expect(JSON.stringify(categories(s))).toBe(before)
  const b=putCategory(s,{name:'Sibling'});putCategory(s,{name:'Sibling',parentId:chain[0]});expect(()=>cmd(s,{op:'delete-category',id:chain[0]})).toThrow(/sibling/);expect(categories(s).some(c=>c.id===b.id)).toBe(true)
  const parentCategory=putCategory(s,{name:'Same'}),child=putCategory(s,{name:'Same',parentId:parentCategory.id});cmd(s,{op:'delete-category',id:parentCategory.id});expect(categories(s).find(c=>c.id===child.id)?.parentId).toBeNull()
 })
 it('keeps IDs during move/rename; version-checks metadata and undo against a second tab',async()=>{
  const s=store();await imported(s);const a=libraryQuery(s,{}).assets[0],revision=libraryRevision(s),change=cmd(s,{op:'metadata',ids:[a.id],patch:{title:'New title'}})
  expect(()=>libraryCommand(s,{revision,op:'metadata',ids:[a.id],patch:{title:'Stale'}})).toThrow(/another tab/)
  cmd(s,{op:'undo',token:change.token});expect(s.asset(a.id).name).toBe('Desk')
  const c=categories(s).find(c=>c.id===a.categoryId)!;cmd(s,{op:'category',category:{id:c.id,name:'Furniture',parentId:null}});expect(s.asset(a.id).categoryId).toBe(c.id)
 })
 it('blocks path, hash, scale and unknown type errors before writes',async()=>{
  const s=store();for(const extra of [{file:'wrong/06_desk.png'},{sha256:'0'.repeat(64)},{type:'prefab'},{defaultSize:{mode:'grid',width:-1,height:2,unit:'cells',lockAspectRatio:false}}]){const p=await previewPack(s,await pack(extra));expect(p.errors.length).toBeGreaterThan(0);expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true})).toThrow();expect(libraryQuery(s,{}).total).toBe(0)}
 })
 it('enforces all three duplicate policies and preview revision conflicts',async()=>{
  const s=store();await imported(s);let p=await previewPack(s,await pack({title:'Incoming',author:'Author'}));commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true});expect(libraryQuery(s,{}).assets[0].name).toBe('Desk')
  p=await previewPack(s,await pack({title:'Incoming',author:'Author'}));commitPack(s,{token:p.token,revision:p.revision,duplicate:'fill',createCategories:true,useExistingCategories:true});expect(libraryQuery(s,{}).assets[0]).toMatchObject({name:'Desk',author:'Author'})
  p=await previewPack(s,await pack({title:'Incoming',description:''}));commitPack(s,{token:p.token,revision:p.revision,duplicate:'overwrite',createCategories:true,useExistingCategories:true});expect(libraryQuery(s,{}).assets[0]).toMatchObject({name:'Incoming',description:''})
  p=await previewPack(s,await pack());putCategory(s,{name:'Other'});expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep'})).toThrow(/another tab/)
 })
 it('rolls back failed commit, preserves shared blobs and leaves no import journal',async()=>{
  let fail=false;const s=store(()=>{if(fail)throw Error('Injected failure')});await imported(s);const asset=libraryQuery(s,{}).assets[0],original=s.bytes(s.asset(asset.id));const p=await previewPack(s,await pack({type:'fillPattern',defaultSize:{mode:'native',lockAspectRatio:true}}));fail=true
  expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})).toThrow('Injected failure');expect(libraryQuery(s,{type:'fill-pattern'}).total).toBe(0);expect(s.bytes(s.asset(asset.id))).toEqual(original);expect(readdirSync(path.join(s.root,'logs')).filter(n=>n.startsWith('library-import'))).toEqual([])
 })
 it('reviews resolved changes without writing files/rows, preserving original filenames and multiple roles',async()=>{
  const s=store(),bytes=await image(),manifest={schemaVersion:1,assets:[{file:'desk.png',type:'stamp',originalName:'06_original.png',title:'Desk'},{file:'desk.png',type:'fillPattern',title:'Desk pattern'}],categories:[{path:['Empty'],sortOrder:9}],collection:{title:'Both roles'}}
  const p=await previewPack(s,Buffer.from(zipSync({'desk.png':bytes,'mapweaver-assets.json':strToU8(JSON.stringify(manifest))},{level:0}))),options={token:p.token,revision:p.revision,duplicate:'keep' as const,createCategories:true,useExistingCategories:true}
  const reviewed=commitPack(s,options,true);expect(reviewed.entries).toHaveLength(2);expect(libraryQuery(s,{}).total).toBe(0);expect(readdirSync(path.join(s.root,'assets/originals'))).toEqual([])
  commitPack(s,options);const stamp=libraryQuery(s,{}).assets[0],pattern=libraryQuery(s,{type:'fill-pattern'}).assets[0];expect(stamp.originalName).toBe('06_original.png');expect(stamp.sha256).toBe(pattern.sha256);expect(readdirSync(path.join(s.root,'assets/originals'))).toHaveLength(1)
  const target=store(),round=await previewPack(target,exportLibrary(s,[stamp.id,pattern.id]));expect(round.errors).toEqual([]);commitPack(target,{...options,token:round.token,revision:round.revision});expect(libraryQuery(target,{}).assets[0].originalName).toBe('06_original.png')
  const work=path.join(s.root,'test-backup'),signal=new AbortController().signal,backup=await createBackup(s,work,generation(s),signal,()=>{}),dest=path.join(s.root,'restore');await extractArchive(backup.file,dest,signal,()=>{});const restored=new Storage(dest);stores.push(restored);expect(categories(restored).some(c=>c.name==='Empty')).toBe(false);expect(restored.db.prepare('SELECT * FROM library_members').all()).toHaveLength(2)
 })
 it('validates both shipped templates at runtime and a plain-image native title',async()=>{
  const s=store();for(const name of ['mapweaver-assets.json','06_manuscriptlessenaar.mapweaver.json']){const raw=JSON.parse(readFileSync(path.resolve('public/asset-templates',name),'utf8'));const bytes=readFileSync(path.resolve('public/asset-templates/06_manuscriptlessenaar.png'));const p=await previewPack(s,Buffer.from(zipSync({[name]:strToU8(JSON.stringify(raw)),[raw.assets[0].file]:bytes},{level:0})));expect(p.errors).toEqual([])}
  const p=await previewPack(s,Buffer.from(zipSync({'06_plain_image.png':await image()},{level:0})));expect(p.entries[0].title).toBe('06 plain image');commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep'});expect(libraryQuery(s,{}).assets[0].defaultSize.mode).toBe('native')
 })
 it('undoes and redoes sequential metadata commands but refuses a newer edit of the same row',async()=>{
  const s=store();await imported(s);const id=libraryQuery(s,{}).assets[0].id,a=cmd(s,{op:'metadata',ids:[id],patch:{title:'First'}}),b=cmd(s,{op:'metadata',ids:[id],patch:{description:'Second'}})
  cmd(s,{op:'undo',token:b.token});const inverse=cmd(s,{op:'undo',token:a.token});expect(s.asset(id).name).toBe('Desk');cmd(s,{op:'undo',token:inverse.token});expect(s.asset(id).name).toBe('First')
  patchAsset(s,id,{title:'Another browser'});expect(()=>cmd(s,{op:'undo',token:a.token})).toThrow(/newer/);expect(s.asset(id).name).toBe('Another browser')
 })
 it('recovers an interrupted file journal on service startup without removing a shared blob',async()=>{
  const s=store();await imported(s);const shared=libraryQuery(s,{}).assets[0],bytes=await image('blue'),orphan=`assets/originals/${hash(bytes)}.png`;s.atomic(orphan,bytes);const journal=path.join(s.root,'logs',`library-import-${crypto.randomUUID()}.json`);writeFileSync(journal,JSON.stringify([orphan,shared.originalPath]));s.close();const app=await createApp({directory:s.root});try{expect(existsSync(path.join(s.root,orphan))).toBe(false);expect(existsSync(path.join(s.root,shared.originalPath))).toBe(true);expect(existsSync(journal)).toBe(false);expect(libraryQuery(app.store,{}).assets[0].id).toBe(shared.id)}finally{await app.app.close()}
 })
 it('requires an explicit source for conflicting sidecar and collection metadata',async()=>{const s=store(),entry={file:'desk.png',type:'stamp'},bytes=Buffer.from(zipSync({'desk.png':await image(),'mapweaver-assets.json':strToU8(JSON.stringify({schemaVersion:1,assets:[{...entry,title:'Collection title'}]})),'desk.mapweaver.json':strToU8(JSON.stringify({schemaVersion:1,assets:[{...entry,title:'Sidecar title'}]}))},{level:0}));expect((await previewPack(s,bytes)).errors[0]).toContain('Choose which');expect((await previewPack(s,bytes,'stamp','collection')).entries[0].title).toBe('Collection title');expect((await previewPack(s,bytes,'stamp','sidecar')).entries[0].title).toBe('Sidecar title');expect(libraryQuery(s,{}).total).toBe(0)})
 it('selects across pages and adds/removes tags without losing other tags',async()=>{
  const s=store();await imported(s);const a=libraryQuery(s,{}).assets[0];cmd(s,{op:'tags-add',ids:[a.id],tags:['Wood']});cmd(s,{op:'tags-remove',ids:[a.id],tags:['studie']});expect(publicAsset(s.asset(a.id) as LibraryAsset).tags).toEqual(['Eryndor','Sylvenglen','paleis','Wood']);expect(libraryQuery(s,{limit:'1'},true).ids).toEqual([a.id]);patchAsset(s,a.id,{favorite:true});expect(libraryQuery(s,{favorite:'true'}).total).toBe(1);cmd(s,{op:'collection',name:'Set',description:'Original'});const c=libraryQuery(s,{}).collections[0];cmd(s,{op:'collection-add',ids:[a.id],collectionId:c.id});cmd(s,{op:'collection',id:c.id,name:'Renamed set',description:'Updated'});const removed=cmd(s,{op:'delete-collection',id:c.id});expect(libraryQuery(s,{}).collections).toEqual([]);cmd(s,{op:'undo',token:removed.token});expect(libraryQuery(s,{collection:c.id}).total).toBe(1)
 })
})

it('filters map applicability before pagination and keeps universal assets and explicit all browsing',async()=>{
 const s=store();await imported(s,{applicableMapTypes:['battlemap']});
 const preview=await previewPack(s,await pack({title:'Universal'},await image('blue')));commitPack(s,{token:preview.token,revision:preview.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})
 expect(libraryQuery(s,{mapType:'battlemap'}).total).toBe(2)
 for(const mapType of ['regional-map','world-map']){const result=libraryQuery(s,{mapType,limit:'1'});expect(result.total).toBe(1);expect(result.assets[0].name).toBe('Universal')}
 expect(libraryQuery(s,{}).total).toBe(2);expect(()=>libraryQuery(s,{mapType:'unknown'})).toThrow(/map type/)
})

describe('explicit library removal recovery',()=>{
 it('preflights a batch, cleans metadata, then cleanly reimports exactly once with categories and collections',async()=>{
  const s=store();await imported(s);const first=libraryQuery(s,{}).assets[0]
  cmd(s,{op:'collection',name:'Original collection',description:'Preserved'})
  const collection=(s.db.prepare('SELECT id FROM library_collections').get() as {id:string}).id
  cmd(s,{op:'collection-add',ids:[first.id],collectionId:collection})
  const bytes=exportLibrary(s,[first.id]),category=first.categoryId
  cmd(s,{op:'favorite',ids:[first.id],patch:{favorite:true}});cmd(s,{op:'tags-add',ids:[first.id],tags:['Stale']})
  s.db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('scatterRecentSets',?)").run(JSON.stringify([[{assetId:first.id}]]))
  expect(removalPreview(s,[first.id,first.id]).assets).toHaveLength(1);expect(usage(s,[first.id])).toEqual([])
  const removal=cmd(s,{op:'delete',ids:[first.id]})
  expect(libraryQuery(s,{}).total).toBe(0);expect(libraryQuery(s,{search:'desk'}).assets).toEqual([])
  expect(publicAsset(s.asset(first.id) as LibraryAsset)).toMatchObject({categoryId:'uncategorized',favorite:false,tags:[],description:''})
  expect(s.db.prepare('SELECT * FROM library_members').all()).toEqual([])
  expect(s.db.prepare('SELECT * FROM library_collections').all()).toHaveLength(1)
  expect(categories(s).some(c=>c.id===category)).toBe(true)
  expect(s.db.prepare("SELECT value FROM settings WHERE key='scatterRecentSets'").get()).toEqual({value:'[]'})
  // Full library restoration remains an explicit, supported undo.
  const restored=cmd(s,{op:'undo',token:removal.token});expect(libraryQuery(s,{}).total).toBe(1)
  cmd(s,{op:'undo',token:restored.token});expect(libraryQuery(s,{}).total).toBe(0)
  for(let i=0;i<2;i++){
   const p=await previewPack(s,bytes);expect(p.errors).toEqual([]);if(!i)expect(p.entries[0].existing).toBeNull()
   commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})
   expect(libraryQuery(s,{}).assets).toHaveLength(1)
   expect(libraryQuery(s,{}).assets[0]).toMatchObject({id:first.id,categoryId:category,favorite:false,tags:['studie','Eryndor','Sylvenglen','paleis']})
   expect(s.db.prepare('SELECT * FROM library_collections').all()).toHaveLength(1)
   expect(s.db.prepare('SELECT * FROM library_members').all()).toHaveLength(1)
  }
 })
 it('removes multiple assets atomically and reactivates single-image imports',async()=>{
  const s=store(),a=await s.importAsset(new File([new Uint8Array(await image('red'))],'red.png',{type:'image/png'}),'stamp','Red'),b=await s.importAsset(new File([new Uint8Array(await image('blue'))],'blue.png',{type:'image/png'}),'stamp','Blue')
  expect(()=>cmd(s,{op:'delete',ids:[a.asset.id,'missing']})).toThrow();expect(libraryQuery(s,{}).total).toBe(2)
  cmd(s,{op:'delete',ids:[a.asset.id,b.asset.id]});expect(libraryQuery(s,{}).total).toBe(0)
  const revived=await s.importAsset(new File([new Uint8Array(await image('red'))],'fresh.png',{type:'image/png'}),'stamp','Fresh')
  expect(revived).toMatchObject({added:true,asset:{id:a.asset.id,name:'Fresh'}});expect(libraryQuery(s,{}).total).toBe(1)
 })
})

it('distinguishes named saved-map usage and blocks the whole batch without changing the map',async()=>{
 const s=store();await imported(s);const a=libraryQuery(s,{}).assets[0]
 const b=(await s.importAsset(new File([new Uint8Array(await image('blue'))],'blue.png',{type:'image/png'}),'stamp','Unused')).asset
 const now=new Date().toISOString(),row=s.writeProject({formatVersion:2,id:crypto.randomUUID(),name:'Occupied map',createdAt:now,modifiedAt:now,map:{width:800,height:600,...defaultMapStyle(),background:{id:a.id,name:a.name,width:a.width,height:a.height}},layers:[{id:'layer',name:'Layer',visible:true,locked:false,objectIds:[]}],objects:[],assets:[{id:a.id,kind:'stamp',fileName:'desk.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]})
 const preview=removalPreview(s,[a.id,b.id]);expect(preview.usage).toEqual([{id:a.id,ownerId:row.id,kind:'map',name:'Occupied map'}])
 expect(()=>cmd(s,{op:'delete',ids:[a.id,b.id]})).toThrow('1 selected asset(s) are used by saved maps or definitions: Occupied map. Nothing removed.')
 expect(libraryQuery(s,{}).total).toBe(2);expect(s.project(row.id)).toEqual(row)
})

it('rolls back a failed tombstone revival with no partial metadata or collection memberships',async()=>{
 let fail=false;const s=store(()=>{if(fail)throw Error('Revival failure')});await imported(s)
 const asset=libraryQuery(s,{}).assets[0];cmd(s,{op:'delete',ids:[asset.id]});const before=s.asset(asset.id),revision=libraryRevision(s)
 const p=await previewPack(s,await pack());fail=true
 expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})).toThrow('Revival failure')
 expect(s.asset(asset.id)).toEqual(before);expect(libraryRevision(s)).toBe(revision);expect(libraryQuery(s,{}).total).toBe(0)
})

it('counts descendants with filters separately from genuine emptiness across roles and updates after removal',async()=>{
 const s=store();await imported(s);const root=categories(s).find(c=>c.name==='Meubilair')!,asset=libraryQuery(s,{}).assets[0]
 const original=categories(s)
 for(const q of [{search:'no match'},{favorite:'true'},{type:'fill-pattern'},{collection:'missing'}]){
  const result=libraryQuery(s,q),parent=result.categories.find(c=>c.id===root.id)!
  expect(parent).toMatchObject({direct:0,total:0,libraryTotal:1})
 }
 expect(libraryQuery(s,{}).categories.find(c=>c.id===root.id)).toMatchObject({direct:0,total:1,libraryTotal:1})
 expect(categories(s)).toEqual(original)
 cmd(s,{op:'delete',ids:[asset.id]})
 expect(libraryQuery(s,{}).categories.find(c=>c.id===root.id)).toMatchObject({total:0,libraryTotal:0})
})

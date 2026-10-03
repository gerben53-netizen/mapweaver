import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { zipSync, strToU8 } from 'fflate'
import { Storage, hash } from './storage'
import { previewPack, commitPack, exportLibrary } from './libraryPacks'
import { libraryQuery, libraryCommand, libraryRevision, usage } from './library'
import { createBackup, extractArchive } from './archives'
import { generation } from './safety'
import { mapWorkspace } from '../src/domain/geography'
import { DEFAULT_GRID } from '../src/domain/mapSettings'
import { validatePrefab } from '../src/domain/prefabs'
const roots:string[]=[],stores:Storage[]=[]
function store(fail?:()=>void) {const root=mkdtempSync(path.join(os.tmpdir(),'mw-prefab-'));roots.push(root);const s=new Storage(root,fail);stores.push(s);return s}
afterEach(()=>{stores.splice(0).forEach(s=>{if(s.db.open)s.close()});roots.splice(0).forEach(r=>rmSync(r,{recursive:true,force:true}))})
async function fixture() {
 const bytes=await sharp({create:{width:20,height:10,channels:4,background:'#778844'}}).png().toBuffer(),digest=hash(bytes)
 const map={width:1000,height:800,background:null,backgroundColor:'#ffffff',grid:{...DEFAULT_GRID},...mapWorkspace({})}
 const prefab=validatePrefab({formatVersion:1,mode:'editable',bounds:{x:0,y:0,width:100,height:50},visibleBounds:{x:0,y:0,width:100,height:50},anchor:{x:50,y:25},sourceMap:map,renderScale:1,document:{formatVersion:12,id:'composition',name:'House',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects:[{id:'furniture',kind:'stamp',assetId:'source',x:0,y:0,width:100,height:50,rotation:0,scaleX:1,scaleY:1,opacity:1}],layers:[{id:'layer',name:'Furniture',visible:true,locked:false,objectIds:['furniture']}],objectGroups:[],layerTree:{roots:['layer'],groups:[]},assets:[{id:'source',kind:'stamp',fileName:'desk.png',mimeType:'image/png',width:20,height:10,hash:digest,path:`assets/${digest}.png`}]}})
 const manifest={schemaVersion:2,assets:[{file:'desk.png',type:'stamp',sha256:digest},{file:'preview.png',type:'prefab',title:'House',categoryPath:['Eryndor','Buildings'],tags:['home'],defaultSize:{mode:'grid',width:2,height:1,unit:'cells',lockAspectRatio:true},prefab}]}
 const pack=()=>Buffer.from(zipSync({'desk.png':bytes,'preview.png':bytes,'mapweaver-assets.json':strToU8(JSON.stringify(manifest))},{level:0}))
 return {pack,manifest}
}
async function insert(s:Storage,bytes:Buffer){const p=await previewPack(s,bytes);expect(p.errors).toEqual([]);return commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})}
it('stores one canonical prefab, shares image bytes, protects dependencies and transfers a complete closure',async()=>{
 const s=store(),f=await fixture();await insert(s,f.pack());const result=libraryQuery(s,{type:'prefab'}),row=result.assets[0]
 expect(result.total).toBe(1);expect(libraryQuery(s,{type:'prefab',search:'HOME',category:result.categories.find(c=>c.name==='Eryndor')!.id}).total).toBe(1)
 const p=validatePrefab(JSON.parse(s.asset(row.id).prefab!)),dep=p.document.assets[0];expect(dep.id).not.toBe('source');expect(p.document.objects[0]).toMatchObject({assetId:dep.id})
 expect(readdirSync(path.join(s.root,'assets/originals'))).toHaveLength(1)
 expect(usage(s,[dep.id])[0].name).toBe('Prefab: House')
 expect(()=>libraryCommand(s,{revision:libraryRevision(s),op:'delete',ids:[dep.id]})).toThrow(/saved maps or definitions: Prefab: House/)
 const other=store();await insert(other,exportLibrary(s,[row.id]));const restored=libraryQuery(other,{type:'prefab'}).assets[0]
 expect(restored.tags).toEqual(['home']);expect(restored.defaultSize).toMatchObject({width:2,height:1})
 const restoredPrefab=validatePrefab(JSON.parse(other.asset(restored.id).prefab!));expect(restoredPrefab.anchor).toEqual(p.anchor);expect(restoredPrefab.document.assets[0].hash).toBe(dep.hash)
 const expected=s.asset(row.id).prefab;s.close();const reopened=new Storage(s.root);stores.push(reopened);expect(reopened.asset(row.id).prefab).toBe(expected)
})
it('backs up and restores prefab definitions and shared dependencies without source-project links',async()=>{
 const s=store(),f=await fixture();await insert(s,f.pack());const backup=await createBackup(s,path.join(s.root,'backup-test'),generation(s),new AbortController().signal,()=>{})
 const root=mkdtempSync(path.join(os.tmpdir(),'mw-prefab-restore-'));roots.push(root);await extractArchive(backup.file,path.join(root,'restored'),new AbortController().signal,()=>{})
 const restored=new Storage(path.join(root,'restored'));stores.push(restored);expect(restored.asset(libraryQuery(restored,{type:'prefab'}).assets[0].id).prefab).toEqual(s.asset(libraryQuery(s,{type:'prefab'}).assets[0].id).prefab)
 expect(restored.integrity().missing).toEqual([])
})
it('keeps immutable compositions out of list/history payloads and preserves them through metadata undo',async()=>{
 const s=store(),f=await fixture();await insert(s,f.pack());const row=libraryQuery(s,{type:'prefab'}).assets[0],payload=s.asset(row.id).prefab
 expect(row.prefab).toBeUndefined();expect(row.prefabMode).toBe('editable');expect(row.prefabBounds).toEqual({x:0,y:0,width:100,height:50})
 const changed=libraryCommand(s,{revision:libraryRevision(s),op:'metadata',ids:[row.id],patch:{title:'Renamed'}})
 expect(s.asset(row.id).name).toBe('Renamed')
 libraryCommand(s,{revision:changed.revision,op:'undo',token:changed.token})
 expect(s.asset(row.id).name).toBe('House');expect(s.asset(row.id).prefab).toBe(payload)
})
it('refuses missing dependencies, recursive roles, unknown versions and malicious paths before any write',async()=>{
 for(const mutate of [(f:Awaited<ReturnType<typeof fixture>>)=>{f.manifest.assets.shift()},(f:Awaited<ReturnType<typeof fixture>>)=>{f.manifest.assets[1].prefab!.formatVersion=2 as 1},(f:Awaited<ReturnType<typeof fixture>>)=>{f.manifest.assets[0].file='../desk.png'},(f:Awaited<ReturnType<typeof fixture>>)=>{f.manifest.assets[0].type='prefab'}]){
   const s=store(),f=await fixture();mutate(f);const p=await previewPack(s,f.pack());expect(p.errors.length).toBeGreaterThan(0);expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep'})).toThrow();expect(libraryQuery(s,{type:'prefab'}).total).toBe(0);expect(readdirSync(path.join(s.root,'assets/originals'))).toEqual([])
 }
})
it('rolls back failed commits and never removes an already shared original',async()=>{
 let fail=false;const s=store(()=>{if(fail)throw Error('Injected write failure')}),f=await fixture();await insert(s,f.pack());const original=libraryQuery(s,{}).assets[0],bytes=s.bytes(s.asset(original.id));fail=true
 const p=await previewPack(s,f.pack());expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})).toThrow('Injected')
 expect(libraryQuery(s,{type:'prefab'}).total).toBe(1);expect(s.bytes(s.asset(original.id))).toEqual(bytes);expect(readdirSync(path.join(s.root,'logs'))).toEqual([])
 expect(readFileSync(path.join(s.root,original.originalPath))).toEqual(bytes)
})

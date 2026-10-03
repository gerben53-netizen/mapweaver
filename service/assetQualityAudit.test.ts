import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { Storage } from './storage'
import { applyQualityAudit } from './assetQualityAudit'
import { categories, libraryQuery, libraryRevision, patchAsset, putCategory, publicAsset } from './library'
import type { LibraryAsset } from './library'
import { commitPack, exportLibrary, previewPack } from './libraryPacks'
import { defaultMapStyle } from '../src/domain/mapSettings'
const roots:string[]=[],stores:Storage[]=[]
afterEach(()=>{stores.forEach(s=>s.close());stores.length=0;roots.forEach(r=>rmSync(r,{recursive:true,force:true}));roots.length=0})
const store=()=>{const root=mkdtempSync(path.join(os.tmpdir(),'mw-quality-'));roots.push(root);const s=new Storage(root);stores.push(s);return s}
async function asset(s:Storage){const bytes=await sharp({create:{width:20,height:20,channels:4,background:'#a08261'}}).png().toBuffer();return (await s.importAsset(new File([new Uint8Array(bytes)],'desk.png',{type:'image/png'}),'stamp','Bureau')).asset}
it('hides every inactive quality classification without deleting bytes or IDs; reopens database unchanged',async()=>{
 const s=store(),a=await asset(s),bytes=s.bytes(a),root=s.root
 for(const classification of ['REPLACE','REJECT','DUPLICATE'] as const){patchAsset(s,a.id,{quality:{classification,reason:'Review',semanticClass:'furniture',softShadowDefault:true}});expect(libraryQuery(s,{}).total).toBe(0);expect(s.asset(a.id).id).toBe(a.id);expect(s.bytes(s.asset(a.id))).toEqual(bytes)}
 s.close();stores.splice(stores.indexOf(s),1);const reopened=new Storage(root);stores.push(reopened);expect(libraryQuery(reopened,{}).total).toBe(0);expect(reopened.bytes(reopened.asset(a.id))).toEqual(bytes)
})
it('migrates taxonomy/tags atomically and preserves old filter aliases and inactive export/import status',async()=>{
 const s=store(),a=await asset(s),old=putCategory(s,{name:'Palace'});patchAsset(s,a.id,{categoryId:old.id,tags:['Palace','palace']})
 const plan={entries:[{id:a.id,sha256:a.sha256,classification:'FIX',reason:'Metadata',categoryAfter:['Meubilair','Tafels & bureaus'],tagsAfter:['paleis'],semanticClass:'furniture',softShadowDefault:true}],tagAliases:{palace:'paleis'}}
 applyQualityAudit(s,plan,libraryRevision(s));expect(libraryQuery(s,{category:old.id,search:'Palace'}).total).toBe(1);expect(categories(s).some(c=>c.id===old.id)).toBe(false)
 const snapshot=JSON.stringify(categories(s));expect(()=>applyQualityAudit(s,{...plan,entries:[{...plan.entries[0],sha256:'0'.repeat(64)}]},libraryRevision(s))).toThrow(/changed/);expect(JSON.stringify(categories(s))).toBe(snapshot)
 expect(()=>applyQualityAudit(s,plan,-1)).toThrow(/another tab/)
 patchAsset(s,a.id,{quality:{classification:'REPLACE',reason:'Projection',semanticClass:'furniture',softShadowDefault:true}})
 const other=store(),p=await previewPack(other,exportLibrary(s,[a.id]));expect(p.errors).toEqual([]);const result=commitPack(other,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true});expect(libraryQuery(other,{}).total).toBe(0);expect(publicAsset(other.asset(result.entries[0].id) as LibraryAsset).quality?.classification).toBe('REPLACE');expect(other.bytes(other.asset(result.entries[0].id))).toEqual(s.bytes(s.asset(a.id)))
})
it('does not alter project documents or resurrect deleted assets during audit',async()=>{
 const s=store(),a=await asset(s),now=new Date().toISOString()
 const row=s.writeProject({formatVersion:2,id:crypto.randomUUID(),name:'Historical map',createdAt:now,modifiedAt:now,map:{width:400,height:300,...defaultMapStyle(),background:{id:a.id,name:a.name,width:a.width,height:a.height}},layers:[{id:'layer',name:'Layer',visible:true,locked:false,objectIds:[]}],objects:[],assets:[{id:a.id,kind:'stamp',fileName:'desk.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]})
 s.db.prepare('UPDATE assets SET deletedAt=? WHERE id=?').run('2026-01-01',a.id)
 const before=s.db.prepare('SELECT * FROM projects').all(),refs=s.db.prepare('SELECT * FROM project_assets').all()
 applyQualityAudit(s,{entries:[{id:a.id,sha256:a.sha256,classification:'FIX',reason:'Metadata',categoryAfter:['Meubilair'],tagsAfter:[],semanticClass:'furniture',softShadowDefault:true}],tagAliases:{}},libraryRevision(s));expect(libraryQuery(s,{}).total).toBe(0);expect((s.asset(a.id) as LibraryAsset).deletedAt).toBe('2026-01-01');expect(s.db.prepare('SELECT * FROM projects').all()).toEqual(before);expect(s.db.prepare('SELECT * FROM project_assets').all()).toEqual(refs)
 expect((await s.prepared(row.id)).assets.get(a.id)?.blob.size).toBe(a.size);expect((await s.exportProject(row.id)).length).toBeGreaterThan(0)
})

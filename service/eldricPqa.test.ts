import { expect,it } from 'vitest'
import { readFileSync,mkdtempSync,rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Storage } from './storage'
import { previewPack,commitPack,exportLibrary } from './libraryPacks'
import { categories,libraryQuery,putCategory,publicAsset } from './library'
import type { LibraryAsset } from './library'
it('registers five PQA concepts in canonical taxonomy, preserves mappings, and keeps IDs on reimport/transfer',async()=>{
 const roots=[mkdtempSync(path.join(os.tmpdir(),'eldric-pqa-')),mkdtempSync(path.join(os.tmpdir(),'eldric-pqa-transfer-'))],stores=roots.map(r=>new Storage(r))
 try{
  const s=stores[0],books=putCategory(s,{name:'Opslag'});putCategory(s,{name:'Boekenkasten',parentId:books.id});const furniture=putCategory(s,{name:'Meubilair'});putCategory(s,{name:'Tafels & bureaus',parentId:furniture.id})
  const before=categories(s),bytes=readFileSync('tests/fixtures/eldric-pqa/eldric-bibliotheek-mapweaver-assets.zip')
  const p=await previewPack(s,bytes);expect(p.errors).toEqual([]);expect(p.warnings.every(w=>w.startsWith('INFO:'))).toBe(true)
  const first=commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:false,useExistingCategories:true});expect(first.entries).toHaveLength(5);expect(categories(s)).toEqual(before);expect(libraryQuery(s,{}).total).toBe(5)
  for(const a of first.entries){const value=publicAsset(s.asset(a.id) as LibraryAsset);expect(value.quality?.classification).toBe('KEEP');expect(value.quality?.softShadowDefault).toBe(true);expect(value.defaultSize.mode).toBe('world');expect(value.defaultSize.unit).toBe('ft');const provenance=JSON.parse(value.source);expect(provenance.conceptId).toMatch(/^pqa-koningsboom-/);expect(Array.isArray(provenance.replacesAssetIds)).toBe(true);expect(s.bytes(s.asset(a.id)).length).toBeGreaterThan(100000)}
  const p2=await previewPack(s,bytes),second=commitPack(s,{token:p2.token,revision:p2.revision,duplicate:'keep',createCategories:false,useExistingCategories:true});expect(second.entries.map(a=>a.id).sort()).toEqual(first.entries.map(a=>a.id).sort());expect(libraryQuery(s,{}).total).toBe(5)
  const t=stores[1],transfer=await previewPack(t,exportLibrary(s,first.entries.map(a=>a.id)));expect(transfer.errors).toEqual([]);const imported=commitPack(t,{token:transfer.token,revision:transfer.revision,duplicate:'keep',createCategories:true,useExistingCategories:true});expect(imported.entries).toHaveLength(5);for(const a of imported.entries)expect(publicAsset(t.asset(a.id) as LibraryAsset).quality?.classification).toBe('KEEP')
 }finally{stores.forEach(s=>s.close());roots.forEach(r=>rmSync(r,{recursive:true,force:true}))}
})

import { randomUUID } from 'node:crypto'
import { STAMP_CATEGORIES, taxonomyPath, resolveStampCategory, importCategoryKey } from '../src/domain/stampTaxonomy'
import { normalizeLibraryText, type LibraryCategory } from '../src/domain/library'
import type { AssetEntry } from '../src/domain/assetManifest'
import type { Storage } from './storage'

/** Only reviewed registry nodes may be materialized; historical DB identities stay intact. */
export function ensureStampTaxonomy(s:Storage,required:string[]){
 const result=new Map<string,string>()
 const needed=new Set(required)
 for(const id of required){let c=STAMP_CATEGORIES.find(c=>c.id===id);while(c?.parentId){needed.add(c.parentId);c=STAMP_CATEGORIES.find(n=>n.id===c!.parentId)}}
 for(const c of STAMP_CATEGORIES){
  if(!needed.has(c.id))continue
  const parent=c.parentId?result.get(c.parentId)!:null
  const candidates=s.db.prepare('SELECT * FROM categories WHERE parentId IS ? ORDER BY id').all(parent) as LibraryCategory[]
  const old=candidates.find(n=>normalizeLibraryText(n.name)===normalizeLibraryText(c.name))||candidates.find(n=>resolveStampCategory(n.name).categoryId===c.id)
  const id=old?.id||(s.db.prepare('SELECT id FROM categories WHERE id=?').get(c.id)?randomUUID():c.id)
  if(!old){const now=new Date().toISOString();s.db.prepare('INSERT INTO categories(id,name,normalizedName,parentId,sortOrder,createdAt,modifiedAt) VALUES(?,?,?,?,?,?,?)').run(id,c.name,`${parent||''}/${normalizeLibraryText(c.name)}`,parent,0,now,now)}
  result.set(c.id,id)
 }
 return result
}
export function categoryResolution(entry:AssetEntry,mapping:Record<string,string>={}){
 if(entry.categoryId&&entry.categoryPath?.length){const path=resolveStampCategory(entry.categoryPath);if(path.categoryId&&path.categoryId!==resolveStampCategory(entry.categoryId).categoryId)throw Error('Conflicting category ID/path.')}
 const source=importCategoryKey(entry),automatic=resolveStampCategory(entry.categoryId||entry.categoryPath||[]),id=mapping[source]||automatic.categoryId
 if(id&&!STAMP_CATEGORIES.some(c=>c.id===id&&c.active))throw Error('Invalid canonical category mapping: '+id)
 return {source,categoryId:id||null,tags:automatic.tags,label:id?taxonomyPath(id).join(' › '):null}
}

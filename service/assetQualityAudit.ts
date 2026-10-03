import { createHash } from 'node:crypto'
import { validateAssetQuality } from '../src/domain/assetQuality'
import { categoryPath, normalizeTags, validateCategoryTree } from '../src/domain/library'
import { categories, checkRevision, libraryRevision, patchAsset, putCategory } from './library'
import type { Storage } from './storage'
export interface QualityAuditPlan {
  entries: { id:string; sha256:string; classification:string; reason:string; categoryAfter:string[]; tagsAfter:string[]; semanticClass:string|null; softShadowDefault:boolean|null }[]
  tagAliases: Record<string,string>
}
/** A reviewed, hash-bound metadata-only migration. No project or image mutations. */
export function applyQualityAudit(s:Storage, plan:QualityAuditPlan, revision:number) {
  checkRevision(s,revision)
  if (!Array.isArray(plan.entries) || plan.entries.length > 10000 || new Set(plan.entries.map(e=>e.id)).size !== plan.entries.length) throw Error('Invalid or duplicate audit identities.')
  const beforeTree=categories(s), aliases:Record<string,string[]>= {}, now=new Date().toISOString()
  for (const e of plan.entries) {
    const a=s.asset(e.id)
    if(a.sha256!==e.sha256 || createHash('sha256').update(s.bytes(a)).digest('hex')!==e.sha256) throw Error(`Asset changed since review: ${e.id}`)
    validateAssetQuality(e);normalizeTags(e.tagsAfter)
    validateCategoryTree(e.categoryAfter.map((name,i)=>({id:String(i),parentId:i?String(i-1):null,name,sortOrder:0,createdAt:now,modifiedAt:now})))
    if (!e.categoryAfter.length) throw Error('Audit needs a category path.')
  }
  return s.db.transaction(()=>{
    for(const e of plan.entries){
      const a=s.asset(e.id), oldPath=categoryPath(beforeTree,a.categoryId)
      let parentId:string|null=null
      for(const name of e.categoryAfter){
        const old=categories(s).find(c=>c.parentId===parentId&&c.name.normalize('NFKC').trim().toLowerCase()===name.normalize('NFKC').trim().toLowerCase())
        parentId=old?.id||putCategory(s,{name,parentId}).id
      }
      for(const c of oldPath) aliases[c.id]=[...new Set([...(aliases[c.id]||[]),parentId!])]
      patchAsset(s,e.id,{categoryId:parentId,tags:e.tagsAfter,quality:validateAssetQuality(e)})
    }
    // Prune only now-unused old taxonomy nodes, deepest first. Preserve used/ambiguous paths.
    for(const c of [...beforeTree].sort((a,b)=>categoryPath(beforeTree,b.id).length-categoryPath(beforeTree,a.id).length)){
      if(c.id==='uncategorized')continue
      if(!s.db.prepare('SELECT 1 FROM assets WHERE categoryId=?').get(c.id)&&!s.db.prepare('SELECT 1 FROM categories WHERE parentId=?').get(c.id))s.db.prepare('DELETE FROM categories WHERE id=?').run(c.id)
    }
    const prior=s.db.prepare("SELECT value FROM settings WHERE key='assetTaxonomyAliases'").get() as {value:string}|undefined
    const previous=prior?JSON.parse(prior.value):{categories:{},tags:{}}
    s.db.prepare("INSERT INTO settings(key,value) VALUES('assetTaxonomyAliases',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({categories:{...previous.categories,...aliases},tags:{...previous.tags,...plan.tagAliases}}))
    s.db.prepare("INSERT INTO settings(key,value) VALUES('assetQualityAudit',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({appliedAt:now,entries:plan.entries}))
    return {count:plan.entries.length,revision:libraryRevision(s),aliases}
  })()
}

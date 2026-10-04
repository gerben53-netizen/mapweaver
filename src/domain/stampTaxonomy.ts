import registry from './stampTaxonomy.json'
import { libraryText, normalizeLibraryText, normalizeTags } from './library'
export const STAMP_CATEGORIES = registry.categories
const key = (s:string) => normalizeLibraryText(s).replace(/\s+/g,' ')
export function taxonomyPath(id:string):string[] {
 const c=STAMP_CATEGORIES.find(c=>c.id===id)
 if(!c)throw Error('Unknown canonical category: '+id)
 return [...(c.parentId?taxonomyPath(c.parentId):[]),c.name]
}
export function resolveStampCategory(input:string|string[]) {
 const parts=Array.isArray(input)?input:[input],tags:string[]=[]
 const legacy=(registry.pathAliases as Record<string,{categoryId:string;tags:string[]}>)[parts.map(key).join(' / ')]
 if(legacy)return {...legacy}
 let category:string|undefined,parent:string|null=null
 for(const part of parts){
  const text=key(part),context=(registry.contextAliases as Record<string,string>)[text]
  if(context){tags.push(context);continue}
  const found=STAMP_CATEGORIES.find(c=>c.active&&(c.id===text||c.aliases.some(a=>key(a)===text)||key(c.name)===text)&&(parts.length===1||c.parentId===parent))
  if(!found)return {categoryId:null,tags}
  category=found.id;parent=found.id
 }
 return {categoryId:category||null,tags}
}
export function normalizeStampTags(tags:unknown):string[] {
 return normalizeTags(normalizeTags(tags).map(t=>normalizeStampSearch(libraryText(t,80,true))))
}
/** Search text is not a tag input and must not inherit the tag length limit. */
export function normalizeStampSearch(value:string){
 const text=key(value),aliases=registry.tagAliases as Record<string,string>
 return aliases[text]||Object.values(aliases).find(v=>key(v)===text)||text
}
export const importCategoryKey=(a:{categoryId?:string;categoryPath?:string[]})=>a.categoryId||JSON.stringify(a.categoryPath||[])

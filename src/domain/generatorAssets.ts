import { seededRandom } from './seededRandom'
import type { MapType } from './geography'
export const SEMANTIC_TYPES = ['mountain','hill','tree','forestCluster','snowMountain','volcano','rock','rockCluster','swampVegetation','marshCluster'] as const
export const GENERATOR_ROLES = ['ridge','peak','foothill','isolatedFeature','forestInterior','forestEdge','forestCluster','sparseVegetation','rockScatter','swampInterior','swampEdge','landmark'] as const
export const GENERATOR_BIOMES = ['temperate','alpine','snow','conifer','deciduous','tropical','arid','desert','volcanic','swamp','wetland','tundra','generic'] as const
export const GENERATOR_THEMES = ['painterlyFantasy','parchment','darkFantasy','genericFantasy'] as const
export const GENERATOR_HIERARCHY = ['hero','primary','support','detail'] as const
export type AssetHierarchy = typeof GENERATOR_HIERARCHY[number]
export interface GeneratorMetadata {
  hierarchy?:AssetHierarchy; ridgeAxis?:number; lighting?:'northwest'|'neutral'|'other'
  version: 1; semanticType: typeof SEMANTIC_TYPES[number]
  roles: typeof GENERATOR_ROLES[number][]; biomes: typeof GENERATOR_BIOMES[number][]; themes: typeof GENERATOR_THEMES[number][]
  weight: number; scale?: {min:number;max:number}; rotation?: {allowed:boolean;min:number;max:number}; spacing?: number
}
export const defaultGeneratorMetadata = (): GeneratorMetadata => ({version:1,semanticType:'mountain',roles:['ridge'],biomes:['generic'],themes:['genericFantasy'],weight:1,scale:{min:1,max:1},rotation:{allowed:false,min:0,max:0},spacing:1})
const object = (v:unknown,keys:string[]) => { if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('Invalid generator metadata fields.');return v as Record<string,unknown> }
const number = (v:unknown,min:number,max:number) => typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max
export function validateGeneratorMetadata(value:unknown):GeneratorMetadata {
  const v=object(value,['version','semanticType','roles','biomes','themes','weight','scale','rotation','spacing','hierarchy','ridgeAxis','lighting'])
  if(v.version!==1||!SEMANTIC_TYPES.includes(v.semanticType as never))throw Error('Invalid generator semantic type or version.')
  for(const [key,values] of [['roles',GENERATOR_ROLES],['biomes',GENERATOR_BIOMES],['themes',GENERATOR_THEMES]] as const){const list=v[key];if(!Array.isArray(list)||!list.length||list.length>values.length||new Set(list).size!==list.length||list.some(x=>!values.includes(x as never)))throw Error(`Invalid generator ${key}. Choose one or more supported values.`)}
  const weight=v.weight===undefined?1:v.weight
  if(!number(weight,.000001,1000000))throw Error('Generator weight must be positive (0.000001–1,000,000).')
  if(v.scale!==undefined){const s=object(v.scale,['min','max']);if(!number(s.min,.01,100)||!number(s.max,.01,100)||Number(s.min)>Number(s.max))throw Error('Generator scale must be an ordered range within 0.01–100.')}
  if(v.rotation!==undefined){const r=object(v.rotation,['allowed','min','max']);if(typeof r.allowed!=='boolean'||!number(r.min,-180,180)||!number(r.max,-180,180)||Number(r.min)>Number(r.max)||(!r.allowed&&(r.min!==0||r.max!==0)))throw Error('Invalid generator rotation policy. Disabled rotation uses 0–0 degrees.')}
  if(v.hierarchy!==undefined&&!GENERATOR_HIERARCHY.includes(v.hierarchy as never))throw Error('Invalid generator hierarchy.')
  if(v.ridgeAxis!==undefined&&!number(v.ridgeAxis,-90,90))throw Error('Invalid generator ridge axis.')
  if(v.lighting!==undefined&&!['northwest','neutral','other'].includes(v.lighting as string))throw Error('Invalid generator lighting.')
  if(v.spacing!==undefined&&!number(v.spacing,.1,10))throw Error('Generator spacing must be 0.1–10.')
  return structuredClone({...v,weight}) as unknown as GeneratorMetadata
}
export interface GeneratorAsset { id:string; type:string; applicableMapTypes:MapType[]; generator?:GeneratorMetadata|null }
export interface GeneratorAssetQuery { semanticType:GeneratorMetadata['semanticType']; roles?:GeneratorMetadata['roles']; biome?:GeneratorMetadata['biomes'][number]; theme?:GeneratorMetadata['themes'][number]; mapType:MapType }
export function validateGeneratorQuery(value:unknown):GeneratorAssetQuery {
  const q=object(value,['semanticType','roles','biome','theme','mapType'])
  if(!SEMANTIC_TYPES.includes(q.semanticType as never)||!['battlemap','regional-map','world-map'].includes(q.mapType as string)||q.biome!==undefined&&!GENERATOR_BIOMES.includes(q.biome as never)||q.theme!==undefined&&!GENERATOR_THEMES.includes(q.theme as never)||q.roles!==undefined&&(!Array.isArray(q.roles)||q.roles.length>GENERATOR_ROLES.length||q.roles.some(v=>!GENERATOR_ROLES.includes(v))))throw Error('Invalid generator asset query.')
  return q as unknown as GeneratorAssetQuery
}
/** Map applicability and exact semantic type are mandatory at EVERY fallback level. Roles use ANY matching requested role. */
export function findGeneratorAssets<T extends GeneratorAsset>(assets:readonly T[],input:GeneratorAssetQuery) {
  const q=validateGeneratorQuery(input),base=assets.filter(a=>a.type==='stamp'&&a.generator?.semanticType===q.semanticType&&(!a.applicableMapTypes.length||a.applicableMapTypes.includes(q.mapType))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
  const role=(a:T)=>!q.roles?.length||q.roles.some(r=>a.generator!.roles.includes(r)),biome=(a:T)=>!q.biome||a.generator!.biomes.includes(q.biome),theme=(a:T)=>!q.theme||a.generator!.themes.includes(q.theme)
  const levels=[(a:T)=>role(a)&&biome(a)&&theme(a),(a:T)=>role(a)&&biome(a),biome,(a:T)=>a.generator!.biomes.includes('generic'),()=>true]
  for(let i=0;i<levels.length;i++){const candidates=base.filter(levels[i]);if(candidates.length)return {level:i+1,candidates}}
  return {level:6,candidates:[] as T[]}
}
/** Stable ID ordering and counter-based RNG: input order never changes a selection. */
export function createGeneratorSelector<T extends GeneratorAsset>(candidates:readonly T[]) {
  const list=[...candidates].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
  if(new Set(list.map(a=>a.id)).size!==list.length)throw Error('Duplicate generator asset IDs.')
  let total=0
  const cumulative=list.map(a=>{if(a.type!=='stamp')throw Error('Generator selection requires stamps.');total+=validateGeneratorMetadata(a.generator).weight;return total})
  return (seed:number,index:number):T|undefined=>{
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isSafeInteger(index)||index<0)throw Error('Use a uint32 seed and nonnegative selection index.')
    if(!list.length)return undefined
    const draw=seededRandom(seed,index,91)*total
    let lo=0,hi=list.length-1
    while(lo<hi){const mid=(lo+hi)>>>1;if(draw<cumulative[mid])hi=mid;else lo=mid+1}
    return list[lo]
  }
}
export function selectGeneratorAsset<T extends GeneratorAsset>(candidates:readonly T[],seed:number,index:number):T|undefined {
  return createGeneratorSelector(candidates)(seed,index)
}

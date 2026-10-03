import { expect,it } from 'vitest'
import manifest from '../../public/world-assets/mapweaver-assets.json'
import { scatterWorld,ridgeCells,forestAcceptance,maskDistance } from './scatterWorld'
import { DEFAULT_WORLD_SCATTER,validateWorldScatterSource,WORLD_SCATTER_LIMITS } from './scatterModel'
import type { WorldScatterAsset,WorldScatterSettings } from './scatterModel'
import { WORLD_DEFAULTS,validateWorldGeneration } from './model'
import { generateWorld } from './generate'
import { fixture } from '../../tests/fixtures/worldScatter'
import { parseProject } from '../projects/format'
export const assets=manifest.assets.map((a,i)=>({id:'asset-'+i,type:'stamp',name:a.title,width:640,height:480,generator:a.generator,defaultSize:a.defaultSize,applicableMapTypes:a.applicableMapTypes})) as WorldScatterAsset[]
export const settings:WorldScatterSettings={mountains:'high',forests:'high',details:'high',theme:'genericFantasy'}

it('preserves disabled terrain exactly, is deterministic independent of asset order and bounded',()=>{
 const base=generateWorld(WORLD_DEFAULTS);expect(scatterWorld(base,DEFAULT_WORLD_SCATTER,assets)).toBe(base)
 const start=performance.now(),a=scatterWorld(base,settings,assets),b=scatterWorld(base,settings,[...assets].reverse())
 expect(a).toEqual(b);expect(a.map.generation!.scatter!.placements.length).toBeGreaterThan(10);expect(a.objects.length).toBeLessThanOrEqual(240+540);expect(performance.now()-start).toBeLessThan(5000)
 console.log('SCATTER default',a.map.generation!.scatter!.placements.length,'ms',Math.round(performance.now()-start))
})
it('follows ridges, snow/volcanic biomes and forest masks with bounded upright scales',()=>{
 const {r,f}=fixture(),out=scatterWorld(r,settings,assets,f),source=out.map.generation!.scatter!,ridges=ridgeCells(f,r.map.generation!.parameters.water)
 expect(source.placements.filter(p=>p.group==='mountains').length).toBeGreaterThan(10);expect(source.placements.filter(p=>p.group==='forests').length).toBeGreaterThan(15);expect(source.placements.some(p=>p.group==='swamp')).toBe(true)
 for(const p of source.placements){const a=assets.find(a=>a.id===p.sourceId)!,o=out.objects.find(o=>o.id===p.id)!;expect(f.biomes[p.cell]).not.toBe('ocean');expect(o.rotation).toBe(0);expect(p.scale).toBeGreaterThanOrEqual(a.generator.scale!.min);expect(p.scale).toBeLessThanOrEqual(a.generator.scale!.max)
 if(p.group==='mountains'){expect(ridges.has(p.cell)).toBe(true);expect(a.generator.semanticType).toBe(f.biomes[p.cell]==='alpine'?'snowMountain':'mountain')}
 if(p.group==='forests')expect(f.biomes[p.cell]).toBe('forest')
 if(p.group==='volcanic')expect(f.biomes[p.cell]).toBe('volcanic')}
 expect(source.placements.filter(p=>p.group==='volcanic').length).toBeLessThanOrEqual(2)
 const stamps=out.objects.filter(o=>o.kind==='stamp');for(let i=0;i<stamps.length;i++)for(let j=0;j<i;j++){const a=stamps[i],b=stamps[j];expect(Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)).toBeGreaterThanOrEqual((Math.min(a.width,a.height)+Math.min(b.width,b.height))*.32*1.05-1e-6)}
})
it('softens forest edges and stays stable across logical resolution changes',()=>{
 expect(forestAcceptance(1)).toBeLessThan(forestAcceptance(4));const {r,f}=fixture(),out=scatterWorld(r,settings,assets,f),distance=maskDistance(f.biomes.map(b=>b==='forest'),f.cols,f.rows),counts=[0,0],cells=[0,0]
 f.biomes.forEach((b,i)=>{if(b==='forest')cells[distance[i]<3?0:1]++});out.map.generation!.scatter!.placements.filter(p=>p.group==='forests').forEach(p=>counts[distance[p.cell]<3?0:1]++)
 expect(counts[1]/cells[1]).toBeGreaterThan(counts[0]/cells[0])
 const base=generateWorld(WORLD_DEFAULTS),small=generateWorld({...WORLD_DEFAULTS,width:1200,height:750}),a=scatterWorld(base,settings,assets),b=scatterWorld(small,settings,assets)
 expect(b.map.generation!.scatter!.placements).toEqual(a.map.generation!.scatter!.placements)
})
it('does not use incompatible biomes/themes or volcanoes without volcanic geography',()=>{
 const {r,f}=fixture(),snowOnly=assets.filter(a=>a.generator.semanticType==='snowMountain'),out=scatterWorld(r,settings,snowOnly,f)
 expect(out.map.generation!.scatter!.placements.every(p=>f.biomes[p.cell]==='alpine')).toBe(true)
 expect(scatterWorld(r,{...settings,theme:'darkFantasy'},assets,f).map.generation!.scatter!.placements).toHaveLength(0)
 const normal=scatterWorld(generateWorld(WORLD_DEFAULTS),settings,assets)
 expect(normal.map.generation!.scatter!.placements.some(p=>p.group==='volcanic')).toBe(false)
})
it('respects permitted rotation and rejects invalid settings/provenance',()=>{
 const {r,f}=fixture(),rotated=assets.map(a=>({...a,generator:{...a.generator,rotation:{allowed:true,min:-8,max:8}}})),out=scatterWorld(r,settings,rotated,f)
 for(const o of out.objects.filter(o=>o.kind==='stamp'))expect(o.rotation<=8||o.rotation>=352).toBe(true)
 expect(()=>scatterWorld(r,{...settings,mountains:'unlimited'} as never,assets,f)).toThrow()
 expect(()=>validateWorldScatterSource({...out.map.generation!.scatter!,engineVersion:2} as never)).toThrow()
 expect(()=>validateWorldGeneration({...out.map.generation!,scatter:{...out.map.generation!.scatter!,placements:[{...out.map.generation!.scatter!.placements[0],scale:Infinity}]}})).toThrow()
})
it('round-trips native objects and frozen ownership through project validation',()=>{
 const {r,f}=fixture(),out=scatterWorld(r,settings,assets,f),used=[...new Set(out.objects.flatMap(o=>o.kind==='stamp'?[o.assetId]:[]))],now='2026-09-25T00:00:00.000Z'
 const doc={formatVersion:12,id:'fixture',name:'Fixture',createdAt:now,modifiedAt:now,map:out.map,objects:out.objects,layers:out.layers,layerTree:out.layerTree,objectGroups:[],assets:used.map(id=>({id,kind:'stamp',fileName:id+'.png',mimeType:'image/png',width:640,height:480,hash:'a'.repeat(64),path:'assets/'+id+'.png'}))}
 const parsed=parseProject(JSON.parse(JSON.stringify(doc)));expect(parsed.map.generation).toEqual(out.map.generation);expect(parsed.objects).toEqual(out.objects)
 expect(out.map.generation!.scatter!.placements.length).toBeLessThanOrEqual(WORLD_SCATTER_LIMITS.mountains+WORLD_SCATTER_LIMITS.forests+WORLD_SCATTER_LIMITS.details)
})

it('keeps image footprints on land and excludes emitted river/marker cells',()=>{
 const {r,f}=fixture(),water=r.map.generation!.parameters.water,baseline=scatterWorld(r,settings,assets,f),picked=baseline.map.generation!.scatter!.placements.find(p=>p.group==='forests')!,stamp=baseline.objects.find(o=>o.id===picked.id)!
 // Actual terrain rectangle containment is separate from the raster exclusion mask.
 const x=stamp.x+stamp.width/2,y=stamp.y+stamp.height/2
 r.objects.push({kind:'place',id:'marker',x:x-20,y:y-20,width:40,height:40} as never)
 const out=scatterWorld(r,settings,assets,f)
 expect(out.map.generation!.scatter!.placements.some(p=>p.cell===picked.cell)).toBe(false)
 for(const o of out.objects.filter(o=>o.kind==='stamp')){expect(o.x).toBeGreaterThan(20);expect(o.y).toBeGreaterThan(20);expect(o.x+o.width).toBeLessThan(2380);expect(o.y+o.height).toBeLessThan(1480)}
 const ocean=scatterWorld(r,settings,assets,{...f,height:f.height.map(()=>water-.1),biomes:f.biomes.map(()=>'ocean')});expect(ocean.map.generation!.scatter!.placements).toHaveLength(0)
 const path={kind:'path',pathKind:'river',id:'river',nodes:[{x:20,y},{x:2380,y}]} as never
 const river=scatterWorld({...r,objects:[...r.objects.filter(o=>o.id!=='marker'),path]},settings,assets,f)
 expect(river.map.generation!.scatter!.placements.some(p=>p.cell===picked.cell)).toBe(false)
})

it('reaches a compatible generic biome fallback instead of stopping on a wrong-theme pool',()=>{
 const {r,f}=fixture(),source=assets.find(a=>a.generator.semanticType==='mountain')!,wrong={...source,id:'wrong',generator:{...source.generator,themes:['darkFantasy'] as const}},generic={...source,id:'generic',generator:{...source.generator,biomes:['generic'] as const}}
 const out=scatterWorld(r,{...settings,forests:'off',details:'off'},[wrong,generic] as unknown as WorldScatterAsset[],f)
 expect(out.map.generation!.scatter!.placements.length).toBeGreaterThan(0);expect(out.map.generation!.scatter!.placements.every(p=>p.sourceId==='generic'&&p.fallback===4)).toBe(true)
})

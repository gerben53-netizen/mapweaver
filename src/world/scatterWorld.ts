import { hierarchyTier,hierarchyDensity,hierarchyTransform,axisDelta } from './assetHierarchy'
import type { AssetHierarchy } from '../domain/generatorAssets'
import { findGeneratorAssets,createGeneratorSelector,validateGeneratorMetadata } from '../domain/generatorAssets'
import type { GeneratorMetadata } from '../domain/generatorAssets'
import { validateDefaultSize } from '../domain/library'
import { resolvePlacementSize } from '../domain/placement'
import { seededRandom,instanceInArea } from '../domain/scatter'
import { normalizeRotation } from '../domain/transforms'
import type { AreaObject,StampObject,MapLayer } from '../domain/models'
import { terrainField,drainage,seedHash } from './generate'
import type { WorldResult } from './model'
import { WORLD_SCATTER_LIMITS as LIMIT,validateWorldScatterSettings,scatterEnabled } from './scatterModel'
import type { WorldScatterAsset,WorldScatterSettings,GeneratedPlacement,GenerationGroup } from './scatterModel'

type Field=ReturnType<typeof terrainField>
type Biome=GeneratorMetadata['biomes'][number]
type Role=GeneratorMetadata['roles'][number]
type Kind=GeneratorMetadata['semanticType']
interface Candidate {cell:number;kind:Kind;role:Role;biome:Biome;group:GenerationGroup;strength:number;angle:number;tier?:AssetHierarchy}
/** Manhattan distance transform on the fixed logical terrain grid, including map edges. */
export function maskDistance(mask:boolean[],cols:number,rows:number) {
 const d=mask.map((v,i)=>v&&i%cols>0&&i%cols<cols-1&&i>=cols&&i<cols*(rows-1)?cols+rows:0)
 for(let y=1;y<rows;y++)for(let x=1;x<cols;x++){const i=y*cols+x;if(d[i])d[i]=Math.min(d[i],d[i-1]+1,d[i-cols]+1)}
 for(let y=rows-2;y>=0;y--)for(let x=cols-2;x>=0;x--){const i=y*cols+x;if(d[i])d[i]=Math.min(d[i],d[i+1]+1,d[i+cols]+1)}
 return d
}
/** Nonmaximum suppression across a ridge's normal; tangent follows the strongest opposing drop. */
export function ridgeCells(field:Field,water:number) {
 const {cols,rows,height,biomes}=field,angles=new Map<number,number>()
 for(let y=2;y<rows-2;y++)for(let x=2;x<cols-2;x++){
  const i=y*cols+x,e=(height[i]-water)/(1-water)
  if(e<.22||!['mountains','alpine','tundra','volcanic'].includes(biomes[i]))continue
  let best=0,angle=0
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){const a=height[i-dx-dy*cols],b=height[i+dx+dy*cols],drop=height[i]-Math.max(a,b);if(drop>best){best=drop;angle=Math.atan2(dx,-dy)*180/Math.PI}}
  if(best>.001)angles.set(i,angle)
 }
 return angles
}
export const forestAcceptance=(distance:number)=>.12+.88*Math.min(1,Math.max(0,distance)/4)
const amount={off:0,low:.24,medium:.5,high:.85}
/** Pure placement engine. Optional field is a test/terrain-provider seam, never persisted. */
export function scatterWorld(result:WorldResult,input:WorldScatterSettings,inputAssets:WorldScatterAsset[],givenField?:Field):WorldResult {
 const settings=validateWorldScatterSettings(input)
 if(!scatterEnabled(settings))return result
 if(!result.map.generation)throw Error('Scatter requires world-generation terrain provenance.')
 if(inputAssets.length>LIMIT.assets||new Set(inputAssets.map(a=>a.id)).size!==inputAssets.length)throw Error('World scatter supports up to 10,000 distinct semantic assets.')
 const assets=inputAssets.map(a=>({...a,generator:validateGeneratorMetadata(a.generator),defaultSize:validateDefaultSize(a.defaultSize)})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
 const hierarchical=assets.some(a=>a.generator.hierarchy!==undefined&&a.generator.themes.includes(settings.theme))
 const fingerprint='v1-'+seedHash(JSON.stringify(assets)).toString(16).padStart(8,'0'),p=result.map.generation.parameters,seed=seedHash(p.seed+' world-scatter-v1'),f=givenField??terrainField(p,result.map.generation.generatorVersion),{cols,rows,height,biomes,temperature}=f
 const lakes=drainage(height,cols,rows,p.water).lake,ridges=ridgeCells(f,p.water),forest=biomes.map(b=>b==='forest'||b==='dense forest'),edges=maskDistance(forest,cols,rows)
 // Version-2 spines fill short gaps in isolated maxima and expose stable tangent alignment.
 for(const ridge of result.map.generation.geography?.ridges??[])for(let j=1;j<ridge.points.length;j++){
  const a=ridge.points[j-1],b=ridge.points[j],steps=Math.ceil(Math.hypot((b.x-a.x)/p.width*cols,(b.y-a.y)/p.height*rows)*2)
  for(let k=0;k<=steps;k++){const t=steps?k/steps:0,x=Math.round((a.x+(b.x-a.x)*t)/p.width*(cols-1)),y=Math.round((a.y+(b.y-a.y)*t)/p.height*(rows-1));ridges.set(y*cols+x,Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)}
 }
 const land=result.objects.filter((o):o is AreaObject=>o.kind==='area'&&o.land?.role==='landmass')
 const dry=height.map((h,i)=>h>p.water&&!lakes[i]),excluded=new Uint8Array(height.length)
 const sx=p.width/(cols-1),sy=p.height/(rows-1)
 // Rasterize exclusions from actual emitted rivers and existing semantic markers.
 for(const o of result.objects){
  if(o.kind==='path'&&o.pathKind==='river')for(let n=1;n<o.nodes.length;n++){const a=o.nodes[n-1],b=o.nodes[n],steps=Math.ceil(Math.hypot((b.x-a.x)/sx,(b.y-a.y)/sy)*2);for(let k=0;k<=steps;k++){const t=steps?k/steps:0,x=Math.round((a.x+(b.x-a.x)*t)/sx),y=Math.round((a.y+(b.y-a.y)*t)/sy);if(x>=0&&y>=0&&x<cols&&y<rows)excluded[y*cols+x]=1}}
  if(o.kind==='place'){const x=Math.round((o.x+o.width/2)/sx),y=Math.round((o.y+o.height/2)/sy);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<cols&&y+dy>=0&&y+dy<rows)excluded[(y+dy)*cols+x+dx]=1}
 }
 const riverDistance=maskDistance(Array.from(excluded,v=>!v),cols,rows),candidates:Candidate[]=[],nearRidge=maskDistance(biomes.map((_,i)=>!ridges.has(i)),cols,rows)
 for(let i=cols+1;i<height.length-cols-1;i++){
  if(!dry[i])continue
  const b=biomes[i],e=(height[i]-p.water)/(1-p.water),snow=b==='alpine'||temperature[i]<.3,biome:Biome=snow?'snow':b==='volcanic'?'volcanic':'temperate'
  if(ridges.has(i))candidates.push({cell:i,kind:b==='volcanic'?'volcano':snow?'snowMountain':'mountain',role:e>.6?'peak':'ridge',biome,group:b==='volcanic'?'volcanic':'mountains',strength:e>.6?1:.8,angle:ridges.get(i)!})
  else if(nearRidge[i]<=3&&nearRidge[i]>0&&e>.12&&e<.6)candidates.push({cell:i,kind:'hill',role:'foothill',biome:snow?'alpine':'temperate',group:'details',strength:.42,angle:0})
  if(forest[i]){const edge=edges[i]<3;candidates.push({cell:i,kind:edge?'tree':'forestCluster',role:edge?'forestEdge':'forestInterior',biome:temperature[i]<.45?'conifer':temperature[i]>.85?'tropical':'temperate',group:'forests',strength:forestAcceptance(edges[i]),angle:0})}
  if(b==='wetland'||b==='swamp')candidates.push({cell:i,kind:seededRandom(seed,i,3)<.65?'marshCluster':'swampVegetation',role:'swampInterior',biome:'swamp',group:'swamp',strength:.55,angle:0})
  if(['desert','upland','volcanic'].includes(b)&&e>.17||nearRidge[i]===1)candidates.push({cell:i,kind:'rockCluster',role:'rockScatter',biome:b==='volcanic'?'volcanic':b==='desert'?'arid':'alpine',group:'details',strength:.15,angle:0})
 }
 if(hierarchical)for(const c of candidates){
  c.tier=hierarchyTier(c.group,c.role,edges[c.cell],seededRandom(seed,c.cell,51))
  if(c.group==='forests'){
   c.biome=temperature[c.cell]<.3?'snow':c.biome
   c.role=c.tier==='hero'?'landmark':edges[c.cell]<=1?'sparseVegetation':edges[c.cell]<3?'forestEdge':edges[c.cell]<5?'forestCluster':'forestInterior'
   c.kind=c.tier==='hero'||c.tier==='detail'?'tree':'forestCluster'
  }
  if(c.group==='mountains'&&c.tier!=='hero')c.role='ridge'
  if(c.group==='mountains'&&c.tier==='support'&&c.kind==='snowMountain'){c.kind='hill';c.role='foothill'}
  if(c.group==='details'&&c.tier==='detail'){c.kind='rockCluster';c.role='rockScatter'}
  if(c.group==='mountains'&&c.tier==='detail'){c.kind='rockCluster';c.role='rockScatter'}
  if(c.group==='swamp'&&c.tier==='support')c.role='swampEdge'
 }
 // Stable seeded priorities avoid raster rows. Peaks precede secondary detail.
 candidates.sort((a,b)=>(hierarchical?(['hero','primary','support','detail'].indexOf(a.tier!)-['hero','primary','support','detail'].indexOf(b.tier!)):0)||(a.role==='peak'?0:1)-(b.role==='peak'?0:1)||seededRandom(seed,a.cell,15)-seededRandom(seed,b.cell,15)||a.cell-b.cell||a.kind.localeCompare(b.kind,'en'))
 const warnings=new Set<string>(),cache=new Map<string,{select:ReturnType<typeof createGeneratorSelector<WorldScatterAsset>>;level:number}>(),objects:StampObject[]=[],placements:GeneratedPlacement[]=[]
 const tierCounts=new Map<string,number>()
 const heroCounts=new Map<string,number>(),heroSources=new Set<string>()
 const counts={mountains:0,forests:0,details:0},usedSources=new Set<string>(),buckets=new Map<string,{x:number;y:number;r:number}[]>(),cellSize=p.width/100
 const getPool=(c:Candidate)=>{
  const key=[c.kind,c.role,c.biome,settings.theme,c.tier,Math.round(c.angle/15)].join('/');let pool=cache.get(key);if(pool)return pool
  // Sprint B fallback is reused, but cross-biome type-only fallback is unsafe for geography.
  const compatible=assets.filter(a=>(a.generator.biomes.includes(c.biome)||a.generator.biomes.includes('generic'))&&a.generator.themes.includes(settings.theme)&&(!hierarchical||((a.generator.hierarchy??'primary')===c.tier&&a.generator.lighting!=='other')))
  const query=findGeneratorAssets(compatible,{semanticType:c.kind,roles:[c.role],biome:c.biome,theme:settings.theme,mapType:'world-map'})
  let safe=query.candidates.filter(a=>(a.generator.biomes.includes(c.biome)||a.generator.biomes.includes('generic'))&&a.generator.themes.includes(settings.theme))
  if(hierarchical&&c.role==='ridge'&&safe.some(a=>a.generator.ridgeAxis!==undefined)){const best=Math.min(...safe.filter(a=>a.generator.ridgeAxis!==undefined).map(a=>Math.abs(axisDelta(c.angle,a.generator.ridgeAxis!))));safe=safe.filter(a=>a.generator.ridgeAxis!==undefined&&Math.abs(axisDelta(c.angle,a.generator.ridgeAxis))<=best+20)}
  if(hierarchical&&c.role==='ridge')safe=safe.map(a=>({...a,generator:{...a.generator,weight:a.generator.weight*(a.generator.ridgeAxis===undefined?1:Math.max(.1,1-Math.abs(axisDelta(c.angle,a.generator.ridgeAxis))/90))}}))
  if(!safe.length)warnings.add(`No compatible ${c.kind} / ${c.biome} assets for ${settings.theme}; skipped.`)
  else if(query.level>1)warnings.add(`Used fallback level ${query.level}: ${c.kind} / ${c.role} / ${c.biome}.`)
  pool={select:createGeneratorSelector(safe),level:query.level};cache.set(key,pool);return pool
 }
 if(hierarchical&&assets.some(a=>a.generator.lighting==='other'))warnings.add('Assets declaring conflicting lighting were excluded from hierarchy composition.')
 let volcanoes=0
 for(let n=0;n<candidates.length;n++){
  const c=candidates[n],category=c.group==='volcanic'?'mountains':c.group==='swamp'?'details':c.group,density=hierarchical?hierarchyDensity(c.tier!,settings[category]):amount[settings[category]]
  if(!density||counts[category]>=LIMIT[category])continue
  const tierKey=category+'/'+c.tier
  // Reserve space for edges/details even when interior candidates fill the category cap.
  if((c.tier==='primary'&&(tierCounts.get(tierKey)??0)>=Math.floor(LIMIT[category]*.45))||(c.tier==='support'&&(tierCounts.get(tierKey)??0)>=Math.floor(LIMIT[category]*.4)))continue
  const heroFamily=c.group==='volcanic'?'mountains':c.group
  if(c.tier==='hero'&&(heroCounts.get(heroFamily)??0)>=(heroFamily==='mountains'?2:1))continue
  if(c.kind==='volcano'&&(volcanoes>=2||seededRandom(seed,c.cell,40)>.04))continue
  const patch=.45+.55*seededRandom(seed,Math.floor(c.cell%cols/5)+Math.floor(c.cell/cols/5)*cols,16)
  if(seededRandom(seed,c.cell,17)>density*(c.tier==='hero'?1:c.strength)*(c.group==='forests'||c.group==='swamp'?patch:1))continue
  const pool=getPool(c),asset=pool.select(seed,c.cell);if(!asset||c.tier==='hero'&&heroSources.has(asset.id))continue
  if(!usedSources.has(asset.id)&&usedSources.size>=LIMIT.sources){warnings.add('Source image limit reached (128); additional sources skipped.');continue}
  const meta=asset.generator,transform=c.tier?hierarchyTransform(meta,c.tier,seededRandom(seed,c.cell,20),c.angle,c.role==='ridge'):undefined
  if(c.tier&&!transform){warnings.add('Some hierarchy scale or rotation ranges do not overlap supported tier bounds; skipped.');continue}
  const range=meta.scale??{min:1,max:1},fraction=c.role==='peak'?.75+seededRandom(seed,c.cell,20)*.25:c.role==='foothill'?seededRandom(seed,c.cell,20)*.35:seededRandom(seed,c.cell,20),scale=transform?.scale??range.min+(range.max-range.min)*fraction
  const d=asset.defaultSize,size=resolvePlacementSize({naturalWidth:asset.width,naturalHeight:asset.height,sizing:{sizingMode:d.mode,defaultWidth:d.width??null,defaultHeight:d.height??null,sizingUnit:d.unit??null,aspectRatioLocked:d.lockAspectRatio,sizingScope:'any',applicableMapTypes:asset.applicableMapTypes}},result.map)
  if(size.reason){warnings.add(size.reason);continue}
  const width=size.width*scale,h=size.height*scale
  if(width>p.width/8||h>p.height/8||width<p.width/3000){warnings.add('Some asset defaults are too large or small for this world scale; adjust library sizes.');continue}
  const x=(c.cell%cols+(seededRandom(seed,c.cell,21)-.5)*.6)*sx,y=(Math.floor(c.cell/cols)+(seededRandom(seed,c.cell,22)-.5)*.6)*sy
  const policy=meta.rotation,rotation=transform?.rotation??(policy?.allowed?Math.max(policy.min,Math.min(policy.max,(c.role==='ridge'?c.angle*.15:0)+policy.min+seededRandom(seed,c.cell,23)*(policy.max-policy.min))):0)
  const radius=Math.hypot(width,h)/2,margin=Math.max(sx,sy)
  if(x-radius<margin||y-radius<margin||x+radius>p.width-margin||y+radius>p.height-margin||riverDistance[c.cell]*Math.min(sx,sy)<Math.min(width,h)*.3+margin*.5)continue
  // Whole image land containment protects the actual smoothed coastline, not just field samples.
  const instance={assetId:asset.id,x,y,width,height:h,rotation:normalizeRotation(rotation),scaleX:1 as const,scaleY:1 as const,opacity:1}
  if(!land.some(o=>instanceInArea(instance,o.geometry)))continue
  let wet=false
  for(let yy=Math.max(0,Math.floor((y-radius)/sy));yy<=Math.min(rows-1,Math.ceil((y+radius)/sy));yy++)for(let xx=Math.max(0,Math.floor((x-radius)/sx));xx<=Math.min(cols-1,Math.ceil((x+radius)/sx));xx++)if(Math.hypot(xx*sx-x,yy*sy-y)<radius&&(!dry[yy*cols+xx]||excluded[yy*cols+xx]))wet=true
  if(wet)continue
  const r=Math.max(p.width/600,Math.min(width,h)*.32*(meta.spacing??1)),x0=Math.floor((x-r)/cellSize),x1=Math.floor((x+r)/cellSize),y0=Math.floor((y-r)/cellSize),y1=Math.floor((y+r)/cellSize)
  let collision=false
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)if(buckets.get(xx+','+yy)?.some(o=>Math.hypot(x-o.x,y-o.y)<r+o.r))collision=true
  if(collision)continue
  const id=`world-v1-scatter-${objects.length}`
  objects.push({kind:'stamp',id,assetId:asset.id,name:asset.name,x:x-width/2,y:y-h/2,width,height:h,rotation:instance.rotation,scaleX:1,scaleY:1,opacity:1})
  placements.push({id,sourceId:asset.id,group:c.group,role:c.role,cell:c.cell,scale,fallback:pool.level,...(c.tier?{hierarchy:c.tier}:{})});counts[category]++;tierCounts.set(tierKey,(tierCounts.get(tierKey)??0)+1);if(c.tier==='hero'){heroCounts.set(heroFamily,(heroCounts.get(heroFamily)??0)+1);heroSources.add(asset.id)}if(c.kind==='volcano')volcanoes++;usedSources.add(asset.id)
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const key=xx+','+yy;const bucket=buckets.get(key)??[];bucket.push({x,y,r});buckets.set(key,bucket)}
 }
 for(const key of ['mountains','forests','details'] as const)if(counts[key]>=LIMIT[key])warnings.add(`${key} limit reached (${LIMIT[key]}).`)
 if(!objects.length)warnings.add('No compatible placements fit. Import semantic assets or adjust density, map scale and library defaults.')
 const layers:MapLayer[]=(['volcanic','mountains','forests','swamp','details'] as GenerationGroup[]).map(group=>({id:`world-v1-detail-${group}`,name:({volcanic:'Volcanic',mountains:'Mountain stamps',forests:'Forest stamps',swamp:'Swamp / Wetland',details:'Hills & Rocks'})[group],visible:true,locked:false,objectIds:placements.filter(v=>v.group===group).map(v=>v.id).sort((a,b)=>objects.find(o=>o.id===a)!.y-objects.find(o=>o.id===b)!.y)})).filter(l=>l.objectIds.length)
 const allLayers=[...layers,...result.layers],generation={...result.map.generation,objectIds:[...result.map.generation.objectIds,...objects.map(o=>o.id)],layerIds:allLayers.map(l=>l.id),scatter:{engineVersion:hierarchical?2 as const:1 as const,settings,libraryFingerprint:fingerprint,placements,warnings:[...warnings].slice(0,100)}}
 return {...result,map:{...result.map,generation},objects:[...result.objects,...objects],layers:allLayers,layerTree:{...result.layerTree,groups:result.layerTree.groups.map(g=>g.id===generation.groupId?{...g,children:[...layers.map(l=>l.id),...g.children]}:g)}}
}

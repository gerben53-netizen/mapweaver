import type { MapDocument, MapObject } from './models'
import type { Point, Size } from '../canvas/viewport'
import { distanceField, finishNoise } from './geographyFinish'
import { TerrainStroke, defaultTerrainBrush } from './terrainBrush'
import { validateTerrainPaint, decodeMask, PAINT_SAMPLES, type TerrainPaint } from './terrainPaint'
import { pathGeometry, pointAtDistance } from './paths'
import { routeWidth } from './routes'
import { WATER_STYLES, type WaterStyleId } from './terrainStyles'

export interface WaterDepth {
  version: 1; model?: 'bathymetry'; coastEdge?: boolean; enabled: boolean; shallow: string; mid: string; deep: string
  shelf: number; softness: number; texture: number; mouths: number; paint?: TerrainPaint
}
export interface WaterDepthBrush { mode:'shallow'|'deep'|'erase'|'blend'; size:number; softness:number; strength:number }
export const defaultWaterDepthBrush:WaterDepthBrush={mode:'shallow',size:160,softness:.8,strength:.5}
export function waterDepthPreset(style:WaterStyleId='deep'):WaterDepth {
  const p=WATER_STYLES[style]
  const colors:Record<WaterStyleId,string[]>={calm:['#699c9f','#416f84','#254b65'],deep:['#568b94','#365f79','#203d5b'],dark:['#536f7a','#334f62','#192e40'],parchment:['#bfb597','#a4987c','#867b67'],minimal:['#779faa','#547e91','#416b82']}
  const [shallow,mid,deep]=colors[style]
  return {version:1,model:'bathymetry',coastEdge:false,enabled:true,shallow,mid,deep,shelf:140,softness:.75,texture:p.waves*.6,mouths:.65}
}
export function validateWaterDepth(value:unknown):WaterDepth {
  const v=value as WaterDepth
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['version','enabled','shallow','mid','deep','shelf','softness','texture','mouths','paint','model','coastEdge'].includes(k))||v.version!==1||typeof v.enabled!=='boolean')throw Error('Invalid water depth settings.')
  if(v.model!==undefined&&v.model!=='bathymetry'||v.coastEdge!==undefined&&(typeof v.coastEdge!=='boolean'||v.model!=='bathymetry'))throw Error('Invalid bathymetry model.')
  for(const color of [v.shallow,v.mid,v.deep])if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Invalid water depth color.')
  for(const [n,lo,hi] of [[v.shelf,8,2000],[v.softness,0,1],[v.texture,0,.3],[v.mouths,0,1]])if(!Number.isFinite(n)||n<lo||n>hi)throw Error('Invalid water depth value.')
  if(v.paint!==undefined){validateTerrainPaint(v.paint);if(v.paint.version!==1||Object.entries(v.paint.materials).some(([id,m])=>!['shallow_1','ocean_1'].includes(id)||m.scale!==1||!['shallow','ocean'].includes(m.style||'')))throw Error('Invalid water depth paint material.')}
  return v
}
export function automaticDepth(distance:number,shelf:number,softness:number,x=0,y=0) {
  const d=Math.max(0,distance)/(shelf*(.94+finishNoise(x/150,y/150)*.12))
  return Math.max(0,Math.min(1,1-Math.exp(-Math.pow(d,1.3-softness*.5))))
}
/** Four-connected land components cap small-island shelves, in map units. */
function islandShelves(land:Uint8Array,w:number,h:number,step:number,shelf:number) {
  const caps=new Float32Array(land.length),seen=new Uint8Array(land.length),queue=new Int32Array(land.length)
  for(let start=0;start<land.length;start++)if(land[start]&&!seen[start]){
    let head=0,tail=1;queue[0]=start;seen[start]=1
    while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w)
      for(const n of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(n>=0&&land[n]&&!seen[n]){seen[n]=1;queue[tail++]=n}
    }
    const cap=Math.min(shelf,Math.max(step*2,Math.sqrt(tail/Math.PI)*step*.65))
    for(let i=0;i<tail;i++)caps[queue[i]]=cap
  }
  return caps
}
export function bathymetricDepth(distance:number,shelf:number,softness:number,x:number,y:number) {
  // Long wavelengths warp the shelf gently; no per-dab/random rendering noise.
  const variation=.6+finishNoise(x/310,y/310)*.8+finishNoise(x/113+17,y/113-8)*.16
  const d=Math.max(0,distance)/(shelf*variation)
  return 1-Math.exp(-Math.pow(d,1.45-softness*.35))
}
export function buildDepthField(land:Uint8Array,width:number,height:number,step:number,settings:WaterDepth) {
  if(settings.model!=='bathymetry'){
    const field=distanceField(land,width,height)
    return Float32Array.from(field.distance,(d,i)=>land[i]?0:field.nearest[i]<0?1:automaticDepth(d*step,settings.shelf,settings.softness,(i%width)*step,Math.floor(i/width)*step))
  }
  const caps=islandShelves(land,width,height,step,settings.shelf),groups=new Map<number,Uint8Array>()
  for(let i=0;i<land.length;i++)if(land[i]){
    // Logarithmic shelf classes bound distance-transform work. Combine their
    // influences, never switch cap at a nearest-island Voronoi boundary.
    const cap=settings.shelf/2**Math.round(Math.log2(settings.shelf/caps[i]))
    let mask=groups.get(cap);if(!mask){mask=new Uint8Array(land.length);groups.set(cap,mask)}mask[i]=1
  }
  const normalized=new Float32Array(land.length).fill(Infinity)
  for(const [cap,mask] of groups){const field=distanceField(mask,width,height);for(let i=0;i<land.length;i++)normalized[i]=Math.min(normalized[i],field.distance[i]*step/cap)}
  return Float32Array.from(normalized,(d,i)=>land[i]?0:bathymetricDepth(d,1,settings.softness,(i%width)*step,Math.floor(i/width)*step))
}
export const mixDepth=(automatic:number,shallow:number,deep:number)=>automatic*(1-(shallow+deep)/255)+deep/255
export function depthColor(depth:number,settings:WaterDepth) {
  const parse=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),a=parse(depth<.5?settings.shallow:settings.mid),b=parse(depth<.5?settings.mid:settings.deep)
  const t=Math.max(0,Math.min(1,depth<.5?depth*2:(depth-.5)*2)),smooth=settings.model==='bathymetry'?t:t*t*(3-2*t)
  return a.map((n,i)=>Math.round(n*(1-smooth)+b[i]*smooth))
}
export const WATER_DEPTH_LIMITS={mouths:256,mouthPatchRadius:128,cachedMouths:64} as const
export interface RiverMouth { id:string; x:number;y:number;dx:number;dy:number;radius:number; width:number }
/** Only downstream endpoints with upstream land and nearby receiving water qualify. */
export function riverMouths(objects:MapObject[],isWater:(p:Point)=>boolean):RiverMouth[] {
  const result:RiverMouth[]=[]
  for(const o of objects){
    if(result.length>=WATER_DEPTH_LIMITS.mouths)break
    if(o.kind!=='path'||o.route?.kind!=='river'||o.closed||o.opacity<=0)continue
    const g=pathGeometry(o);if(g.length<2)continue
    const width=Math.max(1,routeWidth(o,1)),radius=Math.max(10,Math.min(160,width*4)),end=pointAtDistance(o,g.length),up=pointAtDistance(o,Math.max(0,g.length-Math.max(width*4,12))).point
    if(isWater(up))continue
    const length=Math.hypot(end.tangent.x,end.tangent.y)||1,dx=end.tangent.x/length,dy=end.tangent.y/length
    let mouth:Point|null=null
    for(let t=0;t<=1;t+=.125){const p={x:end.point.x+dx*t*Math.max(6,width*1.5),y:end.point.y+dy*t*Math.max(6,width*1.5)};if(isWater(p)){mouth=p;break}}
    if(mouth)result.push({id:o.id,...mouth,dx,dy,radius,width})
  }
  return result
}
export function mouthInfluence(p:Point,m:RiverMouth) {
  const x=p.x-m.x,y=p.y-m.y,along=x*m.dx+y*m.dy,across=-x*m.dy+y*m.dx
  const radius=m.radius*(.6+.4*Math.max(0,Math.min(1,along/m.radius)))
  return Math.exp(-2*((along-m.radius*.22)**2/(m.radius*m.radius)+across*across/(radius*radius)))
}
export function waterStroke(base:TerrainPaint|undefined,b:WaterDepthBrush,map:Size,isWater:(p:Point)=>boolean,automatic?:(p:Point)=>number) {
  if(!['shallow','deep','erase','blend'].includes(b.mode))throw Error('Unknown depth mode.')
  const blend=b.mode==='blend'&&automatic?depthBlendTarget(base,b,map,isWater,automatic):undefined
  return new TerrainStroke(base,{...defaultTerrainBrush,...b,mode:b.mode==='shallow'||b.mode==='deep'?'paint':b.mode,style:b.mode==='deep'?'ocean':'shallow',textureScale:1},map,isWater,blend,automatic&&b.softness>0?(p,center)=>{
    const distance=Math.hypot(p.x-center.x,p.y-center.y),frequency=Math.max(24,b.size*.6)
    // Stable world-space variation merges neighboring dabs; only the soft edge
    // contracts, so the circular cursor still bounds the affected region.
    return distance*(1+.35*b.softness*(1-finishNoise(p.x/frequency,p.y/frequency)))
  }:undefined)
}
export const enabledWaterDepth=(map:MapDocument)=>!!map.waterDepth?.enabled

/** Directional estuary scalar: compact support, continuous at the fan boundary. */
export function estuaryInfluence(p:Point,m:RiverMouth) {
  const x=p.x-m.x,y=p.y-m.y,along=x*m.dx+y*m.dy,across=-x*m.dy+y*m.dx
  const span=m.radius*1.8, t=(along+m.width*.5)/span
  if(t<=0||t>=1)return 0
  const width=m.width*.7+m.radius*.48*Math.sin(t*Math.PI)
  const side=Math.abs(across)/width
  if(side>=1)return 0
  return Math.sin(t*Math.PI)**2*(1-side*side)**2
}
/** Sample immutable scalar masks; decoding is per touched tile, not per pixel. */
export function paintedDepthSampler(paint:TerrainPaint|undefined,automatic:(p:Point)=>number) {
  const decoded=new Map<string,Record<string,Uint8Array>>()
  return (p:Point)=>{
    if(!paint?.visible)return automatic(p)
    const key=Math.floor(p.x/128)+','+Math.floor(p.y/128)
    let masks=decoded.get(key)
    if(!masks){masks=Object.fromEntries(Object.entries(paint.tiles[key]??{}).map(([id,m])=>[id,decodeMask(m)]));decoded.set(key,masks)}
    const i=(Math.floor(p.y/2)%PAINT_SAMPLES)*PAINT_SAMPLES+Math.floor(p.x/2)%PAINT_SAMPLES
    return mixDepth(automatic(p),(masks.shallow_1?.[i]??0)*paint.opacity,(masks.ocean_1?.[i]??0)*paint.opacity)
  }
}
function depthBlendTarget(base:TerrainPaint|undefined,b:WaterDepthBrush,map:Size,isWater:(p:Point)=>boolean,automatic:(p:Point)=>number) {
  const sample=paintedDepthSampler(base,automatic),radius=Math.max(2,Math.min(24,b.size*.1))
  return {materials:{shallow_1:{style:'shallow' as const,scale:1},ocean_1:{style:'ocean' as const,scale:1}},target:(p:Point)=>{
    let sum=0,count=0
    for(const dy of [-radius,0,radius])for(const dx of [-radius,0,radius]){
      const q={x:p.x+dx,y:p.y+dy}
      if(q.x>=0&&q.y>=0&&q.x<map.width&&q.y<map.height&&isWater(q)){sum+=sample(q);count++}
    }
    const target=count?sum/count:sample(p),auto=automatic(p),opacity=base?.opacity??1
    return {shallow_1:target<auto?Math.min(255,255*(auto-target)/Math.max(1e-9,auto*opacity)):0,ocean_1:target>auto?Math.min(255,255*(target-auto)/Math.max(1e-9,(1-auto)*opacity)):0}
  }}
}

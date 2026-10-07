import type { MapDocument, MapObject } from './models'
import type { Point } from '../canvas/viewport'
import { pathGeometry } from './paths'
import { productionDetailPreset, PRODUCTION_DETAIL_PRESETS } from './environmentalProduction'
import { metersPerPixel } from './mapScale'

export type DetailMode = 'surface' | 'decals'
/** Dedicated brush content; never inserted into ordinary Stamp Library cards. */
export const DETAIL_CONTENT = { type: 'environmental-detail', revision: 'dev-1', quality: 'DEV', categories: ['surface', 'decals'] } as const
export const DETAIL_LIMITS = { strokes: 1024, points: 4096, instances: 12000, bytes: 2 * 1024 * 1024 } as const
export const DETAIL_PRESETS = [
  { id: 'dev.surface.dirt', name: 'Dirt', mode: 'surface', color: '#70523a', blend: 'multiply', tier: 'floor', variants: 4 },
  { id: 'dev.surface.damp', name: 'Damp', mode: 'surface', color: '#65756e', blend: 'multiply', tier: 'floor', variants: 4 },
  { id: 'dev.surface.wear', name: 'Wear', mode: 'surface', color: '#d1bb94', blend: 'source-over', tier: 'floor', variants: 4 },
  { id: 'dev.surface.moss', name: 'Moss wash', mode: 'surface', color: '#607544', blend: 'multiply', tier: 'floor', variants: 4 },
  ...(['cracks', 'rubble', 'gravel', 'leaves', 'roots', 'moss-clumps', 'wall-edge-debris'] as const).map((role) => ({
    id: `dev.decals.${role}`, name: {cracks:'Cracks',rubble:'Rubble',gravel:'Gravel',leaves:'Leaves',roots:'Small roots','moss-clumps':'Moss clumps','wall-edge-debris':'Wall-edge debris'}[role],
    mode: 'decals' as const, color: {cracks:'#574f45',rubble:'#969082',gravel:'#a19b87',leaves:'#877547',roots:'#8a6848','moss-clumps':'#566e35','wall-edge-debris':'#91866f'}[role],
    blend: 'source-over', tier: role === 'wall-edge-debris' ? 'edge' : 'floor', variants: 4,
  })),
] as const
export type DetailPresetId = string
export const detailPreset = (id: string) => DETAIL_PRESETS.find(p => p.id === id) || productionDetailPreset(id)
export const ALL_DETAIL_PRESETS = [...DETAIL_PRESETS,...PRODUCTION_DETAIL_PRESETS]
export interface DetailBrush {
  mode: DetailMode; action: 'paint' | 'erase'; presetId: DetailPresetId;
  radius: number; density: number; sizeMin: number; sizeMax: number;
  rotation: number; variation: boolean; opacity: number; softness: number; edgeBias: 'off' | 'walls'
}
export const defaultDetailBrush: DetailBrush = {mode:'surface',action:'paint',presetId:'dev.surface.dirt',radius:24,density:30,sizeMin:3,sizeMax:10,rotation:180,variation:true,opacity:.35,softness:.75,edgeBias:'off'}
export interface DetailInstance { id: string; x: number; y: number; size: number; rotation: number; variant: number; opacity: number }
export interface DetailStroke { id: string; revision: 'dev-1'|'production-1'; pixelsPerFoot?:number; seed: number; brush: DetailBrush; points: Point[]; instances: DetailInstance[] }
export interface EnvironmentalDetail { version: 1; visible: boolean; locked: boolean; opacity: number; strokes: DetailStroke[] }
export const emptyEnvironmentalDetail = (): EnvironmentalDetail => ({version:1,visible:true,locked:false,opacity:1,strokes:[]})
const round = (n: number) => Math.round(n * 1e6) / 1e6
export function detailRandom(seed: number) { let n=seed>>>0;return ()=>{n+=0x6d2b79f5;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296} }
/** Arc-distance samples, independent of duplicate/collinear pointer events. */
export function detailSamples(points: readonly Point[], step: number): Point[] {
  if(!points.length)return []
  const result=[{...points[0]}];let length=0,next=step
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y);while(d>0&&next<=length+d+1e-7){const t=Math.min(1,(next-length)/d);result.push({x:round(a.x+(b.x-a.x)*t),y:round(a.y+(b.y-a.y)*t)});next+=step;if(result.length>DETAIL_LIMITS.points)throw Error('Environmental stroke is too long. Use shorter strokes.')}length+=d}
  return result
}
export function segmentDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
export function detailWallDistance(p:Point,objects:readonly MapObject[]){let best=Infinity;for(const wall of objects){if(wall.kind!=='path'||wall.pathKind!=='wall')continue;const samples=pathGeometry(wall).samples;for(let i=1;i<samples.length;i++)best=Math.min(best,Math.max(0,segmentDistance(p,samples[i-1].point,samples[i].point)-wall.strokeWidth/2))}return best}
export function validateDetailBrush(b:DetailBrush){
  const preset=detailPreset(b.presetId),production=productionDetailPreset(b.presetId)
  if(!preset||preset.mode!==b.mode||!['paint','erase'].includes(b.action)||!['off','walls'].includes(b.edgeBias)||typeof b.variation!=='boolean'||!Number.isFinite(b.radius)||b.radius<2||b.radius>256||!Number.isFinite(b.density)||b.density<1||b.density>200||!Number.isFinite(b.sizeMin)||!Number.isFinite(b.sizeMax)||b.sizeMin<=0||!production&&(b.sizeMin<.5||b.sizeMax>100)||b.sizeMax>1e6||b.sizeMax<b.sizeMin||!Number.isFinite(b.rotation)||b.rotation<0||b.rotation>180||![b.opacity,b.softness].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid environmental brush settings.')
}
export function makeDetailStroke(points:Point[],brush:DetailBrush,map:Pick<MapDocument,'width'|'height'> & Partial<Pick<MapDocument,'grid'|'mapType'|'geography'>>,objects:readonly MapObject[]=[],seed=crypto.getRandomValues(new Uint32Array(1))[0],id:string=crypto.randomUUID()):DetailStroke {
  validateDetailBrush(brush)
  const production=productionDetailPreset(brush.presetId),meters=map.grid?metersPerPixel(map as MapDocument):null,pixelsPerFoot=meters===null?10:.3048/meters
  if(production&&brush.mode==='decals'&&brush.action==='paint'){const c=production.components[0],min=c.widthFt*pixelsPerFoot*c.scaleRange.min,max=c.widthFt*pixelsPerFoot*c.scaleRange.max;if(brush.sizeMin<min-1e-6||brush.sizeMax>max+1e-6)throw Error('Environmental component size must stay within its approved 0.5–2× footprint range.')}
  if(points.length>DETAIL_LIMITS.points||!points.length||points.some(p=>![p.x,p.y].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6)))throw Error('Invalid environmental stroke path.')
  const random=detailRandom(seed),step=Math.max(1,brush.radius/3),samples=detailSamples(points,step),instances:DetailInstance[]=[]
  if(brush.mode==='decals'&&brush.action==='paint')for(const [index,p]of samples.entries()){
    const area=index?step*brush.radius*2:Math.PI*brush.radius**2,n=brush.density*area/10000,count=Math.floor(n)+(random()<n%1?1:0)
    for(let j=0;j<count;j++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*brush.radius,x=round(p.x+Math.cos(angle)*r),y=round(p.y+Math.sin(angle)*r)
      const size=round(brush.sizeMin+(brush.sizeMax-brush.sizeMin)*random()),rotation=round((random()*2-1)*brush.rotation),variant=brush.variation?Math.floor(random()*4):0,opacity=round(brush.opacity*(brush.variation ? .65+random()*.35 : 1))
      if(x<0||y<0||x>=map.width||y>=map.height)continue
      if(brush.edgeBias==='walls'&&detailWallDistance({x,y},objects)>brush.radius*.35&&random()>.2)continue
      // A small local rejection radius avoids exact pile-ups, without global physics.
      if(instances.slice(-24).some(v=>Math.hypot(v.x-x,v.y-y)<Math.min(v.size,size)*.18))continue
      instances.push({id:`${id}:${instances.length}`,x,y,size,rotation,variant,opacity})
      if(instances.length>DETAIL_LIMITS.instances)throw Error('Too many environmental decals. Reduce density or stroke length.')
    }
  }
  // Persist arc samples, not event samples: smaller save data and stable replay.
  let surfacePoints=detailSamples(points,Math.max(1,brush.radius*.2));const end=points.at(-1)!
  if(Math.hypot(end.x-surfacePoints.at(-1)!.x,end.y-surfacePoints.at(-1)!.y)>1e-6)surfacePoints.push({...end})
  if(brush.mode==='surface'&&brush.action==='paint'&&brush.edgeBias==='walls')surfacePoints=surfacePoints.filter(p=>detailWallDistance(p,objects)<=brush.radius*.35||random()<.2)
  if(!surfacePoints.length)surfacePoints=[{...points[0]}]
  return {id,revision:production?'production-1':'dev-1',...(production?{pixelsPerFoot}:{}),seed,brush:{...brush},points:surfacePoints,instances}
}
export function applyDetailStroke(before:EnvironmentalDetail|undefined,stroke:DetailStroke):EnvironmentalDetail {
  const base=before||emptyEnvironmentalDetail();if(base.locked||!base.visible)throw Error('Show and unlock Environmental Detail before painting.')
  if(stroke.brush.opacity===0||stroke.brush.mode==='surface'&&stroke.brush.action==='erase'&&!base.strokes.some(s=>s.brush.mode==='surface'&&s.brush.action==='paint'))return base
  if(stroke.brush.mode==='decals'&&stroke.brush.action==='erase'){
    const hit=(v:DetailInstance)=>stroke.points.some((p,i)=>segmentDistance(v,i?stroke.points[i-1]:p,p)<=stroke.brush.radius)
    return {...base,strokes:base.strokes.map(s=>s.brush.mode==='decals'?{...s,instances:s.instances.filter(v=>!hit(v))}:s).filter(s=>s.brush.mode==='surface'||s.instances.length>0)}
  }
  if(stroke.brush.mode==='decals'&&!stroke.instances.length)return base
  return {...base,strokes:[...base.strokes,stroke]}
}
export function validateEnvironmentalDetail(value:unknown):EnvironmentalDetail {
  const d=value as EnvironmentalDetail
  if(!d||d.version!==1||typeof d.visible!=='boolean'||typeof d.locked!=='boolean'||!Number.isFinite(d.opacity)||d.opacity<0||d.opacity>1||!Array.isArray(d.strokes)||d.strokes.length>DETAIL_LIMITS.strokes)throw Error('Invalid environmental detail layer.')
  const ids=new Set<string>();let total=0
  for(const s of d.strokes){if(!s||typeof s.id!=='string'||!s.id||s.id.length>128||ids.has(s.id)||!['dev-1','production-1'].includes(s.revision)||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||!Array.isArray(s.points)||!s.points.length||s.points.length>DETAIL_LIMITS.points||!Array.isArray(s.instances))throw Error('Invalid environmental stroke.');ids.add(s.id);validateDetailBrush(s.brush);const prod=productionDetailPreset(s.brush.presetId);if(!!prod!==(s.revision==='production-1')||prod&&(!Number.isFinite(s.pixelsPerFoot)||s.pixelsPerFoot!<=0||s.pixelsPerFoot!>10000))throw Error('Invalid environmental artwork revision or physical scale.');if(prod&&s.brush.mode==='decals'&&s.brush.action==='paint'){const c=prod.components[0];if(s.brush.sizeMin<c.widthFt*s.pixelsPerFoot!*.5-1e-6||s.brush.sizeMax>c.widthFt*s.pixelsPerFoot!*2+1e-6)throw Error('Invalid environmental component scale.')}if(s.points.some(p=>!p||![p.x,p.y].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6)))throw Error('Invalid environmental points.');total+=s.instances.length
    const instanceIds=new Set<string>();for(const v of s.instances){if(!v||typeof v.id!=='string'||v.id.length>150||instanceIds.has(v.id)||![v.x,v.y,v.size,v.rotation,v.opacity].every(Number.isFinite)||Math.abs(v.x)>1e6||Math.abs(v.y)>1e6||v.size<s.brush.sizeMin||v.size>s.brush.sizeMax||Math.abs(v.rotation)>s.brush.rotation||v.opacity<0||v.opacity>1||!Number.isInteger(v.variant)||v.variant<0||v.variant>=4)throw Error('Invalid environmental decal.');instanceIds.add(v.id)}
    if(s.brush.mode==='surface'&&s.instances.length)throw Error('Surface strokes cannot contain decals.')
  }
  if(total>DETAIL_LIMITS.instances||new TextEncoder().encode(JSON.stringify(d)).length>DETAIL_LIMITS.bytes)throw Error('Environmental detail exceeds its storage budget.')
  return d
}
/** Opt-in strata. No environmental field means no change to historic ordering. */
export function environmentalOrder(objects:MapObject[],enabled:boolean){if(!enabled)return objects;const rank=(o:MapObject)=>o.kind==='area'?(o.ceiling?3:0):o.kind==='path'||o.kind==='door'?1:2;return [...objects].sort((a,b)=>rank(a)-rank(b))}
export function environmentalBoundary(objects:MapObject[],tier:'floor'|'edge'){const index=objects.findIndex(o=>tier==='floor'?o.kind!=='area'||!!o.ceiling:!['area','path','door'].includes(o.kind)||o.kind==='area'&&!!o.ceiling);return index<0?objects.length:index}

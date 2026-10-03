import { hexCellCorners, pixelToHex } from './hexGrid'
import { landGridPoint } from './landHexGrid'
import { hexFootprint, validateHexSettings, type HexSettings } from './hexLandShape'
import clipping, { type MultiPolygon } from 'polygon-clipping'
import type { Point, Size } from '../canvas/viewport'
import type { AreaGeometry, AreaObject } from './models'
import { closestPoint, createArea, distance, geometryBounds, normalizeGeometry, rectangleGeometry, signedArea, simplify, withGeometry } from './areas'
import { defaultLandArea } from './landAreas'
import { terrainAppearance, type TerrainAppearance } from './terrainStyles'

export const LAND_SHAPES={round:'Round',organic:'Organic',jagged:'Jagged',island:'Island',peninsula:'Peninsula',detail:'Coastline Detail',hexagon:'Hexagon'} as const
export interface LandBrush { snapHex?:boolean;matchHex?:boolean;hexGrid?:import('./models').GridSettings; hex?:HexSettings; action:'add'|'remove'|'smooth'|'roughen'; shape:keyof typeof LAND_SHAPES; size:number; softness:number; roughness:number; smoothing:'off'|'low'|'medium'|'high' }
export const defaultLandBrush:LandBrush={action:'add',shape:'organic',size:180,softness:.25,roughness:.4,smoothing:'medium'}
export const LAND_PRESETS:Record<string,LandBrush>={
 'Continental Mass':{...defaultLandBrush,size:600,roughness:.25,smoothing:'high'},
 'Regional Coast':{...defaultLandBrush},
 'Island':{...defaultLandBrush,shape:'island',size:100,roughness:.5},
 'Archipelago Detail':{...defaultLandBrush,shape:'detail',size:40,roughness:.55,smoothing:'low'},
 'Smooth Shore':{...defaultLandBrush,action:'smooth',shape:'round',size:160,roughness:0,smoothing:'high'},
 'Rocky Coast':{...defaultLandBrush,action:'roughen',shape:'jagged',size:140,roughness:.65,smoothing:'low'},
}
export const LAND_BRUSH_LIMITS={samples:2048,dabs:256,timeout:5000} as const
export function validateLandBrush(b:LandBrush){
 if(b.hex)validateHexSettings(b.hex)
 if(!['add','remove','smooth','roughen'].includes(b.action)||!Object.hasOwn(LAND_SHAPES,b.shape)||!['off','low','medium','high'].includes(b.smoothing)||![b.size,b.softness,b.roughness].every(Number.isFinite)||b.size<(b.matchHex?4:12)||b.size>1200||b.softness<0||b.softness>1||b.roughness<0||b.roughness>1)throw Error('Invalid land brush settings.')
}
const smoothAmount={off:0,low:.12,medium:.25,high:.4}
const noise=(x:number,y:number,seed:number)=>Math.sin(x*.91+y*.37+seed)*.5+Math.sin(x*.43-y*.83+seed*1.3)*.3+Math.sin(x*1.71+y*1.27+seed*.7)*.2
/** Shared bounded polar shape; size is its maximum longitudinal diameter. */
export function landFootprint(p:Point,b:LandBrush,seed=1,angle=0):Point[]{
 if(b.shape==='hexagon')return hexFootprint(p,b.size,b.hex,b.roughness,b.softness,b.smoothing,seed,b.hexGrid&&b.matchHex?hexCellCorners(pixelToHex(p,b.hexGrid),b.hexGrid):undefined)
 const profile={round:[0,1,1],organic:[.22,1,1],jagged:[.32,2.5,1],island:[.3,1.4,.8],peninsula:[.16,1,.35],detail:[.13,3,.85]}[b.shape]
 return Array.from({length:48},(_,i)=>{const t=i*Math.PI/24,irregular=profile[0]*b.roughness,frequency=profile[1],wave=noise(Math.cos(t)*frequency*2,Math.sin(t)*frequency*2,seed)
  // The .5 contour of a soft falloff recedes by half the soft band. No fractional semantic state.
  const radius=b.size/2*(1-b.softness*.5)*(1+irregular*wave)/(1+irregular),x=Math.cos(t)*radius,y=Math.sin(t)*radius*profile[2]
  return{x:p.x+x*Math.cos(angle)-y*Math.sin(angle),y:p.y+x*Math.sin(angle)+y*Math.cos(angle)}
 })
}
export function resampleLandStroke(points:Point[],size:number):Point[]{
 if(!points.length||points.length>LAND_BRUSH_LIMITS.samples||points.some(p=>!Number.isFinite(p.x+p.y)||Math.abs(p.x)>1e6||Math.abs(p.y)>1e6))throw Error('Land stroke is empty or too long.')
 const result=[points[0]],spacing=Math.max(2,size*.12);let remainder=0
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=distance(a,b);for(let d=spacing-remainder;d<=length;d+=spacing){result.push({x:a.x+(b.x-a.x)*d/length,y:a.y+(b.y-a.y)*d/length});if(result.length>LAND_BRUSH_LIMITS.dabs)throw Error('Use a shorter land stroke.')}remainder=(remainder+length)%spacing}
 if(distance(result.at(-1)!,points.at(-1)!)>.01)result.push(points.at(-1)!)
 return result.map(p=>({x:Math.round(p.x*1e6)/1e6,y:Math.round(p.y*1e6)/1e6}))
}
const multi=(g:AreaGeometry):MultiPolygon=>g.polygons.map(p=>[p.outer,...p.holes].map(r=>r.map(p=>[p.x,p.y])))
const ring=(r:number[][])=>r.map(([x,y])=>({x,y})).filter((p,i,a)=>i!==a.length-1||distance(p,a[0])>1e-6)
const area=(g:AreaGeometry)=>g.polygons.reduce((sum,p)=>sum+Math.abs(signedArea(p.outer))-p.holes.reduce((s,r)=>s+Math.abs(signedArea(r)),0),0)
/** Bounded simplification with strict native topology validation; no silent invalid repairs. */
function contours(value:MultiPolygon,b:LandBrush):AreaGeometry|null{
 const minimum=Math.max(1,Math.min(25,(b.size*.012)**2)),tolerance=b.shape==='hexagon'&&['add','remove'].includes(b.action)?Math.max(.001,b.size*(b.hex?.edge==='rough'?.0003:.0001)*b.roughness):Math.max(.15,Math.min(2,b.size*.004))*(1+smoothAmount[b.smoothing])
 const polygons=value.map(p=>({outer:ring(p[0]),holes:p.slice(1).map(ring)})).filter(p=>Math.abs(signedArea(p.outer))>=minimum).map(p=>({...p,holes:p.holes.filter(r=>Math.abs(signedArea(r))>=minimum)}))
 if(!polygons.length)return null
 // Exact coverage must not have vertices displaced or removed by approximation.
 if(b.shape==='hexagon'&&(b.hex?.edge??'exact')==='exact'&&['add','remove'].includes(b.action))return normalizeGeometry({polygons})
 const reduce=(r:Point[],t:number)=>simplify([...r,r[0]],t).slice(0,-1)
 for(const factor of [1,.5,.1]){
  try{return normalizeGeometry({polygons:polygons.map(p=>({outer:reduce(p.outer,tolerance*factor),holes:p.holes.map(r=>reduce(r,tolerance*factor))}))})}catch{/* A less aggressive simplification can preserve a narrow channel. */}
 }
 throw Error('This coast exceeds safe geometry limits. Use shorter strokes or a smoother shape.')
}
const overlap=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>a.x<=b.x+b.width&&a.x+a.width>=b.x&&a.y<=b.y+b.height&&a.y+a.height>=b.y
export interface LandBrushInput { lands:AreaObject[]; editable:string[]; map:Size; brush:LandBrush; points:Point[]; seed:number; newId:string; appearance?:TerrainAppearance }
export interface LandBrushResult { replacements:AreaObject[]; removed:string[]; added:AreaObject[] }
export function applyLandStroke(input:LandBrushInput):LandBrushResult{
 const {lands,map,brush:b,seed}=input;validateLandBrush(b)
 const points=resampleLandStroke(input.points,b.size).map(p=>landGridPoint(p,b)).filter((p,i,a)=>!i||distance(p,a[i-1])>.001),coverage:MultiPolygon[]=points.map((p,i)=>{
  const previous=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],angle=Math.atan2(next.y-previous.y,next.x-previous.x)
  return [[landFootprint(p,b,seed,angle).map(p=>[p.x,p.y])]]
 })
 let mask:MultiPolygon=[]
 // Small batches avoid feeding an unbounded segment queue to the boolean engine.
 for(let i=0;i<coverage.length;i+=16)mask=clipping.union(mask,...coverage.slice(i,i+16))
 mask=clipping.intersection(mask,multi(rectangleGeometry({x:0,y:0,...map})))
 if(!mask.length)return{replacements:[],removed:[],added:[]}
 const bounds=geometryBounds({polygons:mask.map(p=>({outer:ring(p[0]),holes:[]}))}),touched=lands.filter(o=>overlap(o,bounds)&&(clipping.intersection(multi(o.geometry),mask).length||(b.hexGrid&&b.action==='add'&&clipping.union(multi(o.geometry),mask).length<o.geometry.polygons.length+mask.length)))
 if(touched.some(o=>!input.editable.includes(o.id)))throw Error('Show and unlock touched landmasses and their groups before editing this coast.')
 if(b.action==='add'){
  if(touched.length&&!clipping.difference(mask,...touched.map(o=>multi(o.geometry))).length)return{replacements:[],removed:[],added:[]}
  const combined=clipping.union(mask,...touched.map(o=>multi(o.geometry))),g=contours(combined,b)
  if(!g)return{replacements:[],removed:[],added:[]}
  if(touched.length){const primary=touched[0];return{replacements:[withGeometry(primary,g)],removed:touched.slice(1).map(o=>o.id),added:[]}}
  const o=createArea(g,{kind:'solid',color:'#b5bb89'}),appearance=input.appearance||{...terrainAppearance('land',map.width),coast:'fantasy' as const,feather:0}
  return{replacements:[],removed:[],added:[{...o,id:input.newId,name:'Landmass',land:{...defaultLandArea('landmass'),appearance}}]}
 }
 const replacements:AreaObject[]=[],removed:string[]=[]
 for(const o of touched){
  let g:AreaGeometry|null
  if(b.action==='remove')g=contours(clipping.difference(multi(o.geometry),mask),b)
  else g=reshapeCoast(o.geometry,points,b,seed,map)
  if(g){if(JSON.stringify(g)!==JSON.stringify(o.geometry))replacements.push(withGeometry(o,g))}else removed.push(o.id)
 }
 return{replacements,removed,added:[]}
}
function reshapeCoast(g:AreaGeometry,points:Point[],b:LandBrush,seed:number,map:Size):AreaGeometry{
 if((b.action==='roughen'&&b.roughness===0)||(b.action==='smooth'&&b.smoothing==='off'))return g
 const radius=b.size/2,spacing=Math.max(2,Math.min(20,b.size/12))
 const influence=(p:Point)=>{let d=Infinity;for(let i=0;i<points.length;i++)d=Math.min(d,distance(p,i?closestPoint(p,points[i-1],points[i]):points[0]));const t=Math.max(0,1-d/radius);return t*t*(3-2*t)}
 const change=(original:Point[])=>{
  const r=original.flatMap((a,i)=>{const next=original[(i+1)%original.length],mid={x:(a.x+next.x)/2,y:(a.y+next.y)/2},count=influence(a)||influence(next)||influence(mid)?Math.max(1,Math.ceil(distance(a,next)/spacing)):1;return Array.from({length:count},(_,j)=>({x:a.x+(next.x-a.x)*j/count,y:a.y+(next.y-a.y)*j/count}))})
  if(r.length>4095)throw Error('Coastline detail is too dense. Use a larger brush.')
  let result=r
  if(b.action==='smooth'){
   // Paired positive/negative Laplacian passes reduce chatter without systematic shrinkage.
   for(const factor of [.5,-.53,.5,-.53])result=result.map((p,i)=>{const a=result[(i+result.length-1)%result.length],z=result[(i+1)%result.length],w=influence(p)*factor*(.3+smoothAmount[b.smoothing]);return{x:p.x+((a.x+z.x)/2-p.x)*w,y:p.y+((a.y+z.y)/2-p.y)*w}})
  }else result=r.map((p,i)=>{const a=r[(i+r.length-1)%r.length],z=r[(i+1)%r.length],dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy)||1,offset=noise(p.x/spacing,p.y/spacing,seed)*b.roughness*Math.min(20,b.size*.055)*influence(p)*(1-b.softness*.5);return{x:p.x-dy/len*offset,y:p.y+dx/len*offset}})
  return result.map(p=>({x:Math.max(0,Math.min(map.width,p.x)),y:Math.max(0,Math.min(map.height,p.y))}))
 }
 const raw={polygons:g.polygons.map(p=>({outer:change(p.outer),holes:p.holes.map(change)}))}
 const result=contours(multi(raw),b)
 if(!result)throw Error('Coast adjustment would remove this island. Use Remove Land instead.')
 if(b.action==='smooth'&&Math.abs(area(result)-area(g))/area(g)>.03)throw Error('Smoothing would change more than 3% of this landmass. Use a smaller brush.')
 return result
}

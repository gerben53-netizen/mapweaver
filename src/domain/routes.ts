import { smoothRiverNodes,validateRiverAppearance } from './riverAppearance'
import type { MapDocument, MapObject, PathNode, PathObject } from './models'
import { createPath, nearestPathPoint, pathGeometry, validatePath, withPathGeometry } from './paths'
import { distanceToPixels } from './geography'
export type RouteKind = 'river' | 'road' | 'border'
export const ROUTE_LIMITS = { junctionSegments: 20000, warningSamples: 512, outline: 128 } as const
interface Base { unit:'px'|'km'|'mi'; pixelsPerUnit:number; preset:string }
interface Outline { color:string; width:number }
export type RouteSettings =
  | (Base & { kind:'river'; appearance?:import('./riverAppearance').RiverAppearance; startWidth:number; endWidth:number; startFactor:number; endFactor:number; bank:Outline })
  | (Base & { kind:'road'; roadClass:'trail'|'road'|'major'; outline:Outline; marking:Outline & { dash:number; gap:number } })
  | (Base & { kind:'border'; style:'solid'|'dashed'|'dotted'|'double'; dash:number; gap:number; halo:Outline })
export type RouteStyle = Pick<PathObject,'stroke'|'strokeWidth'|'cap'|'join'|'opacity'> & { route:RouteSettings }
export const isRouteKind = (kind:string):kind is RouteKind => ['river','road','border'].includes(kind)
export function routePreset(kind:RouteKind, preset='standard'):RouteStyle {
  const base={unit:'px' as const,pixelsPerUnit:1,preset}
  const common={opacity:1,cap:'round' as const,join:'round' as const}
  if(kind==='river')return {...common,strokeWidth:18,stroke:{kind:'solid',color:'#599fb5'},route:{...base,kind,startWidth:4,endWidth:18,startFactor:0.2,endFactor:1,bank:{color:'#346c7c',width:1}}}
  if(kind==='road')return {...common,strokeWidth:preset==='trail'?5:preset==='major'?16:10,stroke:preset==='trail'?{kind:'dashed',color:'#beab82',dash:9,gap:5}:{kind:'solid',color:'#cbb78d'},route:{...base,kind,roadClass:preset==='trail'?'trail':preset==='major'?'major':'road',outline:{color:'#766950',width:1.5},marking:{color:'#efe4c9',width:0,dash:8,gap:6}}}
  return {...common,strokeWidth:3,stroke:{kind:'solid',color:'#945e77'},route:{...base,kind,style:'dashed',dash:12,gap:7,halo:{color:'#f5edd9',width:2}}}
}
export function createRoute(nodes:PathNode[], closed:boolean, style:RouteStyle):PathObject {
  return validatePath(withPathGeometry({...createPath(nodes,closed),...structuredClone(style),pathKind:style.route.kind,name:style.route.kind[0].toUpperCase()+style.route.kind.slice(1)}))
}
export const routeStyle=(p:PathObject):RouteStyle=>{if(!p.route)throw new Error('Expected a route.');return {route:p.route,stroke:p.stroke,strokeWidth:p.strokeWidth,opacity:p.opacity,cap:p.cap,join:p.join}}
export function routeWidth(p:Pick<PathObject,'strokeWidth'|'route'>, t:number) {
  const r=p.route
  if(r?.kind==='river'&&r.appearance?.widthMode==='uniform')return r.endWidth*r.endFactor
  return r?.kind==='river' ? r.startWidth*r.startFactor*(1-t)+r.endWidth*r.endFactor*t : p.strokeWidth
}
export function routeRadius(p:Pick<PathObject,'strokeWidth'|'route'>) {
  const r=p.route
  if(!r)return 0
  return r.kind==='river'?Math.max(routeWidth(p,0),routeWidth(p,1))/2+(r.appearance?.outlineEnabled===false?0:r.bank.width)+(r.appearance?.halo.enabled?r.appearance.halo.width:0):r.kind==='road'?p.strokeWidth/2+r.outline.width:r.style==='double'?p.strokeWidth*1.5+r.halo.width:p.strokeWidth/2+r.halo.width
}
export function routeUnit(style:RouteStyle,unit:RouteSettings['unit'],map:MapDocument):RouteStyle {
  return {...style,route:{...style.route,unit,pixelsPerUnit:unit==='px'?1:distanceToPixels(1,unit,map)}}
}
export function scaleRoute(p:PathObject,factor:number):Partial<PathObject> {
  const r=p.route;if(!r)return {}
  const outline=(v:Outline)=>({...v,width:v.width*factor})
  return {...(p.stroke.kind==='dashed'?{stroke:{...p.stroke,dash:p.stroke.dash*factor,gap:p.stroke.gap*factor}}:{}),route:r.kind==='river'?{...r,startWidth:r.startWidth*factor,endWidth:r.endWidth*factor,bank:outline(r.bank),...(r.appearance?{appearance:{...r.appearance,halo:{...r.appearance.halo,width:r.appearance.halo.width*factor}}}:{})}:r.kind==='road'?{...r,outline:outline(r.outline),marking:{...outline(r.marking),dash:r.marking.dash*factor,gap:r.marking.gap*factor}}:{...r,dash:r.dash*factor,gap:r.gap*factor,halo:outline(r.halo)}}
}
export function reverseRoute(p:PathObject):Partial<PathObject> {
 const r=p.route;if(r?.kind!=='river')return {}
 if(r.appearance)return {route:{...r,appearance:{...r.appearance,widthMode:r.appearance.widthMode==='uniform'?'uniform':'manual'},startWidth:routeWidth(p,1),endWidth:routeWidth(p,0),startFactor:1,endFactor:1}}
 return {route:{...r,startWidth:r.endWidth,endWidth:r.startWidth,startFactor:r.endFactor,endFactor:r.startFactor}}
}

export function convertRoute(p:PathObject,kind:'generic'|RouteKind):PathObject {
  if(p.pathKind==='wall')throw new Error('Walls must retain their opening relationships.')
  const next={...p};delete next.route
  return validatePath(withPathGeometry(kind==='generic'?{...next,pathKind:'generic'}:{...next,...routePreset(kind),pathKind:kind,closed:kind==='river'?false:p.closed}))
}
const fields=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw new Error('Invalid route fields.')}
const number=(v:number,min:number,max:number)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error('Route value outside supported limits.')}
export function validateRoute(p:PathObject) {
  const r=p.route
  if(!r||r.kind!==p.pathKind)throw new Error('Route type and settings must agree.')
  fields(r,['kind','unit','pixelsPerUnit','preset',...(r.kind==='river'?['startWidth','endWidth','startFactor','endFactor','bank','appearance']:r.kind==='road'?['roadClass','outline','marking']:['style','dash','gap','halo'])])
  if(!['px','km','mi'].includes(r.unit)||typeof r.preset!=='string'||!/^[a-zA-Z0-9 -]{1,40}$/.test(r.preset))throw new Error('Invalid route scale or preset.')
  number(r.pixelsPerUnit,1e-9,1e9);if(r.unit==='px'&&r.pixelsPerUnit!==1)throw new Error('Pixel units require a unit scale.')
  const outline=(v:Outline,extra:string[]=[])=>{fields(v,['color','width',...extra]);if(!/^#[\da-f]{6}$/i.test(v.color))throw new Error('Invalid route color.');number(v.width,0,ROUTE_LIMITS.outline)}
  if(r.kind==='river'){
    if(p.closed||p.stroke.kind==='dashed')throw new Error('Rivers are open and use solid water or a texture.')
    number(r.startWidth,.1,1024);number(r.endWidth,.1,1024);number(r.startFactor,0,4);number(r.endFactor,0,4)
    if(Math.max(routeWidth(p,0),routeWidth(p,1))>1024||Math.max(routeWidth(p,0),routeWidth(p,1))<.1)throw new Error('River width must stay between 0.1 and 1024 map pixels.')
    outline(r.bank);if(r.appearance!==undefined)validateRiverAppearance(r.appearance)
  }else if(r.kind==='road'){
    if(!['trail','road','major'].includes(r.roadClass))throw new Error('Invalid road class.')
    outline(r.outline);outline(r.marking,['dash','gap']);number(r.marking.dash,.1,10000);number(r.marking.gap,.1,10000)
    if(r.marking.width>p.strokeWidth)throw new Error('Center marking must fit inside the road.')
  }else{
    if(!['solid','dashed','dotted','double'].includes(r.style)||p.stroke.kind!=='solid')throw new Error('Borders use a color and border pattern.')
    number(r.dash,.1,10000);number(r.gap,.1,10000);outline(r.halo)
  }
}
export function routeWarnings(p:PathObject):string[] {
  if(p.route?.kind!=='river')return []
  const warnings=routeWidth(p,0)>routeWidth(p,1)?['The source is wider than the mouth.']:[]
  const samples=pathGeometry(p).samples
  // Bounded diagnostics: exact line crossing, at most 512 samples / 131k comparisons.
  if(samples.length>ROUTE_LIMITS.warningSamples)return [...warnings,'Self-crossing check skipped above 512 samples.']
  const cross=(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number})=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  for(let i=1;i<samples.length;i++)for(let j=i+2;j<samples.length;j++){
    const a=samples[i-1].point,b=samples[i].point,c=samples[j-1].point,d=samples[j].point
    if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return [...warnings,'This river crosses itself. Review the water contour.']
  }
  return warnings
}
/** Two endpoints per route and only explicit T references: no quadratic network scan. */
export function routeBudget(objects:MapObject[]) {
  const paths=objects.filter((p):p is PathObject=>p.kind==='path'),byId=new Map(paths.map(p=>[p.id,p]))
  let checks=0
  for(const p of paths)if(p.route&&!p.closed)for(const n of [p.nodes[0],p.nodes.at(-1)!]){
    const target=n.junction?byId.get(n.junction):undefined
    if(target?.pathKind===p.pathKind)checks+=target.nodes.length
  }
  if(checks>ROUTE_LIMITS.junctionSegments)throw Error('Route junctions exceed 20,000 target segments. Simplify connected routes or disconnect endpoints.')
}
export function routeConnections(objects:MapObject[]) {
  routeBudget(objects)
  const paths=objects.filter((p):p is PathObject=>p.kind==='path'&&(p.pathKind==='river'||p.pathKind==='road'))
  const byId=new Map(paths.map(p=>[p.id,p])),ends=new Map<string,Set<string>>(),result=new Map<string,{x:number;y:number}[]>()
  const key=(p:PathObject,n:{x:number;y:number})=>`${p.pathKind}:${n.x.toFixed(5)},${n.y.toFixed(5)}`
  for(const p of paths)if(!p.closed)for(const n of [p.nodes[0],p.nodes.at(-1)!]){const k=key(p,n),set=ends.get(k)||new Set<string>();set.add(p.id);ends.set(k,set)}
  for(const p of paths)if(!p.closed)for(const n of [p.nodes[0],p.nodes.at(-1)!]){
    const target=n.junction?byId.get(n.junction):undefined
    if((ends.get(key(p,n))?.size||0)>1||(target&&target.id!==p.id&&target.pathKind===p.pathKind&&nearestPathPoint(target,n).distance<.001))result.set(p.id,[...(result.get(p.id)||[]),{x:n.x,y:n.y}])
  }
  return result
}
export function splitRoute(p:PathObject,index:number):[PathObject,PathObject] {
  if(!p.route||p.closed||!Number.isInteger(index)||index<1||index>=p.nodes.length-1)throw Error('Choose an interior node on an open route.')
  const g=pathGeometry(p),fraction=g.segments[index-1].start/g.length+g.segments[index-1].length/g.length,width=routeWidth(p,fraction)
  const nodes=p.route.kind==='river'&&p.route.appearance?.smoothing&&p.route.appearance.smoothing!=='off'?smoothRiverNodes(p.nodes,p.route.appearance.smoothing):p.nodes
  const left={...p,nodes:nodes.slice(0,index+1)},right={...p,id:crypto.randomUUID(),name:`${p.name.slice(0,108)} (split)`,nodes:nodes.slice(index).map(n=>({...n,id:crypto.randomUUID()}))}
  if(p.route.kind==='river'){
    left.route={...p.route,...(p.route.appearance?{startWidth:routeWidth(p,0),startFactor:1,appearance:{...p.route.appearance,widthMode:'manual'}}:{}),endWidth:width,endFactor:1};right.route={...p.route,...(p.route.appearance?{endWidth:routeWidth(p,1),endFactor:1,appearance:{...p.route.appearance,widthMode:'manual'}}:{}),startWidth:width,startFactor:1}
  }
  return [validatePath(withPathGeometry(left)),validatePath(withPathGeometry(right))]
}

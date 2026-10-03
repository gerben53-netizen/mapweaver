import type { PathObject } from './models'
import { pathGeometry } from './paths'
import { seededRandom } from './seededRandom'
import { materialPixelsPerUnit, materialValues } from './continuousWallMaterial'
import { wallStyle } from './walls'

export interface FlowSegment { ax:number; ay:number; bx:number; by:number; dx:number; dy:number; length:number; u:number; arc:number; key:number; first:boolean; last:boolean }
export interface WallField { segments:FlowSegment[]; bins:Map<string,FlowSegment[]>; cell:number; width:number; wavelength:number; amplitude:number; seed:number; closed:boolean; cap:PathObject['cap'] }
const fields=new WeakMap<PathObject,WallField>()
export function stableKey(text:string){let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return value>>>0}
const smooth=(t:number)=>t*t*(3-2*t)
/** Coherent world-space field; neither viewport nor unrelated objects enter its seed. */
export function materialNoise(seed:number,x:number,y:number) {
  const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy)
  const at=(a:number,b:number)=>seededRandom(seed,a,b)*2-1
  return (at(ix,iy)*(1-u)+at(ix+1,iy)*u)*(1-v)+(at(ix,iy+1)*(1-u)+at(ix+1,iy+1)*u)*v
}
export function wallField(path:PathObject):WallField {
  const old=fields.get(path);if(old)return old
  const material=path.wall!.material!,definition=material.set.continuous!,style=wallStyle(path),pixels=materialPixelsPerUnit(style,definition.scale.unit)
  const width=path.strokeWidth,cell=Math.max(width*2,32),segments:FlowSegment[]=[],bins=new Map<string,FlowSegment[]>()
  const geometry=pathGeometry(path),local=new Map<number,number>();let arc=0
  for(let i=1;i<geometry.samples.length;i++){
    const a=geometry.samples[i-1].point,b=geometry.samples[i].point,index=geometry.samples[i].segment,length=Math.hypot(b.x-a.x,b.y-a.y)
    if(length<1e-8)continue
    const s:FlowSegment={ax:a.x,ay:a.y,bx:b.x,by:b.y,dx:(b.x-a.x)/length,dy:(b.y-a.y)/length,length,u:local.get(index)||0,arc,key:stableKey(path.nodes[index].id),first:i===1,last:i===geometry.samples.length-1}
    local.set(index,s.u+length);arc+=length;segments.push(s)
    const radius=width*1.6
    for(let y=Math.floor((Math.min(a.y,b.y)-radius)/cell);y<=Math.floor((Math.max(a.y,b.y)+radius)/cell);y++)for(let x=Math.floor((Math.min(a.x,b.x)-radius)/cell);x<=Math.floor((Math.max(a.x,b.x)+radius)/cell);x++){
      const key=`${x},${y}`,list=bins.get(key)||[];list.push(s);bins.set(key,list)
      if(bins.size>100000)throw Error('Continuous wall exceeds the spatial budget. Split this very large wall.')
    }
  }
  const result:WallField={segments,bins,cell,width,wavelength:Math.max(width*2,definition.scale.organicWavelength*pixels),amplitude:width*.18*materialValues(style).organic,seed:material.seed,closed:path.closed,cap:path.cap}
  fields.set(path,result);return result
}
export function wallFlow(field:WallField,x:number,y:number) {
  const candidates=field.bins.get(`${Math.floor(x/field.cell)},${Math.floor(y/field.cell)}`)||[]
  let best=Infinity,u=0,arc=0,v=0,key=0,tangentX=1,tangentY=0,atEnd=false
  for(const s of candidates){
    const projection=(x-s.ax)*s.dx+(y-s.ay)*s.dy,t=Math.max(0,Math.min(s.length,projection)),px=s.ax+s.dx*t,py=s.ay+s.dy*t,distance=Math.hypot(x-px,y-py)
    if(distance<best){best=distance;u=s.u+t;arc=s.arc+t;v=(x-px)*-s.dy+(y-py)*s.dx;key=s.key;tangentX=s.dx;tangentY=s.dy;atEnd=!field.closed&&((s.first&&projection<field.width*.5)||(s.last&&projection>s.length-field.width*.5))}
  }
  return {distance:best,u,arc,v,key,tangentX,tangentY,atEnd}
}
export function organicOffset(field:WallField,x:number,y:number) {
  return {x:materialNoise(field.seed,x/field.wavelength,y/field.wavelength)*field.amplitude,y:materialNoise(field.seed^0x173bc,x/field.wavelength,y/field.wavelength)*field.amplitude}
}

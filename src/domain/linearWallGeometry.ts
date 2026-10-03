import type { OpeningObject, PathObject } from './models'
import { generatedDefinition, generatedPixelsPerFoot } from './generatedWalls'
import type { GeneratedPlacement } from './generatedWallGeometry'
import { pathGeometry, pointAtDistance, sampleSegments } from './paths'
import { openingPlacement } from './openings'
import { outsideWall, wallWinding } from './wallAlignment'
import { wallStyle } from './walls'

function random(seed:number,index:number) {
 let x=(seed^Math.imul(index+1,0x9e3779b1))>>>0
 x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97)
 return ((x^(x>>>15))>>>0)/4294967296
}
export const linearRowCount=(widthFt:number)=>Math.max(1,Math.ceil(widthFt/.5))
const tables=new WeakMap<ReturnType<typeof pathGeometry>,{t:number;distance:number}[][]>()
/** Local arc-length lookup avoids repeated Bezier integration for every row/probe.
 * Canonical segment lengths and the shared bounded sampler remain authoritative. */
function arcTables(geometry:ReturnType<typeof pathGeometry>){
 let result=tables.get(geometry);if(result)return result
 const samples=sampleSegments(geometry.segments,.05)
 result=geometry.segments.map(s=>{
  const points=samples.filter(p=>p.segment===s.index),table=[{t:0,distance:0}];let distance=0
  for(let i=1;i<points.length;i++){distance+=Math.hypot(points[i].point.x-points[i-1].point.x,points[i].point.y-points[i-1].point.y);table.push({t:points[i].t,distance})}
  return table.map(p=>({...p,distance:distance?p.distance*s.length/distance:0}))
 });tables.set(geometry,result);return result
}
/** Ordered longitudinal members, shortened at curvature, with ordinary short join pieces.
 * Geometry is transient; the native wall remains the only persistent structural object. */
export function linearPlacements(path:PathObject,openings:OpeningObject[]=[]):GeneratedPlacement[] {
 const g=path.wall!.generated!,definition=generatedDefinition(g),geometry=pathGeometry(path)
 const width=path.strokeWidth,rows=linearRowCount(width/generatedPixelsPerFoot(wallStyle(path))),course=width/rows
 const result:GeneratedPlacement[]=[],short=definition.components.filter(c=>c.role==='beam-short')
 const lookup=arcTables(geometry),samples=new Map<string,{point:{x:number;y:number};tangent:{x:number;y:number}}>()
 const sample=(d:number)=>{
  const key=d.toFixed(6);const old=samples.get(key);if(old)return old
  d=Math.max(0,Math.min(geometry.length,d));const s=geometry.segments.find(s=>s.start+s.length>=d)||geometry.segments.at(-1)!,table=lookup[s.index],target=d-s.start
  let lo=0,hi=table.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(table[mid].distance<target)lo=mid;else hi=mid}
  const a=table[lo],b=table[hi],fraction=b.distance>a.distance?(target-a.distance)/(b.distance-a.distance):0,t=a.t+(b.t-a.t)*fraction
  const v=s.curve.derivative(t),n=Math.hypot(v.x,v.y),at=n?{point:s.curve.get(t),tangent:{x:v.x/n,y:v.y/n}}:pointAtDistance(path,d)
  samples.set(key,at);return at
 }
 const cuts=openings.map(o=>openingPlacement(o,path)).sort((a,b)=>a.start-b.start)
 const intervals:{start:number;end:number}[]=[];let start=0
 for(const c of cuts){if(c.start>start)intervals.push({start,end:c.start});start=Math.max(start,c.end)}
 if(start<geometry.length)intervals.push({start,end:geometry.length})
 const breaks=geometry.segments.slice(1).filter(s=>{
  const a=pointAtDistance(path,s.start-.01).tangent,b=pointAtDistance(path,s.start+.01).tangent
  return a.x*b.x+a.y*b.y<.95
 }).map(s=>s.start)
 const spans=intervals.flatMap(v=>{const points=[v.start,...breaks.filter(d=>d>v.start&&d<v.end),v.end];return points.slice(1).map((end,i)=>({start:points[i],end}))})
 const add=(p:GeneratedPlacement)=>{result.push(p);if(result.length>12000)throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')}
 const rowPoint=(distance:number,offset:number)=>{const at=sample(distance);return {x:at.point.x-at.tangent.y*offset,y:at.point.y+at.tangent.x*offset}}
 for(let row=0;row<rows;row++)for(let spanIndex=0;spanIndex<spans.length;spanIndex++){
  const span=spans[spanIndex],offset=(row+.5)*course-width/2-(outsideWall(path)?width*.5*wallWinding(path):0)
  let d=span.start,index=0,previous=''
  while(d<span.end-.001){
   const key=row*100003+spanIndex*1009+index*13,variation=g.variation!,wobble=(1-g.regularity!)*variation
   let candidates=definition.components.filter(c=>c.id!==previous)
   if(index===0&&row%2)candidates=candidates.filter(c=>c.role!=='beam-long')
   let roll=random(g.seed,key+Math.round(variation*997))*candidates.reduce((sum,c)=>sum+c.weight,0)
   let component=candidates.find(c=>(roll-=c.weight)<=0)||candidates.at(-1)!
   let length=Math.min(span.end-d,component.nominalLengthFt/component.nominalWidthFt*course)
   // Probe the complete member, not just its ends: an S bend can have equal end tangents.
   const tangent=sample(d+.001).tangent
   for(let t=Math.min(course*.25,length);t<length+.001;t+=course*.25){const b=sample(Math.min(span.end-.001,d+t)).tangent;if(tangent.x*b.x+tangent.y*b.y<Math.cos(.14)){length=Math.max(course*.25,t-course*.25);break}}
   const fitting=definition.components.filter(c=>c.nominalLengthFt/c.nominalWidthFt*course<=length*1.001)
   if(length<component.nominalLengthFt/component.nominalWidthFt*course-.001)component=fitting.sort((a,b)=>b.nominalLengthFt-a.nominalLengthFt)[0]||short[index%short.length]
   const nominal=component.nominalLengthFt/component.nominalWidthFt*course
   length=Math.min(length,nominal)
   // The outside row travels farther around a bend; shorten its path step rather than stretch stock.
   for(let i=0;i<3;i++){const inset=Math.min(.001,length*.1),a=rowPoint(d+inset,offset),b=rowPoint(d+length-inset,offset),chord=Math.hypot(b.x-a.x,b.y-a.y);if(chord<=nominal)break;length*=nominal/chord}
   const distance=d+length/2
   const inset=Math.min(.001,length*.1),a=rowPoint(d+inset,offset),b=rowPoint(d+length-inset,offset),at=sample(distance)
   const angle=Math.atan2(b.y-a.y,b.x-a.x),chord=Math.hypot(b.x-a.x,b.y-a.y)
   const lateral=(random(g.seed,key+2)-.5)*course*wobble*.025
   // Grain follows the member. At most half a degree of rustic joint skew, never a quarter-turn.
   const skew=(random(g.seed,key+3)-.5)*wobble*.015
   const overlap=course*.04,terminal=d===span.start||d+length>=span.end-.001
   add({component,x:(a.x+b.x)/2-at.tangent.y*lateral,y:(a.y+b.y)/2+at.tangent.x*lateral,width:chord+(terminal?0:overlap),height:course*1.12,angle:angle+skew,distance,run:row,sourceFraction:Math.min(1,chord/nominal)})
   // Short square join stock bridges rotating members without bending or stretching grain.
   if(d>span.start+course*.25){const join=rowPoint(d,offset),t=sample(d).tangent;add({component:short[(row+index)%short.length],...join,width:course*1.10,height:course*1.12,angle:Math.atan2(t.y,t.x),distance:d,run:row})}
   previous=component.id;d+=length;index++
  }
 }
 // Ordinary short stock rounds the outer join of sharp turns, including the closed seam.
 for(const distance of [...breaks,...(path.closed?[0]:[])]){
  if(cuts.some(c=>distance>=c.start-width&&distance<=c.end+width))continue
  const a=pointAtDistance(path,distance===0?geometry.length-.01:distance-.01),b=pointAtDistance(path,distance+.01)
  const turn=Math.atan2(a.tangent.x*b.tangent.y-a.tangent.y*b.tangent.x,a.tangent.x*b.tangent.x+a.tangent.y*b.tangent.y),at=b.point
  for(let row=0;row<rows;row++){
   const offset=(row+.5)*course-width/2-(outsideWall(path)?width*.5*wallWinding(path):0)
   const radius=Math.abs(offset),steps=Math.max(1,Math.ceil(Math.abs(turn)*radius/(course*.7))),angle0=Math.atan2(a.tangent.x*offset,-a.tangent.y*offset)
   for(let i=0;i<=steps;i++){const angle=angle0+turn*i/steps;add({component:short[(row+i)%short.length],x:at.x+Math.cos(angle)*radius,y:at.y+Math.sin(angle)*radius,width:course*1.04,height:course*1.12,angle:angle+Math.PI/2,distance,run:row})}
  }
 }
 return result
}

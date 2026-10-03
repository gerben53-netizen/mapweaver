import { masonryPlacements } from './masonryWallGeometry'
import type { PathObject,OpeningObject } from './models'
import { generatedDefinition,generatedPixelsPerFoot,type GeneratedComponent } from './generatedWalls'
import { pathGeometry,pointAtDistance } from './paths'
import { openingPlacement } from './openings'
import { wallStyle } from './walls'
import { outsideWall,wallWinding } from './wallAlignment'
export interface GeneratedPlacement {component:GeneratedComponent;x:number;y:number;width:number;height:number;angle:number;distance:number;run:number;sourceFraction?:number}
export const GENERATED_LIMITS={placements:12000,pixels:4194304,cachedPixels:16777216}
function random(seed:number,n:number){let x=(seed^Math.imul(n+1,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)/4294967296}
function noise(seed:number,d:number){const i=Math.floor(d),t=d-i,u=t*t*(3-2*t);return (random(seed,i)*(1-u)+random(seed,i+1)*u)*2-1}
export function rootRunCount(widthFt:number){return Math.max(2,Math.min(9,Math.round(1.5+widthFt*1.8)))}
export function generatedPlacements(path:PathObject,openings:OpeningObject[]=[]){
 if(generatedDefinition(path.wall!.generated!).generatorType==='masonry')return masonryPlacements(path,openings)
 const g=path.wall!.generated!,definition=generatedDefinition(g),geometry=pathGeometry(path),width=path.strokeWidth,runs=rootRunCount(width/generatedPixelsPerFoot(wallStyle(path))),result:GeneratedPlacement[]=[]
 const cuts=openings.map(o=>openingPlacement(o,path)).sort((a,b)=>a.start-b.start),intervals:{start:number;end:number}[]=[];let start=0
 for(const cut of cuts){if(cut.start>start)intervals.push({start,end:cut.start});start=cut.end}if(start<geometry.length)intervals.push({start,end:geometry.length})
 const flow=(seed:number,d:number,wavelength:number)=>path.closed&&!cuts.length?Math.sin(d/geometry.length*Math.PI*2*Math.max(1,Math.round(geometry.length/wavelength))+random(seed,0)*Math.PI*2):noise(seed,d/wavelength)
 const choose=(roles:GeneratedComponent['role'][],index:number,previous?:string)=>{let candidates=definition.components.filter(c=>roles.includes(c.role));if(candidates.length>1)candidates=candidates.filter(c=>c.id!==previous);if(!candidates.length)return undefined;let roll=random(g.seed,index)*candidates.reduce((n,c)=>n+c.weight,0);return candidates.find(c=>(roll-=c.weight)<=0)||candidates.at(-1)!}
 const add=(component:GeneratedComponent,distance:number,run:number,height:number,_index:number,interval:{start:number;end:number},end=false)=>{
  const at=pointAtDistance(path,distance),smooth=flow(g.seed+run*197,distance,Math.max(1,width*3)),spread=(run-(runs-1)/2)*width*.65/runs+smooth*g.organic*width*.14
  const offset=spread-(outsideWall(path)?width*.5*wallWinding(path):0),angle=Math.atan2(at.tangent.y,at.tangent.x)+flow(g.seed+run*31,distance,Math.max(1,width*4))*g.organic*.09
  const length=Math.min(width*2.8,height*component.nominalLengthFt/component.nominalWidthFt)*(1+flow(g.seed+run*17, distance,Math.max(1,width*5))*g.organic*.12)
  const available=path.closed&&!cuts.length?Infinity:2*Math.min(distance-interval.start,interval.end-distance),w=Math.max(.01,Math.min(length,available))
  result.push({component,x:at.point.x-at.tangent.y*offset,y:at.point.y+at.tangent.x*offset,width:w,height,angle:angle+(end?Math.PI:0),distance,run})
  if(result.length>GENERATED_LIMITS.placements)throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')
 }
 for(let run=0;run<runs;run++)for(const interval of intervals){
  const span=interval.end-interval.start,step=Math.max(1,width*.5*(1+noise(g.seed+run,interval.start/Math.max(1,width*4))*g.organic*.1)),count=Math.max(1,Math.ceil(span/step));if(count*runs>GENERATED_LIMITS.placements)throw Error('Generated wall exceeds component budget.')
  let previous=''
  for(let i=0;i<count;i++){const endpointInset=Math.min(span/2,width*(.8+random(g.seed,run+52)*.15)),d=path.closed&&!cuts.length?interval.start+span*(i+.5)/count:i===0?interval.start+endpointInset:i===count-1?interval.end-endpointInset:interval.start+span*(i+.5)/count,index=run*100003+i*13+Math.round(interval.start),end=!path.closed||cuts.length>0,role=end&&(i===0||i===count-1)&&definition.components.some(c=>c.role==='root-end')?['root-end' as const]:['root-long' as const,'root-medium' as const],c=choose(role,index,previous)!;previous=c.id;add(c,d,run,width*3.2/runs,index,interval,end&&i===0)}
 }
 for(const interval of intervals){let previousDetail='';const count=Math.ceil((interval.end-interval.start)/Math.max(1,width*.65));for(let i=0;i<count;i++){const d=interval.start+(interval.end-interval.start)*(i+.5)/count,index=900007+i+Math.round(interval.start),run=Math.floor(random(g.seed,index+8000)*runs)
  if(d-interval.start>width&&interval.end-d>width&&random(g.seed,index)<g.growth){const c=choose(['root-small','knot'],index+7000,previousDetail);if(c){previousDetail=c.id;add(c,d,run,width*(c.role==='knot'?.65:1),index,interval)}}
  if(random(g.seed,index+3000)<g.overgrowth){const c=choose(['moss','leaves'],index+4000);if(c)add(c,d,run,width*.7,index,interval)}
 }}
 // A small root knot joins abrupt changes in direction. Ordinary walls overlap naturally at T/crossings.
 for(const segment of geometry.segments.slice(1)){const d=segment.start,a=pointAtDistance(path,Math.max(0,d-.1)),b=pointAtDistance(path,d+.1);if(a.tangent.x*b.tangent.x+a.tangent.y*b.tangent.y>.8)continue;const interval=intervals.find(v=>d-width*.4>v.start&&d+width*.4<v.end);if(interval){const c=choose(['knot'],700000+segment.index)!;add(c,d,(runs-1)/2,width*1.15,segment.index,interval)}}
 return result
}
export function generatedVisualBounds(placements:GeneratedPlacement[]){let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;for(const p of placements){const w=(Math.abs(Math.cos(p.angle))*p.width+Math.abs(Math.sin(p.angle))*p.height)/2,h=(Math.abs(Math.sin(p.angle))*p.width+Math.abs(Math.cos(p.angle))*p.height)/2;x=Math.min(x,p.x-w);right=Math.max(right,p.x+w);y=Math.min(y,p.y-h);bottom=Math.max(bottom,p.y+h)}return placements.length?{x:Math.floor(x)-2,y:Math.floor(y)-2,width:Math.ceil(right)-Math.floor(x)+4,height:Math.ceil(bottom)-Math.floor(y)+4}:{x:0,y:0,width:1,height:1}}

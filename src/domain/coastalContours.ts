import type { MapDocument, MapObject } from './models'
import type { Point } from '../canvas/viewport'
import { waterGeometry, waterContains, waterArea } from './waterGeometry'
import { distanceField, finishNoise } from './geographyFinish'
import { riverMouths } from './waterDepth'
export const CONTOUR_PRESETS = {'world.painterlyFantasy':'Painterly Atlas','world.classicParchment':'Engraved','world.minimalPolitical':'Minimal','world.darkFantasy':'Dark Fantasy'} as const
export interface CoastalContours { version:1; enabled:boolean; preset:keyof typeof CONTOUR_PRESETS; count:number; spacing:number; opacity:number; variation:number; width:number; falloff:number; color:string; lakes:boolean }
export function contourPreset(id:string='world.painterlyFantasy',size=1600):CoastalContours {
 const preset=(Object.hasOwn(CONTOUR_PRESETS,id)?id:'world.painterlyFantasy') as CoastalContours['preset'],minimal=preset==='world.minimalPolitical',dark=preset==='world.darkFantasy',ink=preset==='world.classicParchment'
 return {version:1,enabled:true,preset,count:minimal?1:dark?2:3,spacing:Math.max(6,Math.min(100,size/160)),opacity:minimal?.25:.45,variation:ink?.08:.12,width:Math.max(.7,Math.min(4,size/1600)),falloff:.2,color:ink?'#665a43':dark?'#a1b3be':'#d7ddcd',lakes:!minimal}
}
export function validateCoastalContours(value:unknown):CoastalContours {
 const v=value as CoastalContours
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['version','enabled','preset','count','spacing','opacity','variation','width','falloff','color','lakes'].includes(k))||v.version!==1||typeof v.enabled!=='boolean'||typeof v.lakes!=='boolean'||!Object.hasOwn(CONTOUR_PRESETS,v.preset)||!/^#[0-9a-f]{6}$/i.test(v.color)||!Number.isInteger(v.count))throw Error('Invalid coastal contours.')
 for(const [n,min,max] of [[v.count,0,3],[v.spacing,2,500],[v.opacity,0,1],[v.variation,0,.3],[v.width,.25,8],[v.falloff,0,.8]])if(!Number.isFinite(n)||n<min||n>max)throw Error('Coastal contour value outside supported range.')
 return structuredClone(v)
}
// Four-connected components distinguish open ocean, lakes and island size.
function components(mask:Uint8Array,w:number,h:number,step:number){
 const ids=new Int32Array(mask.length).fill(-1),radii:number[]=[],edge:boolean[]=[],queue=new Int32Array(mask.length)
 for(let start=0;start<mask.length;start++)if(mask[start]&&ids[start]<0){const id=radii.length;let head=0,tail=1,touches=false;queue[0]=start;ids[start]=id
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(!x||!y||x===w-1||y===h-1)touches=true
   for(const j of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(j>=0&&mask[j]&&ids[j]<0){ids[j]=id;queue[tail++]=j}
  }radii.push(Math.sqrt(tail/Math.PI)*step);edge.push(touches)
 }return {ids,radii,edge}
}
export type ContourSegment = [Point,Point]
export function buildContours(map:Pick<MapDocument,'width'|'height'>,objects:MapObject[],settings:CoastalContours){
 const geometry=waterGeometry(map,objects),wet=waterContains(geometry),step=Math.max(1,Math.max(map.width,map.height)/768),w=Math.ceil(map.width/step)+1,h=Math.ceil(map.height/step)+1,land=new Uint8Array(w*h)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)land[y*w+x]=wet({x:Math.min(map.width-.001,x*step),y:Math.min(map.height-.001,y*step)})?0:1
 const islands=components(land,w,h,step),water=components(Uint8Array.from(land,v=>1-v),w,h,step),{distance,nearest}=distanceField(land,w,h),mouths=riverMouths(objects,wet)
 const field=Float32Array.from(distance,(d,i)=>nearest[i]<0?1e9:d*step/(1+settings.variation*(finishNoise((i%w)*step/100,Math.floor(i/w)*step/100)-.5)))
 const allowed=(p:Point,level:number)=>{
  const i=Math.min(h-1,Math.round(p.y/step))*w+Math.min(w-1,Math.round(p.x/step)),source=nearest[i],island=source<0?-1:islands.ids[source],lake=water.ids[i]
  if(island<0||!wet(p)||(!settings.lakes&&lake>=0&&!water.edge[lake]))return false
  if(!islands.edge[island]&&level>islands.radii[island]*.65)return false
  return !mouths.some(m=>{const dx=p.x-m.x,dy=p.y-m.y,along=dx*m.dx+dy*m.dy,across=Math.abs(dx*m.dy-dy*m.dx);return along>-m.width&&along<settings.spacing*(settings.count+1)&&across<m.width*.8+Math.max(0,along)*.3})
 }
 const lines:ContourSegment[][]=[]
 for(let n=1;n<=settings.count;n++){const level=n*settings.spacing,segments:ContourSegment[]=[]
  for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
   const ids=[y*w+x,y*w+x+1,(y+1)*w+x+1,(y+1)*w+x],ps=[{x:x*step,y:y*step},{x:(x+1)*step,y:y*step},{x:(x+1)*step,y:(y+1)*step},{x:x*step,y:(y+1)*step}],cross:Point[]=[]
   for(let e=0;e<4;e++){const a=ids[e],b=ids[(e+1)%4];if((field[a]<level)!==(field[b]<level)){const t=(level-field[a])/(field[b]-field[a]),p=ps[e],q=ps[(e+1)%4];cross.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t})}}
   // Ambiguous saddle cells are suppressed, never crossed through a narrow strait.
   if(cross.length===2&&allowed(cross[0],level)&&allowed(cross[1],level))segments.push([cross[0],cross[1]])
  }lines.push(segments)
 }return {geometry,lines,step}
}
const caches=new Map<string,ReturnType<typeof buildContours>>(),fingerprints=new WeakMap<MapObject,string>();let builds=0
export function contourGeometry(map:MapDocument,objects:MapObject[]){
 const relevant=objects.filter(o=>o.kind==='area'&&(o.land?.role==='landmass'||waterArea(o))||o.kind==='path'&&o.route?.kind==='river')
 const key=JSON.stringify([map.width,map.height,map.coastalContours,relevant.map(o=>{let key=fingerprints.get(o);if(!key){key=JSON.stringify(o);fingerprints.set(o,key)}return key})])
 let value=caches.get(key);if(!value){value=buildContours(map,relevant,map.coastalContours!);caches.set(key,value);builds++;while(caches.size>2)caches.delete(caches.keys().next().value!)}return value
}
export const contourCacheStats=()=>({builds,entries:caches.size})

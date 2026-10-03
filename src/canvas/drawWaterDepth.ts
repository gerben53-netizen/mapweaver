import type { MultiPolygon } from 'polygon-clipping'
import type { MapDocument, MapObject } from '../domain/models'
import { waterGeometry, waterContains } from '../domain/waterGeometry'
import { buildDepthField, depthColor, mixDepth, mouthInfluence, estuaryInfluence, riverMouths, WATER_DEPTH_LIMITS } from '../domain/waterDepth'
import { decodeMask, PAINT_SAMPLES, PAINT_STEP, type TerrainPaint } from '../domain/terrainPaint'
import { finishNoise } from '../domain/geographyFinish'
import { styleFingerprint } from '../domain/worldThemes'

let baseBuilds=0
const objectKeys=new WeakMap<MapObject,string>()
const caches=new Map<string,ReturnType<typeof makeBase>>()
let recent:{objects:MapObject[];config:string;width:number;height:number;entry:ReturnType<typeof makeBase>}|undefined
function trace(c:CanvasRenderingContext2D,geometry:MultiPolygon){c.beginPath();for(const p of geometry)for(const r of p){c.moveTo(r[0][0],r[0][1]);for(const v of r.slice(1))c.lineTo(v[0],v[1]);c.closePath()}}
function makeBase(map:MapDocument,objects:MapObject[]){
  baseBuilds++
  const geometry=waterGeometry(map,objects),contains=waterContains(geometry),mouths=riverMouths(objects,contains)
  const ratio=Math.min(.5,768/Math.max(map.width,map.height)),w=Math.max(2,Math.ceil(map.width*ratio)),h=Math.max(2,Math.ceil(map.height*ratio)),step=map.width/w
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
  const c=canvas.getContext('2d',{willReadFrequently:true})!;c.save();c.scale(w/map.width,h/map.height);trace(c,geometry);c.fill();c.restore()
  const pixels=c.getImageData(0,0,w,h).data,land=Uint8Array.from({length:w*h},(_,i)=>pixels[i*4+3]<128?1:0)
  const depth=buildDepthField(land,w,h,step,map.waterDepth!)
  for(const m of mouths){const r=m.radius*2;for(let y=Math.max(0,Math.floor((m.y-r)/step));y<Math.min(h,(m.y+r)/step);y++)for(let x=Math.max(0,Math.floor((m.x-r)/step));x<Math.min(w,(m.x+r)/step);x++){const i=y*w+x;if(!land[i])depth[i]*=1-map.waterDepth!.mouths*(map.waterDepth!.model==='bathymetry'?estuaryInfluence:mouthInfluence)({x:(x+.5)*step,y:(y+.5)*step},m)}}
  const grain=Float32Array.from({length:w*h},(_,i)=>{const mx=(i%w+.5)*step,my=(Math.floor(i/w)+.5)*step;return ((finishNoise(mx/27,my/27)-.5)*35+Math.sin(my*.3+Math.sin(mx*.04))*5)*map.waterDepth!.texture})
  const depthAt=(p:{x:number;y:number})=>{
    const fx=Math.max(0,Math.min(w-1,p.x/step-.5)),fy=Math.max(0,Math.min(h-1,p.y/step-.5)),x=Math.floor(fx),y=Math.floor(fy),u=fx-x,v=fy-y
    const at=(dx:number,dy:number)=>depth[Math.min(h-1,y+dy)*w+Math.min(w-1,x+dx)]
    return (at(0,0)*(1-u)+at(1,0)*u)*(1-v)+(at(0,1)*(1-u)+at(1,1)*u)*v
  }
  return {geometry,contains,mouths,depth,depthAt,grain,canvas,step,w,h,paint:undefined as TerrainPaint|undefined,rendered:false,mouthImages:new Map<string,HTMLCanvasElement>()}
}
export function waterDepthSurface(map:MapDocument,objects:MapObject[]){
  const settings=map.waterDepth!,{paint,...config}=settings,configKey=JSON.stringify(config)
  if(recent&&recent.objects===objects&&recent.width===map.width&&recent.height===map.height&&recent.config===configKey&&recent.entry.paint===paint&&recent.entry.rendered)return recent.entry
  const relevant=objects.filter(o=>o.kind==='area'&&o.land?.role!=='area'||o.kind==='path'&&o.route?.kind==='river')
  const key=[map.width,map.height,configKey,...relevant.map(o=>{let v=objectKeys.get(o);if(!v){v=styleFingerprint(o);objectKeys.set(o,v)}return v})].join('|')
  let entry=caches.get(key)
  if(!entry){entry=makeBase(map,relevant);caches.set(key,entry);while(caches.size>2){const id=caches.keys().next().value!,old=caches.get(id)!;old.canvas.width=0;old.mouthImages.forEach(c=>c.width=0);caches.delete(id)}}
  recent={objects,config:configKey,width:map.width,height:map.height,entry}
  if(entry.paint===paint&&entry.rendered)return entry
  const {canvas,w,h,step,depth}=entry,c=canvas.getContext('2d')!
  let left=0,top=0,right=w,bottom=h
  if(entry.rendered&&entry.paint?.visible===paint?.visible&&entry.paint?.opacity===paint?.opacity){
    const old=entry.paint?.tiles??{},next=paint?.tiles??{},changed=[...new Set([...Object.keys(old),...Object.keys(next)])].filter(k=>old[k]!==next[k]).map(k=>k.split(',').map(Number))
    if(!changed.length){entry.paint=paint;return entry}
    left=Math.max(0,Math.floor(Math.min(...changed.map(p=>p[0]))*128/step)-1);top=Math.max(0,Math.floor(Math.min(...changed.map(p=>p[1]))*128/step)-1)
    right=Math.min(w,Math.ceil((Math.max(...changed.map(p=>p[0]))+1)*128/step)+1);bottom=Math.min(h,Math.ceil((Math.max(...changed.map(p=>p[1]))+1)*128/step)+1)
  }
  if(right<=left||bottom<=top){entry.paint=paint;return entry}
  const pixels=c.createImageData(right-left,bottom-top)
  const masks=new Map(Object.entries(paint?.visible?paint.tiles:{}).map(([key,t])=>[key,{shallow:t.shallow_1?decodeMask(t.shallow_1):null,deep:t.ocean_1?decodeMask(t.ocean_1):null}]))
  const colors=Array.from({length:256},(_,i)=>depthColor(i/255,settings)),tileSize=PAINT_SAMPLES*PAINT_STEP
  const xKeys=Array.from({length:w},(_,x)=>Math.floor((x+.5)*step/tileSize)),xs=Array.from({length:w},(_,x)=>Math.floor((x+.5)*step/PAINT_STEP)%PAINT_SAMPLES)
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const i=y*w+x,k=((y-top)*(right-left)+x-left)*4,my=(y+.5)*step,t=masks.get(xKeys[x]+','+Math.floor(my/tileSize)),index=(Math.floor(my/PAINT_STEP)%PAINT_SAMPLES)*PAINT_SAMPLES+xs[x]
    const d=mixDepth(depth[i],(t?.shallow?.[index]??0)*(paint?.opacity??1),(t?.deep?.[index]??0)*(paint?.opacity??1)),color=colors[Math.max(0,Math.min(255,Math.round(d*255)))]
    for(let j=0;j<3;j++)pixels.data[k+j]=color[j]+entry.grain[i]*(settings.model==='bathymetry'?.4+.6*d:1)
    pixels.data[k+3]=255
  }
  c.putImageData(pixels,left,top);entry.paint=paint;entry.rendered=true
  entry.mouthImages.forEach(c=>c.width=0);entry.mouthImages.clear()
  return entry
}
export function paintWaterDepth(c:CanvasRenderingContext2D,map:MapDocument,objects:MapObject[]){
  if(!map.waterDepth?.enabled)return
  const surface=waterDepthSurface(map,objects)
  c.save();trace(c,surface.geometry);c.clip();c.imageSmoothingEnabled=true;c.drawImage(surface.canvas,0,0,map.width,map.height);if(map.waterDepth.model==='bathymetry'&&map.waterDepth.coastEdge){trace(c,surface.geometry);c.strokeStyle=map.waterDepth.shallow;c.globalAlpha*=.25;c.lineWidth=1.5;c.stroke()}c.restore()
}
/** Fade only the water-side end of a river into the receiving depth surface. */
export function paintWaterMouth(c:CanvasRenderingContext2D,map:MapDocument,objects:MapObject[],id:string){
  if(!map.waterDepth?.enabled||!map.waterDepth.mouths)return
  const s=waterDepthSurface(map,objects),m=s.mouths.find(v=>v.id===id);if(!m)return
  const r=Math.max(6,Math.min(WATER_DEPTH_LIMITS.mouthPatchRadius,m.width*2))
  let image=s.mouthImages.get(id)
  if(!image){image=document.createElement('canvas');image.width=image.height=Math.ceil(r*2);const ctx=image.getContext('2d')!;ctx.drawImage(s.canvas,(m.x-r)/map.width*s.w,(m.y-r)/map.height*s.h,r*2/map.width*s.w,r*2/map.height*s.h,0,0,image.width,image.height);ctx.globalCompositeOperation='destination-in';const refined=map.waterDepth.model==='bathymetry',g=refined?ctx.createLinearGradient(r-m.dx*m.width,r-m.dy*m.width,r,r):ctx.createRadialGradient(r,r,0,r,r,r);if(refined){g.addColorStop(0,'#00000000');g.addColorStop(1,'#000000ff')}else{g.addColorStop(0,'#000000ff');g.addColorStop(.3,'#000000ff');g.addColorStop(.65,'#00000088');g.addColorStop(1,'#00000000')}ctx.fillStyle=g;ctx.fillRect(0,0,image.width,image.height);s.mouthImages.set(id,image);while(s.mouthImages.size>WATER_DEPTH_LIMITS.cachedMouths){const first=s.mouthImages.keys().next().value!;s.mouthImages.get(first)!.width=0;s.mouthImages.delete(first)}}
  c.save();trace(c,s.geometry);c.clip();c.globalAlpha*=Math.min(1,map.waterDepth.mouths*2);c.drawImage(image,m.x-r,m.y-r,r*2,r*2);c.restore()
}
export const waterDepthCacheStats=()=>({baseBuilds,entries:caches.size,pixels:[...caches.values()].reduce((n,s)=>n+s.w*s.h+[...s.mouthImages.values()].reduce((n,c)=>n+c.width*c.height,0),0)})

import type { AreaObject, MapDocument, MapObject } from '../domain/models'
import { coastDepth, distanceField, finishNoise, reliefLight } from '../domain/geographyFinish'
import { WATER_STYLES } from '../domain/terrainStyles'
import { terrainField } from '../world/generate'
import { styleFingerprint } from '../domain/worldThemes'

const fingerprints = new WeakMap<AreaObject,string>()
const cache = new Map<string,{ocean:HTMLCanvasElement;relief:HTMLCanvasElement}>()
export const geographyFinishCacheStats = () => ({entries:cache.size,pixels:[...cache.values()].reduce((n,v)=>n+v.ocean.width*v.ocean.height+v.relief.width*v.relief.height,0)})
function trace(c:CanvasRenderingContext2D,o:AreaObject) {
  c.beginPath()
  for(const p of o.geometry.polygons)for(const ring of [p.outer,...p.holes]){c.moveTo(ring[0].x,ring[0].y);for(const v of ring.slice(1))c.lineTo(v.x,v.y);c.closePath()}
}
function transformed(c:CanvasRenderingContext2D,o:AreaObject,paint:()=>void) {
  c.save();c.translate(o.x+o.width/2,o.y+o.height/2);c.rotate(o.rotation*Math.PI/180);c.scale(o.scaleX,o.scaleY);c.translate(-o.x-o.width/2,-o.y-o.height/2);paint();c.restore()
}
function surfaces(map:MapDocument,objects:MapObject[]) {
  const finish=map.geographyFinish!,areas=objects.filter((o):o is AreaObject=>o.kind==='area'&&!!o.land&&o.land.role!=='area'&&o.fill.kind!=='none'&&o.opacity>0)
  const key=[map.width,map.height,JSON.stringify(finish),map.water?.style??'deep',JSON.stringify(map.generation?.parameters),map.generation?.generatorVersion,...areas.map(o=>{let f=fingerprints.get(o);if(!f){f=styleFingerprint([o.geometry,o.land,o.x,o.y,o.width,o.height,o.rotation,o.scaleX,o.scaleY]);fingerprints.set(o,f)}return f})].join('|')
  const old=cache.get(key);if(old){cache.delete(key);cache.set(key,old);return old}
  const ratio=Math.min(1/3,768/Math.max(map.width,map.height)),width=Math.max(2,Math.ceil(map.width*ratio)),height=Math.max(2,Math.ceil(map.height*ratio)),n=width*height
  const mask=document.createElement('canvas');mask.width=width;mask.height=height
  const c=mask.getContext('2d',{willReadFrequently:true})!;c.scale(width/map.width,height/map.height)
  for(const o of areas.filter(o=>o.land?.role==='landmass'))transformed(c,o,()=>{trace(c,o);c.fillStyle='#404040';c.fill()})
  const land=Uint8Array.from(c.getImageData(0,0,width,height).data.filter((_,i)=>i%4===3),v=>v>127?1:0)
  // Semantic uplands provide relief even after manual land/terrain edits.
  const levels:Record<string,number>={rocky:220,volcanic:235,snow:235,tundra:135,forest:85,desert:80,swamp:45,shallow:0,ocean:0}
  for(const o of areas.filter(o=>o.land?.role==='terrain-region'))transformed(c,o,()=>{trace(c,o);const h=levels[o.land?.appearance?.style??'']??(o.land?.terrain==='mountains'?220:70);c.fillStyle=`rgb(${h},${h},${h})`;c.fill()})
  const rgba=c.getImageData(0,0,width,height).data,semantic=Float32Array.from({length:n},(_,i)=>rgba[i*4]/255),water=Uint8Array.from(land,v=>v?0:1)
  const offshore=distanceField(land,width,height),inland=distanceField(water,width,height)
  const field=map.generation?terrainField(map.generation.parameters,map.generation.generatorVersion):undefined
  let h=Float32Array.from({length:n},(_,i)=>{
    if(!land[i])return 0
    const x=i%width/(width-1),y=Math.floor(i/width)/(height-1),noise=finishNoise(x*53,y*53)*.045
    const fx=x*((field?.cols??2)-1),fy=y*((field?.rows??2)-1),ix=Math.floor(fx),iy=Math.floor(fy),u=fx-ix,v=fy-iy
    const sample=(dx:number,dy:number)=>field?field.height[Math.min(field.rows-1,iy+dy)*field.cols+Math.min(field.cols-1,ix+dx)]:0
    const generated=field?Math.max(0,(sample(0,0)*(1-u)+sample(1,0)*u)*(1-v)+(sample(0,1)*(1-u)+sample(1,1)*u)*v-map.generation!.parameters.water):0
    return (semantic[i]*(field?.06:.22)+generated*1.8+noise*.3)*Math.min(1,inland.distance[i]/9)
  })
  // Bounded diffusion softens samples, not semantic geometry.
  for(let pass=0;pass<3+Math.round(finish.relief.softness*9)+(field?0:12);pass++){
    const next=h.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;next[i]=(h[i]*4+h[i-1]+h[i+1]+h[i-width]+h[i+width])/8}h=next
  }
  const ocean=document.createElement('canvas'),relief=document.createElement('canvas');ocean.width=relief.width=width;ocean.height=relief.height=height
  const oc=ocean.getContext('2d')!,rc=relief.getContext('2d')!,od=oc.createImageData(width,height),rd=rc.createImageData(width,height)
  const preset=WATER_STYLES[map.water?.style??'deep'],rgb=(hex:string)=>[1,3,5].map(v=>parseInt(hex.slice(v,v+2),16)),deep=rgb(preset.deep),shallow=rgb(preset.shallow)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,k=i*4,mx=x*map.width/width,my=y*map.height/height
    if(!land[i]&&offshore.nearest[i]>=0&&(finish.ocean!=='off'||finish.coast!=='off')){
      const high=Math.max(0,(semantic[offshore.nearest[i]]-.3)/.7),d=coastDepth(offshore.distance[i],mx,my,high,width*.012)
      const mix=finish.ocean==='off'?0:Math.min(.95,d.shallow*.62+d.offshore*.19)
      const variation=(finishNoise(mx/190,my/190)-.5)*(finish.ocean==='deep'?22:7)
      for(let j=0;j<3;j++)od.data[k+j]=Math.max(0,Math.min(255,deep[j]*(1-mix)+shallow[j]*mix+variation))
      od.data[k+3]=finish.ocean==='off'?0:255
      if(finish.coast!=='off'){
        const alpha=Math.min(.8,d.near*.2+d.shore*(.5-high*.3)),sand=finish.coast==='ink'?[160,143,110]:[208-high*80,210-high*70,174-high*40]
        for(let j=0;j<3;j++)od.data[k+j]=od.data[k+j]*(1-alpha)+sand[j]*alpha
        od.data[k+3]=finish.ocean==='off'?Math.round(alpha*255):255
      }
    }
    if(land[i]&&finish.relief.enabled&&x&&y&&x<width-1&&y<height-1){
      const light=reliefLight((h[i+1]-h[i-1])*9,(h[i+width]-h[i-width])*9,finish.relief.light,finish.relief.strength,finish.relief.contrast)
      const color=light>0?[250,240,198]:[37,45,38]
      for(let j=0;j<3;j++)rd.data[k+j]=color[j]
      rd.data[k+3]=Math.round(Math.abs(light)*255*Math.min(1,inland.distance[i]/2))
    }
  }
  oc.putImageData(od,0,0);rc.putImageData(rd,0,0);mask.width=mask.height=0
  const result={ocean,relief};cache.set(key,result)
  // At most two maps / four bounded rasters. Dispose backing stores on eviction.
  while(cache.size>2){const first=cache.keys().next().value!,v=cache.get(first)!;v.ocean.width=v.ocean.height=v.relief.width=v.relief.height=0;cache.delete(first)}
  return result
}
export function paintGeographyFinish(c:CanvasRenderingContext2D,map:MapDocument,objects:MapObject[],pass:'ocean'|'relief') {
  const f=map.geographyFinish;if(!f||(pass==='relief'&&(!f.relief.enabled||!f.relief.strength))||(pass==='ocean'&&f.ocean==='off'&&f.coast==='off'))return
  const image=surfaces(map,objects)[pass]
  c.save();c.globalAlpha=1;c.imageSmoothingEnabled=true;c.drawImage(image,0,0,map.width,map.height);c.restore()
}

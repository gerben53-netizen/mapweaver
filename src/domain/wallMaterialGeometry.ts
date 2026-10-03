import { seededRandom as random } from './seededRandom'
import type { PathObject } from './models'
import { pathGeometry } from './paths'
import type { PackedArt } from './wallSets'
import { WALL_SET_LIMITS } from './wallSets'
export interface MaterialPiece { art: PackedArt; x: number; y: number; angle: number; scale: number; sourceX: number; sourceWidth: number; anchorX: number; lateral: number; quad?:{x:number;y:number}[] }
const cache = new WeakMap<PathObject, MaterialPiece[]>()
export function materialWarning(path:PathObject) {
  if(!path.wall?.material)return ''
  if(path.wall.material.set.continuous)return path.width>2048||path.height>2048||path.width*path.height>1048576?'This large wall uses a bounded raster surface. Split it into shorter walls for maximum detail.':''
  const samples=pathGeometry(path).samples.map(s=>s.point)
  for(let i=1;i<samples.length-1;i++){
    const a=samples[i-1],b=samples[i],c=samples[i+1],u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y},al=Math.hypot(u.x,u.y),bl=Math.hypot(v.x,v.y)
    if(al<1e-8||bl<1e-8)continue
    const angle=Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(al*bl))))
    if(angle>2.2||angle>.01&&Math.min(al,bl)/angle<path.strokeWidth*.4)return 'This bend is tight for the material thickness. Artwork can overlap; reduce thickness or widen the bend.'
  }
  return pathGeometry(path).length<path.strokeWidth?'This wall is shorter than its thickness; end pieces dominate its appearance.':''
}
/** Bounded arc table shared by both rendering targets; no viewport inputs. */
export function materialPieces(path: PathObject): MaterialPiece[] {
  const old = cache.get(path); if (old) return old
  const material = path.wall?.material; if (!material || material.set.continuous) return []
  const set = material.set, scale = path.strokeWidth / set.nominalWidthPx
  const samples = pathGeometry(path).samples.map(s => s.point), table = [{ point:samples[0],distance:0 }]
  for (const p of samples.slice(1)) { const a=table.at(-1)!; const d=Math.hypot(p.x-a.point.x,p.y-a.point.y); if(d>1e-8)table.push({point:p,distance:a.distance+d}) }
  const length = table.at(-1)!.distance
  const at = (distance:number) => {
    const d=Math.max(0,Math.min(length,distance));let lo=1,hi=table.length-1
    while(lo<hi){const mid=(lo+hi)>>>1;if(table[mid].distance<d)lo=mid+1;else hi=mid}
    const a=table[Math.max(0,lo-1)],b=table[lo]||a,span=b.distance-a.distance,t=span?(d-a.distance)/span:0
    return {x:a.point.x+(b.point.x-a.point.x)*t,y:a.point.y+(b.point.y-a.point.y)*t,angle:Math.atan2(b.point.y-a.point.y,b.point.x-a.point.x)}
  }
  const pieces:MaterialPiece[]=[], totalWeight=set.bodyVariants.reduce((n,a)=>n+a.weight,0)
  const variant=(index:number)=>{let weight=random(material.seed,index,0)*totalWeight;return set.bodyVariants.find(a=>(weight-=a.weight)<=0)||set.bodyVariants[0]}
  const add=(art:PackedArt,distance:number,index:number,sourceX=0,sourceWidth=art.width,anchorX=art.anchor.x,angle?:number)=>{
    if(pieces.length>=WALL_SET_LIMITS.pieces)throw new Error('Wall material exceeds 4096 render parts. Shorten the wall or increase thickness.')
    const p=at(distance), rough=material.roughness
    pieces.push({art,x:p.x,y:p.y,angle:angle??p.angle+(random(material.seed,index,1)-.5)*2*art.rotation*Math.PI/180*rough,
      scale:scale*(1+(random(material.seed,index,2)-.5)*2*art.scaleVariation*rough),sourceX,sourceWidth,anchorX,
      lateral:(random(material.seed,index,3)-.5)*set.roughnessLimits.maxProtrusionPx*rough*.3})
  }
  if(set.renderingMode==='segments') {
    const spacing=(set.repeatLengthPx-set.overlapPx)*scale,count=Math.max(1,Math.ceil(length/spacing))
    if(count+path.nodes.length+2>WALL_SET_LIMITS.pieces)throw new Error('Wall material exceeds 4096 render parts. Increase thickness.')
    for(let i=0;i<count;i++)add(variant(i), Math.min(length,(i+.5)*spacing),i)
  } else {
    // Sliced strips bend on arc length. Fractional last slices retain source scale.
    const step=Math.min(set.repeatLengthPx/8,set.nominalWidthPx/4)*scale,count=Math.ceil(length/step)
    if(count+path.nodes.length+2>WALL_SET_LIMITS.pieces)throw new Error('Wall material exceeds 4096 render parts. Increase thickness.')
    const cornerKeys=new Set(path.nodes.filter(n=>n.mode==='corner').map(n=>`${n.x},${n.y}`))
    const corners=table.filter(p=>cornerKeys.has(`${p.point.x},${p.point.y}`)).map(p=>p.distance)
    let d=0,index=0,corner=0
    while(d<length-1e-7){
      while(corner<corners.length&&corners[corner]<=d+1e-7)corner++
      const tile=Math.floor((d+1e-7)/(set.repeatLengthPx*scale)),phase=d/scale-tile*set.repeatLengthPx
      const art=variant(tile),width=Math.min(step/scale,set.repeatLengthPx-phase,(length-d)/scale,((corners[corner]??length)-d)/scale)
      add(art,d,index++,Math.max(0,phase),Math.max(.01,width),0)
      // A hard node terminates both strips; a material patch joins them. Never twist a
      // single quad between the incoming and outgoing directions of an acute corner.
      const epsilon=Math.min(1e-6,width*scale*.01),a=at(d+epsilon),b=at(d+width*scale-epsilon)
      const edge=(p:typeof a,y:number)=>({x:p.x-Math.sin(p.angle)*y*scale,y:p.y+Math.cos(p.angle)*y*scale})
      pieces.at(-1)!.quad=[edge(a,-art.anchor.y),edge(b,-art.anchor.y),edge(b,art.height-art.anchor.y),edge(a,art.height-art.anchor.y)]
      d+=width*scale
    }
  }
  // Material patches are bounded artwork, not unbounded miter extensions.
  const patch=set.join||set.cap||set.bodyVariants[0]
  for(let i=path.closed?0:1;i<path.nodes.length-(path.closed?0:1);i++){
    const n=path.nodes[i];if(n.mode==='smooth')continue
    const s=pathGeometry(path).segments[i];add(patch,s?.start||0,10000+i,0,patch.width,patch.anchor.x)
  }
  if(!path.closed){const cap=set.cap||set.bodyVariants[0];add(cap,0,20000,0,cap.width,cap.anchor.x,at(0).angle+Math.PI);add(cap,length,20001,0,cap.width,cap.anchor.x,at(length).angle)}
  cache.set(path,pieces);return pieces
}

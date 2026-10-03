import polygonClipping from 'polygon-clipping'
import type { MultiPolygon } from 'polygon-clipping'
import type { AreaGeometry, AreaObject, MapObject, PathObject } from './models'
import type { Point } from '../canvas/viewport'
import { pathGeometry } from './paths'
import { normalizeGeometry, signedArea, createArea, withGeometry, validateArea } from './areas'

export const ROOM_LIMITS={walls:256,segments:2048,pairs:2100000,diagnostics:256,rooms:128,points:512,timeoutMs:1500} as const
const EPS=1e-6, key=(p:Point)=>`${Math.round(p.x/EPS)},${Math.round(p.y/EPS)}`
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x, sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y})
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)
export interface RoomCandidate { id:string; geometry:AreaGeometry; wallIds:string[]; fingerprint:string; seed:Point; overlaps:string[] }
export interface RoomDetection { rooms:RoomCandidate[]; gaps:Point[]; crossings:Point[]; segmentCount:number }
export function insideRing(p:Point,ring:Point[]) {
  let inside=false
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j]
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside
  }
  return inside
}
export function roomContains(room:RoomCandidate,p:Point){return room.geometry.polygons.some(poly=>insideRing(p,poly.outer)&&!poly.holes.some(h=>insideRing(p,h)))}
function fingerprint(walls:PathObject[]) { let hash=2166136261;for(const c of JSON.stringify(walls.map(w=>[w.id,w.nodes,w.closed]))){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16) }
const clipping=(g:AreaGeometry):MultiPolygon=>g.polygons.map(p=>[p.outer,...p.holes].map(r=>[...r,r[0]].map(v=>[v.x,v.y])))
export function detectRooms(objects:MapObject[]):RoomDetection {
  const walls=objects.filter((o):o is PathObject=>o.kind==='path'&&o.pathKind==='wall').sort((a,b)=>a.id.localeCompare(b.id))
  if(walls.length>ROOM_LIMITS.walls)throw new Error('Room detection supports at most 256 visible walls. Hide unrelated layers first.')
  const segments:{a:Point;b:Point;wall:string;cuts:number[]}[]=[]
  for(const wall of walls){const samples=pathGeometry(wall).samples;for(let i=1;i<samples.length;i++){const a=samples[i-1].point,b=samples[i].point;if(distance(a,b)>EPS)segments.push({a,b,wall:wall.id,cuts:[0,1]});if(segments.length>ROOM_LIMITS.segments)throw new Error('Room detection exceeds 2,048 segments. Simplify curves or hide unrelated walls.')}}
  const crossings:Point[]=[],gaps:Point[]=[];let pairs=0
  const crossing=(p:Point)=>{if(crossings.length>=ROOM_LIMITS.diagnostics)throw new Error('Room detection exceeds 256 crossing diagnostics. Isolate and repair a smaller wall network.');crossings.push(p)}
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
    if(++pairs>ROOM_LIMITS.pairs)throw new Error('Room intersection budget exceeded.')
    const a=segments[i],b=segments[j],r=sub(a.b,a.a),s=sub(b.b,b.a),v=sub(b.a,a.a),den=cross(r,s)
    if(Math.abs(den)>EPS){const t=cross(v,s)/den,u=cross(v,r)/den;if(t < -EPS || t > 1+EPS || u < -EPS || u > 1+EPS)continue
      const p={x:a.a.x+t*r.x,y:a.a.y+t*r.y}, interiorT=t>EPS&&t<1-EPS, interiorU=u>EPS&&u<1-EPS
      if(interiorT&&interiorU){crossing(p);continue}
      a.cuts.push(Math.max(0,Math.min(1,t)));b.cuts.push(Math.max(0,Math.min(1,u)))
    }else if(Math.abs(cross(v,r))<EPS){
      const length=r.x*r.x+r.y*r.y,t0=(v.x*r.x+v.y*r.y)/length,v1=sub(b.b,a.a),t1=(v1.x*r.x+v1.y*r.y)/length
      const low=Math.max(0,Math.min(t0,t1)),high=Math.min(1,Math.max(t0,t1))
      if(high-low>EPS)crossing({x:a.a.x+(low+high)/2*r.x,y:a.a.y+(low+high)/2*r.y})
    }
  }
  if(crossings.length)return {rooms:[],gaps,crossings,segmentCount:segments.length}
  const points=new Map<string,Point>(),adj=new Map<string,Set<string>>(),edges=new Map<string,Set<string>>()
  const edgeKey=(a:string,b:string)=>a<b?`${a}|${b}`:`${b}|${a}`
  for(const segment of segments){const cuts=[...new Set(segment.cuts)].sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){
    const point=(t:number)=>({x:segment.a.x+(segment.b.x-segment.a.x)*t,y:segment.a.y+(segment.b.y-segment.a.y)*t}),a=point(cuts[i-1]),b=point(cuts[i]),ka=key(a),kb=key(b)
    if(ka===kb)continue;points.set(ka,a);points.set(kb,b)
    for(const [x,y] of [[ka,kb],[kb,ka]]){const neighbors=adj.get(x)||new Set();neighbors.add(y);adj.set(x,neighbors)}
    const ek=edgeKey(ka,kb),ids=edges.get(ek)||new Set();ids.add(segment.wall);edges.set(ek,ids)
  }}
  for(const [id,neighbors] of adj)if(neighbors.size===1)gaps.push(points.get(id)!)
  // Remove open branches before face walking. They remain explicitly marked as gaps.
  const queue=[...adj].filter(([,n])=>n.size<2).map(([k])=>k)
  for(let i=0;i<queue.length;i++){const id=queue[i],neighbors=adj.get(id);if(!neighbors)continue;for(const n of neighbors){adj.get(n)?.delete(id);if(adj.get(n)?.size===1)queue.push(n)}adj.delete(id)}
  const sorted=new Map([...adj].map(([id,neighbors])=>{const p=points.get(id)!;return [id,[...neighbors].sort((a,b)=>Math.atan2(points.get(a)!.y-p.y,points.get(a)!.x-p.x)-Math.atan2(points.get(b)!.y-p.y,points.get(b)!.x-p.x))] as const}))
  const visited=new Set<string>(),faces:{ring:Point[];wallIds:string[]}[]=[]
  for(const [start,neighbors] of sorted)for(const next of neighbors){
    if(visited.has(`${start}>${next}`))continue
    const ring:Point[]=[],ids=new Set<string>();let a=start,b=next,closed=false
    for(let count=0;count<=segments.length*4;count++){
      const directed=`${a}>${b}`;if(visited.has(directed)){closed=a===start&&b===next;break}visited.add(directed);ring.push(points.get(a)!);edges.get(edgeKey(a,b))?.forEach(id=>ids.add(id))
      const list=sorted.get(b)!;const c=list[(list.indexOf(a)-1+list.length)%list.length];a=b;b=c
    }
    if(closed&&ring.length>=3&&signedArea(ring)>EPS){if(ring.length>ROOM_LIMITS.points)throw new Error('A room exceeds 512 boundary points. Simplify its walls.');faces.push({ring,wallIds:[...ids].sort()})}
    if(faces.length>ROOM_LIMITS.rooms)throw new Error('Room detection exceeds 128 rooms. Hide unrelated layers.')
  }
  const rooms:RoomCandidate[]=faces.map((face,index)=>{
    const contained=faces.filter(other=>other!==face&&insideRing(other.ring[0],face.ring)&&other.ring.every(p=>insideRing(p,face.ring)))
    const children=contained.filter(child=>!contained.some(parent=>parent!==child&&insideRing(child.ring[0],parent.ring)))
    const geometry=normalizeGeometry({polygons:[{outer:face.ring,holes:children.map(c=>c.ring)}]})
    const a=face.ring[0],b=face.ring[1],d=distance(a,b),seed={x:(a.x+b.x)/2-(b.y-a.y)/d*.01,y:(a.y+b.y)/2+(b.x-a.x)/d*.01}
    const wallIds=[...new Set([...face.wallIds,...children.flatMap(c=>c.wallIds)])].sort()
    const overlaps=objects.filter((o):o is AreaObject=>o.kind==='area'&&o.fill.kind!=='none').filter(o=>polygonClipping.intersection(clipping(o.geometry),clipping(geometry)).length>0).map(o=>o.id)
    return {id:`room-${index+1}`,geometry,wallIds,seed,fingerprint:fingerprint(walls.filter(w=>wallIds.includes(w.id))),overlaps}
  })
  return {rooms,gaps,crossings,segmentCount:segments.length}
}
export function roomFloor(room:RoomCandidate,existing?:AreaObject):AreaObject {
  const source={wallIds:room.wallIds,fingerprint:room.fingerprint,seed:room.seed}
  return validateArea(existing?{...withGeometry(existing,room.geometry),roomSource:source}:{...createArea(room.geometry,{kind:'solid',color:'#b3a78e'}),name:'Room floor',roomSource:source})
}

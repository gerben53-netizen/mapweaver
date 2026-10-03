import type { Point } from '../canvas/viewport'
import type { PathObject } from './models'
import { pathGeometry } from './paths'
import { WALL_LIMITS } from './walls'
export interface RibbonStrip { a:Point; b:Point; length:number; distance:number; polygon:Point[]; coverage?:Point[] }
export interface WallRibbon { polygons:Point[][]; circles:{point:Point;radius:number}[]; strips:RibbonStrip[] }
const cache=new WeakMap<PathObject,WallRibbon>()
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x
/** Bounded adaptive contour, shared by editor and export. All contours have positive winding. */
export function wallRibbon(path:PathObject):WallRibbon {
  const cached=cache.get(path);if(cached)return cached
  const radius=path.strokeWidth/2, geometry=pathGeometry(path), points:Point[]=[]
  for(const s of geometry.samples)if(!points.length||Math.hypot(s.point.x-points.at(-1)!.x,s.point.y-points.at(-1)!.y)>1e-8)points.push(s.point)
  const strips:RibbonStrip[]=[],polygons:Point[][]=[],circles:WallRibbon['circles']=[]
  const polygon=(p:Point[])=>{const area=p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a.x*b.y-a.y*b.x},0);polygons.push(area<0?[...p].reverse():p)}
  let distance=0
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y),u={x:(b.x-a.x)/length,y:(b.y-a.y)/length},n={x:-u.y*radius,y:u.x*radius}
    const start=!path.closed&&i===1&&path.cap==='square'?radius:0,end=!path.closed&&i===points.length-1&&path.cap==='square'?radius:0
    const poly=[{x:a.x-u.x*start+n.x,y:a.y-u.y*start+n.y},{x:a.x-u.x*start-n.x,y:a.y-u.y*start-n.y},{x:b.x+u.x*end-n.x,y:b.y+u.y*end-n.y},{x:b.x+u.x*end+n.x,y:b.y+u.y*end+n.y}]
    polygon(poly);strips.push({a,b,length,distance,polygon:poly});distance+=length
  }
  for(let i=path.closed?0:1;i<strips.length;i++){
    const previous=strips[(i-1+strips.length)%strips.length],next=strips[i],p=next.a
    const u={x:(previous.b.x-previous.a.x)/previous.length,y:(previous.b.y-previous.a.y)/previous.length},v={x:(next.b.x-next.a.x)/next.length,y:(next.b.y-next.a.y)/next.length},turn=cross(u,v)
    if(Math.abs(turn)<1e-9){if(u.x*v.x+u.y*v.y<0&&path.join==='round')circles.push({point:p,radius});continue}
    // Curved subdivision vertices use round continuity; real corner nodes honor the chosen join.
    const realCorner=path.nodes.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<1e-7&&n.mode==='corner')
    if(path.join==='round'||!realCorner){circles.push({point:p,radius});continue}
    const side=turn>0?-1:1,a={x:p.x-u.y*radius*side,y:p.y+u.x*radius*side},b={x:p.x-v.y*radius*side,y:p.y+v.x*radius*side}
    const t=cross({x:b.x-a.x,y:b.y-a.y},v)/turn,m={x:a.x+t*u.x,y:a.y+t*u.y}
    polygon(path.join==='miter'&&Math.hypot(m.x-p.x,m.y-p.y)<=radius*WALL_LIMITS.miter?[p,a,m,b]:[p,a,b])
  }
  if(!path.closed&&path.cap==='round')for(const point of [points[0],points.at(-1)!])circles.push({point,radius})
  const tangent=(s:RibbonStrip)=>({x:(s.b.x-s.a.x)/s.length,y:(s.b.y-s.a.y)/s.length})
  const edge=(point:Point,previous:RibbonStrip|undefined,next:RibbonStrip|undefined)=>{
    const u=tangent(previous||next!),v=tangent(next||previous!),denominator=1+u.x*v.x+u.y*v.y
    const offset=denominator>1e-6?{x:-(u.y+v.y)*radius/denominator,y:(u.x+v.x)*radius/denominator}:{x:-v.y*radius,y:v.x*radius}
    const extent=Math.hypot(offset.x,offset.y),limit=radius*8
    if(extent>limit){offset.x*=limit/extent;offset.y*=limit/extent}
    const extension=!previous?-radius:!next?radius:0
    return [{x:point.x+v.x*extension+offset.x,y:point.y+v.y*extension+offset.y},{x:point.x+v.x*extension-offset.x,y:point.y+v.y*extension-offset.y}]
  }
  for(let i=0;i<strips.length;i++){
    const strip=strips[i],a=edge(strip.a,strips[i-1]||(path.closed?strips.at(-1):undefined),strip),b=edge(strip.b,strip,strips[i+1]||(path.closed?strips[0]:undefined))
    strip.coverage=[a[0],a[1],b[1],b[0]]
  }
  const result={polygons,circles,strips};cache.set(path,result);return result
}

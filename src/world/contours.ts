import type { Point } from '../canvas/viewport'
import type { AreaGeometry } from '../domain/models'
import { normalizeGeometry, signedArea, simplify } from '../domain/areas'
// Triangulated marching contours: each edge intersection is shared by its two cells.
export function contours(values:number[],cols:number,rows:number,width:number,height:number){
 const edgeKeys=new WeakMap<Point,string>(),links=new Map<string,{a:Point;b:Point}>(),key=(p:Point)=>edgeKeys.get(p)!
 const point=(i:number):Point=>({x:i%cols*width/(cols-1),y:Math.floor(i/cols)*height/(rows-1)})
 const tri=(indices:number[])=>{
  const crossings:Point[]=[]
  for(let k=0;k<3;k++){const i=indices[k],j=indices[(k+1)%3],a=values[i]===0?-1e-7:values[i],b=values[j]===0?-1e-7:values[j];if((a>0)===(b>0))continue;const p=point(i),q=point(j),t=a/(a-b);const cross={x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t};edgeKeys.set(cross,`${Math.min(i,j)}-${Math.max(i,j)}`);crossings.push(cross)}
  if(crossings.length!==2)return
  let [a,b]=crossings;const inside=point(indices.find(i=>values[i]>0)!)
  if((b.x-a.x)*(inside.y-a.y)-(b.y-a.y)*(inside.x-a.x)<0)[a,b]=[b,a]
  links.set(key(a),{a,b})
 }
 for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const i=y*cols+x;tri([i,i+1,i+cols+1]);tri([i,i+cols+1,i+cols])}
 const rings:Point[][]=[]
 while(links.size){const start=links.keys().next().value!,ring:Point[]=[];let cursor=start
  for(let limit=0;limit<cols*rows*4;limit++){const edge=links.get(cursor);if(!edge)break;ring.push(edge.a);links.delete(cursor);cursor=key(edge.b);if(cursor===start)break}
  if(cursor===start&&ring.length>=3)rings.push(ring)
 }
 const inside=(p:Point,r:Point[])=>{let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if((r[i].y>p.y)!==(r[j].y>p.y)&&p.x<(r[j].x-r[i].x)*(p.y-r[i].y)/(r[j].y-r[i].y)+r[i].x)yes=!yes;return yes}
 const outers=rings.filter(r=>signedArea(r)>0).sort((a,b)=>signedArea(b)-signedArea(a)),holes=rings.filter(r=>signedArea(r)<0)
 const minimum=width*height/(cols*rows)*3,geometries:AreaGeometry[]=[];let discarded=0
 for(const outer of outers){if(signedArea(outer)<minimum){discarded++;continue}
  const nested=holes.filter(h=>inside(h[0],outer)&&!outers.some(o=>o!==outer&&signedArea(o)<signedArea(outer)&&inside(h[0],o)))
  if(nested.length>16){discarded++;continue}
  const tolerance=Math.max(width/(cols-1),height/(rows-1))*.35
  const reduce=(r:Point[],amount:number)=>{const smooth=r.map((p,i)=>{const a=r[(i+r.length-1)%r.length],b=r[(i+1)%r.length];return {x:p.x*.7+(a.x+b.x)*.15,y:p.y*.7+(a.y+b.y)*.15}});return simplify([...smooth,smooth[0]],amount).slice(0,-1)}
  let valid:AreaGeometry|undefined
  // Conservative validation: invalid simplification falls back to a finer contour.
  for(const factor of [1,.35,0])try{const shape={polygons:[{outer:factor?reduce(outer,tolerance*factor):outer,holes:nested.map(r=>factor?reduce(r,tolerance*factor):r)}]};valid=normalizeGeometry(shape);break}catch{/* Try a finer boundary, never admit invalid topology. */}
  if(valid)geometries.push(valid);else discarded++
 }
 return {geometries,discarded}
}

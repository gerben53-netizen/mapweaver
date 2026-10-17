import { validateTerrainAppearance } from './terrainStyles'
import type { AreaGeometry,AreaObject,MapObject } from './models'
import { allRings,normalizeGeometry,simplify } from './areas'
import { seededRandom } from './seededRandom'
export type AreaRole = 'area' | 'landmass' | 'terrain-region'
export type TerrainType = 'forest' | 'mountains' | 'desert' | 'swamp' | 'snow' | 'custom'
export interface LandArea {labelKind?:'region'|'waterMajor'|'waterMinor'|'mountainRange';appearance?: import('./terrainStyles').TerrainAppearance;role:AreaRole;terrain:TerrainType;coastline:{seed:number;roughness:number;step:number}}
export const LAND_LIMITS={objects:256,nodes:10000,coastSamples:4096} as const
export const defaultLandArea=(role:AreaRole='area'):LandArea=>({role,terrain:'custom',coastline:{seed:1,roughness:0,step:12}})
export function validateLandArea(v:LandArea):LandArea {
  const c=v?.coastline
  if(!v||Object.keys(v).some(k=>!['labelKind','role','terrain','coastline','appearance'].includes(k))||!['area','landmass','terrain-region'].includes(v.role)||!['forest','mountains','desert','swamp','snow','custom'].includes(v.terrain)||!c||Object.keys(c).some(k=>!['seed','roughness','step'].includes(k))||!Number.isInteger(c.seed)||c.seed<0||c.seed>0xffffffff||!Number.isFinite(c.roughness)||c.roughness<0||c.roughness>40||!Number.isFinite(c.step)||c.step<2||c.step>200)throw Error('Invalid Area role or coastline settings.')
  if(v.labelKind!==undefined&&!['region','waterMajor','waterMinor','mountainRange'].includes(v.labelKind))throw Error('Invalid semantic label category.')
  if(v.appearance!==undefined)validateTerrainAppearance(v.appearance)
  return structuredClone(v)
}
export function landBudget(objects:MapObject[]) {
  const areas=objects.filter((o):o is AreaObject=>o.kind==='area'&&!!o.land&&o.land.role!=='area')
  if(areas.length>LAND_LIMITS.objects||areas.reduce((n,o)=>n+allRings(o.geometry).reduce((n,r)=>n+r.length,0),0)>LAND_LIMITS.nodes)throw Error('Land maps allow 256 land/terrain Areas and 10,000 combined nodes. Simplify first.')
}
export function editContour(g:AreaGeometry,mode:'simplify'|'smooth',amount:number):AreaGeometry {
  if(!Number.isFinite(amount)||amount<=0||amount>50)throw Error('Contour amount must be greater than 0 and at most 50.')
  const ring=(r:AreaGeometry['polygons'][number]['outer'])=>mode==='simplify'?simplify([...r,r[0]],amount).slice(0,-1):smoothContourPoints(r,r.map(()=>amount/100))
  return normalizeGeometry({polygons:g.polygons.map(p=>({outer:ring(p.outer),holes:p.holes.map(ring)}))})
}
/** Shared Laplacian step; weights can pin individual vertices or limit an edit to a segment. */
export function smoothContourPoints(r:AreaGeometry['polygons'][number]['outer'],weights:number[]) {
  return r.map((p,i)=>{const a=r[(i+r.length-1)%r.length],b=r[(i+1)%r.length],w=weights[i]??0;return w===0?p:{x:p.x*(1-2*w)+(a.x+b.x)*w,y:p.y*(1-2*w)+(a.y+b.y)*w}})
}
const cache=new WeakMap<AreaObject,AreaGeometry>()
// Render-only displacement. Canonical topology, fill, selection and clipping are unchanged.
export function coastlineGeometry(o:AreaObject):AreaGeometry {
  if(o.land?.role!=='landmass'||!o.land.coastline.roughness)return o.geometry
  const prior=cache.get(o);if(prior)return prior
  const {seed,roughness,step}=o.land.coastline,rings=allRings(o.geometry)
  const perimeter=rings.reduce((n,r)=>n+r.reduce((s,p,i)=>s+Math.hypot(p.x-r[(i+1)%r.length].x,p.y-r[(i+1)%r.length].y),0),0)
  const actual=Math.max(step,perimeter/Math.max(1,LAND_LIMITS.coastSamples-rings.reduce((n,r)=>n+r.length,0)))
  let index=0
  const displaced=rings.map(r=>r.flatMap((a,i)=>{const b=r[(i+1)%r.length],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),count=Math.max(1,Math.ceil(d/actual));return Array.from({length:count},(_,j)=>{const t=j/count,offset=j===0?0:(seededRandom(seed,index++,0)*2-1)*roughness;return{x:a.x+dx*t-dy/d*offset,y:a.y+dy*t+dx/d*offset}})}))
  let ri=0;const result={polygons:o.geometry.polygons.map(p=>({outer:displaced[ri++],holes:p.holes.map(()=>displaced[ri++])}))};cache.set(o,result);return result
}

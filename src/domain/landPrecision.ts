import clipping, { type MultiPolygon } from 'polygon-clipping'
import type { AreaGeometry, AreaObject } from './models'
import { allRings, closestPoint, distance, normalizeGeometry, signedArea, withGeometry } from './areas'
import { smoothContourPoints } from './landAreas'

export interface ContourRange { ring:number; start:number; end:number; protectedPoints:number[]; amount:number }
export function contourIndices(length:number,start:number,end:number) {
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<0||start>=length||end>=length||start===end)throw Error('Choose two different contour endpoints.')
  return Array.from({length:(end-start+length)%length+1},(_,i)=>(start+i)%length)
}
const multi=(g:AreaGeometry):MultiPolygon=>g.polygons.map(p=>[p.outer,...p.holes].map(r=>r.map(p=>[p.x,p.y])))
const surface=(m:MultiPolygon)=>m.reduce((n,p)=>n+p.reduce((s,r,i)=>s+(i?-1:1)*Math.abs(signedArea(r.map(([x,y])=>({x,y})))),0),0)

/** No simplification, resampling or index changes. Only the selected original vertices can move. */
export function precisionSmooth(object:AreaObject,range:ContourRange,others:AreaObject[]=[]):AreaObject {
  if(object.land?.role!=='landmass')throw Error('Select a landmass first.')
  const rings=allRings(object.geometry),ring=rings[range.ring]
  if(!Number.isInteger(range.ring)||!ring)throw Error('Choose a valid contour ring.')
  if(!Number.isFinite(range.amount)||range.amount<=0||range.amount>50)throw Error('Smoothing strength must be between 1 and 50.')
  if(range.protectedPoints.some(i=>!Number.isInteger(i)||i<0||i>=ring.length))throw Error('The protected points changed. Select the contour again.')
  const indices=contourIndices(ring.length,range.start,range.end)
  if(indices.length<7)throw Error('Select at least seven points so the endpoints can stay stable.')
  const weights=ring.map(()=>0),pinned=new Set(range.protectedPoints)
  // Keep both endpoint tangents and the immediate neighbours of landmarks unchanged.
  for(const i of range.protectedPoints){pinned.add((i+1)%ring.length);pinned.add((i+ring.length-1)%ring.length)}
  indices.forEach((i,k)=>{if(k>1&&k<indices.length-2&&!pinned.has(i))weights[i]=Math.min(1,(k-1)/3,(indices.length-2-k)/3)})
  if(!weights.some(Boolean))throw Error('The protected points leave no editable interior. Select a wider segment.')
  // Conservatively bound motion by clearance to nonlocal shores, including holes.
  const clearance=ring.map((p,i)=>{
    let d=Infinity
    rings.forEach((r,ri)=>r.forEach((a,j)=>{
      if(ri===range.ring&&[j,(j+1)%r.length].some(k=>Math.min((k-i+r.length)%r.length,(i-k+r.length)%r.length)<=2))return
      d=Math.min(d,distance(p,closestPoint(p,a,r[(j+1)%r.length])))
    }))
    return d*.2
  })
  let next=ring
  for(const factor of [.5,-.53,.5,-.53]){
    // The shared step weights each neighbour; the brush algorithm weights their average.
    const proposed=smoothContourPoints(next,weights.map(w=>w*factor*range.amount/100))
    next=proposed.map((p,i)=>{
      if(!weights[i])return ring[i]
      const delta=distance(p,ring[i]),limit=clearance[i]
      return delta>limit?{x:ring[i].x+(p.x-ring[i].x)*limit/delta,y:ring[i].y+(p.y-ring[i].y)*limit/delta}:p
    })
  }
  const geometry=structuredClone(object.geometry)
  allRings(geometry)[range.ring].splice(0,ring.length,...next)
  const validated=normalizeGeometry(geometry)
  // Never silently remove a duplicate point, reverse a ring or change indexing.
  if(JSON.stringify(validated)!==JSON.stringify(geometry))throw Error('This adjustment would collapse or reorder contour points. Use a smaller range or strength.')
  const beforeArea=surface(multi(object.geometry)),afterArea=surface(multi(geometry))
  if(Math.abs(afterArea-beforeArea)>beforeArea*.03)throw Error('Smoothing would change more than 3% of the land. Use a smaller range or strength.')
  for(const other of others){
    if(other.id===object.id)continue
    const oldOverlap=clipping.intersection(multi(object.geometry),multi(other.geometry))
    const newOverlap=clipping.intersection(multi(geometry),multi(other.geometry))
    if(surface(clipping.difference(newOverlap,oldOverlap))>1e-7)throw Error('This adjustment would overlap another landmass. Protect the shore or reduce the strength.')
  }
  if(JSON.stringify(next)===JSON.stringify(ring))throw Error('This segment has no movable curvature. Select a wider or more curved segment.')
  return withGeometry(object,geometry)
}

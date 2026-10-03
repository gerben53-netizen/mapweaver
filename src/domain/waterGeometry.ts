import clipping, { type MultiPolygon } from 'polygon-clipping'
import type { MapObject, AreaObject } from './models'
import type { Point, Size } from '../canvas/viewport'
export const waterArea=(o:MapObject)=>o.kind==='area'&&o.land?.role==='terrain-region'&&['ocean','shallow'].includes(o.land.appearance?.style??'')
export function transformedWaterGeometry(o:AreaObject):MultiPolygon {
  const cx=o.x+o.width/2,cy=o.y+o.height/2,a=o.rotation*Math.PI/180
  return o.geometry.polygons.map(p=>[p.outer,...p.holes].map(r=>r.map(p=>{const x=(p.x-cx)*o.scaleX,y=(p.y-cy)*o.scaleY;return [cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)]})))
}
export function waterGeometry(map:Size,objects:MapObject[]):MultiPolygon {
  const areas=objects.filter((o):o is AreaObject=>o.kind==='area'&&o.opacity>0&&o.fill.kind!=='none')
  const lands=areas.filter(o=>o.land?.role==='landmass').map(transformedWaterGeometry),lakes=areas.filter(waterArea).map(transformedWaterGeometry)
  const rectangle:MultiPolygon=[[[[0,0],[map.width,0],[map.width,map.height],[0,map.height],[0,0]]]]
  let land:MultiPolygon=lands.length?clipping.union(lands[0],...lands.slice(1)):[]
  if(land.length&&lakes.length)land=clipping.difference(land,...lakes)
  return land.length?clipping.difference(rectangle,land):rectangle
}
function inRing(p:Point,ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
export function waterContains(geometry:MultiPolygon){
  const shapes=geometry.map(rings=>({rings,minX:Math.min(...rings[0].map(p=>p[0])),maxX:Math.max(...rings[0].map(p=>p[0])),minY:Math.min(...rings[0].map(p=>p[1])),maxY:Math.max(...rings[0].map(p=>p[1]))}))
  return(p:Point)=>shapes.some(s=>p.x>=s.minX&&p.x<=s.maxX&&p.y>=s.minY&&p.y<=s.maxY&&inRing(p,s.rings[0])&&!s.rings.slice(1).some(r=>inRing(p,r)))
}

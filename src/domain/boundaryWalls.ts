import type { AreaObject } from './models'
import { createWall } from './walls'
import type { WallStyle } from './walls'
export function boundaryWalls(area:AreaObject,style:WallStyle,outer:boolean,holes:boolean) {
  const rings=area.geometry.polygons.flatMap(p=>[...(outer?[p.outer]:[]),...(holes?p.holes:[])])
  if(!rings.length||rings.length>100)throw new Error('Choose 1–100 contours.')
  return rings.map((ring,i)=>({...createWall(ring.map(p=>({...p,id:crypto.randomUUID(),mode:'corner'})),true,style),name:`${area.name.slice(0,85)} boundary ${i+1}`}))
}

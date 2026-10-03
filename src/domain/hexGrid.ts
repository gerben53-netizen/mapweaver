import type { Point, Size } from '../canvas/viewport'
import type { GridSettings } from './models'
export type GridType='square'|'hex-flat'|'hex-pointy'
export type HexOrientation='flat'|'pointy'
export interface Hex {q:number;r:number}
export const isHexGrid=(grid:GridSettings)=>grid.type==='hex-flat'||grid.type==='hex-pointy'
export const hexOrientation=(grid:GridSettings):HexOrientation=>grid.type==='hex-pointy'?'pointy':'flat'
const SQRT3=Math.sqrt(3)
export function hexToPixel(h:Hex,grid:GridSettings):Point{
  const r=grid.cellSize/2
  return grid.type==='hex-pointy'?{x:grid.offsetX+SQRT3*r*(h.q+h.r/2),y:grid.offsetY+1.5*r*h.r}:{x:grid.offsetX+1.5*r*h.q,y:grid.offsetY+SQRT3*r*(h.r+h.q/2)}
}
export const hexCenter=hexToPixel
export function pixelToHex(p:Point,grid:GridSettings):Hex{
  const x=(p.x-grid.offsetX)/(grid.cellSize/2),y=(p.y-grid.offsetY)/(grid.cellSize/2)
  const q=grid.type==='hex-pointy'?SQRT3*x/3-y/3:2*x/3,r=grid.type==='hex-pointy'?2*y/3:-x/3+SQRT3*y/3,s=-q-r
  let qi=Math.round(q),ri=Math.round(r);const si=Math.round(s),dq=Math.abs(qi-q),dr=Math.abs(ri-r),ds=Math.abs(si-s)
  if(dq>dr&&dq>ds)qi=-ri-si;else if(dr>ds)ri=-qi-si
  return{q:qi===0?0:qi,r:ri===0?0:ri}
}
export function hexNeighbors(h:Hex):Hex[]{return [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([q,r])=>({q:h.q+q,r:h.r+r}))}
export function hexCorners(center:Point,diameter:number,orientation:HexOrientation,rotation=0):Point[]{
  const angle=((orientation==='pointy'?30:0)+rotation)*Math.PI/180
  return Array.from({length:6},(_,i)=>({x:center.x+diameter/2*Math.cos(angle+i*Math.PI/3),y:center.y+diameter/2*Math.sin(angle+i*Math.PI/3)}))
}
/** Integer lattice coefficients give neighboring cells bit-identical shared vertices. */
export function hexCellCorners(h:Hex,g:GridSettings):Point[]{
  const r=g.cellSize/2
  return (g.type==='hex-pointy'?[[1,1],[0,2],[-1,1],[-1,-1],[0,-2],[1,-1]].map(([x,y])=>({x:g.offsetX+(2*h.q+h.r+x)*SQRT3*r/2,y:g.offsetY+(3*h.r+y)*r/2})): [[2,0],[1,1],[-1,1],[-2,0],[-1,-1],[1,-1]].map(([x,y])=>({x:g.offsetX+(3*h.q+x)*r/2,y:g.offsetY+(2*h.r+h.q+y)*SQRT3*r/2})))
}
export const MAX_HEX_CELLS=40000
export function hexGridRange(size:Size,g:GridSettings){
  const points=[{x:-g.cellSize,y:-g.cellSize},{x:size.width+g.cellSize,y:-g.cellSize},{x:0,y:size.height+g.cellSize},{x:size.width+g.cellSize,y:size.height+g.cellSize}].map(p=>pixelToHex(p,g))
  const q0=Math.min(...points.map(p=>p.q))-2,q1=Math.max(...points.map(p=>p.q))+2,r0=Math.min(...points.map(p=>p.r))-2,r1=Math.max(...points.map(p=>p.r))+2
  return{q0,q1,r0,r1,count:(q1-q0+1)*(r1-r0+1)}
}
/** Unique edges, bounded work; no overview grid that implies different cell boundaries. */
export function hexGridEdges(size:Size,g:GridSettings):[Point,Point][]{
  const range=hexGridRange(size,g);if(range.count>MAX_HEX_CELLS)throw Error('Hex grid is too dense. Increase its diameter or export without the grid.')
  const edges:[Point,Point][]=[]
  for(let q=range.q0;q<=range.q1;q++)for(let r=range.r0;r<=range.r1;r++){
    const c=hexCellCorners({q,r},g)
    // Three consistently oriented edges per cell; neighbors provide the other three.
    for(let i=0;i<3;i++){const a=c[i],b=c[i+1];if(Math.max(a.x,b.x)>=0&&Math.min(a.x,b.x)<=size.width&&Math.max(a.y,b.y)>=0&&Math.min(a.y,b.y)<=size.height)edges.push([a,b])}
  }
  return edges
}

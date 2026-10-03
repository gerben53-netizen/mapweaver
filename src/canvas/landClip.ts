import type { AreaObject } from '../domain/models'
/** Native normalized outer/hole winding produces the union without an extra persisted mask. */
export function traceLandClip(ctx:CanvasRenderingContext2D,lands:AreaObject[]){
 ctx.beginPath()
 for(const land of lands)for(const polygon of land.geometry.polygons)for(const ring of [polygon.outer,...polygon.holes]){
  ctx.moveTo(ring[0].x,ring[0].y);for(const p of ring.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath()
 }
 // An empty path clips everything when no land remains.
}

import type { Shape } from 'konva/lib/Shape'
// Scene, hit and filter canvases together stay below approximately 48 MiB.
const MAX_PIXELS=4_000_000, entries=new Map<Shape,number>()
export function clearMaterialCache(shape:Shape) { if(entries.delete(shape))shape.clearCache() }
export function cacheMaterial(shape:Shape,width:number,height:number,zoomBucket:number) {
  clearMaterialCache(shape)
  const ratio=Math.min(zoomBucket,Math.sqrt(250_000/Math.max(1,width*height))),pixels=Math.ceil(width*ratio)*Math.ceil(height*ratio)
  let total=[...entries.values()].reduce((n,v)=>n+v,0)
  for(const [old,size] of entries){if(total+pixels<=MAX_PIXELS)break;clearMaterialCache(old);total-=size}
  shape.cache({x:0,y:0,width,height,pixelRatio:ratio,hitCanvasPixelRatio:ratio});entries.set(shape,pixels)
}
export function materialVisible(bounds:{x:number;y:number;width:number;height:number},viewport:{zoom:number;pan:{x:number;y:number}},size:{width:number;height:number}) {
  return bounds.x*viewport.zoom+viewport.pan.x<=size.width && (bounds.x+bounds.width)*viewport.zoom+viewport.pan.x>=0 && bounds.y*viewport.zoom+viewport.pan.y<=size.height && (bounds.y+bounds.height)*viewport.zoom+viewport.pan.y>=0
}

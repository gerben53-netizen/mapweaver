import { paintGeneratedWall } from './drawGeneratedWall'
import { paintContinuousWall } from './drawContinuousWall'
import type { WallConnection } from '../domain/walls'
import { paintWallMaterial } from './drawWallMaterial'
import { outsideWall, wallPaintPath } from '../domain/wallAlignment'
import type { OpeningObject, PathObject } from '../domain/models'
import { clipWallOpenings } from './drawOpening'
import { wallRibbon } from '../domain/wallGeometry'
import { pathTrace } from './drawPath'
const contours=new WeakMap<PathObject,Path2D>()
function contour(path:PathObject) {
  let result=contours.get(path);if(result)return result
  result=new Path2D();const ribbon=wallRibbon(path)
  for(const polygon of ribbon.polygons){result.moveTo(polygon[0].x-path.x,polygon[0].y-path.y);for(const p of polygon.slice(1))result.lineTo(p.x-path.x,p.y-path.y);result.closePath()}
  for(const {point,radius} of ribbon.circles){result.moveTo(point.x-path.x+radius,point.y-path.y);result.arc(point.x-path.x,point.y-path.y,radius,0,Math.PI*2);result.closePath()}
  contours.set(path,result);return result
}
/** Nominal outside band; the inner clip follows the exact cubic boundary. */
export function clipOutsideWall(c:CanvasRenderingContext2D,path:PathObject,boundOuter=true) {
  if(!outsideWall(path))return
  pathTrace(c,path,path.x,path.y)
  const margin=path.strokeWidth*4+512
  c.rect(-margin,-margin,path.width+margin*2,path.height+margin*2)
  c.clip('evenodd')
  if(boundOuter)c.clip(contour(wallPaintPath(path)))
}
export function paintWall(c:CanvasRenderingContext2D,path:PathObject,image?:CanvasImageSource,connections:WallConnection[] = [],openings:OpeningObject[] = [],preview=false) {
  c.save()
  try {
    if(path.wall?.renderingMode==='generated'){c.globalAlpha*=path.opacity;paintGeneratedWall(c,path,openings,preview);return}
    if(path.wall?.material?.set.continuous&&image){if(outsideWall(path))clipOutsideWall(c,path,false);clipWallOpenings(c,path,openings);c.globalAlpha*=path.opacity;paintContinuousWall(c,path,image,connections,undefined,openings,preview);return}
    if(outsideWall(path)) {
      const paint=wallPaintPath(path)
      const outline=path.wall!.outline,edge=outline.enabled?Math.min(outline.width,path.strokeWidth/2):0
      // Solid strokes already have exact native joins; a sampled outer clip can nick curve extrema.
      clipOutsideWall(c,path,path.stroke.kind==='texture'||!!path.wall?.material||edge>0)
      clipWallOpenings(c,path,openings)
      // Both outlines stay inside the physical band, so neither consumes usable floor space.
      if(edge>0){c.save();c.globalAlpha*=path.opacity*outline.opacity;c.fillStyle=outline.color;c.fillRect(-path.strokeWidth*4-512,-path.strokeWidth*4-512,path.width+path.strokeWidth*8+1024,path.height+path.strokeWidth*8+1024);c.restore()}
      c.save()
      if(edge>0)c.clip(contour({...paint,strokeWidth:paint.strokeWidth-2*edge}))
      if(path.wall?.material&&image){c.save();c.globalAlpha*=path.opacity;c.lineWidth=paint.strokeWidth;c.lineJoin=path.join;c.miterLimit=2;c.strokeStyle=path.wall.material.set.coreColor;pathTrace(c,path,path.x,path.y);c.stroke();c.restore()}
      paintWall(c,edge>0?{...paint,wall:{...paint.wall!,outline:{...outline,enabled:false}}}:paint,image,[],[])
      c.restore()
      if(edge>0){c.save();c.globalAlpha*=path.opacity*outline.opacity;c.lineWidth=2*edge;c.strokeStyle=outline.color;pathTrace(c,path,path.x,path.y);c.stroke();c.restore()}
      return
    }
    clipWallOpenings(c,path,openings)
    c.globalAlpha*=path.opacity;c.lineCap=path.cap;c.lineJoin=path.join;c.miterLimit=2
    const disks=(radius:number,color:string)=>{c.fillStyle=color;c.beginPath();for(const p of connections){c.moveTo(p.x-path.x+radius,p.y-path.y);c.arc(p.x-path.x,p.y-path.y,radius,0,Math.PI*2)}c.fill()}
    if(path.wall?.material && image){paintWallMaterial(c,path,image,connections);return}
    const outline=path.wall!.outline
    if(outline.enabled&&outline.width>0){c.save();c.globalAlpha*=outline.opacity;c.lineWidth=path.strokeWidth+2*outline.width;c.strokeStyle=outline.color;pathTrace(c,path,path.x,path.y);c.stroke();disks(path.strokeWidth/2+outline.width,outline.color);c.restore()}
    if(path.stroke.kind!=='texture'||!image){c.lineWidth=path.strokeWidth;c.strokeStyle=path.stroke.kind==='texture'?'#d15a88':path.stroke.color;if(path.stroke.kind==='texture')c.setLineDash([8,4]);pathTrace(c,path,path.x,path.y);c.stroke();disks(path.strokeWidth/2,String(c.strokeStyle));return}
    const pattern=c.createPattern(image,'repeat');if(!pattern)return
    const height='height' in image?Number(image.height):path.strokeWidth
    const scale=path.strokeWidth/Math.max(1,height)*path.stroke.scale, flip=path.wall!.flip?-1:1
    const clip=new Path2D(contour(path));for(const p of connections){clip.moveTo(p.x-path.x+path.strokeWidth/2,p.y-path.y);clip.arc(p.x-path.x,p.y-path.y,path.strokeWidth/2,0,Math.PI*2)}c.clip(clip)
    // A bounded tangent patch at each adaptive chord covers joins as well as the centerline.
    // Phase uses cumulative centerline distance, so zoom and width do not reset repetition.
    const ribbon=wallRibbon(path),r=path.strokeWidth
    for(const strip of ribbon.strips){
      const dx=(strip.b.x-strip.a.x)/strip.length,dy=(strip.b.y-strip.a.y)/strip.length
      c.save()
      c.beginPath();const coverage=strip.coverage!;c.moveTo(coverage[0].x-path.x,coverage[0].y-path.y);for(const p of coverage.slice(1))c.lineTo(p.x-path.x,p.y-path.y);c.closePath();c.clip()
      c.translate(strip.a.x-path.x,strip.a.y-path.y);c.rotate(Math.atan2(dy,dx))
      pattern.setTransform(new DOMMatrix([scale,0,0,scale*flip,-strip.distance+path.stroke.offset,-path.strokeWidth/2]))
      c.fillStyle=pattern;c.fillRect(-r,-r,strip.length+2*r,2*r);c.restore()
    }
  } finally {c.restore()}
}


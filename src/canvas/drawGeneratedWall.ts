import type { GeneratedWall } from '../domain/generatedWalls'
import { generatedDefinition } from '../domain/generatedWalls'
import type { PathObject,OpeningObject } from '../domain/models'
import { generatedPlacements,generatedVisualBounds,GENERATED_LIMITS } from '../domain/generatedWallGeometry'
import { clipWallOpenings } from './drawOpening'
const images=new Map<string,HTMLImageElement>(),pending=new Map<string,Promise<void>>()
let sourcePixels=0
export function loadGeneratedWall(g:GeneratedWall){const d=generatedDefinition(g),key=d.id+'@'+d.revision;let job=pending.get(key);if(!job){job=(async()=>{for(const c of d.components){if(images.has(c.image))continue;const image=new Image();image.src=c.image;await image.decode();const pixels=image.naturalWidth*image.naturalHeight;if(image.naturalWidth>2048||image.naturalHeight>2048||sourcePixels+pixels>16777216)throw Error('Generated wall components exceed the image budget.');if(!images.has(c.image)){images.set(c.image,image);sourcePixels+=pixels}}})().catch(error=>{pending.delete(key);throw error});pending.set(key,job)}return job}

interface Surface {canvas:HTMLCanvasElement;x:number;y:number;width:number;height:number}
const surfaces=new Map<string,Surface>();let cachedPixels=0
export const generatedRenderStats={builds:0,hits:0,lastBuildMs:0,lastComponents:0,lastRatio:0}
export function clearGeneratedSurfaces(){surfaces.clear();cachedPixels=0}
/** Key includes only render inputs, not selection, zoom, unrelated objects or object names. */
export function generatedSurfaceKey(p:PathObject,openings:OpeningObject[],preview=false){return JSON.stringify([p.nodes.map(n=>[n.x,n.y,n.in,n.out]),p.closed,p.strokeWidth,p.wall?.alignment,p.wall?.unit,p.wall?.pixelsPerUnit,p.wall?.generated,openings.map(o=>[o.position,o.openingWidth]),preview])}
export function paintGeneratedWall(ctx:CanvasRenderingContext2D,p:PathObject,openings:OpeningObject[],preview=false){
 const definition=generatedDefinition(p.wall!.generated!)
 if(definition.components.some(c=>!images.has(c.image)))return
 const key=generatedSurfaceKey(p,openings,preview);let surface=surfaces.get(key)
 if(surface){generatedRenderStats.hits++;surfaces.delete(key);surfaces.set(key,surface)}else{
  const begin=performance.now(),placements=generatedPlacements(p,openings),bounds=generatedVisualBounds(placements),ratio=Math.min(preview?.5:2,4096/Math.max(bounds.width,bounds.height),Math.sqrt(GENERATED_LIMITS.pixels/(bounds.width*bounds.height)))
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(bounds.width*ratio));canvas.height=Math.max(1,Math.ceil(bounds.height*ratio));const c=canvas.getContext('2d')!;c.scale(ratio,ratio);c.translate(-bounds.x,-bounds.y)
  // Only doorway cutouts constrain artwork; never clip to the nominal wall envelope.
  c.save();c.translate(p.x,p.y);clipWallOpenings(c,p,openings,p.strokeWidth*4);c.translate(-p.x,-p.y)
  for(const placement of placements){c.save();c.translate(placement.x,placement.y);c.rotate(placement.angle);const image=images.get(placement.component.image)!;if(placement.sourceFraction)c.drawImage(image,0,0,image.naturalWidth*placement.sourceFraction,image.naturalHeight,-placement.width/2,-placement.height/2,placement.width,placement.height);else c.drawImage(image,-placement.width/2,-placement.height/2,placement.width,placement.height);c.restore()}c.restore()
  surface={canvas,...bounds};const pixels=canvas.width*canvas.height
  while(surfaces.size&&(surfaces.size>=128||cachedPixels+pixels>GENERATED_LIMITS.cachedPixels)){const [old,s]=surfaces.entries().next().value!;cachedPixels-=s.canvas.width*s.canvas.height;surfaces.delete(old)}
  surfaces.set(key,surface);cachedPixels+=pixels;generatedRenderStats.builds++;generatedRenderStats.lastBuildMs=performance.now()-begin;generatedRenderStats.lastComponents=placements.length;generatedRenderStats.lastRatio=ratio
 }
 ctx.drawImage(surface.canvas,surface.x-p.x,surface.y-p.y,surface.width,surface.height)
}

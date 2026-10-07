import { composeGeneratedContactShadow, GENERATED_CONTACT_SHADOW } from '../../src/canvas/generatedContactShadow'
import { clipWallOpenings } from '../../src/canvas/drawOpening'
import type { PathObject, OpeningObject } from '../../src/domain/models'
export { GENERATED_CONTACT_SHADOW }
export interface Placement { componentId:string; x:number; y:number; width:number; height:number; angle:number; order:number; sourceFraction?:number }
export interface FixtureWall { wall:PathObject; openings:OpeningObject[]; bounds:{x:number;y:number;width:number;height:number}; ratio:number; placements:Placement[] }
/** Frozen native placements; uses the actual production opening clip and contact-shadow function. */
export function replaySurface(f:FixtureWall,images:Map<string,HTMLImageElement>,shadow:boolean) {
  const {bounds,ratio}=f,canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.ceil(bounds.width*ratio));canvas.height=Math.max(1,Math.ceil(bounds.height*ratio))
  const c=canvas.getContext('2d')!;c.scale(ratio,ratio);c.translate(-bounds.x,-bounds.y)
  c.save();c.translate(f.wall.x,f.wall.y);clipWallOpenings(c,f.wall,f.openings,f.wall.strokeWidth*4);c.translate(-f.wall.x,-f.wall.y)
  for(const p of f.placements){const image=images.get(p.componentId);if(!image)throw Error('Missing component '+p.componentId);c.save();c.translate(p.x,p.y);c.rotate(p.angle);if(p.sourceFraction)c.drawImage(image,0,0,image.naturalWidth*p.sourceFraction,image.naturalHeight,-p.width/2,-p.height/2,p.width,p.height);else c.drawImage(image,-p.width/2,-p.height/2,p.width,p.height);c.restore()}
  c.restore()
  return shadow?composeGeneratedContactShadow(canvas,ratio,c=>{c.scale(ratio,ratio);c.translate(f.wall.x-bounds.x,f.wall.y-bounds.y);clipWallOpenings(c,f.wall,f.openings,f.wall.strokeWidth*4);c.resetTransform()}):canvas
}

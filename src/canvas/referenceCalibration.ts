import { clampZoom, screenToMap, type Point, type Size, type Viewport } from './viewport'

export interface ReferencePair { id: number; image: Point | null; map: Point | null }
export interface Similarity { a: number; b: number; x: number; y: number; scale: number; rotation: number; meanError: number; maxError: number; residuals: number[] }
export function validReferencePoint(p: Point, size: Size) {
  return [p.x,p.y,size.width,size.height].every(Number.isFinite)&&size.width>0&&size.height>0&&p.x>=0&&p.y>=0&&p.x<=size.width&&p.y<=size.height
}
export function imageToWorld(p: Point, t: Similarity): Point { return {x:t.a*p.x-t.b*p.y+t.x,y:t.b*p.x+t.a*p.y+t.y} }
export function worldToImage(p: Point, t: Similarity): Point {
  const x=p.x-t.x,y=p.y-t.y,d=t.a*t.a+t.b*t.b
  return {x:(t.a*x+t.b*y)/d,y:(-t.b*x+t.a*y)/d}
}
/** Centred least-squares similarity, no reflection, shear, resampling or project mutation. */
export function calibrateReference(pairs: ReferencePair[], image: Size, map: Size): Similarity {
  if(pairs.length<2)throw Error('Add at least two complete point pairs.')
  if(pairs.length>16)throw Error('Use at most 16 point pairs.')
  const points=pairs.map(p=>{
    if(!p.image||!p.map)throw Error('Choose both the image and map point for every pair.')
    if(!validReferencePoint(p.image,image)||!validReferencePoint(p.map,map))throw Error('Points must be finite and inside the image and map bounds.')
    return {image:p.image,map:p.map}
  })
  for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)for(const side of ['image','map'] as const){
    if(Math.hypot(points[i][side].x-points[j][side].x,points[i][side].y-points[j][side].y)<2)throw Error('Point pairs are too close. Choose distinct landmarks at least 2 pixels apart in both views.')
  }
  const centre=(side:'image'|'map')=>points.reduce((s,p)=>({x:s.x+p[side].x/points.length,y:s.y+p[side].y/points.length}),{x:0,y:0})
  const c=centre('image'),d=centre('map')
  let denominator=0,real=0,imaginary=0
  for(const p of points){const x=p.image.x-c.x,y=p.image.y-c.y,u=p.map.x-d.x,v=p.map.y-d.y;denominator+=x*x+y*y;real+=x*u+y*v;imaginary+=x*v-y*u}
  const a=real/denominator,b=imaginary/denominator,scale=Math.hypot(a,b)
  if(!Number.isFinite(scale)||scale<.0001||scale>10000||denominator<2)throw Error('Calibration is unstable or its scale is outside the safe range (0.0001–10000). Spread the landmarks farther apart.')
  const t:Similarity={a,b,x:d.x-a*c.x+b*c.y,y:d.y-b*c.x-a*c.y,scale,rotation:Math.atan2(b,a),meanError:0,maxError:0,residuals:[]}
  t.residuals=points.map(p=>{const q=imageToWorld(p.image,t);return Math.hypot(q.x-p.map.x,q.y-p.map.y)})
  t.meanError=t.residuals.reduce((s,v)=>s+v,0)/points.length;t.maxError=Math.max(...t.residuals)
  if(![t.x,t.y,...t.residuals].every(Number.isFinite))throw Error('Calibration is numerically unstable.')
  return t
}
export function linkedReferenceViewport(source: Viewport, sourceSize: Size, targetSize: Size, t: Similarity, direction:'reference-map'|'map-reference') {
  const centre=screenToMap({x:sourceSize.width/2,y:sourceSize.height/2},source)
  const target=direction==='reference-map'?imageToWorld(centre,t):worldToImage(centre,t)
  const requested=direction==='reference-map'?source.zoom/t.scale:source.zoom*t.scale,zoom=clampZoom(requested)
  return {view:{zoom,pan:{x:targetSize.width/2-target.x*zoom,y:targetSize.height/2-target.y*zoom}},limited:Math.abs(zoom-requested)>1e-10}
}

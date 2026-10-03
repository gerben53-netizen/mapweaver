import { isAnnotation, transformAnnotation } from './annotations'
import { scaleRoute } from './routes'
import { composeScatter, validateScatter } from './scatter'
import { isOpening, reconcileOpenings } from './openings'
import { scaleWall } from './walls'
import type { PlacedObject } from './models'
import type { Point } from '../canvas/viewport'
import { selectionBounds } from './layers'
import { normalizeRotation, validTransform } from './transforms'
import { validateArea, withGeometry } from './areas'
import { validatePath, withPathGeometry } from './paths'
export type Matrix = [number, number, number, number, number, number]
export function multiply(a: Matrix, b: Matrix): Matrix {
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]
}
export interface SelectionTransform { scale: number; rotation: number; flipX: boolean; flipY: boolean; dx: number; dy: number }
export function transformSelection(objects: PlacedObject[], input: Partial<SelectionTransform>) {
  const t = { scale: 1, rotation: 0, flipX: false, flipY: false, dx: 0, dy: 0, ...input }
  if (!objects.length) return []
  if (![t.scale,t.rotation,t.dx,t.dy].every(Number.isFinite) || t.scale <= 0) throw new Error('Use a positive scale and finite transform values.')
  const bounds = selectionBounds(objects), center = { x: bounds.x+bounds.width/2, y: bounds.y+bounds.height/2 }
  const angle=t.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),sx=t.scale*(t.flipX?-1:1),sy=t.scale*(t.flipY?-1:1)
  const matrix:Matrix=[c*sx,s*sx,-s*sy,c*sy,0,0]
  matrix[4]=center.x+t.dx-matrix[0]*center.x-matrix[2]*center.y
  matrix[5]=center.y+t.dy-matrix[1]*center.x-matrix[3]*center.y
  const point=(p:Point):Point=>({x:matrix[0]*p.x+matrix[2]*p.y+matrix[4],y:matrix[1]*p.x+matrix[3]*p.y+matrix[5]})
  const vector=(p:Point):Point=>({x:matrix[0]*p.x+matrix[2]*p.y,y:matrix[1]*p.x+matrix[3]*p.y})
  const result=objects.map(object=>{
    if(isOpening(object)){if(!objects.some(o=>o.id===object.wallId))throw new Error('Transform an opening together with its wall, or drag it along the wall.');return {...object,openingWidth:object.openingWidth*t.scale,side:(t.flipX!==t.flipY?-object.side:object.side) as 1|-1}}
    if(object.kind==='scatter')return validateScatter(composeScatter(object,matrix))
    if(object.kind==='area') {
      const geometry={polygons:object.geometry.polygons.map(p=>({outer:p.outer.map(point),holes:p.holes.map(ring=>ring.map(point))}))}
      return validateArea({...withGeometry(object,geometry),strokeWidth:object.strokeWidth*t.scale,patternTransform:multiply(matrix,object.patternTransform||[1,0,0,1,0,0])})
    }
    if(object.kind==='path')return validatePath(withPathGeometry({...object,...scaleWall(object,t.scale),...scaleRoute(object,t.scale),strokeWidth:object.strokeWidth*t.scale},object.nodes.map(node=>({...node,...point(node),...(node.in?{in:vector(node.in)}:{}),...(node.out?{out:vector(node.out)}:{})}))))
    if(isAnnotation(object)){const p=point({x:object.x+object.width/2,y:object.y+object.height/2});return transformAnnotation(object,{...object,x:p.x-object.width*t.scale/2,y:p.y-object.height*t.scale/2,width:object.width*t.scale,height:object.height*t.scale,rotation:normalizeRotation(object.rotation+t.rotation),scaleX:object.scaleX*(t.flipX?-1:1),scaleY:object.scaleY*(t.flipY?-1:1)})}
    if(object.kind!=='stamp')throw new Error('Migrate this legacy pattern before transforming it.')
    const p=point({x:object.x+object.width/2,y:object.y+object.height/2}), width=object.width*t.scale,height=object.height*t.scale
    const reflected=t.flipX!==t.flipY
    return {...object,x:p.x-width/2,y:p.y-height/2,width,height,rotation:normalizeRotation(t.rotation+(reflected?-object.rotation:object.rotation)+(t.flipX?180:0)),scaleY:object.scaleY*(reflected?-1:1)}
  })
  if(result.some(object=>!validTransform(object)))throw new Error('Transform exceeds the coordinate limits.')
  return reconcileOpenings(result)
}


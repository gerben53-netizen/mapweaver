import { linearPlacements } from './linearWallGeometry'
import { rockPlacements } from './rockWallGeometry'
import { validateGeneratedWall, generatedPixelsPerFoot, generatedDefinition } from './generatedWalls'
import { materialPieces } from './wallMaterialGeometry'
import { wallField } from './continuousWallGeometry'
import { validateMaterial } from './wallSets'
import type { PathNode, PathObject, WallSettings } from './models'
import { pathGeometry, nearestPathPoint, validatePath, withPathGeometry } from './paths'
export const WALL_LIMITS = { width: 1024, outline: 128, length: 1000000, samples: 8192, bulk: 100, miter: 2 } as const
export type WallStyle = Pick<PathObject, 'strokeWidth' | 'stroke' | 'cap' | 'join' | 'opacity'> & { wall: WallSettings }
export const SIMPLE_WALL: WallStyle = { strokeWidth: 24, stroke: { kind: 'solid', color: '#a9a394' }, cap: 'butt', join: 'miter', opacity: 1, wall: { unit: 'px', pixelsPerUnit: 1, flip: false, outline: { enabled: true, color: '#343632', width: 2, opacity: 1 } } }
export const STONE_WALL: WallStyle = { ...SIMPLE_WALL, strokeWidth: 48, stroke: { kind: 'solid', color: '#777c78' }, join: 'bevel', wall: { ...SIMPLE_WALL.wall, outline: { ...SIMPLE_WALL.wall.outline, width: 4 } } }
export const wallStyle = (p: PathObject): WallStyle => ({ strokeWidth:p.strokeWidth, stroke:p.stroke,cap:p.cap,join:p.join,opacity:p.opacity,wall:p.wall! })
/** New freehand walls use a centerline. Outside alignment belongs to an
 * explicitly created closed boundary, not to a reusable material/style. */
export function wallDrawingStyle(style: WallStyle): WallStyle {
  const next=structuredClone(style)
  delete next.wall.alignment
  return next
}
export function createWall(nodes: PathNode[], closed = false, style = SIMPLE_WALL): PathObject {
  return validatePath(withPathGeometry({ kind:'path',pathKind:'wall',id:crypto.randomUUID(),name:'Wall',nodes,closed,...structuredClone(style),rotation:0,scaleX:1,scaleY:1,x:0,y:0,width:1,height:1 }))
}
export function validateWall(p: PathObject) {
  const w=p.wall
  const finite=(n:number,max:number)=>Number.isFinite(n)&&n>=0&&n<=max
  const keys=(v:object,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k))
  if(!w || !keys(w,['unit','pixelsPerUnit','flip','outline','material','alignment','renderingMode','generated']) || !['px','cells','ft','m'].includes(w.unit) || !finite(w.pixelsPerUnit,1e6) || w.pixelsPerUnit<=0 || (w.unit==='px'&&w.pixelsPerUnit!==1) || typeof w.flip!=='boolean') throw new Error('Invalid wall scale reference.')
  if(w.alignment !== undefined && (w.alignment !== 'outside' || !p.closed || p.strokeWidth < .5 || p.strokeWidth > 512)) throw Error('Outside walls must be closed and between 0.5 and 512 map pixels thick.')
  if(w.renderingMode!==undefined&&w.renderingMode!=='generated')throw Error('Invalid wall rendering mode.')
  if(w.renderingMode==='generated'){validateGeneratedWall(w.generated!);if(w.material||p.stroke.kind!=='solid')throw Error('Generated walls cannot combine another material or texture.')}else if(w.generated!==undefined)throw Error('Generated settings require generated rendering mode.')
  if(w.generated&&generatedDefinition(w.generated).generatorType==='linear')linearPlacements(p)
  if(w.generated&&generatedDefinition(w.generated).generatorType==='rock')rockPlacements(p)
  validateMaterial(p)
  if(p.wall?.material&&!p.wall.material.set.continuous)materialPieces(p)
  if(p.wall?.material?.set.continuous)wallField(p)
  const o=w.outline
  if(!o || !keys(o,['enabled','color','width','opacity']) || typeof o.enabled!=='boolean' || !/^#[\da-f]{6}$/i.test(o.color) || !finite(o.width,WALL_LIMITS.outline) || !finite(o.opacity,1))throw new Error('Invalid wall outline.')
  if(p.stroke.kind==='dashed')throw new Error('Walls support solid or texture strokes.')
  if(w.generated&&generatedDefinition(w.generated).generatorType==='masonry'){const rows=Math.max(1,Math.ceil(p.strokeWidth/generatedPixelsPerFoot(wallStyle(p))/.5)),course=p.strokeWidth/rows;if((Math.ceil(pathGeometry(p).length/Math.max(.1,course*.45))+128)*rows+p.nodes.length*rows*rows>12000)throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')}
  if(w.generated&&generatedDefinition(w.generated).generatorType==='living-root'){const runs=Math.max(2,Math.min(9,Math.round(1.5+p.strokeWidth/generatedPixelsPerFoot(wallStyle(p))*1.8)));if((Math.ceil(pathGeometry(p).length/Math.max(1,p.strokeWidth*.45))+64)*(runs+2)+p.nodes.length>12000)throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')}
  if(pathGeometry(p).length>WALL_LIMITS.length)throw new Error('Wall exceeds 1,000,000 map pixels.')
}
export function wallUnits(value:number,unit:WallSettings['unit'],pixelsPerUnit:number) {
  if(!Number.isFinite(value)||!Number.isFinite(pixelsPerUnit)||pixelsPerUnit<=0)throw new Error('Enter a valid scale reference.')
  return value*(unit==='px'?1:pixelsPerUnit)
}
export function compatibleWalls(a:PathObject,b:WallStyle) { return a.pathKind==='wall' && !a.closed && JSON.stringify(wallStyle(a))===JSON.stringify(b) }
export function scaleWall(p:PathObject,factor:number):Partial<PathObject> { return p.wall ? {wall:{...p.wall,outline:{...p.wall.outline,width:p.wall.outline.width*factor}}}:{} }

export interface WallConnection { x:number; y:number; neighbor?:PathObject }
/** Visual endpoint patches only: no persisted graph, merging or target mutations. */
export function wallConnections(objects:import('./models').PlacedObject[]) {
  const endpoints=new Map<string,{path:PathObject;point:{x:number;y:number}}[]>(),result=new Map<string,WallConnection[]>()
  for(const path of objects){if(path.kind!=='path'||path.pathKind!=='wall'||path.closed)continue
    const style=JSON.stringify(wallStyle(path))
    for(const point of [path.nodes[0],path.nodes.at(-1)!]){const key=`${point.x.toFixed(5)},${point.y.toFixed(5)}|${style}`,list=endpoints.get(key)||[];list.push({path,point});endpoints.set(key,list)}
  }
  for(const list of endpoints.values())if(new Set(list.map(a=>a.path.id)).size>1)for(const a of list)result.set(a.path.id,[...(result.get(a.path.id)||[]),a.point])
  for(const path of objects){if(path.kind!=='path'||path.pathKind!=='wall')continue
    for(const node of path.nodes){if(!node.junction)continue;const target=objects.find(o=>o.id===node.junction)
      if(target?.kind==='path'&&target.pathKind==='wall'&&nearestPathPoint(target,node).distance<.01){
        // Only explicit snap annotations form junctions. No unrelated crossing inference.
        const same=path.wall?.material?.set.revision===target.wall?.material?.set.revision
        if(same)result.set(path.id,[...(result.get(path.id)||[]),{x:node.x,y:node.y}])
      }
    }
  }
  const continuous=objects.filter((o):o is PathObject=>o.kind==='path'&&!!o.wall?.material?.set.continuous)
  for(const path of continuous)for(const other of continuous){
    if(other===path||path.wall!.material!.set.revision!==other.wall!.material!.set.revision||path.opacity!==other.opacity)continue
    if(path.x>other.x+other.width||other.x>path.x+path.width||path.y>other.y+other.height||other.y>path.y+path.height)continue
    result.set(path.id,[...(result.get(path.id)||[]),{x:0,y:0,neighbor:other}])
  }
  return result
}

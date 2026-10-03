import type { Point, Size } from '../canvas/viewport'
import type { GridSettings, MapLayer, PlacedObject } from './models'
import { editableIds, selectionBounds } from './layers'
import { snapPoint } from './mapSettings'
import { screenTolerance, nearestPathPoint } from './paths'

export interface SnapGuide { axis: 'x' | 'y'; position: number; start: number; end: number; label?: string }
interface Target { position: number; start: number; end: number; gap?: number }
export interface SnapTargets { x: Target[]; y: Target[]; gapX?: Target[]; gapY?: Target[] }
export interface SnapBox extends Point, Size {}
export const OBJECT_SNAP_PIXELS = 8

/** Build once at gesture start; no geometry scans on pointer movement. */
export function buildSnapTargets(objects: PlacedObject[], layers: MapLayer[], excluded: string[], map: Size): SnapTargets {
  const allowed = editableIds(layers, objects), selected = new Set(excluded)
  const targets: SnapTargets = { x: [{ position: map.width / 2, start: 0, end: map.height }], y: [{ position: map.height / 2, start: 0, end: map.width }] }
  const boxes: SnapBox[] = []
  for (const object of objects) {
    if (!allowed.has(object.id) || selected.has(object.id)) continue
    const bounds = selectionBounds([object])
    boxes.push(bounds)
    if(object.kind==='path')for(const node of object.nodes){targets.x.push({position:node.x,start:node.y,end:node.y});targets.y.push({position:node.y,start:node.x,end:node.x})}
    for (const fraction of [0, .5, 1]) {
      targets.x.push({ position: bounds.x + bounds.width * fraction, start: bounds.y, end: bounds.y + bounds.height })
      targets.y.push({ position: bounds.y + bounds.height * fraction, start: bounds.x, end: bounds.x + bounds.width })
    }
  }
  targets.x.sort((a, b) => a.position - b.position)
  targets.y.sort((a, b) => a.position - b.position)
  for(const axis of ['x','y'] as const){const size=axis==='x'?'width':'height',cross=axis==='x'?'y':'x',other=axis==='x'?'height':'width';const sorted=[...boxes].sort((a,b)=>a[axis]-b[axis]),gaps:Target[]=[];for(let i=1;i<sorted.length;i++){const a=sorted[i-1],b=sorted[i],gap=b[axis]-a[axis]-a[size];if(gap>0&&Math.min(a[cross]+a[other],b[cross]+b[other])>=Math.max(a[cross],b[cross]))gaps.push({position:(a[axis]+a[size]+b[axis])/2,start:Math.min(a[cross],b[cross]),end:Math.max(a[cross]+a[other],b[cross]+b[other]),gap})}targets[axis==='x'?'gapX':'gapY']=gaps.sort((a,b)=>a.position-b.position)}
  return targets
}

function nearest(targets: Target[], position: number, tolerance: number): Target | null {
  let low = 0, high = targets.length
  while (low < high) { const middle = (low + high) >>> 1; if (targets[middle].position < position) low = middle + 1; else high = middle }
  const candidates = [targets[low - 1], targets[low]].filter((target): target is Target => !!target)
  candidates.sort((a, b) => Math.abs(a.position - position) - Math.abs(b.position - position) || a.position - b.position)
  return candidates[0] && Math.abs(candidates[0].position - position) <= tolerance ? candidates[0] : null
}

/** Object matches within eight screen pixels take precedence per axis over grid.
 * Grid snaps the joint center; one correction is applied to every member. */
export function snapSelection(bounds: SnapBox, targets: SnapTargets, grid: GridSettings, zoom: number, enabled: boolean, bypass: boolean) {
  if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('Snap zoom must be positive.')
  if (bypass) return { delta: { x: 0, y: 0 }, guides: [] as SnapGuide[] }
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  const snapped = snapPoint(center, grid)
  const delta = { x: snapped.x - center.x, y: snapped.y - center.y }
  const guides: SnapGuide[] = []
  if (enabled) {
    const tolerance = screenTolerance(OBJECT_SNAP_PIXELS, zoom)
    for (const axis of ['x', 'y'] as const) {
      const dimension = axis === 'x' ? 'width' : 'height'
      const cross = axis === 'x' ? 'y' : 'x', crossDimension = axis === 'x' ? 'height' : 'width'
      let match: { target: Target; correction: number } | null = null
      for (const fraction of [0, .5, 1]) {
        const position = bounds[axis] + bounds[dimension] * fraction
        const target = nearest(targets[axis], position, tolerance)
        if (target && (!match || Math.abs(target.position - position) < Math.abs(match.correction))) match = { target, correction: target.position - position }
      }
      if (match) {
        delta[axis] = match.correction
        guides.push({ axis, position: match.target.position, start: Math.min(bounds[cross], match.target.start), end: Math.max(bounds[cross] + bounds[crossDimension], match.target.end) })
      } else {
        const gap=nearest(targets[axis==='x'?'gapX':'gapY']||[],center[axis],tolerance)
        if(gap&&gap.gap!>=bounds[dimension]&&bounds[cross]+bounds[crossDimension]>=gap.start&&bounds[cross]<=gap.end){delta[axis]=gap.position-center[axis];guides.push({axis,position:gap.position,start:gap.start,end:gap.end,label:`Equal gaps: ${Number(((gap.gap!-bounds[dimension])/2).toFixed(1))} px`})}
      }
    }
  }
  return { delta, guides }
}

export interface PathSnap { point:Point; kind:'endpoint'|'node'|'segment'|'grid'|'guide'|'area edge'|null; objectId?:string; nodeIndex?:number }
/** Connection targets share the same eight-screen-pixel tolerance and layer policy as object guides. */
export function snapPathPoint(point:Point, objects:PlacedObject[], layers:MapLayer[], map:Size, grid:GridSettings, zoom:number, enabled:boolean, bypass:boolean, exclude='',scope:'walls'|'routes'='walls'):PathSnap {
  if(bypass)return {point,kind:null}
  const tolerance=screenTolerance(OBJECT_SNAP_PIXELS,zoom),allowed=editableIds(layers,objects)
  const walls=enabled?objects.filter(o=>o.id!==exclude&&allowed.has(o.id)&&o.kind==='path'&&(scope==='walls'?o.pathKind==='wall':true)):[]
  let best:PathSnap|null=null,bestDistance=Infinity
  for(const wall of walls){if(wall.kind!=='path')continue;for(const [i,node] of wall.nodes.entries()){
    const d=Math.hypot(node.x-point.x,node.y-point.y)
    if(d<=tolerance&&d<bestDistance){bestDistance=d;best={point:{x:node.x,y:node.y},kind:!wall.closed&&(i===0||i===wall.nodes.length-1)?'endpoint':'node',objectId:wall.id,nodeIndex:i}}
  }}
  if(best)return best
  for(const wall of walls){if(wall.kind!=='path'||point.x<wall.x-tolerance||point.y<wall.y-tolerance||point.x>wall.x+wall.width+tolerance||point.y>wall.y+wall.height+tolerance)continue
    const near=nearestPathPoint(wall,point);if(near.distance<=tolerance&&near.distance<bestDistance){bestDistance=near.distance;best={point:near.point,kind:'segment',objectId:wall.id}}
  }
  if(best)return best
  if(enabled&&scope==='routes')for(const area of objects){
    if(area.kind!=='area'||!area.land||area.id===exclude||!allowed.has(area.id)||point.x<area.x-tolerance||point.y<area.y-tolerance||point.x>area.x+area.width+tolerance||point.y>area.y+area.height+tolerance)continue
    for(const poly of area.geometry.polygons)for(const ring of [poly.outer,...poly.holes])for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))),p={x:a.x+dx*t,y:a.y+dy*t},d=Math.hypot(p.x-point.x,p.y-point.y)
      if(d<=tolerance&&d<bestDistance){bestDistance=d;best={point:p,kind:'area edge',objectId:area.id}}
    }
  }
  if(best)return best
  const targets=enabled?buildSnapTargets(objects,layers,[exclude],map):{x:[],y:[]}
  const result=snapSelection({...point,width:0,height:0},targets,grid,zoom,enabled,false)
  return {point:{x:point.x+result.delta.x,y:point.y+result.delta.y},kind:result.guides.length?'guide':grid.snapEnabled?'grid':null}
}


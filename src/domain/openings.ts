import { wallMaterialRadius } from './wallSets'
import { outsideWall, wallWinding } from './wallAlignment'
import type { MapLayer, MapObject, OpeningObject, PathObject } from './models'
import { nearestPathPoint, pathGeometry, pointAtDistance } from './paths'
import type { Point } from '../canvas/viewport'

export const OPENING_LIMITS = { perWall: 64, width: 4096, minimum: 4, gap: .01, samples: 256 } as const
export const isOpening = (o: MapObject): o is OpeningObject => o.kind === 'door' || o.kind === 'window'
/** Continuing from the start reverses the original path; keep existing doors in place. */
export function openingsAfterExtension(original: PathObject, extended: PathObject, openings: OpeningObject[]) {
  const reversed=extended.nodes[0].id===original.nodes.at(-1)!.id
  const oldLength=pathGeometry(original).length,newLength=pathGeometry(extended).length
  return openings.map(o=>deriveOpening({...o,
    position:(reversed?1-o.position:o.position)*oldLength/newLength,
    side:reversed?(o.side===1?-1:1):o.side,flip:reversed?!o.flip:o.flip,
  },extended))
}
export function createOpeningIndex() {
  let previous=new Map<string,OpeningObject[]>()
  return (objects:MapObject[])=>{
    const next=new Map<string,OpeningObject[]>()
    for(const o of objects)if(isOpening(o)){const list=next.get(o.wallId)||[];list.push(o);next.set(o.wallId,list)}
    for(const [id,list] of next){const old=previous.get(id);if(old?.length===list.length&&list.every((o,i)=>o===old[i]))next.set(id,old)}
    previous=next;return next
  }
}
const cuts=new WeakMap<OpeningObject,WeakMap<PathObject,Map<number,Point[]>>>()
export function openingDistance(wall: PathObject, point: Point) {
  const near = nearestPathPoint(wall, point), segment = pathGeometry(wall).segments[near.segment]
  return segment.start + (near.t === 0 ? 0 : segment.curve.split(0, near.t).length())
}
export function snapOpeningDistance(wall:PathObject,distance:number,width:number,objects:MapObject[],gridStep:number,zoom:number,bypass:boolean,excludeId?:string) {
  if(bypass)return distance
  const g=pathGeometry(wall),half=width/2
  let result=gridStep>0?Math.round(distance/gridStep)*gridStep:distance
  const candidates=g.segments.filter(s=>s.length>=width).flatMap(s=>[s.start+half,s.start+s.length-half])
  for(const o of objects)if(isOpening(o)&&o.wallId===wall.id&&o.id!==excludeId){const p=openingPlacement(o,wall);candidates.push(p.start-half-OPENING_LIMITS.gap,p.end+half+OPENING_LIMITS.gap)}
  const near=candidates.map(value=>({value,d:Math.abs(value-distance)})).filter(v=>v.d<=8/zoom).sort((a,b)=>a.d-b.d)[0]
  if(near)result=near.value
  return result
}
export function openingPlacement(o: OpeningObject, wall: PathObject) {
  const geometry = pathGeometry(wall), distance = o.position * geometry.length, half = o.openingWidth / 2
  const segment = geometry.segments.find(s => distance - half >= s.start - 1e-6 && distance + half <= s.start + s.length + 1e-6)
  if (!segment) throw new Error('The opening must fit completely on one wall segment. Reduce its width or move it away from the corner.')
  const location = pointAtDistance(wall, distance)
  if(outsideWall(wall)) { const offset = wall.strokeWidth / 2 * wallWinding(wall); location.point = { x: location.point.x + location.tangent.y * offset, y: location.point.y - location.tangent.x * offset } }
  return { ...location, distance, start: distance - half, end: distance + half, segmentIndex: segment.index }
}
export function openingCutout(o: OpeningObject, wall: PathObject, extra = 0): Point[] {
  const walls=cuts.get(o)||new WeakMap(),variants=walls.get(wall)||new Map<number,Point[]>(),cached=variants.get(extra)
  if(cached)return cached
  const place = openingPlacement(o, wall), radius = Math.max(wallMaterialRadius(wall.strokeWidth,wall.wall?.material),wall.strokeWidth * (outsideWall(wall) ? 1 : .5) + (wall.wall?.outline.enabled ? wall.wall.outline.width : 0)) + 1 + extra
  const steps = Math.min(OPENING_LIMITS.samples, Math.max(2, Math.ceil(o.openingWidth / 2))), left: Point[] = [], right: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const { point, tangent } = pointAtDistance(wall, place.start + (place.end - place.start) * i / steps)
    left.push({ x: point.x - tangent.y * radius, y: point.y + tangent.x * radius })
    right.push({ x: point.x + tangent.y * radius, y: point.y - tangent.x * radius })
  }
  const result=[...left, ...right.reverse()];variants.set(extra,result);walls.set(wall,variants);cuts.set(o,walls);return result
}
export function deriveOpening(o: OpeningObject, wall: PathObject): OpeningObject {
  const { point } = openingPlacement(o, wall), r = o.openingWidth + wall.strokeWidth + (wall.wall?.outline.width || 0)
  // Common object adapters require bounds. They are checked derived data, never the attachment source.
  return { ...o, x: point.x - r, y: point.y - r, width: r * 2, height: r * 2 }
}
export function createOpening(wall: PathObject, position: number, kind: OpeningObject['kind'], width = 70): OpeningObject {
  const base = { id: crypto.randomUUID(), wallId: wall.id, position, openingWidth: width, unit: wall.wall!.unit, pixelsPerUnit: wall.wall!.pixelsPerUnit, side: 1 as const, flip: false, x: 0, y: 0, width: 1, height: 1, rotation: 0 as const, scaleX: 1 as const, scaleY: 1 as const, opacity: 1 }
  return deriveOpening(kind === 'door' ? { ...base, kind, name: 'Door', doorType: 'single', status: 'closed' } : { ...base, kind, name: 'Window', windowType: 'simple' }, wall)
}
export function validateOpening(input: OpeningObject): OpeningObject {
  if (!input || (input.kind !== 'door' && input.kind !== 'window')) throw new Error('Invalid opening type.')
  const keys = ['kind','id','name','visible','locked','assetId','wallId','position','openingWidth','unit','pixelsPerUnit','side','flip','x','y','width','height','rotation','scaleX','scaleY','opacity', ...(input.kind === 'door' ? ['doorType','status'] : ['windowType'])]
  if (Object.keys(input).some(k => !keys.includes(k))) throw new Error('Unknown opening field.')
  for (const id of [input.id, input.wallId, ...(input.assetId === undefined ? [] : [input.assetId])]) if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid opening identifier.')
  if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || [...input.name].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))) throw new Error('Invalid opening name.')
  for (const flag of [input.visible, input.locked]) if (flag !== undefined && typeof flag !== 'boolean') throw new Error('Invalid opening flag.')
  if (![input.position,input.openingWidth,input.pixelsPerUnit,input.x,input.y,input.width,input.height,input.opacity].every(n => typeof n === 'number' && Number.isFinite(n)) || Math.abs(input.x) > 1e9 || Math.abs(input.y) > 1e9 || input.width <= 0 || input.height <= 0 || input.width > 1e9 || input.height > 1e9 || input.position < 0 || input.position > 1 || input.openingWidth < OPENING_LIMITS.minimum || input.openingWidth > OPENING_LIMITS.width || input.pixelsPerUnit <= 0 || input.pixelsPerUnit > 1e6 || (input.unit==='px'&&input.pixelsPerUnit!==1) || input.opacity < 0 || input.opacity > 1) throw new Error('Invalid opening dimensions or position.')
  if (!['px','cells','ft','m'].includes(input.unit) || ![-1,1].includes(input.side) || typeof input.flip !== 'boolean' || input.rotation !== 0 || input.scaleX !== 1 || input.scaleY !== 1) throw new Error('Invalid opening orientation or units.')
  if (input.kind === 'door' ? !['single','double','passage'].includes(input.doorType) || !['closed','open-left','open-right'].includes(input.status) : !['simple','wide'].includes(input.windowType)) throw new Error('Invalid opening style.')
  return input
}
export function reconcileOpenings(objects: MapObject[], layers?: MapLayer[], strictBounds = false): MapObject[] {
  const byId = new Map(objects.map(o => [o.id, o])), membership = layers ? new Map(layers.flatMap(l => l.objectIds.map(id => [id,l.id] as const))) : null
  const intervals = new Map<string, { start: number; end: number }[]>()
  return objects.map(o => {
    if (!isOpening(o)) return o
    validateOpening(o)
    const wall = byId.get(o.wallId)
    if (wall?.kind !== 'path' || wall.pathKind !== 'wall') throw new Error(`Opening “${o.name || o.id}” has no wall. Restore its wall or delete the opening before saving or exporting.`)
    if (membership && membership.get(o.id) !== membership.get(wall.id)) throw new Error('An opening and its wall must be in the same layer. Move the complete wall assembly.')
    const interval = openingPlacement(o, wall), existing = intervals.get(wall.id) || []
    if (existing.length >= OPENING_LIMITS.perWall) throw new Error('A wall supports at most 64 openings.')
    if (existing.some(v => interval.start < v.end + OPENING_LIMITS.gap - 1e-6 && interval.end > v.start - OPENING_LIMITS.gap + 1e-6)) throw new Error('Openings overlap. Move the opening to free wall space or reduce its width.')
    existing.push(interval); intervals.set(wall.id, existing)
    const derived = deriveOpening(o, wall)
    const changed = (['x','y','width','height'] as const).some(k => Math.abs(derived[k] - o[k]) > 1e-5)
    if (strictBounds && changed) throw new Error('Opening bounds do not match its wall attachment.')
    return changed ? derived : o
  })
}
export function assemblyIds(objects: MapObject[], ids: string[]): string[] {
  const result = new Set(ids), walls = new Set(objects.filter(o => result.has(o.id)).map(o => isOpening(o) ? o.wallId : o.id))
  for (const o of objects) if (walls.has(o.id) || (isOpening(o) && walls.has(o.wallId))) result.add(o.id)
  for(const o of objects)if(o.kind==='label'&&o.ownerId&&result.has(o.ownerId))result.add(o.id)
  return [...result]
}
export function remapOpening(o: MapObject, ids: Map<string,string>): MapObject {
  if(o.kind==='label'&&o.ownerId){const ownerId=ids.get(o.ownerId);return {...o,ownerId}}
  if (isOpening(o)) { const wallId = ids.get(o.wallId); if (!wallId) throw new Error('Copy the opening together with its wall.'); return {...o,wallId} }
  if(o.kind==='path')return {...o,nodes:o.nodes.map(n=>n.junction?{...n,junction:ids.get(n.junction)||n.junction}:n)}
  if(o.kind==='area'&&o.roomSource)return {...o,roomSource:{...o.roomSource,wallIds:o.roomSource.wallIds.map(id=>ids.get(id)||id)}}
  return o
}
export function nextFreePosition(o: OpeningObject, wall: PathObject, objects: MapObject[]) {
  const g = pathGeometry(wall), width = o.openingWidth, occupied = objects.filter((v):v is OpeningObject => isOpening(v) && v.wallId === wall.id && v.id !== o.id).map(v => openingPlacement(v,wall)).sort((a,b)=>a.start-b.start)
  const candidates = g.segments.flatMap(s => [s.start + width/2, ...occupied.filter(v=>v.start>=s.start&&v.end<=s.start+s.length).map(v=>v.end+OPENING_LIMITS.gap+width/2)]).sort((a,b)=>a-b)
  const distance=o.position*g.length
  for (const d of [...candidates.filter(d=>d>distance+1e-6),...candidates.filter(d=>d<=distance+1e-6)]) {
    try { const candidate={...o,position:d/g.length};openingPlacement(candidate,wall);if(!occupied.some(v=>d-width/2<v.end+OPENING_LIMITS.gap-1e-7&&d+width/2>v.start-OPENING_LIMITS.gap+1e-7))return candidate.position } catch { /* try next bounded interval */ }
  }
  throw new Error('No free segment fits this opening width.')
}

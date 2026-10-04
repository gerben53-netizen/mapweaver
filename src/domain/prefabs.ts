import { remapFamilyObject } from './stampFamilies'
import type { ProjectSnapshot } from '../store/history'
import type { ProjectFile } from '../projects/types'
import type { MapObject, MapDocument } from './models'
import type { DefaultSize } from './library'
import { parseProject } from '../projects/format'
import { flatLayerTree, flattenLayerTree } from './grouping'
import { effectiveLayers, groupFlags, projectObjects } from './projectView'
import { selectionBounds } from './layers'
import { transformSelection } from './selectionTransform'
import { reconcileLabels } from './annotations'
import { objectAssetIds } from './areas'
import { remapScatter } from './scatter'
import { resolvePlacementSize } from './placement'
import type { Point } from '../canvas/viewport'

export const PREFAB_LIMITS = { objects: 2000, layers: 128, dependencies: 512, bytes: 4 * 1024 * 1024, closure: 256 } as const
export type PrefabSource = { kind: 'selection' | 'group' | 'layer' | 'layerGroup'; ids: string[] }
export interface Bounds { x: number; y: number; width: number; height: number }
export interface Prefab {
  formatVersion: 1
  mode: 'editable' | 'flattened'
  bounds: Bounds
  visibleBounds: Bounds
  anchor: Point
  sourceMap: MapDocument
  document: ProjectFile
  renderScale: 1 | 2
}
export function objectRelations(o: MapObject): string[] {
  if (o.kind === 'door' || o.kind === 'window') return [o.wallId]
  if (o.kind === 'label' && o.ownerId) return [o.ownerId]
  if (o.kind === 'area') return o.roomSource?.wallIds || []
  if (o.kind === 'path') return o.nodes.flatMap(n => n.junction ? [n.junction] : [])
  return [] // Clipping and scatter exclusions are stored geometry, without live object IDs.
}
export function captureSource(state: ProjectSnapshot, source: PrefabSource, hidden = false, required = false, detachOptional = false) {
  const tree = state.layerTree || flatLayerTree(state.layers), rows = flattenLayerTree(tree, state.layers)
  const chosen = new Set<string>()
  for (const id of source.ids) {
    if (source.kind === 'selection') {
      if (!state.objects.some(o => o.id === id)) throw Error('A selected source object no longer exists.')
      chosen.add(id)
    } else if (source.kind === 'group') {
      const group = state.objectGroups?.find(g => g.id === id)
      if (!group) throw Error('The source object group no longer exists.')
      group.objectIds.forEach(id => chosen.add(id))
    } else {
      if (source.kind === 'layer' ? !state.layers.some(l => l.id === id) : !tree.groups.some(g => g.id === id)) throw Error('The source layer entry no longer exists.')
      rows.filter(r => r.layer.id === id || r.ancestors.includes(id)).forEach(r => r.layer.objectIds.forEach(id => chosen.add(id)))
    }
  }
  const visible = new Set(projectObjects(state, true).map(o => o.id))
  const excluded = [...chosen].filter(id => !visible.has(id))
  if (!hidden) excluded.forEach(id => chosen.delete(id))
  const byId = new Map(state.objects.map(o => [o.id, o]))
  const added: string[] = [], unresolved = new Set<string>()
  for (const id of chosen) for (const target of objectRelations(byId.get(id)!)) if (!chosen.has(target)) {
    if(detachOptional&&['label','area','path'].includes(byId.get(id)!.kind))continue
    if (required && byId.has(target) && (hidden || visible.has(target))) {
      if (added.length >= PREFAB_LIMITS.closure) throw Error('Required-object closure exceeds 256 objects. Choose the complete source explicitly.')
      chosen.add(target); added.push(target)
    } else unresolved.add(target)
  }
  const objects = state.objects.filter(o => chosen.has(o.id))
  if (!objects.length) throw Error('The source has no included objects. Select content or explicitly include hidden objects.')
  if (objects.length > PREFAB_LIMITS.objects) throw Error('A prefab supports at most 2,000 ordinary objects.')
  const layers = state.layers.filter(l => l.objectIds.some(id => chosen.has(id))).map(l => ({ ...l, objectIds: l.objectIds.filter(id => chosen.has(id)) }))
  const keep = new Set(rows.filter(r => layers.some(l => l.id === r.layer.id)).flatMap(r => [r.layer.id, ...r.ancestors]))
  const groups = (state.objectGroups || []).filter(g => g.objectIds.some(id => chosen.has(id))).map(g => ({ ...g, objectIds: g.objectIds.filter(id => chosen.has(id)) }))
  const content: ProjectSnapshot = { map: { ...structuredClone(state.map), effects: undefined, background: null }, objects: structuredClone(objects).map(o=>{
    if(!detachOptional)return o
    if(o.kind==='label'&&o.ownerId&&!chosen.has(o.ownerId)){const copy={...o,leader:false};delete copy.ownerId;return copy}
    if(o.kind==='area'&&o.roomSource?.wallIds.some(id=>!chosen.has(id))){const copy={...o};delete copy.roomSource;return copy}
    if(o.kind==='path')return {...o,nodes:o.nodes.map(n=>{if(!n.junction||chosen.has(n.junction))return n;const copy={...n};delete copy.junction;return copy})}
    return o
  }), layers, objectGroups: groups, layerTree: { roots: tree.roots.filter(id => keep.has(id)), groups: tree.groups.filter(g => keep.has(g.id)).map(g => ({ ...g, children: g.children.filter(id => keep.has(id)) })) } }
  const flags = groupFlags(state), effective = effectiveLayers(state)
  const locked = objects.filter(o => o.locked || flags.get(o.id)?.locked || effective.find(l => l.objectIds.includes(o.id))?.locked).length
  return { content, excluded: excluded.length, locked, added, unresolved: [...unresolved], dependencies: [...new Set(objects.flatMap(objectAssetIds))], bounds: selectionBounds(objects) }
}
// Groups have no additional transforms in the current canonical model. All poses are already baked.
export function transformComposition(objects: MapObject[], anchor: Point, target: Point, scale = 1, rotation = 0) {
  const b = selectionBounds(objects), center = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  const a = rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const transformed = transformSelection(objects, { scale, rotation, dx: target.x - center.x - scale * ((anchor.x - center.x) * c - (anchor.y - center.y) * s), dy: target.y - center.y - scale * ((anchor.x - center.x) * s + (anchor.y - center.y) * c) })
  const point = (p: Point) => ({ x: target.x + scale * ((p.x - anchor.x) * c - (p.y - anchor.y) * s), y: target.y + scale * ((p.x - anchor.x) * s + (p.y - anchor.y) * c) })
  return reconcileLabels(transformed.map(o => o.kind === 'area' && o.roomSource ? { ...o, roomSource: { ...o.roomSource, seed: point(o.roomSource.seed) } } : o), undefined, objects)
}
export function remapComposition(document: ProjectFile, newId: () => string = () => crypto.randomUUID()): ProjectFile {
  const d = structuredClone(document), ids = new Map<string, string>()
  const remap = (id: string) => { if (!ids.has(id)) ids.set(id, newId()); return ids.get(id)! }
  for (const o of d.objects) remap(o.id)
  for (const l of d.layers) remap(l.id)
  for (const g of [...(d.objectGroups || []), ...(d.layerTree?.groups || [])]) remap(g.id)
  d.objects = d.objects.map(o => {
    const base = { ...o, id: remap(o.id) }
    if (base.kind === 'door' || base.kind === 'window') return { ...base, wallId: remap(base.wallId) }
    if (base.kind === 'label' && base.ownerId) return { ...base, ownerId: remap(base.ownerId) }
    if (base.kind === 'path') return { ...base, nodes: base.nodes.map(n => ({ ...n, id: remap(n.id), ...(n.junction ? { junction: remap(n.junction) } : {}) })) }
    if (base.kind === 'area' && base.roomSource) return { ...base, roomSource: { ...base.roomSource, wallIds: base.roomSource.wallIds.map(remap) } }
    if (base.kind === 'legend') return { ...base, entries: base.entries.map(e => ({ ...e, id: remap(e.id) })) }
    return base
  })
  d.layers = d.layers.map(l => ({ ...l, id: remap(l.id), objectIds: l.objectIds.map(remap) }))
  d.objectGroups = d.objectGroups?.map(g => ({ ...g, id: remap(g.id), layerId: remap(g.layerId), objectIds: g.objectIds.map(remap) }))
  if (d.layerTree) d.layerTree = { roots: d.layerTree.roots.map(remap), groups: d.layerTree.groups.map(g => ({ ...g, id: remap(g.id), children: g.children.map(remap) })) }
  return parseProject(d)
}
export function remapPrefabAssets(prefab: Prefab, ids: Map<string, string>): Prefab {
  const p = structuredClone(prefab), d = p.document
  const get = (id: string) => { const result = ids.get(id); if (!result) throw Error(`Missing prefab dependency: ${id}`); return result }
  d.assets = [...new Map(d.assets.map(a => ({ ...a, id: get(a.id) })).map(a => [a.id, a])).values()]
  d.objects = d.objects.map(o => {
    if (o.kind === 'scatter') return remapScatter(o, ids)
    if (o.kind === 'stamp') return remapFamilyObject(o,ids)
    if (o.kind === 'area') return { ...o, fill: o.fill.kind === 'pattern' ? { ...o.fill, assetId: get(o.fill.assetId) } : o.fill }
    if (o.kind === 'path') return { ...o, stroke: o.stroke.kind === 'texture' ? { ...o.stroke, assetId: get(o.stroke.assetId) } : o.stroke }
    if (o.kind === 'legend') return { ...o, entries: o.entries.map(e => ({ ...e, ...(e.assetId ? { assetId: get(e.assetId) } : {}) })) }
    return o.assetId ? { ...o, assetId: get(o.assetId) } : o
  })
  return validatePrefab(p)
}
export function validatePrefab(value: unknown): Prefab {
  if (!value || typeof value !== 'object') throw Error('Invalid prefab payload.')
  const p = value as Prefab
  if (p.formatVersion !== 1) throw Error('Unsupported prefab format version.')
  if (Object.keys(p).some(k => !['formatVersion','mode','bounds','visibleBounds','anchor','sourceMap','document','renderScale'].includes(k)) || !['editable','flattened'].includes(p.mode) || ![1,2].includes(p.renderScale)) throw Error('Unsupported prefab fields or mode.')
  if (new TextEncoder().encode(JSON.stringify(p)).length > PREFAB_LIMITS.bytes) throw Error('Prefab metadata exceeds 4 MiB.')
  for (const b of [p.bounds, p.visibleBounds]) if (!b || ![b.x,b.y,b.width,b.height].every(n => Number.isFinite(n) && Math.abs(n) <= 1e9) || b.width <= 0 || b.height <= 0) throw Error('Invalid prefab bounds.')
  if (!p.anchor || ![p.anchor.x,p.anchor.y].every(n => Number.isFinite(n) && Math.abs(n) <= 1e9)) throw Error('Invalid prefab anchor.')
  const document = parseProject(p.document)
  if (document.map.background || !document.objects.length || document.objects.length > PREFAB_LIMITS.objects || document.layers.length > PREFAB_LIMITS.layers || document.assets.length > PREFAB_LIMITS.dependencies) throw Error('Empty prefab, background or composition limit exceeded.')
  if (document.objects.some(o => objectRelations(o).some(id => !document.objects.some(target => target.id === id)))) throw Error('Prefab contains external object relationships. Include required objects.')
  if (p.mode === 'flattened' && (document.objects.length !== 1 || document.objects[0].kind !== 'stamp')) throw Error('Flattened prefab must contain one ordinary rendered stamp.')
  // Reuse canonical map validation, with no source project identity or filesystem paths.
  const sourceMap = parseProject({ ...document, map: p.sourceMap }).map
  if (sourceMap.background) throw Error('Prefab source metadata must not reference a background.')
  return { ...structuredClone(p), document, sourceMap }
}
export function prefabScale(p: Pick<Prefab,'bounds'>, size: DefaultSize, map: MapDocument, types: import('./geography').MapType[]) {
  if (size.mode === 'native') return { scale: 1 }
  const result = resolvePlacementSize({ naturalWidth: p.bounds.width, naturalHeight: p.bounds.height, sizing: { sizingMode: size.mode, defaultWidth: size.width || null, defaultHeight: size.height || null, sizingUnit: size.unit || null, aspectRatioLocked: size.lockAspectRatio, sizingScope: 'any', applicableMapTypes: types } }, map)
  if (result.reason) return { scale: 1, reason: result.reason.replace('native size', 'stored composition size') }
  const sx = result.width / p.bounds.width, sy = result.height / p.bounds.height
  if (Math.abs(sx - sy) > .001 * sx) throw Error('Compositions use uniform scale to preserve walls, openings, patterns and scatter. Lock the aspect ratio or correct the profile.')
  return { scale: sx }
}
export function placePrefab(p: Prefab, current: ProjectFile, target: Point, scale: number, rotation: number, mode: 'layers' | 'active', activeId: string, newId = () => crypto.randomUUID()) {
  const copy = remapComposition(validatePrefab(p).document, newId)
  copy.objects = transformComposition(copy.objects, p.anchor, target, scale, rotation)
  const d = structuredClone(current)
  d.assets = [...new Map([...d.assets, ...copy.assets].map(a => [a.id, a])).values()]
  if (mode === 'active') {
    const layer = effectiveLayers(d).find(l => l.id === activeId)
    if (!layer || !layer.visible || layer.locked) throw Error('Choose a visible, unlocked active layer.')
    const visible = new Set(projectObjects(copy, true).map(o => o.id)), flags = groupFlags(copy), layers = effectiveLayers(copy)
    copy.objects = projectObjects(copy).map(o => ({ ...o, visible: visible.has(o.id), locked: !!(o.locked || flags.get(o.id)?.locked || layers.find(l => l.objectIds.includes(o.id))?.locked) }))
    d.layers = d.layers.map(l => l.id === activeId ? { ...l, objectIds: [...l.objectIds, ...copy.objects.map(o => o.id)] } : l)
    d.objectGroups = [...(d.objectGroups || []), ...(copy.objectGroups || []).map(g => ({ ...g, layerId: activeId }))]
  } else {
    const tree = d.layerTree || flatLayerTree(d.layers), own = copy.layerTree || flatLayerTree(copy.layers)
    const existingRoot=own.roots.length===1&&own.groups.some(g=>g.id===own.roots[0])
    d.layerTree = { roots: [...(existingRoot?own.roots:[newId()]), ...tree.roots], groups: [...tree.groups, ...own.groups] }
    if(!existingRoot)d.layerTree.groups.push({ id: d.layerTree.roots[0], name: 'Prefab composition', visible: true, locked: false, children: own.roots })
    d.layers.push(...copy.layers)
    d.objectGroups = [...(d.objectGroups || []), ...(copy.objectGroups || [])]
  }
  // Nonnested same-layer groups are the existing grouping model; group only remaining ungrouped members.
  const grouped = new Set(d.objectGroups?.flatMap(g => g.objectIds))
  for (const l of d.layers) {
    const ids = l.objectIds.filter(id => copy.objects.some(o => o.id === id) && !grouped.has(id))
    if (ids.length > 1 && !copy.objects.some(o => ids.includes(o.id) && (o.kind === 'door' || o.kind === 'window') && !ids.includes(o.wallId))) (d.objectGroups ||= []).push({ id: newId(), layerId: l.id, name: 'Prefab composition', objectIds: ids, visible: true, locked: false })
  }
  d.objects.push(...copy.objects)
  if(new TextEncoder().encode(JSON.stringify(d)).length>3*1024*1024)throw Error('Placement exceeds the 3 MiB editable metadata budget. Simplify the composition or use Flattened.')
  return { document: parseProject(d), ids: copy.objects.map(o => o.id) }
}

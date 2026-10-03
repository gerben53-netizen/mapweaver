import { isOpening } from './openings'
import { flatLayerTree, flattenLayerTree } from './grouping'
import type { LayerTree, ObjectGroup } from './grouping'
import type { MapLayer, PlacedObject } from './models'
import { orderedObjects } from './layers'
export interface ManagedContent { layers: MapLayer[]; objects: PlacedObject[]; objectGroups?: ObjectGroup[]; layerTree?: LayerTree | null }
export function effectiveLayers(state: ManagedContent, solo: string | null = null) {
  return flattenLayerTree(state.layerTree || flatLayerTree(state.layers), state.layers, solo).map(row => row.layer)
}
export function groupFlags(state: ManagedContent) {
  const flags = new Map<string, { visible: boolean; locked: boolean }>()
  for (const group of state.objectGroups || []) for (const id of group.objectIds) flags.set(id, group)
  return flags
}
export function editableProjectIds(state: ManagedContent, solo: string | null = null) {
  const flags = groupFlags(state)
  const objects = new Set(state.objects.filter(object => object.visible !== false && !object.locked && flags.get(object.id)?.visible !== false && !flags.get(object.id)?.locked).map(object => object.id))
  for(const o of state.objects)if(isOpening(o)&&!objects.has(o.wallId))objects.delete(o.id)
  return new Set(effectiveLayers(state, solo).filter(layer => layer.visible && !layer.locked).flatMap(layer => layer.objectIds).filter(id => objects.has(id)))
}
export function projectObjects(state: ManagedContent, visibleOnly = false, solo: string | null = null) {
  const flags = groupFlags(state)
  const ordered=orderedObjects(effectiveLayers(state, solo), state.objects, visibleOnly).filter(object => !visibleOnly || (object.visible !== false && flags.get(object.id)?.visible !== false))
  const visible=new Set(ordered.map(o=>o.id))
  return ordered.filter(o=>!visibleOnly||!isOpening(o)||visible.has(o.wallId))
}
export function normalizeGroupOrder(groups: ObjectGroup[], layers: MapLayer[]): ObjectGroup[] {
  const result = groups.flatMap(group => {
    const ids = new Set(group.objectIds), layer = layers.find(layer => layer.id === group.layerId)
    const objectIds = layer?.objectIds.filter(id => ids.has(id)) || []
    return objectIds.length ? [objectIds.length === group.objectIds.length && objectIds.every((id, index) => id === group.objectIds[index]) ? group : { ...group, objectIds }] : []
  })
  return result.length === groups.length && result.every((group, index) => group === groups[index]) ? groups : result
}
export function expandGroupSelection(ids: string[], groups: ObjectGroup[], editing: string | null) {
  const result = new Set(ids)
  for (const group of groups) if (group.id !== editing && group.objectIds.some(id => result.has(id))) group.objectIds.forEach(id => result.add(id))
  return [...result]
}

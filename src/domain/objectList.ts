import { elementName } from './cartographicPresets'
import { effectiveLayers, groupFlags } from './projectView'
import type { ManagedContent } from './projectView'
import type { MapLayer, PlacedObject } from './models'

export interface ObjectListRow {
  id: string
  kind: PlacedObject['kind'] | 'wall' | 'river' | 'road' | 'border' | 'group'
  groupId?: string
  name: string
  assetId: string | null
  layerId: string
  layerName: string
  visible: boolean
  locked: boolean
}
export type ObjectListFilter = 'scaleBar' | 'title' | 'infoPanel' | 'place' | 'label' | 'legend' | 'compass' | 'scatter' | 'all' | 'stamp' | 'area' | 'path' | 'wall' | 'river' | 'road' | 'border' | 'door' | 'window'

/** Object transforms do not change list metadata. Reuse the previous row array
 * so a pointer preview does not cause a React render of the list. */
export function createObjectListSelector(solo: string | null = null) {
  let previous: ObjectListRow[] = []
  let lastObjects: PlacedObject[] | undefined, lastLayers: MapLayer[] | undefined
  let lastTree: ManagedContent['layerTree'], lastGroups: ManagedContent['objectGroups']
  return (state: ManagedContent) => {
    if (state.objects === lastObjects && state.layers === lastLayers && state.layerTree === lastTree && state.objectGroups === lastGroups) return previous
    const byId = new Map(state.objects.map(object => [object.id, object]))
    const rows: ObjectListRow[] = []
    const memberships = new Map((state.objectGroups || []).flatMap(g => g.objectIds.map(id => [id,g] as const))), emitted = new Set<string>(), flags = groupFlags(state)
    for (const layer of effectiveLayers(state, solo)) {
      // List order is front to back, matching the panel's layer convention.
      for (let index = layer.objectIds.length - 1; index >= 0; index--) {
        const object = byId.get(layer.objectIds[index])
        if (!object) continue
        const group = memberships.get(object.id)
        if (group && !emitted.has(group.id)) { emitted.add(group.id); rows.push({id:group.id,kind:'group',name:group.name,assetId:null,layerId:layer.id,layerName:layer.name,visible:layer.visible && group.visible,locked:layer.locked || group.locked}) }
        rows.push({ groupId:group?.id, id: object.id, kind: object.kind==='path'&&object.pathKind!=='generic'?object.pathKind:object.kind, name: object.name || '', assetId: object.kind === 'stamp' || object.kind === 'patternFill' ? object.assetId : null, layerId: layer.id, layerName: layer.name, visible: layer.visible && object.visible !== false && flags.get(object.id)?.visible !== false, locked: layer.locked || !!object.locked || !!flags.get(object.id)?.locked })
      }
    }
    const same = rows.length === previous.length && rows.every((row, index) => {
      const before = previous[index]
      return row.groupId === before.groupId && row.id === before.id && row.kind === before.kind && row.name === before.name && row.assetId === before.assetId && row.layerId === before.layerId && row.layerName === before.layerName && row.visible === before.visible && row.locked === before.locked
    })
    lastObjects = state.objects; lastLayers = state.layers; lastTree = state.layerTree; lastGroups = state.objectGroups
    if (!same) previous = rows
    return previous
  }
}

export function objectListName(row: ObjectListRow, assetNames: ReadonlyMap<string, string>) {
  return row.name || (row.assetId && assetNames.get(row.assetId)) || elementName(row.kind)
}
export function filterObjectRows(rows: ObjectListRow[], options: { scope: 'active' | 'visible'; activeLayerId: string; type: ObjectListFilter; query: string; collapsed?: string[] }, assetNames: ReadonlyMap<string, string>) {
  const query = options.query.trim().toLocaleLowerCase('en-US')
  const matches = rows.filter(row => (options.scope === 'active' ? row.layerId === options.activeLayerId : row.visible)
    && (options.type === 'all' || row.kind === options.type || row.kind === 'group')
    && (query || !row.groupId || !options.collapsed?.includes(row.groupId))
    && (!query || objectListName(row, assetNames).toLocaleLowerCase('en-US').includes(query)))
  return matches
}

export const OBJECT_ROW_HEIGHT = 52
export function objectListWindow(count: number, scrollTop: number, viewportHeight: number, overscan = 4) {
  const first = Math.min(Math.max(0, count - 1), Math.max(0, Math.floor(scrollTop / OBJECT_ROW_HEIGHT)))
  return { start: Math.max(0, first - overscan), end: Math.min(count, first + Math.ceil(viewportHeight / OBJECT_ROW_HEIGHT) + overscan) }
}


/** Duplicate names gain a list-local ordinal, never a raw database identifier. */
export function objectRowContexts(rows:ObjectListRow[], names:ReadonlyMap<string,string>) {
 const buckets=new Map<string,ObjectListRow[]>()
 for(const row of rows){const key=JSON.stringify([row.layerName,objectListName(row,names)]);const list=buckets.get(key)||[];list.push(row);buckets.set(key,list)}
 const result=new Map<string,string>()
 for(const list of buckets.values())list.forEach((row,index)=>result.set(row.id,`${elementName(row.kind)} · ${row.layerName}${list.length>1?` · Item ${index+1}`:''}`))
 return result
}

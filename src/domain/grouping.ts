import type { MapLayer, PlacedObject } from './models'

export const GROUP_LIMITS = { depth: 5, layerGroups: 256, objectGroups: 10000 } as const
export interface ObjectGroup {
  id: string
  layerId: string
  name: string
  objectIds: string[]
  visible: boolean
  locked: boolean
}
export interface LayerGroup {
  id: string
  name: string
  children: string[]
  visible: boolean
  locked: boolean
}
export interface LayerTree { roots: string[]; groups: LayerGroup[] }
export interface LayerRow { layer: MapLayer; depth: number; ancestors: string[] }

const fail = (detail: string): never => { throw new Error(`Invalid groups: ${detail}.`) }
function identifier(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) fail('identifier')
}
function name(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 120 || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) fail('name')
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('record')
  if (Object.keys(value).some(key => !keys.includes(key))) fail('unknown field')
  return value as Record<string, unknown>
}
function ids(value: unknown, limit: number): string[] {
  if (!Array.isArray(value) || value.length > limit) return fail('reference limit')
  value.forEach(identifier)
  if (new Set(value).size !== value.length) fail('duplicate reference')
  return [...value]
}
function flags(row: Record<string, unknown>) {
  if (typeof row.visible !== 'boolean' || typeof row.locked !== 'boolean') fail('visibility or lock')
  return { visible: row.visible as boolean, locked: row.locked as boolean }
}

/** Legacy layer order becomes root order verbatim, without moving any object. */
export function flatLayerTree(layers: MapLayer[]): LayerTree {
  return { roots: layers.map(layer => layer.id), groups: [] }
}

/** Every tree ID has one parent. Traversal is bounded before recursion. */
export function validateLayerTree(input: unknown, layers: MapLayer[]): LayerTree {
  const raw = record(input, ['roots', 'groups'])
  if (!Array.isArray(raw.groups) || raw.groups.length > GROUP_LIMITS.layerGroups) return fail('layer group limit')
  const groups = raw.groups.map(value => {
    const group = record(value, ['id', 'name', 'children', 'visible', 'locked'])
    identifier(group.id); name(group.name)
    return { id: group.id, name: group.name, children: ids(group.children, layers.length + GROUP_LIMITS.layerGroups), ...flags(group) }
  })
  const tree = { roots: ids(raw.roots, layers.length + groups.length), groups }
  const layerIds = new Set(layers.map(layer => layer.id))
  const byId = new Map(groups.map(group => [group.id, group]))
  if (layerIds.size !== layers.length || byId.size !== groups.length || groups.some(group => layerIds.has(group.id))) fail('duplicate tree identifier')
  const seen = new Set<string>()
  function visit(id: string, depth: number) {
    if (seen.has(id)) fail(`duplicate or cyclic reference ${id}`)
    seen.add(id)
    const group = byId.get(id)
    if (group) {
      if (depth >= GROUP_LIMITS.depth) fail('nesting limit')
      group.children.forEach(child => visit(child, depth + 1))
    } else if (!layerIds.has(id)) fail(`missing layer ${id}`)
  }
  tree.roots.forEach(id => visit(id, 0))
  if (seen.size !== groups.length + layers.length) fail('unreachable layers or groups')
  return tree
}

/** Top-to-bottom panel order; paint these layers in reverse order. */
export function flattenLayerTree(tree: LayerTree, layers: MapLayer[], soloId: string | null = null): LayerRow[] {
  validateLayerTree(tree, layers)
  const groups = new Map(tree.groups.map(group => [group.id, group]))
  const byId = new Map(layers.map(layer => [layer.id, layer]))
  const result: LayerRow[] = []
  function visit(id: string, ancestors: string[], visible: boolean, locked: boolean) {
    const group = groups.get(id)
    if (group) {
      group.children.forEach(child => visit(child, [...ancestors, id], visible && group.visible, locked || group.locked))
    } else {
      const layer = byId.get(id)!
      result.push({ layer: { ...layer, visible: visible && layer.visible && (!soloId || id === soloId || ancestors.includes(soloId)), locked: locked || layer.locked }, depth: ancestors.length, ancestors })
    }
  }
  tree.roots.forEach(id => visit(id, [], true, false))
  return result
}

export function validateObjectGroups(input: unknown, layers: MapLayer[], objects: PlacedObject[]): ObjectGroup[] {
  if (!Array.isArray(input) || input.length > GROUP_LIMITS.objectGroups) return fail('object group limit')
  const layerById = new Map(layers.map(layer => [layer.id, layer]))
  const existing = new Set(objects.map(object => object.id)), byObjectId=new Map(objects.map(o=>[o.id,o]))
  const used = new Set<string>(), groupIds = new Set<string>()
  return input.map(value => {
    const group = record(value, ['id', 'layerId', 'name', 'objectIds', 'visible', 'locked'])
    identifier(group.id); identifier(group.layerId); name(group.name)
    if (groupIds.has(group.id) || existing.has(group.id)) fail('duplicate group identifier')
    groupIds.add(group.id)
    const members = ids(group.objectIds, objects.length)
    for(const id of members){const object=byObjectId.get(id);if((object?.kind==='door'||object?.kind==='window')&&!members.includes(object.wallId))fail('Group an opening together with its wall, or keep it outside the group.')}
    if (!members.length) fail('empty object group')
    const layer = layerById.get(group.layerId)
    if (!layer) return fail('missing group layer')
    const positions = new Map(layer.objectIds.map((id, index) => [id, index]))
    let previous = -1
    for (const id of members) {
      const position = positions.get(id)
      if (!existing.has(id) || position === undefined) fail(`missing or cross-layer member ${id}`)
      if (used.has(id)) fail(`multiple group membership ${id}`)
      if (position! <= previous) fail('member order differs from layer order')
      used.add(id); previous = position!
    }
    return { id: group.id, layerId: group.layerId, name: group.name, objectIds: members, ...flags(group) }
  })
}

/** Move one complete subtree; reject cycles/depth overflow without mutating input. */
export function moveLayerEntry(tree: LayerTree, layers: MapLayer[], id: string, parentId: string | null, index: number): LayerTree {
  validateLayerTree(tree, layers)
  if (!Number.isInteger(index) || index < 0) fail('destination index')
  if (!layers.some(layer => layer.id === id) && !tree.groups.some(group => group.id === id)) fail('missing source')
  if (parentId !== null && !tree.groups.some(group => group.id === parentId)) fail('missing parent')
  const next = { roots: tree.roots.filter(item => item !== id), groups: tree.groups.map(group => ({ ...group, children: group.children.filter(item => item !== id) })) }
  const destination = parentId === null ? next.roots : next.groups.find(group => group.id === parentId)!.children
  destination.splice(Math.min(index, destination.length), 0, id)
  return validateLayerTree(next, layers)
}

export function createObjectGroup(id: string, name: string, selection: string[], groups: ObjectGroup[], layers: MapLayer[], objects: PlacedObject[]): ObjectGroup {
  const chosen = new Set(selection)
  if (chosen.size < 2 || chosen.size !== selection.length) fail('select at least two distinct objects')
  const layer = layers.find(layer => selection.every(id => layer.objectIds.includes(id)))
  if (!layer) return fail('group members must share one layer')
  const group = { id, name, layerId: layer.id, objectIds: layer.objectIds.filter(id => chosen.has(id)), visible: true, locked: false }
  validateObjectGroups([...groups, group], layers, objects)
  return group
}

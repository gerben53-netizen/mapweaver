import { describe, expect, it } from 'vitest'
import type { MapLayer, StampObject } from './models'
import { createObjectGroup, flatLayerTree, flattenLayerTree, moveLayerEntry, validateLayerTree, validateObjectGroups } from './grouping'
import type { LayerTree } from './grouping'

const stamp = (id: string): StampObject => ({ id, kind: 'stamp', assetId: 'asset', x: 0, y: 0, width: 20, height: 20, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 })
const objects = ['a', 'b', 'c', 'd'].map(stamp)
const layers: MapLayer[] = [
  { id: 'front', name: 'Front', visible: true, locked: false, objectIds: ['a', 'b', 'c'] },
  { id: 'back', name: 'Back', visible: true, locked: false, objectIds: ['d'] },
]
const tree: LayerTree = { roots: ['folder', 'back'], groups: [{ id: 'folder', name: 'Folder', children: ['front'], visible: true, locked: false }] }

describe('canonical object membership', () => {
  it('keeps noncontiguous members in layer order without changing z-order', () => {
    const original = structuredClone(layers)
    const group = createObjectGroup('g', 'Trees', ['c', 'a'], [], layers, objects)
    expect(group.objectIds).toEqual(['a', 'c'])
    expect(validateObjectGroups([group], layers, objects)).toEqual([group])
    expect(validateObjectGroups([], layers, objects)).toEqual([])
    expect(layers).toEqual(original)
  })
  it('rejects cross-layer, duplicate, missing and ambiguous membership', () => {
    expect(() => createObjectGroup('g', 'Trees', ['a', 'd'], [], layers, objects)).toThrow('share one layer')
    const group = createObjectGroup('g', 'Trees', ['a', 'c'], [], layers, objects)
    for (const objectIds of [['c', 'a'], ['a', 'a'], ['a', 'missing'], ['a', 'd'], []]) {
      expect(() => validateObjectGroups([{ ...group, objectIds }], layers, objects)).toThrow()
    }
    expect(() => validateObjectGroups([group, { ...group, id: 'other' }], layers, objects)).toThrow('multiple')
    expect(() => validateObjectGroups([{ ...group, locked: 'false' }], layers, objects)).toThrow()
    expect(() => validateObjectGroups([{ ...group, children: [] }], layers, objects)).toThrow('unknown')
  })
})

describe('single canonical layer tree', () => {
  it('migrates flat order deterministically and validates idempotently', () => {
    const migrated = flatLayerTree(layers)
    expect(validateLayerTree(migrated, layers)).toEqual(migrated)
    expect(validateLayerTree(validateLayerTree(migrated, layers), layers)).toEqual(migrated)
    expect(flattenLayerTree(migrated, layers).map(row => row.layer)).toEqual(layers)
  })
  it('derives inherited visibility/lock and solo without overwriting local flags', () => {
    const hidden = { ...tree, groups: tree.groups.map(group => ({ ...group, visible: false, locked: true })) }
    const rows = flattenLayerTree(hidden, layers)
    expect(rows[0]).toMatchObject({ depth: 1, ancestors: ['folder'], layer: { visible: false, locked: true } })
    expect(layers[0]).toMatchObject({ visible: true, locked: false })
    expect(flattenLayerTree(tree, layers, 'folder').map(row => row.layer.visible)).toEqual([true, false])
    expect(flattenLayerTree(hidden, layers, 'front')[0].layer.visible).toBe(false)
  })
  it('rejects dangling references, repeated IDs, cycles and orphan records', () => {
    for (const bad of [
      { ...tree, roots: ['missing'] },
      { ...tree, roots: ['folder', 'front', 'back'] },
      { ...tree, roots: ['back'] },
      { ...tree, groups: [{ ...tree.groups[0], children: ['folder', 'front'] }] },
      { ...tree, groups: [{ ...tree.groups[0], id: 'front' }] },
    ]) expect(() => validateLayerTree(bad, layers)).toThrow()
  })
  it('moves a subtree atomically and refuses cycles and excessive depth', () => {
    const original = structuredClone(tree)
    const moved = moveLayerEntry(tree, layers, 'back', 'folder', 0)
    expect(flattenLayerTree(moved, layers).map(row => row.layer.id)).toEqual(['back', 'front'])
    expect(tree).toEqual(original)
    expect(() => moveLayerEntry(tree, layers, 'folder', 'folder', 0)).toThrow()
    const nested: LayerTree = { roots: ['g0', 'back'], groups: Array.from({ length: 5 }, (_, index) => ({ id: `g${index}`, name: 'Group', visible: true, locked: false, children: [index === 4 ? 'front' : `g${index + 1}`] })) }
    expect(flattenLayerTree(nested, layers)[0].depth).toBe(5)
    const tooDeep = { ...nested, groups: [...nested.groups.map(group => group.id === 'g4' ? { ...group, children: ['g5'] } : group), { id: 'g5', name: 'Deep', children: ['front'], visible: true, locked: false }] }
    expect(() => validateLayerTree(tooDeep, layers)).toThrow('nesting')
  })
})

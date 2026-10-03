import { migratePattern } from '../domain/areas'
import { beforeEach, expect, it, vi } from 'vitest'
import { Util } from 'konva/lib/Util'
import { exportDimensions, exportScene, roll20Settings } from './scene'
import { buildScene, exportPng } from './render'
import { defaultMapStyle } from '../domain/mapSettings'
import { createPattern } from '../domain/patterns'
import { currentSnapshot } from '../projects/session'
import { useHistoryStore } from '../store/history'
import type { ProjectSnapshot } from '../store/history'
import type { StampObject } from '../domain/models'
const stamp: StampObject = { kind: 'stamp', id: 's', assetId: 'image', x: -10, y: 30, width: 100, height: 80, rotation: 45, scaleX: -1, scaleY: 1, opacity: .6 }
// Node construction is real; jsdom cannot run Konva's browser pixel-privacy probe.
beforeEach(() => { vi.spyOn(Util, 'isCanvasFarblingActive').mockReturnValue(false) })
function project(): ProjectSnapshot {
  return { map: { width: 600, height: 400, background: null, ...defaultMapStyle() }, objects: [stamp], layers: [{ id: 'objects', name: 'Objects', visible: true, locked: true, objectIds: ['s'] }] }
}
it('uses exact 1×/2× map dimensions without serializing viewport or modifying the model', () => {
  const p = project(), before = structuredClone(p)
  expect(exportDimensions(p.map, 1)).toEqual({ width: 600, height: 400 })
  expect(exportDimensions(p.map, 2)).toEqual({ width: 1200, height: 800 })
  const scene = exportScene(p, { scale: 2, includeGrid: false, transparent: false })
  expect(scene.scale).toBe(2); expect(scene).not.toHaveProperty('viewport'); expect(p).toEqual(before)
})
it('paints back to front, retaining locked visible layers and excluding hidden content and editor UI', () => {
  const p = project(); p.objects.push({ ...stamp, id: 'top' }, { ...stamp, id: 'hidden', assetId: 'missing' })
  p.layers.unshift({ ...p.layers[0], id: 'top', objectIds: ['top'] }, { ...p.layers[0], id: 'hidden', visible: false, objectIds: ['hidden'] })
  const scene = exportScene(p, { scale: 1, includeGrid: false, transparent: false })
  expect(scene.items.map((i) => i.kind === 'object' ? i.object.id : i.kind)).toEqual(['color', 's', 'top'])
  const image = Object.assign(new Image(), { width: 10, height: 10 }), root = buildScene(scene, new Map([['image', image]]))
  expect(root.clipWidth()).toBe(600); expect(root.find('Transformer')).toHaveLength(0); expect(root.find('Text')).toHaveLength(0); root.destroy()
})
it('includes grid independently from editor visibility in the requested above/below order', () => {
  const p = project(); p.map.grid.visible = false
  const options = { scale: 1 as const, includeGrid: true, transparent: false }
  expect(exportScene(p, options).items.map((i) => i.kind)).toEqual(['color', 'grid', 'object'])
  p.map.grid.renderAboveObjects = true
  expect(exportScene(p, options).items.map((i) => i.kind)).toEqual(['color', 'object', 'grid'])
  expect(exportScene(p, { ...options, includeGrid: false }).items.some((i) => i.kind === 'grid')).toBe(false)
})
it('transparent output omits only map color, preserving the background image', () => {
  const p = project(); p.map.background = { id: 'bg', name: 'floor.png', width: 200, height: 200 }
  const options = { scale: 1 as const, includeGrid: false, transparent: true }
  expect(exportScene(p, options).items.map((i) => i.kind)).toEqual(['background', 'object'])
  expect(exportScene(p, { ...options, transparent: false }).items[0]).toEqual({ kind: 'color', color: p.map.backgroundColor })
})
it('passes stamp pivot, mirrors, alpha and repeat/stretch transforms to the actual Konva adapter', () => {
  const p = project(), pattern = { ...createPattern('image', { x: 50, y: 60, width: 150, height: 100 }), patternRotation: 30, patternScale: 2, patternOffsetX: 7, patternOffsetY: -3, opacity: .4 }
  p.objects.push(migratePattern(pattern)); p.layers[0].objectIds.push(pattern.id)
  const image = Object.assign(new Image(), { width: 20, height: 10 })
  for (const mode of ['repeat', 'stretch'] as const) {
    pattern.mode = mode; p.objects[1]=migratePattern(pattern)
    const root = buildScene(exportScene(p, { scale: 2, includeGrid: false, transparent: true }), new Map([['image', image]]))
    const group = root.getChildren()[0]
    expect(group.getAttrs()).toMatchObject({ x: 40, y: 70, offsetX: 50, offsetY: 40, rotation: 45 })
    expect(root.find('Image')[0].getAttrs()).toMatchObject({ x: 100, scaleX: -1, scaleY: 1, opacity: .6 })
    expect(root.find('Shape').find(n=>n.getClassName()==='Shape')!.getAttrs()).toMatchObject({width:150,height:100,sceneFunc:expect.any(Function)})
    root.destroy()
  }
})
it('rejects missing assets and output limits without changing project/history/dirty state or allocating pixels', async () => {
  const snapshot = currentSnapshot(), history = useHistoryStore.getState(), resolve = vi.fn(async () => { throw new Error('Missing image') })
  await expect(exportPng(project(), { scale: 1, includeGrid: true, transparent: false }, resolve)).rejects.toThrow('image: Missing image')
  const p = project(); p.map.width = 6000; p.map.height = 4000; resolve.mockClear()
  await expect(exportPng(p, { scale: 2, includeGrid: false, transparent: false }, resolve)).rejects.toThrow('32 million pixels')
  expect(resolve).not.toHaveBeenCalled(); expect(currentSnapshot()).toEqual(snapshot); expect(useHistoryStore.getState()).toBe(history)
})
it('reports scaled cell pixels, exact cells and partial offset edges without rounding them into whole cells', () => {
  const p = project(), options = { scale: 2 as const, includeGrid: false, transparent: false }
  const info = roll20Settings(p.map, options)
  expect(info).toContain('1200 × 800'); expect(info).toContain('100 export pixels per cell'); expect(info).toContain('Horizontal: 12 cells'); expect(info).toContain('Vertical: 8 cells')
  p.map.grid.offsetX = -10; p.map.height = 410
  const partial = roll20Settings(p.map, options)
  expect(partial).toContain('Partial edge cells'); expect(partial).toContain('Grid origin: 80, 0'); expect(partial).toContain('11 full + partial')
})

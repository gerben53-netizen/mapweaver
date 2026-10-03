import { beforeEach, expect, it, vi } from 'vitest'
import { registerTestAssets } from '../test/assets'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
import { useProjectStore as project } from './projectStore'
import { useEditorStore as editor } from './editorStore'
import { history, useHistoryStore } from './history'
import { applyMaterial, cancelMaterial, materialTargets, openMaterialBrowser, previewMaterial, useMaterialPreview } from './materialApplication'
import { defaultLandArea } from '../domain/landAreas'
import { canCreateWithTool } from '../domain/mapCapabilities'
import { projectAssets } from '../projects/assets'
import { TerrainStroke, defaultTerrainBrush } from '../domain/terrainBrush'
vi.mock('../images/imageCache', () => ({ acquireAssetImage: () => ({ promise: Promise.resolve({ width: 40, height: 60 }), release: vi.fn() }) }))

beforeEach(() => {
  cancelMaterial(); history.cancel()
  registerTestAssets({ floor: 'fillPattern', wood: 'fillPattern', tree: 'stamp' })
  project.setState({ map: { width: 600, height: 400, background: null, ...defaultMapStyle() }, ...createLayeredContent(), objectGroups: [], layerTree: null })
  editor.setState({ selectedObjectIds: [], soloLayerId: null, activeLayerId: 'objects', activeTool: 'select', picker: null })
  history.reset()
})
function floors(count = 1) {
  const ids = Array.from({ length: count }, (_, i) => project.getState().createPattern('floor', { x: i * 120 + 10, y: 20, width: 100, height: 80 }, 'objects')!)
  editor.setState({ selectedObjectIds: ids }); history.reset(); return ids
}
it('requires existing compatible selection and never falls back to a drawing tool', () => {
  expect(openMaterialBrowser()).toBe(false)
  expect(editor.getState()).toMatchObject({ activeTool: 'select', picker: null })
  expect(canCreateWithTool('battlemap', 'patternFill')).toBe(false)
  floors(); editor.setState({ selectedObjectIds: ['missing'] })
  expect(openMaterialBrowser()).toBe(false)
  expect(project.getState().objects).toHaveLength(1)
  project.getState().place(projectAssets().find(a => a.id === 'tree')!, { x: 300, y: 200 })
  expect(openMaterialBrowser()).toBe(false)
  expect(editor.getState().activeTool).toBe('select')
})
it('previews outside the document, then cancel restores exact state with no history', async () => {
  floors(); const before = project.getState()
  openMaterialBrowser(); await previewMaterial('wood', 'project')
  expect(useMaterialPreview.getState().asset?.id).toBe('wood')
  expect(project.getState()).toBe(before)
  expect(useHistoryStore.getState()).toMatchObject({ dirty: false, undoCount: 0 })
  cancelMaterial(); expect(useMaterialPreview.getState().asset).toBeNull()
  expect(project.getState()).toBe(before)
})
it('applies to three Areas atomically, preserves all non-fill data and supports exact undo/redo', async () => {
  floors(3)
  project.setState(s => ({ objects: s.objects.map((o, i) => o.kind === 'area' ? { ...o, ...(i === 2 ? { land: defaultLandArea('terrain-region') } : {}), fill: { kind: 'pattern', assetId: 'floor', mode: 'repeat', scale: .5, rotation: 23, offsetX: 7, offsetY: 9 } } : o) }))
  history.reset(); const before = project.getState()
  openMaterialBrowser(); await previewMaterial('wood', 'project'); applyMaterial()
  const after = project.getState()
  expect(after.layers).toBe(before.layers)
  expect(after.map).toEqual({ ...before.map, campfireRevision: before.map.campfireRevision! + 1 })
  expect(after.objects).toEqual(before.objects.map(o => o.kind === 'area' ? { ...o, fill: { ...o.fill, assetId: 'wood' } } : o))
  expect(editor.getState().activeTool).toBe('select')
  expect(useHistoryStore.getState().undoCount).toBe(1)
  history.undo(); expect(project.getState().objects).toEqual(before.objects)
  history.redo(); expect(project.getState().objects).toEqual(after.objects)
})
it('skips locked Areas, including inherited locks, and non-Areas in mixed selection', () => {
  const ids = floors(3)
  project.setState(s => ({ objects: s.objects.map((o, i) => i === 1 ? { ...o, locked: true } : o), objectGroups: [{ id: 'g', name: 'Locked', layerId: 'objects', objectIds: [ids[2]], visible: true, locked: true }] }))
  editor.setState({ selectedObjectIds: [...ids, 'missing'] })
  expect(materialTargets().map(o => o.id)).toEqual([ids[0]])
})
it('rejects stale selection or project state without overwriting later changes', async () => {
  floors(); openMaterialBrowser(); await previewMaterial('wood', 'project')
  editor.setState({ selectedObjectIds: [] })
  expect(() => applyMaterial()).toThrow('changed')
  expect(useHistoryStore.getState().undoCount).toBe(0)
  cancelMaterial(); floors(); openMaterialBrowser(); await previewMaterial('wood', 'project')
  project.setState(s => ({ map: { ...s.map, backgroundColor: '#ffffff' } }))
  expect(() => applyMaterial()).toThrow('changed')
})
it('starts at scale 1 for solid fills, preserves independent texture paint, and creates no geometry', async () => {
  floors(); project.setState(s => ({ objects: s.objects.map(o => o.kind === 'area' ? { ...o, fill: { kind: 'solid', color: '#abcdef' } } : o) }))
  const stroke = new TerrainStroke(undefined, { ...defaultTerrainBrush, assetId: 'floor', size: 32, textureScale: .5 }, project.getState().map, undefined, undefined, undefined, true)
  stroke.add({ x: 40, y: 40 })
  project.setState(s => ({ map: { ...s.map, texturePaint: stroke.finish() } }))
  const map = project.getState().map, before = project.getState().objects
  history.reset(); openMaterialBrowser(); await previewMaterial('wood', 'project'); applyMaterial()
  expect(project.getState().map).toEqual({ ...map, campfireRevision: map.campfireRevision! + 1 })
  expect(project.getState().map.texturePaint).toBe(map.texturePaint)
  expect(project.getState().objects).toHaveLength(1)
  expect(project.getState().objects[0]).toMatchObject({ id: before[0].id, fill: { kind: 'pattern', assetId: 'wood', scale: 1 } })
})
it('ignores a decoded image arriving after cancellation', async () => {
  floors(); openMaterialBrowser()
  const pending = previewMaterial('wood', 'project')
  cancelMaterial(); await pending
  expect(useMaterialPreview.getState()).toMatchObject({ targets: [], asset: null, image: undefined })
  expect(useHistoryStore.getState().undoCount).toBe(0)
})

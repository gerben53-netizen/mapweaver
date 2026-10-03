import { beforeEach, expect, it } from 'vitest'
import { useProjectStore as project } from './projectStore'
import { useEditorStore as editor } from './editorStore'
import { history, useHistoryStore } from './history'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { SIMPLE_WALL, wallStyle } from '../domain/walls'
import type { RoomRecipe } from '../domain/roomGenerator'
import { editableProjectIds, projectObjects } from '../domain/projectView'
import { registerTestAssets } from '../test/assets'
import { parseProject } from '../projects/format'
import { exportScene } from '../export/scene'
import { mapWorkspace } from '../domain/geography'
import { createArea, rectangleGeometry } from '../domain/areas'
import { DOCUMENT_LIMITS } from '../domain/documentLimits'
const recipe: RoomRecipe = { name: '', shape: 'rectangle', width: 8, height: 6, floor: { kind: 'solid', color: '#bbaa99' }, walls: SIMPLE_WALL, doors: 2, doorType: 'single', doorWidth: .6, seed: 48217 }
const snapshot = () => { const { map, objects, layers, layerTree, objectGroups } = project.getState(); return structuredClone({ map, objects, layers, layerTree, objectGroups }) }
const add = (name = '') => project.getState().generateRoom({ ...recipe, name }, { x: 500, y: 500 })
it('edits native outside wall thickness with exact undo/redo without resizing floor or opening width', () => {
  add('Thickness'); const before=snapshot(), wall=before.objects.find(o=>o.kind==='path')!
  if(wall.kind!=='path')throw Error('Expected wall')
  project.getState().updateWallStyles([wall.id],{...wallStyle(wall),strokeWidth:50})
  const after=snapshot()
  expect(after.objects.find(o=>o.kind==='area')).toEqual(before.objects.find(o=>o.kind==='area'))
  expect(after.objects.filter(o=>o.kind==='door').map(o=>o.openingWidth)).toEqual(before.objects.filter(o=>o.kind==='door').map(o=>o.openingWidth))
  expect(after.objects.find(o=>o.id===wall.id)).toMatchObject({strokeWidth:50,wall:{alignment:'outside'},nodes:wall.nodes})
  history.undo();expect(snapshot().objects).toEqual(before.objects);expect(snapshot().layers).toEqual(before.layers)
  history.redo();expect(snapshot().objects).toEqual(after.objects);expect(snapshot().layers).toEqual(after.layers)
})
beforeEach(() => { history.cancel(); registerTestAssets({ floor: 'fillPattern' }); project.setState({ map: { ...defaultMapStyle(), width: 2000, height: 2000, background: null }, ...createLayeredContent(), layerTree: null, objectGroups: [] }); editor.setState({ activeLayerId: 'objects', selectedObjectIds: [], soloLayerId: null, editingGroupId: null }); history.reset() })
it('creates a dedicated normal active layer, bypassing hidden/locked active parents and solo', () => {
  project.getState().changeLayer('objects', { locked: true, visible: false }); editor.setState({ soloLayerId: 'objects' }); project.setState({ layerTree: { roots: ['group'], groups: [{ id: 'group', name: 'Old group', children: ['objects'], visible: false, locked: true }] } }); history.reset()
  const before = snapshot(), id = add('Bibliotheek'), state = project.getState()
  expect(state.layers).toHaveLength(before.layers.length + 1); expect(state.layers[0]).toMatchObject({ id, name: 'Bibliotheek', visible: true, locked: false, objectIds: state.objects.map(o => o.id) }); expect(state.layers[1]).toEqual(before.layers[0]); expect(state.layerTree?.roots).toEqual([id, 'group']); expect(editor.getState()).toMatchObject({ activeLayerId: id, soloLayerId: null }); expect(editableProjectIds(state).size).toBe(4)
  const after = snapshot(); expect(useHistoryStore.getState().undoCount).toBe(1); history.undo(); expect(snapshot()).toEqual(before); history.redo(); expect(snapshot()).toEqual(after)
})
it('keeps multiple rooms independent under native hide, lock, rename, reorder, and undo', () => {
  const manual = createArea(rectangleGeometry({ x: 10, y: 10, width: 100, height: 100 })); project.getState().addArea(manual)
  const a = add(), b = add(); expect(project.getState().layers.map(l => l.name)).toEqual(['Room 2', 'Room 1', 'Objects'])
  const idsA = project.getState().layers.find(l => l.id === a)!.objectIds, idsB = project.getState().layers.find(l => l.id === b)!.objectIds
  project.getState().changeLayer(a, { visible: false, name: 'Bibliotheek' }); project.getState().changeLayer(b, { locked: true, name: "Maelyra's werkkamer" }); project.getState().reorderLayer(a, -1)
  expect(projectObjects(project.getState(), true).map(o => o.id)).toEqual(expect.arrayContaining(idsB)); expect(projectObjects(project.getState(), true).some(o => idsA.includes(o.id))).toBe(false); expect(idsB.some(id => editableProjectIds(project.getState()).has(id))).toBe(false); expect(project.getState().objects.find(o => o.id === manual.id)).toEqual(manual)
  const before = snapshot(); add('Third'); history.undo(); expect(snapshot()).toEqual(before)
})
it('rejects unavailable materials, unsafe geometry, and layer exhaustion atomically', () => {
  const before = snapshot()
  expect(() => project.getState().generateRoom({ ...recipe, floor: { kind: 'pattern', assetId: 'missing', mode: 'repeat', scale: 1, rotation: 0, offsetX: 0, offsetY: 0 } }, { x: 500, y: 500 })).toThrow(/material/)
  expect(() => project.getState().generateRoom({ ...recipe, width: 0 }, { x: 500, y: 500 })).toThrow()
  expect(snapshot()).toEqual(before); expect(useHistoryStore.getState().undoCount).toBe(0)
  project.setState({ layers: Array.from({ length: DOCUMENT_LIMITS.layers }, (_, i) => ({ id: `layer${i}`, name: `Layer ${i}`, visible: true, locked: false, objectIds: [] })) }); const full = snapshot(); expect(() => add()).toThrow(/Layer limit/); expect(snapshot()).toEqual(full)
})
it('roundtrips native room objects and layer states through the current parser and normal 1x/2x export', () => {
  const a = add('Bibliotheek'), b = add("Maelyra's werkkamer")
  project.getState().changeLayer(a, { visible: false }); project.getState().changeLayer(b, { locked: true }); project.getState().reorderLayer(a, -1)
  const state = snapshot(), workspace = mapWorkspace(state.map)
  const file = { ...state, map: { ...state.map, ...workspace }, formatVersion: 12, id: 'test-room', name: 'Rooms', createdAt: '2026-09-27T00:00:00.000Z', modifiedAt: '2026-09-27T00:00:00.000Z', assets: [] }
  const parsed = parseProject(JSON.parse(JSON.stringify(file)))
  expect(parsed.objects).toEqual(state.objects); expect(parsed.layers).toEqual(state.layers)
  for (const scale of [1, 2] as const) { const scene = exportScene(parsed, { scale, includeGrid: false, transparent: false }); expect(scene.width).toBe(2000 * scale); expect(scene.items.filter(i => i.kind === 'object')).toHaveLength(4) }
})

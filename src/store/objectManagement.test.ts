import { effectiveLayers, projectObjects } from '../domain/projectView'
import { beforeEach, expect, it } from 'vitest'
import { useProjectStore as project } from './projectStore'
import { useEditorStore as editor } from './editorStore'
import { createLayeredContent, OBJECT_OFFSET, orderedObjects, reorderObjects } from '../domain/layers'
import { handleEditorShortcut } from './shortcuts'
const a = { kind: 'stamp' as const, id: 'a', assetId: 'tree', x: 10, y: 20, width: 100, height: 120, rotation: 35, scaleX: -1, scaleY: 1, opacity: 0.7 }
const b = { ...a, id: 'b', assetId: 'chair', x: 160, y: 90 }
beforeEach(() => {
  project.setState({ ...createLayeredContent([a, b]), objectGroups: [], layerTree: null })
  editor.setState({ selectedObjectIds: [], activeLayerId: 'objects', clipboard: [], pasteCount: 0, message: '' })
})
it('adds and orders layers and objects with top-panel layers painted last, keeping one layer', () => {
  project.getState().addLayer()
  const id = editor.getState().activeLayerId
  expect(project.getState().layers.map((layer) => layer.name)).toEqual(['Layer 2', 'Objects'])
  editor.getState().select('a'); project.getState().moveSelection(id)
  expect(projectObjects(project.getState()).map((object) => object.id)).toEqual(['b', 'a'])
  project.getState().reorderLayer(id, 1)
  expect(projectObjects(project.getState()).map((object) => object.id)).toEqual(['a', 'b'])
  expect(reorderObjects(['a', 'b', 'c', 'd'], ['a', 'b'], 'forward')).toEqual(['c', 'a', 'b', 'd'])
  expect(reorderObjects(['a', 'b', 'c'], ['a', 'b'], 'front')).toEqual(['c', 'a', 'b'])
  project.getState().changeLayer(id, { name: '  ' }); expect(effectiveLayers(project.getState())[1].name).toBe('Layer 2')
  project.getState().deleteLayer(id); expect(project.getState().layers).toHaveLength(2)
  project.getState().deleteLayer(id, true); project.getState().deleteLayer('objects', true)
  expect(project.getState().layers).toHaveLength(1)
})
it('hides or locks layers, cleans selection and blocks mutations, selection and paste targets', () => {
  editor.getState().select('a'); project.getState().copy()
  project.getState().changeLayer('objects', { visible: false })
  expect(editor.getState().selectedObjectIds).toEqual([])
  expect(orderedObjects(project.getState().layers, project.getState().objects, true)).toEqual([])
  project.getState().changeLayer('objects', { visible: true, locked: true })
  editor.getState().select('a'); expect(editor.getState().selectedObjectIds).toEqual([])
  project.getState().updateTransform('a', { ...a, x: 999 })
  project.getState().paste(); project.getState().deleteSelection(); project.getState().duplicate()
  expect(project.getState().objects).toEqual([a, b])
  expect(editor.getState().message).toContain('locked')
  project.getState().addLayer(); editor.setState({ selectedObjectIds: ['a'] })
  project.getState().moveSelection(editor.getState().activeLayerId)
  expect(project.getState().layers[1].objectIds).toEqual(['a', 'b'])
})
it('toggles multi-selection and translates snapshots by one map delta without changing viewport or geometry', () => {
  const viewport = editor.getState().viewport
  editor.getState().select('a'); editor.getState().select('b', true)
  editor.getState().select('b', true); expect(editor.getState().selectedObjectIds).toEqual(['a'])
  editor.getState().select('b', true); editor.getState().select('missing', true)
  expect(editor.getState().selectedObjectIds).toEqual(['a', 'b'])
  project.getState().translate([a, b], { x: 24, y: -10 })
  project.getState().translate([a, b], { x: 50, y: -30 })
  expect(project.getState().objects).toEqual([{ ...a, x: 60, y: -10 }, { ...b, x: 210, y: 60 }])
  expect(editor.getState().viewport).toBe(viewport)
})
it('duplicates in source layers and pastes ordered snapshots into the active layer with new IDs and increasing offsets', () => {
  project.getState().addLayer(); const upper = editor.getState().activeLayerId
  editor.getState().select('b'); project.getState().moveSelection(upper)
  editor.getState().select('a', true); project.getState().copy(); project.getState().duplicate()
  const copies = project.getState().objects.slice(2)
  expect(copies.map((object) => object.assetId)).toEqual(['tree', 'chair'])
  expect(project.getState().layers.find((layer) => layer.id === upper)!.objectIds).toEqual(['b', copies[1].id])
  expect(project.getState().layers[1].objectIds).toEqual(['a', copies[0].id])
  project.getState().paste(); project.getState().paste()
  const pasted = project.getState().objects.slice(-2)
  expect(pasted.map((object) => object.assetId)).toEqual(['tree', 'chair'])
  expect(pasted[0]).toEqual({ ...a, id: pasted[0].id, x: a.x + 2 * OBJECT_OFFSET, y: a.y + 2 * OBJECT_OFFSET })
  expect(new Set(project.getState().objects.map((object) => object.id)).size).toBe(8)
  expect(editor.getState().selectedObjectIds).toEqual(pasted.map((object) => object.id))
})
it('moves references preserving data and relative order; deletion removes instances only and clears selection', () => {
  project.getState().addLayer(); const layer = editor.getState().activeLayerId
  editor.getState().select('b'); editor.getState().select('a', true)
  project.getState().moveSelection(layer)
  expect(project.getState().layers[0].objectIds).toEqual(['a', 'b'])
  expect(project.getState().objects).toEqual([a, b])
  project.getState().copy(); project.getState().deleteSelection()
  expect(project.getState().objects).toEqual([])
  expect(project.getState().layers.every((item) => item.objectIds.length === 0)).toBe(true)
  expect(editor.getState().selectedObjectIds).toEqual([])
  expect(editor.getState().clipboard.map((item) => item.assetId)).toEqual(['tree', 'chair'])
})
it('handles editor shortcuts but ignores editable inputs, nested contenteditable and repeated keys', () => {
  editor.getState().select('a')
  const surface = document.createElement('div'); surface.setAttribute('data-mapweaver-editor', ''); document.body.append(surface)
  window.addEventListener('keydown', handleEditorShortcut)
  try {
    for (const tag of ['input', 'textarea', 'select', 'div']) {
      const host = document.createElement(tag)
      if (tag === 'div') { host.setAttribute('contenteditable', 'true'); host.append(document.createElement('span')) }
      document.body.append(host)
      for (const [key, ctrlKey] of [['Delete', false], ['Backspace', false], ['d', true], ['v', true], ['c', true], ['Escape', false]] as const) {
        (host.firstChild || host).dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true }))
      }
      host.remove()
    }
    expect(project.getState().objects).toEqual([a, b]); expect(editor.getState().selectedObjectIds).toEqual(['a'])
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, repeat: true, bubbles: true }))
    expect(project.getState().objects).toHaveLength(2)
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }))
    expect(project.getState().objects).toHaveLength(3)
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(project.getState().objects).toEqual([a, b])
  } finally { surface.remove(); window.removeEventListener('keydown', handleEditorShortcut) }
})



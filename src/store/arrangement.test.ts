import { beforeEach, expect, it } from 'vitest'
import { useProjectStore as project } from './projectStore'
import { useEditorStore as editor } from './editorStore'
import { history, useHistoryStore } from './history'
import { createLayeredContent, selectionBounds } from '../domain/layers'
import { createArea, rectangleGeometry } from '../domain/areas'
import { createPath } from '../domain/paths'
import { handleEditorShortcut } from './shortcuts'

const area = createArea(rectangleGeometry({ x: 20, y: 30, width: 100, height: 80 }))
const path = createPath([{ id: 'start', x: 200, y: 200, mode: 'corner' }, { id: 'end', x: 350, y: 260, mode: 'corner' }])
beforeEach(() => {
  project.setState({...createLayeredContent([area, path]), objectGroups: [], layerTree: null})
  editor.setState({ selectedObjectIds: [area.id, path.id], editingGroupId: null, soloLayerId: null, activeLayerId: 'objects', activeTool: 'select', message: '', workspace: 'editor' })
  history.reset()
})
it('aligns mixed geometry in one undo entry and restores exact snapshots', () => {
  project.getState().arrange('left')
  const changed = project.getState().objects
  expect(selectionBounds([changed[1]]).x).toBeCloseTo(area.x)
  expect(useHistoryStore.getState().undoCount).toBe(1)
  history.undo(); expect(project.getState().objects).toEqual([area, path])
  history.redo(); expect(project.getState().objects).toEqual(changed)
})
it('rejects all movement and alignment when one member is locked', () => {
  const objects = [area, { ...path, locked: true }]
  project.setState({ objects })
  history.reset()
  project.getState().arrange('top')
  project.getState().translate(objects, { x: 50, y: 20 })
  project.getState().nudge({ x: 1, y: 0 })
  expect(project.getState().objects).toEqual(objects)
  expect(useHistoryStore.getState().undoCount).toBe(0)
  expect(editor.getState().message).toContain('unlocked')
})
it('nudges from canvas, uses a grid cell with Shift and ignores inputs', () => {
  const surface = document.createElement('div')
  surface.setAttribute('data-mapweaver-editor', '')
  const input = document.createElement('input'); surface.append(input); document.body.append(surface)
  window.addEventListener('keydown', handleEditorShortcut)
  try {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(project.getState().objects).toEqual([area, path])
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(project.getState().objects[0].x).toBe(area.x + 1)
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }))
    expect(project.getState().objects[0].y).toBe(area.y + project.getState().map.grid.cellSize)
    expect(useHistoryStore.getState().undoCount).toBe(2)
    history.undo(); history.undo()
    expect(project.getState().objects).toEqual([area, path])
  } finally { surface.remove(); window.removeEventListener('keydown', handleEditorShortcut) }
})
it('groups and ungroups from shortcuts, ignores typing and exits group without losing selection', () => {
  const surface = document.createElement('div'), input = document.createElement('input')
  surface.setAttribute('data-mapweaver-editor', ''); surface.append(input); document.body.append(surface)
  window.addEventListener('keydown', handleEditorShortcut)
  try {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, bubbles: true }))
    expect(project.getState().objectGroups).toEqual([])
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, bubbles: true }))
    expect(project.getState().objectGroups).toHaveLength(1)
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(editor.getState().editingGroupId).toBe(project.getState().objectGroups[0].id)
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(editor.getState().editingGroupId).toBeNull(); expect(editor.getState().selectedObjectIds).toHaveLength(2)
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'G', ctrlKey: true, shiftKey: true, bubbles: true }))
    expect(project.getState().objectGroups).toEqual([])
  } finally { surface.remove(); window.removeEventListener('keydown', handleEditorShortcut) }
})

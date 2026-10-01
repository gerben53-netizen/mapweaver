import { registerTestAssets } from '../test/assets'
import { beforeEach, expect, it } from 'vitest'
import { useProjectStore as project } from './projectStore'
import { useEditorStore as editor } from './editorStore'
import { HISTORY_LIMIT, history, useHistoryStore as status } from './history'
import { beginObjectEdit } from './objectEdits'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { transformArea } from '../domain/areas'
import { backgroundBlob, keepBackground } from '../images/backgroundAssets'
import { handleEditorShortcut } from './shortcuts'
import { cancelObjectGesture, ownObjectGesture } from '../canvas/interaction'
const asset = { kind: 'stamp' as const, id: 'tree', name: 'Tree', naturalWidth: 40, naturalHeight: 60, mimeType: 'image/png', categoryId: '', contentHash: '', createdAt: '' }
// Export revision is monotonic metadata; undo restores authored content, not an older revision.
const contentMap = (map: ReturnType<typeof project.getState>['map']) => { const {campfireRevision: _revision,...content}=map;void _revision;return content }
const snapshot = () => { const { map, objects, layers } = project.getState(); return { map:contentMap(map), objects, layers } }
const place = () => project.getState().place(asset, { x: 100, y: 100 })
beforeEach(() => { registerTestAssets({ tree: 'stamp', floor: 'fillPattern' });
  cancelObjectGesture(); history.cancel()
  project.setState({ objectGroups: [], layerTree: null, map: { width: 600, height: 400, background: null, ...defaultMapStyle() }, ...createLayeredContent() })
  editor.setState({ editingGroupId: null, soloLayerId: null, selectedObjectIds: [], activeLayerId: 'objects', clipboard: [], pasteCount: 0, activeTool: 'select' })
  history.reset()
})
it('restores exact identities, order and background resources, tracks the clean point and excludes editor data', async () => {
  const initial = snapshot(); place()
  const id = project.getState().objects[0].id
  editor.setState({ selectedObjectIds: [id] }); project.getState().duplicate()
  const duplicated = snapshot(); project.getState().deleteSelection(); const deleted = snapshot()
  expect(history.undo()).toBe(true); expect(snapshot()).toEqual(duplicated)
  expect(history.redo()).toBe(true); expect(snapshot()).toEqual(deleted)
  history.markClean(); expect(status.getState().dirty).toBe(false)
  const blobA = new Blob(['a']), blobB = new Blob(['b'])
  keepBackground('a', blobA); project.getState().setBackground({ id: 'a', name: 'A', width: 700, height: 500 })
  const firstBackground = snapshot()
  keepBackground('b', blobB); project.getState().setBackground({ id: 'b', name: 'B', width: 800, height: 600 })
  const secondBackground = snapshot()
  history.undo(); expect(snapshot()).toEqual(firstBackground); expect(await backgroundBlob('a')).toBe(blobA)
  history.redo(); expect(snapshot()).toEqual(secondBackground); expect(await backgroundBlob('b')).toBe(blobB)
  history.undo(); history.undo(); expect(status.getState().dirty).toBe(true) // New revisions must still be persisted.
  editor.setState({ viewport: { zoom: 2, pan: { x: 3, y: 4 } }, activeTool: 'patternFill', clipboard: [...duplicated.objects] })
  while (history.undo()) { /* Return to initial state. */ }
  expect(snapshot()).toEqual(initial)
  expect(editor.getState()).toMatchObject({ activeTool: 'patternFill', viewport: { zoom: 2, pan: { x: 3, y: 4 } }, clipboard: duplicated.objects })
  history.redo(); expect(project.getState().objects[0].id).toBe(id)
  history.reset(); expect(status.getState()).toMatchObject({ undoCount: 0, redoCount: 0, dirty: false })
  await expect(backgroundBlob('a')).rejects.toThrow(); await expect(backgroundBlob('b')).rejects.toThrow()
})
it('records many single and group preview frames as one completed gesture each and blocks active undo', () => {
  place(); const before = project.getState().objects[0]; history.reset()
  const edit = beginObjectEdit(before.id)!
  for (let x = 1; x <= 60; x++) edit.preview({ ...before, x, width: 80, height: 120, rotation: x })
  expect(status.getState().undoCount).toBe(0); expect(history.undo()).toBe(false)
  edit.finish(); edit.finish(); expect(status.getState().undoCount).toBe(1)
  history.undo(); expect(project.getState().objects[0]).toEqual(before); history.redo()
  editor.setState({ selectedObjectIds: [before.id] }); project.getState().duplicate(); history.reset()
  const group = project.getState().objects
  const groupEdit = beginObjectEdit(group[0].id, 'Move objects')!
  for (let x = 0; x < 30; x++) project.getState().translate(group, { x, y: x * 2 })
  project.getState().commitTranslation(group, project.getState().objects)
  expect(status.getState().undoCount).toBe(1); history.undo(); expect(project.getState().objects).toEqual(group)
  // Completion closes the shared transaction; a later finish cannot add another entry.
  groupEdit.finish(); expect(status.getState().undoCount).toBe(0)
})
it('restores compound layer deletion, pattern settings and map forms atomically and cleans selection', () => {
  project.getState().addLayer(); const layer = editor.getState().activeLayerId
  const id = project.getState().createPattern('floor', { x: 10, y: 20, width: 100, height: 80 }, layer)!
  const area = project.getState().objects.find(o=>o.id===id)!
  if(area.kind!=='area')throw new Error('Expected canonical area')
  history.run('Change area',()=>project.getState().updateArea({...transformArea(area,{...area,x:40,y:30,width:200,height:90}),opacity:0.4}))
  const patterned = snapshot(); history.undo(); expect(project.getState().objects[0]).toMatchObject({ kind: 'area', fill: {kind:'pattern',scale:1}, x: 10 }); history.redo(); expect(snapshot()).toEqual(patterned)
  project.getState().changeLayer(layer, { locked: true, visible: false, name: 'Floor' }); expect(editor.getState().selectedObjectIds).toEqual([])
  history.undo(); expect(snapshot()).toEqual(patterned)
  project.getState().deleteLayer(layer, true); const removed = snapshot(); history.undo(); expect(snapshot()).toEqual(patterned); history.redo(); expect(snapshot()).toEqual(removed)
  const map = project.getState().map
  project.getState().applyMapSettings({ ...map, width: 700, backgroundColor: '#ffffff', grid: { ...map.grid, cellSize: 75, snapEnabled: true } }, () => true)
  history.undo(); expect(contentMap(project.getState().map)).toEqual(contentMap(map))
})
it('a new effective command after undo clears redo; a no-op leaves the branch available', () => {
  place(); project.getState().addLayer(); history.undo()
  project.getState().changeLayer('objects', { name: 'Objects' }); expect(status.getState().redoCount).toBe(1)
  project.getState().changeLayer('objects', { name: 'Ground' }); expect(status.getState().redoCount).toBe(0); expect(history.redo()).toBe(false)
})
it('evicts only the oldest steps at the central limit, keeping the newest IDs redoable', () => {
  for (let i = 0; i < HISTORY_LIMIT + 2; i++) place()
  const all = snapshot(); expect(status.getState().undoCount).toBe(HISTORY_LIMIT)
  for (let i = 0; i < HISTORY_LIMIT; i++) expect(history.undo()).toBe(true)
  expect(project.getState().objects).toEqual(all.objects.slice(0, 2)); expect(history.undo()).toBe(false)
  while (history.redo()) { /* replay existing IDs */ }
  expect(snapshot()).toEqual(all)
})
it('no-op, invalid form and cancelled gestures restore the original state without recording', () => {
  place(); history.reset(); const before = project.getState().objects[0], original = snapshot()
  const noop = beginObjectEdit(before.id)!; noop.preview(before); noop.finish(); expect(status.getState().undoCount).toBe(0)
  const edit = beginObjectEdit(before.id)!
  const release = ownObjectGesture(() => edit.finish(), () => edit.cancel())
  edit.preview({ ...before, x: 333 }); cancelObjectGesture(); release()
  expect(snapshot()).toEqual(original); expect(status.getState()).toMatchObject({ busy: false, dirty: false, undoCount: 0 })
  expect(() => project.getState().applyMapSettings({ ...original.map, width: NaN }, () => true)).toThrow()
  expect(snapshot()).toEqual(original); expect(status.getState().undoCount).toBe(0)
})
it('scopes Ctrl/Cmd undo/redo to the editor, ignores text editing and repeated/default-prevented events', () => {
  const root = document.createElement('div'); root.setAttribute('data-mapweaver-editor', ''); document.body.append(root)
  const surface = document.createElement('div'); root.append(surface)
  const key = (target: HTMLElement, value: string, extras: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: value, ctrlKey: true, bubbles: true, cancelable: true, ...extras })
    target.addEventListener('keydown', handleEditorShortcut, { once: true }); target.dispatchEvent(event); return event
  }
  place()
  for (const tag of ['input', 'textarea', 'select']) { const field = document.createElement(tag); root.append(field); expect(key(field, 'z').defaultPrevented).toBe(false) }
  const editable = document.createElement('div'); editable.contentEditable = 'true'; editable.setAttribute('contenteditable', 'true'); root.append(editable)
  expect(key(editable, 'z').defaultPrevented).toBe(false); expect(key(document.body, 'z').defaultPrevented).toBe(false)
  expect(status.getState().undoCount).toBe(1)
  expect(key(surface, 'z').defaultPrevented).toBe(true); expect(project.getState().objects).toHaveLength(0)
  key(surface, 'z', { ctrlKey: false, metaKey: true, shiftKey: true }); expect(project.getState().objects).toHaveLength(1)
  key(surface, 'z', { repeat: true }); expect(project.getState().objects).toHaveLength(1)
  key(surface, 'z'); key(surface, 'y'); expect(project.getState().objects).toHaveLength(1)
  root.remove()
})

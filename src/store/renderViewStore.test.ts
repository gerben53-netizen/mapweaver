import {useArlStore} from './arlStore'
import { afterEach, expect, it, vi } from 'vitest'
import { setRenderView, useRenderViewStore } from './renderViewStore'
import { useEditorStore } from './editorStore'
import { history, useHistoryStore } from './history'
import { useProjectStore } from './projectStore'
import { currentSnapshot, useProjectSession } from '../projects/session'
import { handleEditorShortcut } from './shortcuts'
import { ownObjectGesture } from '../canvas/interaction'
afterEach(() => { useRenderViewStore.setState({ view: 'edit' }); useHistoryStore.setState({ busy: false }); history.reset(); vi.restoreAllMocks() })
it('defaults to Edit and switching preserves canonical data, selection and camera', () => {
  expect(useRenderViewStore.getState().view).toBe('edit'); expect(useArlStore.getState().mode).toBeUndefined()
  useEditorStore.setState({ selectedObjectIds: ['selected'], viewport: { zoom: .75, pan: { x: 19, y: 21 } } })
  const data = currentSnapshot(), editor = useEditorStore.getState(), counts = useHistoryStore.getState()
  setRenderView('preview'); setRenderView('edit')
  expect(currentSnapshot()).toEqual(data); expect(useEditorStore.getState().selectedObjectIds).toEqual(editor.selectedObjectIds)
  expect(useEditorStore.getState().viewport).toEqual(editor.viewport); expect(useHistoryStore.getState()).toEqual(counts)
})
it('finishes an owned gesture before switching, and refuses an unfinished transaction', () => {
  const finish = vi.fn(); ownObjectGesture(finish); setRenderView('preview'); expect(finish).toHaveBeenCalledOnce()
  setRenderView('edit'); useHistoryStore.setState({ busy: true })
  expect(() => setRenderView('preview')).toThrow('Rond de huidige bewerking'); expect(useRenderViewStore.getState().view).toBe('edit')
})
it('blocks mutation shortcuts in Preview, including undo, redo and Delete', () => {
  useEditorStore.setState({ workspace: 'editor', activeTool: 'select' }); setRenderView('preview')
  const host = document.createElement('div'), child = document.createElement('div'); host.dataset.mapweaverEditor = ''; host.append(child); document.body.append(host)
  const remove = vi.spyOn(useProjectStore.getState(), 'deleteSelection'), undo = vi.spyOn(history, 'undo'), redo = vi.spyOn(history, 'redo')
  child.addEventListener('keydown', handleEditorShortcut)
  for (const event of [new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }), new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }), new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true })]) child.dispatchEvent(event)
  expect(remove).not.toHaveBeenCalled(); expect(undo).not.toHaveBeenCalled(); expect(redo).not.toHaveBeenCalled(); host.remove()
})
it('a real map/session change returns to Edit', () => {
  useArlStore.getState().setMode('OFF'); setRenderView('preview'); useProjectSession.setState(s => ({ generation: s.generation + 1 }))
  expect(useRenderViewStore.getState().view).toBe('edit')
})

it('F fits the current Preview surface without requiring the Edit canvas', () => {
  useEditorStore.setState({ workspace: 'editor' }); setRenderView('preview')
  const host = document.createElement('div'), surface = document.createElement('div')
  host.dataset.mapweaverEditor = ''; surface.setAttribute('aria-label', 'Voorbeeld canvas'); host.append(surface); document.body.append(host)
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ width: 900, height: 700 } as DOMRect)
  surface.addEventListener('keydown', handleEditorShortcut)
  useEditorStore.setState({ viewport: { zoom: 3, pan: { x: -123, y: -456 } } })
  surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }))
  expect(useEditorStore.getState().viewport.zoom).not.toBe(3)
  host.remove()
})
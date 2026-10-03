import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { LayerTreePanel } from './LayerTreePanel'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
import { createLayeredContent } from '../domain/layers'
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.open = false } })
  project.setState({ ...createLayeredContent(), objectGroups: [], layerTree: null })
  editor.setState({ activeLayerId: 'objects', selectedObjectIds: [], collapsedLayers: [], soloLayerId: null })
  history.reset()
})
it('nests layers, navigates and collapses by keyboard without changing the active concrete layer', () => {
  project.getState().addLayerGroup(); const id=project.getState().layerTree!.groups[0].id
  project.getState().moveTreeEntry('objects', id)
  render(<LayerTreePanel />)
  const rows=screen.getAllByRole('treeitem'); rows[0].focus()
  fireEvent.keyDown(rows[0], {key:'ArrowDown'}); expect(rows[1]).toHaveFocus()
  fireEvent.keyDown(rows[0], {key:'ArrowLeft'}); expect(screen.getAllByRole('treeitem')).toHaveLength(1)
  fireEvent.keyDown(rows[0], {key:'ArrowRight'}); expect(screen.getAllByRole('treeitem')).toHaveLength(2)
  expect(editor.getState().activeLayerId).toBe('objects')
})
it('uses a counted accessible delete dialog with safe cancellation and undo', () => {
  project.getState().addLayer(); const id=editor.getState().activeLayerId
  render(<LayerTreePanel />)
  fireEvent.click(screen.getByLabelText('More actions for Layer 2'))
  fireEvent.click(screen.getAllByRole('button', {name:'Delete layer'})[0])
  const dialog=screen.getByRole('dialog', {name:'Delete layer entry'})
  expect(dialog).toHaveTextContent('1 layer(s) and 0 object(s)')
  fireEvent.click(screen.getByRole('button', {name:'Cancel'})); expect(project.getState().layers).toHaveLength(2)
  fireEvent.click(screen.getByLabelText('More actions for Layer 2')); fireEvent.click(screen.getAllByRole('button', {name:'Delete layer'})[0])
  fireEvent.click(screen.getByRole('button', {name:'Delete entry and objects'})); expect(project.getState().layers.some(l=>l.id===id)).toBe(false)
  history.undo(); expect(project.getState().layers.some(l=>l.id===id)).toBe(true)
})
it('does not call the blocking native confirm function', () => {
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false)
  render(<LayerTreePanel />); fireEvent.click(screen.getByLabelText('More actions for Objects')); fireEvent.click(screen.getByRole('button',{name:'Delete layer'}))
  expect(confirm).not.toHaveBeenCalled(); expect(screen.getByRole('dialog',{name:'Delete layer entry'})).toBeInTheDocument(); confirm.mockRestore()
})

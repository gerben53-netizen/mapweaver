import { effectiveLayers } from '../domain/projectView'
import { useRef } from 'react'
import { Group } from 'konva/lib/Group'
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AssetPicker } from '../library/AssetPicker'
import { chooseAsset } from '../library/chooseAsset'
import { installProjectAssets, resolveAsset } from '../projects/assets'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { history, useHistoryStore } from '../store/history'
import { handleEditorShortcut } from '../store/shortcuts'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { useStampPlacement } from '../canvas/useStampPlacement'
import { useAreaDrawing } from '../canvas/useAreaDrawing'
import { useCanvasNavigation } from '../canvas/useCanvasNavigation'
import { LayersPanel } from './LayersPanel'
import { Tabs } from './Tabs'
import type { TypedAsset } from '../domain/models'
const assets: TypedAsset[] = [
  { id: 'stamp', kind: 'stamp', name: 'Chair', mimeType: 'image/png', naturalWidth: 40, naturalHeight: 40, contentHash: 'a'.repeat(64), categoryId: 'room', createdAt: '' },
  { id: 'fill', kind: 'fillPattern', name: 'Floor', mimeType: 'image/png', naturalWidth: 40, naturalHeight: 40, contentHash: 'b'.repeat(64), categoryId: 'room', createdAt: '' },
]
vi.mock('../library/useLibrary', () => ({ useLibrary: (kind: string, query: string, category: string) => ({ assets: assets.filter(a=>a.kind===kind&&a.name.toLowerCase().includes(query.toLowerCase())&&(!category||a.categoryId===category)), categories: [{ id: 'room', name: 'Room' }], loading: false, error: '', retry: vi.fn() }) }))
vi.mock('../library/AssetThumbnail', () => ({ AssetThumbnail: () => <span>Thumbnail</span> }))
vi.mock('../images/imageCache', () => ({ acquireAssetImage: () => ({ promise: Promise.resolve({ width: 40, height: 40 }), release: vi.fn() }) }))
beforeEach(() => {
  project.setState({ map: { width: 600, height: 400, background: null, ...defaultMapStyle() }, ...createLayeredContent() })
  editor.setState({ workspace: 'editor', inspector: 'layers', inspectorCollapsed: false, layersPinned: false, layersUsedAt: 0, activeTool: 'select', picker: null, selectedObjectIds: [], activeLayerId: 'objects', viewport: { zoom: 1, pan: { x: 0, y: 0 } }, stampAsset: null, patternAsset: null, recentAssets: [] })
  installProjectAssets(new Map(assets.map((a) => [a.id, { blob: new Blob(['image']), manifest: { id: a.id, kind: a.kind, fileName: a.name, mimeType: a.mimeType, width: 40, height: 40, hash: a.contentHash, path: `assets/${a.id}.png` } }])))
  history.reset()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector<HTMLInputElement>('input')?.focus() }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
function canvasHarness(pattern = false) {
  const preview = new Group({ visible: false })
  function Harness() {
    const surface = useRef<HTMLDivElement>(null)
    useCanvasNavigation(surface); useStampPlacement(surface); useAreaDrawing(surface)
    return <div data-mapweaver-editor><div ref={surface} tabIndex={0} aria-label="Canvas" /></div>
  }
  const view = render(<Harness />), canvas = screen.getByLabelText('Canvas')
  canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn(); canvas.hasPointerCapture = () => false
  const pointer = (type: string, x: number, y: number, buttons = 0) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons, clientX: x, clientY: y })
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } }); fireEvent(canvas, event)
  }
  return { pointer, canvas, preview, close: () => { view.unmount(); preview.destroy() }, pattern }
}
it('picker filters type, search, category and source, and refuses cross-type selection', async () => {
  editor.setState({ picker: { kind: 'stamp' } }); const view = render(<AssetPicker />)
  expect(screen.getByRole('button', { name: 'Choose Chair' })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Choose Floor' })).toBeNull()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } }); expect(screen.queryByRole('button', { name: 'Choose Chair' })).toBeNull()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'chair' } }); fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'room' } })
  expect(screen.getByRole('button', { name: 'Choose Chair' })).toBeInTheDocument()
  await expect(chooseAsset('fill', 'project', 'stamp')).rejects.toThrow(/match/)
  await expect(resolveAsset('fill', false, 'stamp')).rejects.toThrow(/not a stamp/)
  act(() => editor.setState({ picker: { kind: 'fillPattern' } }))
  expect(screen.getByRole('button', { name: 'Choose Floor' })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Choose Chair' })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Project assets' })); expect(screen.getByRole('button', { name: 'Choose Floor' })).toBeInTheDocument()
  view.unmount()
})
it('native Escape cancel closes the picker without changing tool/project/history and restores trigger focus', () => {
  function Harness() { return <><button onClick={() => editor.setState({ picker: { kind: 'stamp' } })}>Open picker</button><AssetPicker /></> }
  render(<Harness />); const trigger = screen.getByRole('button', { name: 'Open picker' }); trigger.focus(); fireEvent.click(trigger)
  expect(screen.getByRole('searchbox')).toHaveFocus()
  const state = project.getState(), historyState = useHistoryStore.getState()
  // Filled search inputs may consume native Escape before dialog cancel.
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Chair' } })
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull(); expect(trigger).toHaveFocus()
  expect(editor.getState().activeTool).toBe('select'); expect(project.getState()).toBe(state); expect(useHistoryStore.getState()).toBe(historyState)
})
it('chooses a stamp and repeatedly places with snapping, rejects a fill asset, and exits with Escape', async () => {
  editor.setState({ picker: { kind: 'stamp' } }); const picker = render(<AssetPicker />)
  fireEvent.click(screen.getByRole('tab', { name: 'Project assets' })); fireEvent.click(screen.getByRole('button', { name: 'Choose Chair' })); fireEvent.click(screen.getByRole('button', { name: 'Choose asset' }))
  await waitFor(() => expect(editor.getState().activeTool).toBe('placeStamp')); picker.unmount()
  project.setState((s) => ({ map: { ...s.map, grid: { ...s.map.grid, snapEnabled: true, cellSize: 50 } } }))
  const h = canvasHarness()
  h.pointer('pointerdown', 106, 108); h.pointer('pointerup', 106, 108); h.pointer('pointerdown', 206, 208); h.pointer('pointerup', 206, 208)
  expect(project.getState().objects.map((o) => [o.kind, o.assetId, o.x, o.y])).toEqual([['stamp', 'stamp', 80, 80], ['stamp', 'stamp', 180, 180]])
  expect(editor.getState().activeTool).toBe('placeStamp')
  act(() => project.getState().place(assets[1], { x: 10, y: 10 })); expect(project.getState().objects).toHaveLength(2)
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }); h.canvas.addEventListener('keydown', handleEditorShortcut); fireEvent(h.canvas, event)
  expect(editor.getState().activeTool).toBe('select'); h.close()
})
it('chooses a fill pattern, draws its area and opens Properties with the new object selected', async () => {
  await chooseAsset('fill', 'project', 'fillPattern'); expect(editor.getState().activeTool).toBe('area')
  const h = canvasHarness(true); h.pointer('pointerdown', 30, 40); h.pointer('pointermove', 150, 180, 1); h.pointer('pointerup', 150, 180)
  expect(project.getState().objects[0]).toMatchObject({ kind: 'area', fill: {kind:'pattern',assetId:'fill'}, x: 30, y: 40, width: 120, height: 140 })
  expect(editor.getState()).toMatchObject({ activeTool: 'area', inspector: 'properties', selectedObjectIds: [project.getState().objects[0].id] })
  expect(project.getState().createPattern('stamp', { x: 0, y: 0, width: 30, height: 30 }, 'objects')).toBeNull(); h.close()
})
it('workspace and inspector keyboard tabs change only UI state, preserving selection, history and dirty state', () => {
  project.getState().addLayer(); editor.setState({ selectedObjectIds: ['remember'] })
  const state = project.getState(), historyState = useHistoryStore.getState()
  function Navigation() { const s = editor(); return <><Tabs label="Workspace" value={s.workspace} items={[["editor", 'Map editor'], ['library', 'Asset library']]} onChange={(workspace) => editor.setState({ workspace })} /><Tabs label="Inspector" value={s.inspector} items={[["layers", 'Layers'], ['properties', 'Properties'], ['map', 'Map']]} onChange={(inspector) => editor.setState({ inspector })} /></> }
  render(<Navigation />); fireEvent.keyDown(screen.getByRole('tab', { name: 'Map editor' }), { key: 'ArrowRight' }); expect(screen.getByRole('tab', { name: 'Asset library' })).toHaveFocus()
  fireEvent.click(screen.getByRole('tab', { name: 'Map' })); expect(editor.getState()).toMatchObject({ workspace: 'library', inspector: 'map', selectedObjectIds: ['remember'] })
  expect(project.getState()).toBe(state); expect(useHistoryStore.getState()).toBe(historyState)
})
it('compact layers retain active, visibility, lock, rename cancellation/commit and ordering', () => {
  render(<LayersPanel />); fireEvent.click(screen.getByRole('button', { name: 'Add layer' }))
  const newLayer = project.getState().layers[0].id
  fireEvent.click(screen.getByRole('button', { name: 'Hide Layer 2' })); expect(project.getState().layers[0].visible).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Lock Layer 2' })); expect(project.getState().layers[0].locked).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Activate Objects' })); expect(editor.getState().activeLayerId).toBe('objects')
  fireEvent.doubleClick(screen.getByRole('button', { name: 'Activate Layer 2' })); let input = screen.getByRole('textbox', { name: 'Rename Layer 2' })
  fireEvent.change(input, { target: { value: 'Cancelled' } }); fireEvent.keyDown(input, { key: 'Escape' }); expect(project.getState().layers[0].name).toBe('Layer 2')
  fireEvent.doubleClick(screen.getByRole('button', { name: 'Activate Layer 2' })); input = screen.getByRole('textbox', { name: 'Rename Layer 2' })
  fireEvent.change(input, { target: { value: 'Floor' } }); fireEvent.keyDown(input, { key: 'Enter' }); expect(project.getState().layers[0].name).toBe('Floor')
  fireEvent.click(screen.getByRole('button', { name: 'Move Floor down' })); expect(effectiveLayers(project.getState())[1].id).toBe(newLayer)
})
it('global edit shortcuts ignore inputs, dialogs and the asset workspace', () => {
  const remove = vi.spyOn(project.getState(), 'deleteSelection')
  render(<div data-mapweaver-editor onKeyDown={(e) => handleEditorShortcut(e.nativeEvent)}><input aria-label="Name" /><dialog open><button>Inside dialog</button></dialog><button>Editor</button></div>)
  fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Delete' }); fireEvent.keyDown(within(screen.getByRole('dialog')).getByRole('button'), { key: 'Delete' })
  act(() => editor.setState({ workspace: 'library' })); fireEvent.keyDown(screen.getByRole('button', { name: 'Editor' }), { key: 'Delete' }); expect(remove).not.toHaveBeenCalled(); remove.mockRestore()
})

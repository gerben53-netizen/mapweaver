import { registerTestAssets } from '../test/assets'
import { chooseAsset } from '../library/chooseAsset'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MapCanvas } from './MapCanvas'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { libraryRepository } from '../storage/libraryRepository'
import { acquireAssetImage } from '../images/imageCache'
import { fitToMap } from './viewport'

vi.mock('react-konva/lib/ReactKonvaCore', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null, Rect: () => null,
}))
vi.mock('../images/useImage', () => ({ useImage: () => ({}) }))
vi.mock('./MapContent', () => ({ MapContent: () => null }))
vi.mock('../images/imageCache', () => ({ acquireAssetImage: vi.fn() }))
const asset = { kind: 'stamp' as const, id: 'test-tree', name: 'Tree', mimeType: 'image/png', naturalWidth: 40, naturalHeight: 60, categoryId: 'trees', createdAt: '', contentHash: 'abc' }
const release = vi.fn()
beforeEach(() => {
  registerTestAssets({ 'test-tree': 'stamp' })
  useProjectStore.setState({ map: { ...defaultMapStyle(), width: 1600, height: 1000, background: null }, ...createLayeredContent() })
  useEditorStore.setState({ activeTool: 'placeStamp', stampAsset: asset, activeLayerId: 'objects', workspace: 'editor', viewport: { zoom: 1, pan: { x: 0, y: 0 } } })
  vi.spyOn(libraryRepository, 'getAsset').mockResolvedValue(asset)
  vi.mocked(acquireAssetImage).mockReturnValue({ promise: Promise.resolve({} as HTMLImageElement), release })
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 850, height: 550 } } as ResizeObserverEntry], {} as ResizeObserver) }
    disconnect() {}
  })
})
afterEach(() => vi.unstubAllGlobals())
function surface() {
  render(<MapCanvas />)
  const canvas = screen.getByRole('region', { name: 'Map canvas' })
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 240, top: 125, width: 850, height: 550 } as DOMRect)
  return canvas
}
function drop(canvas: HTMLElement, x: number, y: number) {
  for (const type of ['pointerdown', 'pointerup']) { const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }); Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } }); fireEvent(canvas, event) }
}
it.each([0.5, 1, 2])('places correctly through canvas click-placement handlers at zoom %s after panning', async (zoom) => {
  const canvas = surface()
  act(() => useEditorStore.setState({ activeTool: 'placeStamp', stampAsset: asset, activeLayerId: 'objects', workspace: 'editor', viewport: { zoom, pan: { x: -70, y: 30 } } }))
  drop(canvas, 240 - 70 + 400 * zoom, 125 + 30 + 250 * zoom)
  await waitFor(() => expect(useProjectStore.getState().objects).toHaveLength(1))
  expect(useProjectStore.getState().objects[0]).toMatchObject({ assetId: asset.id, x: 380, y: 220, width: 40, height: 60 })
  drop(canvas, 240 - 70 + 400 * zoom, 125 + 30 + 250 * zoom)
  await waitFor(() => expect(useProjectStore.getState().objects).toHaveLength(2))
  const [a, b] = useProjectStore.getState().objects
  expect(a.id).not.toBe(b.id)
})
it('rejects an outside click before loading any image', () => {
  const canvas = surface()
  const callsBefore = vi.mocked(acquireAssetImage).mock.calls.length
  drop(canvas, 241, 126)
  expect(useProjectStore.getState().objects).toHaveLength(0)
  expect(vi.mocked(acquireAssetImage).mock.calls.length).toBe(callsBefore)
})
it('ending placement with Select prevents further creation', () => {
  const canvas = surface()
  act(() => useEditorStore.setState({ activeTool: 'select' }))
  drop(canvas, 650, 400)
  expect(useProjectStore.getState().objects).toHaveLength(0)
})
it('rejects an unreadable picker asset without changing the tool or creating an object', async () => {
  surface()
  vi.mocked(acquireAssetImage).mockImplementation(() => ({ promise: Promise.reject(new Error('missing blob')), release }))
  const tool = useEditorStore.getState().activeTool
  await expect(chooseAsset(asset.id, 'project', 'stamp')).rejects.toThrow('missing blob')
  expect(useEditorStore.getState().activeTool).toBe(tool)
  expect(useProjectStore.getState().objects).toHaveLength(0)
})
it('fits a new background with the current canvas size and preserves placed objects', () => {
  surface()
  act(() => {
    useProjectStore.getState().place(asset, { x: 200, y: 200 })
    useProjectStore.getState().setBackground({ id: 'background', name: 'map.png', width: 8192, height: 2000 })
  })
  expect(useEditorStore.getState().viewport).toEqual(fitToMap({ width: 8192, height: 2000 }, { width: 850, height: 550 }))
  expect(useEditorStore.getState().viewport.zoom).toBeLessThan(0.1)
  expect(useProjectStore.getState().objects[0]).toMatchObject({ x: 180, y: 170 })
})


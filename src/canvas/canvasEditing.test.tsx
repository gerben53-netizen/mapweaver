import { defaultMapStyle } from '../domain/mapSettings'
import { defaultLayer } from '../domain/layers'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Group } from 'konva/lib/Group'
import { MapCanvas } from './MapCanvas'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { objectGestureActive } from './interaction'

const mocks = vi.hoisted(() => ({
  groups: new Map<string, { node: Group; props: Record<string, unknown> }>(),
  transformer: { nodes: vi.fn(), forceUpdate: vi.fn(), rotationSnaps: vi.fn(), getActiveAnchor: vi.fn(() => 'bottom-right'), stopTransform: vi.fn() },
}))
vi.mock('./MapGrid', () => ({ MapGrid: () => null }))
vi.mock('../images/useImage', () => ({ useImage: () => ({ image: {} }) }))
vi.mock('react-konva/lib/ReactKonvaCore', async () => {
  const React = await import('react')
  const { Group: KonvaGroup } = await import('konva/lib/Group')
  type Props = { children?: React.ReactNode; id?: string; onMouseDown?: (event: unknown) => void; x?: number; y?: number; width?: number; height?: number; offsetX?: number; offsetY?: number; scaleX?: number; scaleY?: number; rotation?: number }
  const fakeStage = { batchDraw: vi.fn(), find: () => [mocks.transformer], findOne: () => mocks.transformer }
  return {
    Stage: ({ children, onMouseDown }: Props) => <div data-testid="stage" onMouseDown={(event) => { if (event.target === event.currentTarget) { const target = { getStage: () => target }; onMouseDown?.({ evt: event.nativeEvent, target }) } }}>{children}</div>,
    Layer: ({ children }: Props) => <div>{children}</div>,
    Group: React.forwardRef<Group, Props>(function MockGroup(props, ref) {
      const [node] = React.useState(() => new KonvaGroup())
      const previous = React.useRef<Record<string, unknown>>({})
      React.useLayoutEffect(() => {
        for (const field of ['x', 'y', 'width', 'height', 'offsetX', 'offsetY', 'scaleX', 'scaleY', 'rotation'] as const) {
          if (previous.current[field] !== props[field]) node.setAttr(field, props[field])
        }
        previous.current = props
        if (props.id) mocks.groups.set(props.id, { node, props })
      })
      React.useImperativeHandle(ref, () => {
        node.getStage = () => fakeStage as never
        return node
      }, [node])
      return <div data-testid={props.id ? `stamp-${props.id}` : undefined} onMouseDown={(event) => {
        const wrapped = { evt: event.nativeEvent, cancelBubble: false }
        props.onMouseDown?.(wrapped)
        if (wrapped.cancelBubble) event.stopPropagation()
      }}>{props.children}</div>
    }),
    Transformer: React.forwardRef(function MockTransformer(_props, ref) { React.useImperativeHandle(ref, () => mocks.transformer); return null }),
    Line: () => null, Rect: () => null, Text: () => null, Image: () => null, Shape: () => null,
  }
})
const object = { kind: 'stamp' as const, id: 'a', assetId: 'asset', x: 100, y: 200, width: 100, height: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
beforeEach(() => {
  mocks.groups.clear(); vi.clearAllMocks(); mocks.transformer.getActiveAnchor.mockReturnValue('bottom-right')
  useProjectStore.setState({ layers: [{ ...defaultLayer(), objectIds: ['a', 'b'] }], map: { ...defaultMapStyle(), width: 1600, height: 1000, background: null }, objects: [object, { ...object, id: 'b', x: 500 }] })
  useEditorStore.setState({ selectedObjectIds: [], viewport: { zoom: 1, pan: { x: 0, y: 0 } } })
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 850, height: 550 } } as ResizeObserverEntry], {} as ResizeObserver) }
    disconnect() {}
  })
})
afterEach(() => vi.unstubAllGlobals())
function setup() {
  const rendered = render(<div data-mapweaver-editor><MapCanvas /></div>)
  const surface = screen.getByRole('region', { name: 'Map canvas' })
  surface.setPointerCapture = vi.fn(); surface.hasPointerCapture = vi.fn(() => false); surface.releasePointerCapture = vi.fn()
  return { ...rendered, surface }
}
function event(id: string, name: string, shiftKey = false) {
  act(() => (mocks.groups.get(id)!.props[name] as (event: unknown) => void)({ evt: { shiftKey } }))
}
function pointer(target: HTMLElement, type: string, init: MouseEventInit) {
  const evt = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
  Object.defineProperties(evt, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
  fireEvent(target, evt)
}
it('selects one stamp, switches the Transformer attachment, clears on empty canvas and clears selection on Escape, and detaches on unmount', () => {
  const { unmount } = setup()
  fireEvent.mouseDown(screen.getByTestId('stamp-a'), { button: 0 })
  expect(useEditorStore.getState().selectedObjectIds[0]).toBe('a')
  expect(mocks.transformer.nodes).toHaveBeenLastCalledWith([mocks.groups.get('a')!.node])
  fireEvent.mouseDown(screen.getByTestId('stamp-b'), { button: 0 })
  expect(useEditorStore.getState().selectedObjectIds[0]).toBe('b')
  fireEvent.mouseDown(screen.getByTestId('stage'), { button: 0 })
  expect(useEditorStore.getState().selectedObjectIds[0]).toBeUndefined()
  fireEvent.mouseDown(screen.getByTestId('stamp-a'), { button: 0 })
  fireEvent.keyDown(screen.getByRole('region', { name: 'Map canvas' }), { key: 'Escape', code: 'Escape' })
  expect(useEditorStore.getState().selectedObjectIds).toEqual([])
  unmount(); expect(mocks.transformer.nodes).toHaveBeenLastCalledWith([])
})
it.each([0.01, 0.5, 4])('commits an object drag in map units at zoom %s', (zoom) => {
  setup()
  act(() => useEditorStore.setState({ viewport: { zoom, pan: { x: -80, y: 50 } } }))
  const viewport = useEditorStore.getState().viewport
  event('a', 'onDragStart')
  const node = mocks.groups.get('a')!.node
  // Konva resolves screen movement through the parent viewport transform.
  node.x(node.x() + 60 / zoom); node.y(node.y() - 20 / zoom)
  event('a', 'onDragMove'); event('a', 'onDragEnd')
  expect(useProjectStore.getState().objects[0].x).toBeCloseTo(object.x + 60 / zoom)
  expect(useProjectStore.getState().objects[0].y).toBeCloseTo(object.y - 20 / zoom)
  expect(useEditorStore.getState().viewport).toBe(viewport)
  expect(objectGestureActive()).toBe(false)
})
it('normalizes completed scaling, refreshes selection bounds, and snaps rotation with Shift', () => {
  setup()
  fireEvent.mouseDown(screen.getByTestId('stamp-a'), { button: 0 })
  event('a', 'onTransformStart')
  const node = mocks.groups.get('a')!.node
  node.scale({ x: 2, y: 2 })
  event('a', 'onTransform'); event('a', 'onTransformEnd')
  expect(useProjectStore.getState().objects[0]).toMatchObject({ width: 200, height: 400, scaleX: 1, scaleY: 1 })
  expect(node.scale()).toEqual({ x: 1, y: 1 })
  expect(mocks.transformer.forceUpdate).toHaveBeenCalled()
  mocks.transformer.getActiveAnchor.mockReturnValue('rotater')
  event('a', 'onTransformStart'); node.rotation(23)
  event('a', 'onTransform', true); event('a', 'onTransformEnd')
  expect(useProjectStore.getState().objects[0].rotation).toBe(30)
  fireEvent.keyDown(window, { key: 'Shift' })
  expect(mocks.transformer.rotationSnaps).toHaveBeenLastCalledWith(Array.from({ length: 24 }, (_, index) => index * 15))
  fireEvent.keyUp(window, { key: 'Shift' })
  expect(mocks.transformer.rotationSnaps).toHaveBeenLastCalledWith([])
})
it.each(['space', 'middle'])('gives %s panning precedence over selecting or moving a stamp', (method) => {
  const { surface } = setup()
  const target = screen.getByTestId('stamp-a')
  const before = useProjectStore.getState().objects
  const viewport = useEditorStore.getState().viewport
  if (method === 'space') { act(() => surface.focus()); fireEvent.keyDown(surface, { code: 'Space' }) }
  const button = method === 'middle' ? 1 : 0
  pointer(target, 'pointerdown', { button, clientX: 200, clientY: 200 })
  fireEvent.mouseDown(target, { button })
  pointer(surface, 'pointermove', { buttons: method === 'middle' ? 4 : 1, clientX: 240, clientY: 230 })
  pointer(surface, 'pointerup', { button })
  expect(useEditorStore.getState().selectedObjectIds[0]).toBeUndefined()
  expect(useProjectStore.getState().objects).toBe(before)
  expect(useEditorStore.getState().viewport.pan).toEqual({ x: viewport.pan.x + 40, y: viewport.pan.y + 30 })
})
it('ends an active object edit when Space takes over mid-drag', () => {
  const { surface } = setup()
  const target = screen.getByTestId('stamp-a')
  pointer(target, 'pointerdown', { button: 0, clientX: 200, clientY: 200 })
  event('a', 'onDragStart')
  expect(objectGestureActive()).toBe(true)
  fireEvent.keyDown(surface, { code: 'Space' })
  expect(objectGestureActive()).toBe(false)
  const objectAfter = useProjectStore.getState().objects[0]
  pointer(surface, 'pointermove', { buttons: 1, clientX: 240, clientY: 230 })
  expect(useProjectStore.getState().objects[0]).toBe(objectAfter)
})




it('Shift-toggles selection, shares a single drag delta and completion boundary, and keeps pan precedence for a group', () => {
  const { surface } = setup()
  fireEvent.mouseDown(screen.getByTestId('stamp-a'), { button: 0 })
  fireEvent.mouseDown(screen.getByTestId('stamp-b'), { button: 0, shiftKey: true })
  expect(useEditorStore.getState().selectedObjectIds).toEqual(['a', 'b'])
  expect(mocks.transformer.nodes).toHaveBeenLastCalledWith([])
  fireEvent.mouseDown(screen.getByTestId('stamp-a'), { button: 0 })
  const commit = vi.spyOn(useProjectStore.getState(), 'commitTranslation')
  event('a', 'onDragStart')
  const node = mocks.groups.get('a')!.node
  node.x(node.x() + 40); node.y(node.y() - 25)
  event('a', 'onDragMove')
  expect(useProjectStore.getState().objects.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 140, y: 175 }, { x: 540, y: 175 }])
  pointer(surface, 'pointerdown', { button: 0, buttons: 1, clientX: 400, clientY: 300 })
  fireEvent.keyDown(window, { key: ' ', code: 'Space' })
  expect(commit).toHaveBeenCalledTimes(1)
  const after = useProjectStore.getState().objects
  pointer(surface, 'pointermove', { buttons: 1, clientX: 450, clientY: 350 })
  expect(useProjectStore.getState().objects).toBe(after)
  fireEvent.keyUp(window, { key: ' ', code: 'Space' })
  fireEvent.mouseDown(screen.getByTestId('stamp-b'), { button: 0, shiftKey: true })
  expect(useEditorStore.getState().selectedObjectIds).toEqual(['a'])
})


it('previews joint-center snapping, honors release Alt, preserves group distance and refits resized maps', () => {
  setup()
  act(() => useProjectStore.getState().applyMapSettings({ ...useProjectStore.getState().map, grid: { ...defaultMapStyle().grid, snapEnabled: true } }, () => true))
  fireEvent.mouseDown(screen.getByTestId('stamp-a'), { button: 0 })
  fireEvent.mouseDown(screen.getByTestId('stamp-b'), { button: 0, shiftKey: true })
  const node = mocks.groups.get('a')!.node
  event('a', 'onDragStart'); node.x(node.x() + 23); node.y(node.y() + 17); event('a', 'onDragMove')
  expect(useProjectStore.getState().objects[0].x).toBe(100)
  event('a', 'onDragEnd')
  expect(useProjectStore.getState().objects.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 100, y: 200 }, { x: 500, y: 200 }])
  event('a', 'onDragStart'); node.x(node.x() + 23); node.y(node.y() + 17); event('a', 'onDragMove')
  act(() => (mocks.groups.get('a')!.props.onDragEnd as (event: unknown) => void)({ evt: { altKey: true } }))
  expect(useProjectStore.getState().objects[0]).toMatchObject({ x: 123, y: 217 })
  act(() => useEditorStore.getState().select('a'))
  event('a', 'onTransformStart'); node.scale({ x: 1.1, y: 1.1 }); event('a', 'onTransformEnd')
  expect(useProjectStore.getState().objects[0]).toMatchObject({ x: 118, y: 207 })
  act(() => useProjectStore.getState().applyMapSettings({ ...useProjectStore.getState().map, width: 800, height: 600 }, () => true))
  expect(useEditorStore.getState().viewport.zoom).toBeCloseTo((550 - 96) / 600)
  expect(useProjectStore.getState().objects[0]).toMatchObject({ x: 118, y: 207 })
})


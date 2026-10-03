import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MapCanvas } from './MapCanvas'
import { useEditorStore } from '../store/editorStore'
import { fitToMap } from './viewport'
import { MAP_SIZE } from './map'

vi.mock('react-konva/lib/ReactKonvaCore', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Image: () => null,
  Line: () => null, Rect: () => null,
  Shape: () => null,
  Text: () => null,
  Transformer: () => null,
}))
afterEach(() => vi.unstubAllGlobals())

it('initially fits, shows zoom changes, and fits using the resized canvas', () => {
  let notify: ResizeObserverCallback
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { notify = callback }
    observe() {}
    disconnect() {}
  })
  render(<MapCanvas />)
  const resize = (width: number, height: number) => act(() => {
    notify([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver)
  })
  resize(850, 550)
  expect(useEditorStore.getState().viewport).toEqual(fitToMap(MAP_SIZE, { width: 850, height: 550 }))
  act(() => useEditorStore.getState().zoomAt({ x: 100, y: 100 }, 2))
  expect(screen.getByLabelText('Zoom level')).toHaveTextContent('200%')
  resize(1100, 700)
  expect(screen.getByLabelText('Zoom level')).toHaveTextContent('200%')
  fireEvent.click(screen.getByRole('button', { name: /Fit to map/ }))
  expect(useEditorStore.getState().viewport).toEqual(fitToMap(MAP_SIZE, { width: 1100, height: 700 }))
})




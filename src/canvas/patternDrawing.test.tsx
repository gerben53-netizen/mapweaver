import { registerTestAssets } from '../test/assets'
import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAreaDrawing } from './useAreaDrawing'
import { useCanvasNavigation } from './useCanvasNavigation'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
it('owns pattern drawing exclusively: creation, cancellation and both pan methods never create accidental objects', () => {
  // Group has the same Node attribute API; no pixel canvas is needed in jsdom.
  registerTestAssets({ floor: 'fillPattern' })
  function Harness() {
    const surface = useRef<HTMLDivElement>(null)
    useCanvasNavigation(surface); const preview=useAreaDrawing(surface)
    return <div ref={surface} tabIndex={0} aria-label="Pattern canvas" data-points={preview.length} />
  }
  project.setState({ map: { width: 600, height: 400, background: null, ...defaultMapStyle() }, ...createLayeredContent() })
  editor.setState({ activeTool: 'area', areaShape:'rectangle', areaFill:{kind:'pattern',assetId:'floor',mode:'repeat',scale:1,rotation:0,offsetX:0,offsetY:0}, patternAsset: { id: 'floor', name: 'Floor' }, patternReady: true, activeLayerId: 'objects', viewport: { zoom: 1, pan: { x: 0, y: 0 } }, selectedObjectIds: [] })
  const view = render(<Harness />), canvas = screen.getByLabelText('Pattern canvas')
  canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn(); canvas.hasPointerCapture = vi.fn(() => false)
  const pointer = (type: string, init: MouseEventInit = {}) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
    fireEvent(canvas, event)
  }
  pointer('pointerdown', { button: 0, clientX: 200, clientY: 150 })
  pointer('pointermove', { buttons: 1, clientX: 20, clientY: 30 })
  expect(canvas.getAttribute('data-points')).toBe('4')
  pointer('pointerup', { button: 0, clientX: 20, clientY: 30 })
  expect(project.getState().objects).toHaveLength(1)
  expect(project.getState().objects[0]).toMatchObject({ kind: 'area', x: 20, y: 30, width: 180, height: 120 })
  expect(editor.getState()).toMatchObject({ activeTool: 'area', selectedObjectIds: [project.getState().objects[0].id] })
  act(() => editor.setState({ activeTool: 'area', areaShape:'rectangle', areaFill:{kind:'pattern',assetId:'floor',mode:'repeat',scale:1,rotation:0,offsetX:0,offsetY:0} }))
  pointer('pointerdown', { button: 0, clientX: 30, clientY: 30 })
  pointer('pointermove', { buttons: 1, clientX: 100, clientY: 100 })
  fireEvent.keyDown(canvas, { key: 'Escape' }); expect(canvas.getAttribute('data-points')).toBe('0')
  pointer('pointerup', { clientX: 100, clientY: 100 })
  pointer('pointerdown', { button: 1, clientX: 100, clientY: 100 })
  pointer('pointermove', { buttons: 4, clientX: 110, clientY: 120 })
  pointer('pointerup', { button: 1, clientX: 110, clientY: 120 })
  expect(editor.getState().viewport.pan).toEqual({ x: 10, y: 20 })
  pointer('pointerdown', { button: 0, clientX: 50, clientY: 60 })
  pointer('pointermove', { buttons: 1, clientX: 150, clientY: 160 })
  fireEvent.keyDown(canvas, { code: 'Space', key: ' ' }); expect(canvas.getAttribute('data-points')).toBe('0')
  pointer('pointermove', { buttons: 1, clientX: 170, clientY: 190 })
  expect(editor.getState().viewport.pan).toEqual({ x: 30, y: 50 })
  fireEvent.keyUp(canvas, { code: 'Space', key: ' ' })
  pointer('pointerup', { button: 0, clientX: 170, clientY: 190 })
  expect(project.getState().objects).toHaveLength(1)
  pointer('pointerdown', { button: 0, clientX: 50, clientY: 60 })
  pointer('pointermove', { buttons: 1, clientX: 200, clientY: 200 })
  fireEvent.blur(window); pointer('pointerup', { clientX: 200, clientY: 200 })
  expect(project.getState().objects).toHaveLength(1); expect(canvas.getAttribute('data-points')).toBe('0')
  view.unmount()
})


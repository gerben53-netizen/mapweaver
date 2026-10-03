import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasNavigation } from './useCanvasNavigation'
import { useEditorStore } from '../store/editorStore'

function Harness() {
  const ref = useRef<HTMLDivElement>(null)
  const { spaceHeld, panning } = useCanvasNavigation(ref)
  return <><div ref={ref} tabIndex={0} aria-label="Canvas" data-space={spaceHeld} data-panning={panning} /><input aria-label="Name" /><button>Other control</button></>
}

function pointer(element: HTMLElement, type: string, init: MouseEventInit) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
  fireEvent(element, event)
}

function setup() {
  render(<Harness />)
  const canvas = screen.getByLabelText('Canvas')
  // jsdom does not implement native pointer capture; navigation events stay real.
  canvas.setPointerCapture = vi.fn()
  canvas.hasPointerCapture = vi.fn(() => false)
  canvas.releasePointerCapture = vi.fn()
  return canvas
}

beforeEach(() => useEditorStore.setState({ viewport: { zoom: 1, pan: { x: 0, y: 0 } } }))

describe('canvas navigation', () => {
  it('pans with middle mouse and stops after pointer release', () => {
    const canvas = setup()
    pointer(canvas, 'pointerdown', { button: 1, clientX: 100, clientY: 150 })
    pointer(canvas, 'pointermove', { buttons: 4, clientX: 140, clientY: 130 })
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 40, y: -20 })
    pointer(canvas, 'pointerup', { button: 1 })
    pointer(canvas, 'pointermove', { buttons: 4, clientX: 300, clientY: 300 })
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 40, y: -20 })
    expect(canvas).toHaveAttribute('data-panning', 'false')
  })
  it('pans with Space and primary mouse, ending immediately when Space is released', () => {
    const canvas = setup()
    fireEvent.pointerEnter(canvas)
    fireEvent.keyDown(document.body, { code: 'Space' })
    pointer(canvas, 'pointerdown', { button: 0, clientX: 100, clientY: 150 })
    pointer(canvas, 'pointermove', { buttons: 1, clientX: 120, clientY: 190 })
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 20, y: 40 })
    fireEvent.keyUp(window, { code: 'Space' })
    pointer(canvas, 'pointermove', { buttons: 1, clientX: 300, clientY: 300 })
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 20, y: 40 })
    expect(canvas).toHaveAttribute('data-space', 'false')
    expect(canvas).toHaveAttribute('data-panning', 'false')
  })
  it('clears Space and drag on window focus loss', () => {
    const canvas = setup()
    act(() => canvas.focus())
    fireEvent.keyDown(canvas, { code: 'Space' })
    pointer(canvas, 'pointerdown', { button: 0, clientX: 0, clientY: 0 })
    fireEvent.blur(window)
    pointer(canvas, 'pointermove', { buttons: 1, clientX: 30, clientY: 60 })
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 0, y: 0 })
    expect(canvas).toHaveAttribute('data-space', 'false')
    expect(canvas).toHaveAttribute('data-panning', 'false')
  })
  it.each(['pointercancel', 'lostpointercapture'])('ends drag on %s', (type) => {
    const canvas = setup()
    pointer(canvas, 'pointerdown', { button: 1 })
    pointer(canvas, type, {})
    pointer(canvas, 'pointermove', { buttons: 4, clientX: 90, clientY: 80 })
    expect(canvas).toHaveAttribute('data-panning', 'false')
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 0, y: 0 })
  })
  it('ignores primary drag without Space and preserves input/control keyboard behavior', () => {
    const canvas = setup()
    pointer(canvas, 'pointerdown', { button: 0 })
    pointer(canvas, 'pointermove', { buttons: 1, clientX: 50, clientY: 50 })
    expect(useEditorStore.getState().viewport.pan).toEqual({ x: 0, y: 0 })
    fireEvent.pointerEnter(canvas)
    for (const control of [screen.getByLabelText('Name'), screen.getByRole('button')]) {
      act(() => control.focus())
      expect(fireEvent.keyDown(control, { code: 'Space' })).toBe(true)
      expect(canvas).toHaveAttribute('data-space', 'false')
    }
  })
  it('prevents page scrolling and keeps the pointer anchor fixed on wheel input', () => {
    const canvas = setup()
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 200, top: 100, width: 800, height: 500 } as DOMRect)
    expect(fireEvent.wheel(canvas, { clientX: 500, clientY: 300, deltaY: -100, deltaMode: 0 })).toBe(false)
    const { zoom, pan } = useEditorStore.getState().viewport
    expect(zoom).toBeGreaterThan(1)
    expect(300 * zoom + pan.x).toBeCloseTo(300)
    expect(200 * zoom + pan.y).toBeCloseTo(200)
  })
})

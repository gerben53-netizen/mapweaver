import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { usePathDrawing } from './usePathDrawing'
import { useCanvasNavigation } from './useCanvasNavigation'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
import { history, useHistoryStore } from '../store/history'
it.each(['path','wall'] as const)('%s draws curves, Backspace/Enter/closing/cancel; zoom and both pan methods preserve nodes', (tool) => {
  function Harness() {
    const ref = useRef<HTMLDivElement>(null)
    useCanvasNavigation(ref)
    const nodes = usePathDrawing(ref)
    return (
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Path canvas"
        data-nodes={JSON.stringify(nodes)}
      />
    )
  }
  project.setState({
    map: { width: 600, height: 400, background: null, ...defaultMapStyle() },
    ...createLayeredContent(),
  })
  editor.setState({
    activeTool: tool,
    pathMode: 'curved', objectSnap:false,
    pathWidth: 8,
    pathStroke: { kind: 'solid', color: '#ffffff' },
    activeLayerId: 'objects',
    viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    selectedObjectIds: [],
  })
  history.reset()
  const view = render(<Harness />),
    canvas = screen.getByLabelText('Path canvas')
  canvas.setPointerCapture = vi.fn()
  canvas.releasePointerCapture = vi.fn()
  canvas.hasPointerCapture = vi.fn(() => false)
  const pointer = (type: string, init: MouseEventInit = {}) => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
    Object.defineProperties(e, {
      pointerId: { value: 1 },
      pointerType: { value: 'mouse' },
    })
    fireEvent(canvas, e)
  }
  const click = (x: number, y: number) => {
    pointer('pointerdown', { button: 0, clientX: x, clientY: y })
    pointer('pointerup', { button: 0, clientX: x, clientY: y })
  }
  pointer('pointerdown', { clientX: 50, clientY: 100 })
  pointer('pointermove', { clientX: 90, clientY: 50, buttons: 1 })
  pointer('pointerup', { clientX: 90, clientY: 50 })
  click(250, 100)
  click(300, 150)
  fireEvent.keyDown(canvas, { key: 'Backspace' })
  fireEvent.keyDown(canvas, { key: 'Enter' })
  expect(project.getState().objects[0]).toMatchObject({
    kind: 'path',
    nodes: [
      { x: 50, y: 100, mode: 'smooth', out: { x: 40, y: -50 } },
      { x: 250, y: 100, mode: 'corner' },
    ],
  })
  expect(useHistoryStore.getState().undoCount).toBe(1)
  act(() => editor.setState({ activeTool: tool, pathMode: 'straight' }))
  click(50, 200)
  click(100, 250)
  fireEvent.keyDown(canvas, { key: 'Escape' })
  expect(project.getState().objects).toHaveLength(1)
  expect(useHistoryStore.getState().undoCount).toBe(1)
  click(50, 200)
  click(200, 200)
  click(200, 300)
  click(50, 200)
  expect(project.getState().objects.at(-1)).toMatchObject({ closed: true })
  act(() => editor.setState({ activeTool: tool }))
  click(70, 80)
  pointer('pointerdown', { button: 1, clientX: 100, clientY: 100 })
  pointer('pointermove', { buttons: 4, clientX: 120, clientY: 120 })
  pointer('pointerup', { button: 1 })
  expect(editor.getState().viewport.pan).toEqual({ x: 20, y: 20 })
  expect(JSON.parse(canvas.getAttribute('data-nodes')!)[0]).toMatchObject({
    x: 70,
    y: 80,
  })
  fireEvent.keyDown(canvas, { code: 'Space', key: ' ' })
  pointer('pointerdown', { button: 0, clientX: 100, clientY: 100 })
  pointer('pointermove', { buttons: 1, clientX: 110, clientY: 120 })
  pointer('pointerup')
  fireEvent.keyUp(canvas, { code: 'Space', key: ' ' })
  fireEvent.wheel(canvas, { deltaY: -100, clientX: 100, clientY: 100 })
  expect(JSON.parse(canvas.getAttribute('data-nodes')!)[0]).toMatchObject({
    x: 70,
    y: 80,
  })
  fireEvent.blur(window)
  expect(JSON.parse(canvas.getAttribute('data-nodes')!)).toEqual([])
  if(tool==='wall'){
    const wall=project.getState().objects[0]
    if(wall.kind!=='path')throw new Error('Expected wall')
    const before=useHistoryStore.getState().undoCount
    act(()=>editor.setState({viewport:{zoom:1,pan:{x:0,y:0}},wallSnap:{point:{x:250,y:100},kind:'endpoint',objectId:wall.id,nodeIndex:1}}))
    fireEvent(window,new Event('mapweaver-wall-continue'))
    click(400,100);fireEvent.keyDown(canvas,{key:'Enter'})
    expect(project.getState().objects[0].id).toBe(wall.id)
    expect((project.getState().objects[0] as typeof wall).nodes).toHaveLength(3)
    expect(useHistoryStore.getState().undoCount).toBe(before+1)
    act(()=>{history.undo()});expect(project.getState().objects[0]).toEqual(wall)
    act(()=>editor.setState({wallSnap:{point:{x:250,y:100},kind:'endpoint',objectId:wall.id,nodeIndex:1}}))
    fireEvent(window,new Event('mapweaver-wall-continue'));fireEvent.keyDown(canvas,{key:'Enter'})
    expect(useHistoryStore.getState().undoCount).toBe(before)
  }
  view.unmount()
})


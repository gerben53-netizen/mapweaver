import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useEditorStore } from '../store/editorStore'
import { wheelZoom } from './viewport'
import { finishObjectGesture, cancelObjectGesture, objectGestureActive } from './interaction'

import { isEditing, handleEditorShortcut } from '../store/shortcuts'
export function useCanvasNavigation(ref: RefObject<HTMLDivElement | null>) {
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  const space = useRef(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let hovered = false
    type Pointer = { id: number; x: number; y: number; button: number }
    let held: Pointer | null = null
    let drag: Pointer | null = null
    const stopDrag = () => {
      const previous = drag
      drag = null
      if (previous && element.hasPointerCapture(previous.id)) element.releasePointerCapture(previous.id)
      setPanning(false)
    }
    const reset = () => { space.current = false; held = null; setSpaceHeld(false); stopDrag(); cancelObjectGesture() }
    const startPan = (pointer: Pointer) => {
      if(!['path','wall','route'].includes(useEditorStore.getState().activeTool)) finishObjectGesture()
      drag = { ...pointer }
      element.setPointerCapture(pointer.id)
      setPanning(true)
    }
    const keyDown = (event: KeyboardEvent) => {
      handleEditorShortcut(event)
      if (event.code !== 'Space' || isEditing(event.target)) return
      if (event.target instanceof HTMLElement && event.target.closest('button, a[href]')) return
      if (!hovered && !element.contains(document.activeElement)) return
      event.preventDefault()
      space.current = true
      setSpaceHeld(true)
      if (held?.button === 0 && !drag) startPan(held)
    }
    const keyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      space.current = false
      setSpaceHeld(false)
      if (drag?.button === 0) stopDrag()
    }
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      element.focus({ preventScroll: true })
      held = { id: event.pointerId, x: event.clientX, y: event.clientY, button: event.button }
      if (event.button !== 1 && !(event.button === 0 && space.current)) return
      event.preventDefault()
      event.stopPropagation()
      startPan(held)
    }
    const pointerMove = (event: PointerEvent) => {
      if (held?.id === event.pointerId) { held.x = event.clientX; held.y = event.clientY }
      if (!drag || event.pointerId !== drag.id) return
      const requiredButton = drag.button === 1 ? 4 : 1
      if (!(event.buttons & requiredButton)) { stopDrag(); return }
      event.preventDefault()
      event.stopPropagation()
      useEditorStore.getState().panBy({ x: event.clientX - drag.x, y: event.clientY - drag.y })
      drag.x = event.clientX; drag.y = event.clientY
    }
    const pointerUp = () => { held = null; stopDrag() }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (drag || (objectGestureActive() && useEditorStore.getState().activeTool !== 'area' && useEditorStore.getState().activeTool !== 'path' && useEditorStore.getState().activeTool !== 'wall' && useEditorStore.getState().activeTool !== 'route' && useEditorStore.getState().activeTool !== 'scatter')) return
      const bounds = element.getBoundingClientRect()
      const state = useEditorStore.getState()
      state.zoomAt({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, wheelZoom(state.viewport.zoom, event.deltaY, event.deltaMode, bounds.height))
    }
    // Konva uses mouse events for dragging/Transformer. Capture them before its listeners.
    const guardMouse = (event: MouseEvent) => {
      if (event.button === 1 || space.current || drag) { event.preventDefault(); event.stopPropagation() }
    }
    const pointerEnter = () => { hovered = true }
    const pointerLeave = () => { hovered = false }
    const visibility = () => { if (document.hidden) reset() }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', reset)
    window.addEventListener('pointerup', pointerUp)
    document.addEventListener('visibilitychange', visibility)
    const elementBlur = () => { space.current=false; held=null; setSpaceHeld(false); stopDrag() }
    element.addEventListener('blur', elementBlur)
    element.addEventListener('pointerenter', pointerEnter)
    element.addEventListener('pointerleave', pointerLeave)
    element.addEventListener('pointerdown', pointerDown, true)
    element.addEventListener('pointermove', pointerMove, true)
    element.addEventListener('pointercancel', reset)
    element.addEventListener('lostpointercapture', stopDrag)
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('mousedown', guardMouse, true)
    element.addEventListener('auxclick', guardMouse, true)
    return () => {
      reset()
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', reset)
      window.removeEventListener('pointerup', pointerUp)
      document.removeEventListener('visibilitychange', visibility)
      element.removeEventListener('blur', elementBlur)
      element.removeEventListener('pointerenter', pointerEnter)
      element.removeEventListener('pointerleave', pointerLeave)
      element.removeEventListener('pointerdown', pointerDown, true)
      element.removeEventListener('pointermove', pointerMove, true)
      element.removeEventListener('pointercancel', reset)
      element.removeEventListener('lostpointercapture', stopDrag)
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('mousedown', guardMouse, true)
      element.removeEventListener('auxclick', guardMouse, true)
    }
  }, [ref])
  return { spaceHeld, panning }
}




import { interactionGrid, snapPoint } from '../domain/mapSettings'
import { ownObjectGesture } from './interaction'
import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useAssetContext } from '../projects/assets'
import { screenToMap } from './viewport'
import { STAMP_DRAG_TYPE } from '../domain/placement'
import { useStampGhost, useStampDrag, prepareStamp, stampPlacementError, endStampDrag } from '../library/stampPlacement'
export function useStampPlacement(surface: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = surface.current
    if (!element) return
    let mounted = true
    let pressed: { x: number; y: number; id: number; assetId: string; layerId: string; release: () => void } | null = null
    const cancel = () => { const previous = pressed; pressed = null; previous?.release(); useStampGhost.setState({ point: null }) }
    const point = (e: { clientX: number; clientY: number }) => { const rect = element.getBoundingClientRect(); return screenToMap({ x: e.clientX - rect.left, y: e.clientY - rect.top }, useEditorStore.getState().viewport) }
    const down = (e: PointerEvent) => {
      const editor = useEditorStore.getState()
      if (e.defaultPrevented || e.button !== 0 || editor.activeTool !== 'placeStamp') return
      e.preventDefault(); e.stopPropagation()
      pressed = { x: e.clientX, y: e.clientY, id: e.pointerId, assetId: editor.stampAsset?.id || '', layerId: editor.activeLayerId, release: ownObjectGesture(cancel, cancel) }
    }
    const move = (e: PointerEvent) => {
      if (useStampDrag.getState().id) return
      const editor = useEditorStore.getState(), asset = editor.stampAsset
      if (e.defaultPrevented || editor.activeTool !== 'placeStamp' || !asset || e.buttons) { useStampGhost.setState({ point: null }); return }
      const p = point(e), error = stampPlacementError(asset, p)
      useStampGhost.setState({ asset, point: p, bypass: e.altKey, error })
      if (error) useEditorStore.setState({ message: error })
    }
    const up = (e: PointerEvent) => {
      const click = pressed; pressed = null; click?.release()
      const editor = useEditorStore.getState()
      if (!click || click.id !== e.pointerId || Math.hypot(click.x - e.clientX, click.y - e.clientY) > 4 || editor.activeTool !== 'placeStamp' || !editor.stampAsset || click.assetId !== editor.stampAsset.id || click.layerId !== editor.activeLayerId) return
      const p = point(e), error = stampPlacementError(editor.stampAsset, p)
      if (error) useEditorStore.setState({ message: error }); else useProjectStore.getState().place(editor.stampAsset, p, e.altKey)
    }
    const mouse = (e: MouseEvent) => { if (useEditorStore.getState().activeTool === 'placeStamp' && e.button === 0) { e.preventDefault(); e.stopPropagation() } }
    const over = (e: DragEvent) => {
      if (!useStampDrag.getState().id || !e.dataTransfer?.types.includes(STAMP_DRAG_TYPE)) return
      e.preventDefault(); e.stopPropagation()
      const ghost = useStampGhost.getState(), p = point(e), error = ghost.asset ? stampPlacementError(ghost.asset, p) : ghost.error || 'Loading stamp…'
      e.dataTransfer.dropEffect = error ? 'none' : 'copy'
      useStampGhost.setState({ point: p, bypass: e.altKey, error })
      useEditorStore.setState({ message: error || 'Release to place one stamp. Alt bypasses snapping.' })
    }
    const drop = (e: DragEvent) => {
      const id = useStampDrag.getState().id
      if (!id || e.dataTransfer?.getData(STAMP_DRAG_TYPE) !== id) return
      e.preventDefault(); e.stopPropagation(); cancel()
      const editor = useEditorStore.getState(), layerId = editor.activeLayerId, generation = useAssetContext.getState().generation
      // Resolve snap now: later modifier/grid changes must not change this drop.
      const p = point(e), center = snapPoint(p, interactionGrid(useProjectStore.getState().map), e.altKey)
      endStampDrag()
      void prepareStamp(id).then(asset => {
        if (!mounted || generation !== useAssetContext.getState().generation || layerId !== useEditorStore.getState().activeLayerId) throw Error('The destination changed. Drag the stamp again.')
        const error = stampPlacementError(asset, p)
        if (error) throw Error(error)
        useProjectStore.getState().place(asset, center, true)
      }).catch(e => useEditorStore.setState({ message: e.message }))
    }
    const leave = (e: DragEvent) => { if (!(e.relatedTarget instanceof Node) || !element.contains(e.relatedTarget)) useStampGhost.setState({ point: null }) }
    const unsubscribe = useEditorStore.subscribe((s, p) => { if (s.activeTool !== p.activeTool || s.workspace !== p.workspace || s.stampAsset !== p.stampAsset) cancel() })
    element.addEventListener('pointerdown', down, true); element.addEventListener('pointermove', move, true); element.addEventListener('mousedown', mouse, true)
    element.addEventListener('dragover', over); element.addEventListener('drop', drop); element.addEventListener('dragleave', leave)
    element.addEventListener('pointerleave', cancel); element.addEventListener('pointercancel', cancel); window.addEventListener('pointerup', up); window.addEventListener('blur', cancel)
    return () => { mounted = false; cancel(); unsubscribe(); element.removeEventListener('pointerdown', down, true); element.removeEventListener('pointermove', move, true); element.removeEventListener('mousedown', mouse, true); element.removeEventListener('dragover', over); element.removeEventListener('drop', drop); element.removeEventListener('dragleave', leave); element.removeEventListener('pointerleave', cancel); element.removeEventListener('pointercancel', cancel); window.removeEventListener('pointerup', up); window.removeEventListener('blur', cancel) }
  }, [surface])
}

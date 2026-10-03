import { interactionGrid } from '../domain/mapSettings'
import { semanticTerrain } from '../domain/terrainIntent'
import { defaultLandArea } from '../domain/landAreas'
import { effectiveLayers } from '../domain/projectView'
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Point } from './viewport'
import { screenToMap } from './viewport'
import {
  areaGeometry,
  AREA_LIMITS,
  createArea,
  distance,
} from '../domain/areas'
import { snapPoint } from '../domain/mapSettings'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { isEditing } from '../store/shortcuts'
import { ownObjectGesture } from './interaction'
export function useAreaDrawing(surface: RefObject<HTMLDivElement | null>) {
  const [preview, setPreview] = useState<Point[]>([])
  useEffect(() => {
    const element = surface.current
    if (!element) return
    let points: Point[] = [],
      cursor: Point | null = null,
      pointer: number | null = null,
      release = () => {},
      map = useProjectStore.getState().map,
      layer = ''
    const cancel = () => {
      release()
      release = () => {}
      points = []
      cursor = null
      const id = pointer
      pointer = null
      if (id !== null && element.hasPointerCapture(id))
        element.releasePointerCapture(id)
      setPreview([])
    }
    const report = (e: unknown) =>
      useEditorStore.setState({
        message: e instanceof Error ? e.message : 'Cannot create area.',
      })
    const position = (e: PointerEvent) => {
      const b = element.getBoundingClientRect()
      let p = snapPoint(
        screenToMap(
          { x: e.clientX - b.left, y: e.clientY - b.top },
          useEditorStore.getState().viewport,
        ),
        interactionGrid(map),
        e.altKey,
      )
      const last = points.at(-1)
      if (
        e.shiftKey &&
        last &&
        useEditorStore.getState().areaShape === 'polygon'
      ) {
        const angle =
            (Math.round(
              Math.atan2(p.y - last.y, p.x - last.x) / (Math.PI / 4),
            ) *
              Math.PI) /
            4,
          d = distance(last, p)
        p = { x: last.x + Math.cos(angle) * d, y: last.y + Math.sin(angle) * d }
      }
      return p
    }
    const show = (shift = false) => {
      const shape = useEditorStore.getState().areaShape
      if (!points.length) {
        setPreview([])
        return
      }
      if ((shape === 'rectangle' || shape === 'ellipse') && cursor) {
        try {
          setPreview(
            areaGeometry(shape, [points[0], cursor], map, shift).polygons[0]
              .outer,
          )
        } catch {
          setPreview([points[0], cursor])
        }
      } else setPreview([...points, ...(cursor ? [cursor] : [])])
    }
    const finish = (shift = false) => {
      const e = useEditorStore.getState(),
        p = [...points],
        end = cursor
      try {
        const geometry = areaGeometry(
          e.areaShape,
          (e.areaShape === 'rectangle' || e.areaShape === 'ellipse') && end
            ? [p[0], end]
            : p,
          map,
          shift,
        )
        if (useProjectStore.getState().map !== map || e.activeLayerId !== layer)
          throw new Error('The map or active layer changed. Draw again.')
        const area = createArea(geometry, e.areaFill)
        if(e.areaRole!=='area'){area.land=e.areaRole==='terrain-region'?semanticTerrain(e.areaTerrain,map.width):defaultLandArea(e.areaRole);area.name=e.areaRole==='landmass'?'Landmass':'Terrain region'}
        area.strokeWidth = e.areaStroke ? 2 : 0
        area.strokeStyle = e.areaStrokeStyle
        cancel()
        useProjectStore.getState().addArea(area)
        useEditorStore.setState({
          message:
            e.areaShape === 'freehand'
              ? `Contour simplified from ${p.length} to ${geometry.polygons[0].outer.length} points.`
              : '',
        })
      } catch (error) {
        cancel()
        report(error)
      }
    }
    const down = (e: PointerEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        useEditorStore.getState().activeTool !== 'area'
      )
        return
      e.preventDefault()
      e.stopPropagation()
      if (!points.length) {
        map = useProjectStore.getState().map
        layer = useEditorStore.getState().activeLayerId
        const l = effectiveLayers(useProjectStore.getState(), useEditorStore.getState().soloLayerId).find((l) => l.id === layer)
        if (!l?.visible || l.locked) {
          report(new Error('Choose a visible, unlocked layer.'))
          return
        }
      }
      const p = position(e),
        shape = useEditorStore.getState().areaShape
      if (p.x < 0 || p.y < 0 || p.x > map.width || p.y > map.height) {
        report(new Error('Start and draw inside the map.'))
        return
      }
      if (!points.length) {
        release = ownObjectGesture(cancel)
        points = [p]
        useEditorStore.setState({ message: '' })
      } else if (shape === 'polygon') {
        if (
          points.length >= 3 &&
          distance(p, points[0]) < 10 / useEditorStore.getState().viewport.zoom
        ) {
          finish()
          return
        }
        if (distance(p, points[points.length - 1]) > AREA_LIMITS.epsilon)
          points.push(p)
        if (points.length > AREA_LIMITS.ring) {
          cancel()
          report(new Error('Polygon point limit reached.'))
          return
        }
      }
      cursor = p
      if (shape !== 'polygon') {
        pointer = e.pointerId
        element.setPointerCapture(pointer)
      }
      show(e.shiftKey)
    }
    const move = (e: PointerEvent) => {
      if (!points.length || e.defaultPrevented) return
      cursor = position(e)
      if (
        useEditorStore.getState().areaShape === 'freehand' &&
        pointer === e.pointerId &&
        distance(points[points.length - 1], cursor) >=
          AREA_LIMITS.sampleDistance
      ) {
        points.push(cursor)
        if (points.length > AREA_LIMITS.samples) {
          cancel()
          report(
            new Error('Freehand sample limit reached. Draw a shorter contour.'),
          )
          return
        }
      }
      show(e.shiftKey)
    }
    const up = (e: PointerEvent) => {
      if (pointer === e.pointerId) {
        cursor = position(e)
        finish(e.shiftKey)
      }
    }
    const key = (e: KeyboardEvent) => {
      if (
        isEditing(e.target) ||
        !points.length ||
        (e.target instanceof Element && e.target.closest('dialog'))
      )
        return
      if (['Escape', 'Backspace', 'Enter'].includes(e.key)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (e.key === 'Escape') cancel()
        else if (e.key === 'Enter') finish()
        else {
          points.pop()
          if (!points.length) cancel()
          else show()
        }
      }
    }
    const double = (e: MouseEvent) => {
      if (points.length && useEditorStore.getState().areaShape === 'polygon') {
        e.preventDefault()
        finish()
      }
    }
    const mouse = (e: MouseEvent) => {
      if (e.button === 0 && useEditorStore.getState().activeTool === 'area') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    element.addEventListener('pointerdown', down, true)
    element.addEventListener('pointermove', move, true)
    element.addEventListener('mousedown', mouse, true)
    element.addEventListener('dblclick', double)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', key, true)
    window.addEventListener('blur', cancel)
    element.addEventListener('pointercancel', cancel)
    const unsubscribe = useEditorStore.subscribe((s, p) => {
      if (
        s.activeTool !== p.activeTool ||
        s.areaShape !== p.areaShape || s.areaRole !== p.areaRole ||
        s.areaFill !== p.areaFill ||
        s.picker !== p.picker ||
        s.workspace !== p.workspace
      )
        cancel()
    })
    return () => {
      cancel()
      unsubscribe()
      element.removeEventListener('pointerdown', down, true)
      element.removeEventListener('pointermove', move, true)
      element.removeEventListener('mousedown', mouse, true)
      element.removeEventListener('dblclick', double)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', key, true)
      window.removeEventListener('blur', cancel)
      element.removeEventListener('pointercancel', cancel)
    }
  }, [surface])
  return preview
}

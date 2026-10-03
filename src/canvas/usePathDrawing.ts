import { createRoute, routeStyle } from '../domain/routes'
import { interactionGrid } from '../domain/mapSettings'
import { effectiveLayers, editableProjectIds } from '../domain/projectView'
import { createWall, compatibleWalls, wallDrawingStyle } from '../domain/walls'
import { snapPathPoint } from '../domain/objectSnapping'
import { history } from '../store/history'
import { isOpening, openingsAfterExtension } from '../domain/openings'
import { reversePath, withPathGeometry, validatePath } from '../domain/paths'
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { PathNode, PathObject } from '../domain/models'
import {
  createPath,
  constrainPathAngle,
  PATH_LIMITS,
  screenTolerance,
} from '../domain/paths'
import { snapPoint } from '../domain/mapSettings'
import { screenToMap } from './viewport'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { isEditing } from '../store/shortcuts'
import { ownObjectGesture } from './interaction'
export function usePathDrawing(surface: RefObject<HTMLDivElement | null>) {
  const [preview, setPreview] = useState<PathNode[]>([])
  useEffect(() => {
    const el = surface.current
    if (!el) return
    let extending:PathObject|null=null
    let extensionSource:PathObject|null=null
    let nodes: PathNode[] = [],
      cursor: PathNode | null = null,
      drag: number | null = null,
      release = () => {},
      layer = '',
      map = useProjectStore.getState().map
    const show = () =>
      setPreview([
        ...nodes,
        ...(cursor && drag === null && nodes.length < PATH_LIMITS.nodes
          ? [cursor]
          : []),
      ])
    const cancel = () => {
      release()
      release = () => {}
      nodes = []
      cursor = null
      const id = drag
      drag = null
      if (id !== null && el.hasPointerCapture(id)) el.releasePointerCapture(id)
      setPreview([])
      extending=null;extensionSource=null
      useEditorStore.setState({wallSnap:null})
    }
    const report = (e: unknown) =>
      useEditorStore.setState({
        message: e instanceof Error ? e.message : 'Invalid path.',
      })
    const position = (e: PointerEvent, handle = false) => {
      const b = el.getBoundingClientRect(),
        editor = useEditorStore.getState()
      let p = screenToMap(
        { x: e.clientX - b.left, y: e.clientY - b.top },
        editor.viewport,
      )
      if (!handle && ['wall','route'].includes(editor.activeTool)) {
        const project=useProjectStore.getState(),layers=effectiveLayers(project,editor.soloLayerId),allowed=editableProjectIds(project,editor.soloLayerId)
        const snap=snapPathPoint(p,project.objects.filter(o=>allowed.has(o.id)),layers,map,interactionGrid(map),editor.viewport.zoom,editor.objectSnap,e.altKey,extending?.id,editor.activeTool==='route'?'routes':'walls')
        p=snap.point;useEditorStore.setState({wallSnap:snap})
      } else if (!handle) p = snapPoint(p, interactionGrid(map), e.altKey)
      if (e.shiftKey && nodes.length) p = constrainPathAngle(nodes.at(-1)!, p)
      return p
    }
    const finish = (closed = false) => {
      try {
        if(extending && nodes.length===extending.nodes.length && !closed){cancel();return}
        const editor = useEditorStore.getState()
        if (
          editor.activeLayerId !== layer ||
          useProjectStore.getState().map !== map
        )
          throw new Error('Map or layer changed. Draw again.')
        const path = extending ? validatePath(withPathGeometry({...extending,closed},nodes)) : editor.activeTool==='wall' ? createWall(nodes,closed,wallDrawingStyle(editor.wallStyle)) : editor.activeTool==='route' ? createRoute(nodes,closed,editor.routeStyle) : createPath(nodes,closed,editor.pathWidth,editor.pathStroke)
        if(extending){
          if(useProjectStore.getState().objects.find(o=>o.id===extending!.id)!==extensionSource)throw new Error('The wall changed. Cancel and extend again.')
          const openings=useProjectStore.getState().objects.filter(isOpening).filter(o=>o.wallId===path.id)
          const attached=openingsAfterExtension(extensionSource!,path,openings)
          history.run('Extend wall',()=>useProjectStore.getState().updatePath(path,attached))
        } else if(!useProjectStore.getState().addPath(path))throw new Error('Wall could not be added. Check the layer, texture and document limits.')
        cancel()
        if(!['wall','route'].includes(editor.activeTool))useEditorStore.setState({ activeTool: 'select' })
      } catch (e) {
        report(e)
      }
    }
    const down = (e: PointerEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        !['path','wall','route'].includes(useEditorStore.getState().activeTool)
      )
        return
      e.preventDefault()
      e.stopPropagation()
      el.focus()
      if (!nodes.length) {
        map = useProjectStore.getState().map
        layer = useEditorStore.getState().activeLayerId
        const l = effectiveLayers(useProjectStore.getState(), useEditorStore.getState().soloLayerId).find((l) => l.id === layer)
        if (!l?.visible || l.locked) {
          report(new Error('Choose a visible, unlocked layer.'))
          return
        }
      }
      const p = position(e),
        zoom = useEditorStore.getState().viewport.zoom
      if (p.x < 0 || p.y < 0 || p.x > map.width || p.y > map.height) {
        report(new Error('Place nodes inside the map.'))
        return
      }
      if (
        nodes.length >= 3 &&
        Math.hypot(p.x - nodes[0].x, p.y - nodes[0].y) <
          screenTolerance(9, zoom)
      ) {
        finish(true)
        return
      }
      if (
        nodes.length &&
        Math.hypot(p.x - nodes.at(-1)!.x, p.y - nodes.at(-1)!.y) < 0.01
      )
        return
      if (nodes.length >= PATH_LIMITS.nodes) {
        report(new Error('Maximum 256 nodes. Finish this path.'))
        return
      }
      if (!nodes.length) release = ownObjectGesture(cancel)
      const snap=useEditorStore.getState().wallSnap
      const junction=['wall','route'].includes(useEditorStore.getState().activeTool)&&snap?.objectId&&Math.hypot(snap.point.x-p.x,snap.point.y-p.y)<.001?snap.objectId:undefined
      nodes = [...nodes, { ...p, id: crypto.randomUUID(), mode: 'corner', ...(junction?{junction}:{}) }]
      cursor = null
      if (useEditorStore.getState().pathMode === 'curved') {
        drag = e.pointerId
        el.setPointerCapture(drag)
      }
      show()
    }
    const move = (e: PointerEvent) => {
      if(e.defaultPrevented)return
      if(!nodes.length){if(['wall','route'].includes(useEditorStore.getState().activeTool))position(e);return}
      if (drag === e.pointerId) {
        const p = position(e, true),
          node = nodes.at(-1)!,
          v = { x: p.x - node.x, y: p.y - node.y }
        if (Math.hypot(v.x, v.y) * useEditorStore.getState().viewport.zoom > 3)
          nodes = [
            ...nodes.slice(0, -1),
            { ...node, mode: 'smooth', in: { x: -v.x, y: -v.y }, out: v },
          ]
        cursor = null
      } else
        cursor = {
          ...position(e),
          id: map.grid.snapEnabled && !e.altKey ? 'snap-preview' : 'preview',
          mode: 'corner',
        }
      show()
    }
    const up = (e: PointerEvent) => {
      if (drag === e.pointerId) {
        drag = null
        if (el.hasPointerCapture(e.pointerId))
          el.releasePointerCapture(e.pointerId)
        show()
      }
    }
    const key = (e: KeyboardEvent) => {
      if (
        !nodes.length ||
        isEditing(e.target) ||
        (e.target instanceof Element && e.target.closest('dialog'))
      )
        return
      if (['Enter', 'Escape', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (e.key === 'Enter') finish()
        else if (e.key === 'Escape') cancel()
        else {
          if(extending && nodes.length<=extending.nodes.length){cancel();return}
          nodes = nodes.slice(0, -1)
          if (!nodes.length) cancel()
          else show()
        }
      }
    }
    const double = (e: MouseEvent) => {
      if (nodes.length) {
        e.preventDefault()
        finish()
      }
    }
    const mouse = (e: MouseEvent) => {
      if (e.button === 0 && ['path','wall','route'].includes(useEditorStore.getState().activeTool)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const done = () => {
      if (nodes.length) finish()
      if(!nodes.length)useEditorStore.setState({ activeTool: 'select' })
    }
    const extend=()=>{
      const editor=useEditorStore.getState(),project=useProjectStore.getState(),snap=editor.wallSnap,intent=editor.continueWall
      const target=project.objects.find(o=>o.id===(intent?.id||snap?.objectId))
      if(target?.kind!=='path'||!(editor.activeTool==='route'?!!target.route&&!target.closed&&JSON.stringify(routeStyle(target))===JSON.stringify(editor.routeStyle):compatibleWalls(target,editor.wallStyle))||!editableProjectIds(project,editor.soloLayerId).has(target.id)||!project.layers.find(l=>l.id===editor.activeLayerId)?.objectIds.includes(target.id)){
        report(new Error('Continue needs an open path with the same style on the active layer. Draw a separate connecting path instead.'));return
      }
      cancel();extensionSource=target;extending=intent?.endpoint==='start'||(!intent&&snap?.nodeIndex===0)?reversePath(target):target;map=project.map;layer=editor.activeLayerId
      nodes=structuredClone(extending.nodes)
      release=ownObjectGesture(cancel);useEditorStore.setState({continueWall:null});show();el.focus()
    }
    window.addEventListener('mapweaver-path-done', done)
    window.addEventListener('mapweaver-wall-continue',extend)
    const unsub = useEditorStore.subscribe((s, p) => {
      if (
        s.activeTool !== p.activeTool ||
        s.routeStyle.route.kind !== p.routeStyle.route.kind ||
        s.picker !== p.picker ||
        s.workspace !== p.workspace
      )
        cancel()
      if(s.continueWall && s.continueWall!==p.continueWall)extend()
    })
    el.addEventListener('pointerdown', down, true)
    el.addEventListener('pointermove', move, true)
    el.addEventListener('mousedown', mouse, true)
    el.addEventListener('dblclick', double)
    el.addEventListener('pointercancel', cancel)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', key, true)
    window.addEventListener('blur', cancel)
    return () => {
      cancel()
      unsub()
      window.removeEventListener('mapweaver-path-done', done)
      window.removeEventListener('mapweaver-wall-continue',extend)
      el.removeEventListener('pointerdown', down, true)
      el.removeEventListener('pointermove', move, true)
      el.removeEventListener('mousedown', mouse, true)
      el.removeEventListener('dblclick', double)
      el.removeEventListener('pointercancel', cancel)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', key, true)
      window.removeEventListener('blur', cancel)
    }
  }, [surface])
  return preview
}


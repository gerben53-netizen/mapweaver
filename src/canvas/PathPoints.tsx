import { useGeneratedWallImages } from './useGeneratedWallImages'
import { createRoute } from '../domain/routes'
import { interactionGrid } from '../domain/mapSettings'
import { useEffect } from 'react'
import { Circle, Group, Line, Shape, Text } from 'react-konva/lib/ReactKonvaCore'
import { createWall, wallDrawingStyle } from '../domain/walls'
import { snapPathPoint } from '../domain/objectSnapping'
import { effectiveLayers, editableProjectIds } from '../domain/projectView'
import { paintPath } from './drawPath'
import { useImage } from '../images/useImage'
import type { PathNode } from '../domain/models'
import {
  buildSegments,
  insertPathNode,
  nearestPathPoint,
  removePathNode,
  setPathHandle,
  withPathGeometry,
} from '../domain/paths'
import { pathTrace } from './drawPath'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { snapPoint } from '../domain/mapSettings'
import { changePath, endPathEdit } from '../store/pathEditing'
import { isEditing } from '../store/shortcuts'
export function PathPreview({ nodes }: { nodes: PathNode[] }) {
  const route=useEditorStore(s=>s.routeStyle)
  const zoom = useEditorStore((s) => s.viewport.zoom)
  const tool=useEditorStore(s=>s.activeTool),style=useEditorStore(s=>s.wallStyle),snap=useEditorStore(s=>s.wallSnap)
  const {image}=useImage(tool==='route'&&route.stroke.kind==='texture'?route.stroke.assetId:tool==='wall'&&style.stroke.kind==='texture'?style.stroke.assetId:'','asset','fillPattern')
  useGeneratedWallImages(tool==='wall'?style.wall.generated:undefined)
  if (!nodes.length && !snap) return null
  return (
    <Group listening={false}>
      {['wall','route'].includes(tool)&&nodes.length>1&&<Shape sceneFunc={c=>{try{const wall=tool==='route'?createRoute(nodes,false,route):createWall(nodes,false,wallDrawingStyle(style));c._context.save();c._context.translate(wall.x,wall.y);paintPath(c._context,wall,image,[],[],true);c._context.restore()}catch{/* Invalid drafts cannot enter the document. */}}}/>}
      {(tool==='wall'||tool==='route'||tool==='editPath')&&snap?.kind&&<Group x={snap.point.x} y={snap.point.y}>
        {snap.kind==='endpoint'?<Circle radius={8/zoom} stroke="#7aefbe" strokeWidth={2/zoom}/>:snap.kind==='grid'||snap.kind==='guide'?<><Line points={[-8/zoom,0,8/zoom,0]} stroke="#7aefbe" strokeWidth={2/zoom}/><Line points={[0,-8/zoom,0,8/zoom]} stroke="#7aefbe" strokeWidth={2/zoom}/></>:<Line points={snap.kind==='segment'?[0,-8/zoom,8/zoom,0,0,8/zoom,-8/zoom,0]:[-6/zoom,-6/zoom,6/zoom,-6/zoom,6/zoom,6/zoom,-6/zoom,6/zoom]} closed stroke="#7aefbe" strokeWidth={2/zoom}/>}
        <Text text={snap.kind==='segment'?'T connection':snap.kind} x={12/zoom} y={-16/zoom} fontSize={12/zoom} fill="#174b35" padding={3/zoom}/>
      </Group>}
      <Shape
        stroke="#5ca7ff"
        strokeWidth={2 / zoom}
        sceneFunc={(c, s) => {
          const ctx = c._context
          ctx.beginPath()
          if (nodes.length) ctx.moveTo(nodes[0].x, nodes[0].y)
          for (const segment of buildSegments(nodes, false)) {
            const p = segment.curve.points
            ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y)
          }
          c.strokeShape(s)
        }}
      />
      {nodes.map((n) => (
        <Group key={n.id}>
          {(['in', 'out'] as const).map(
            (side) =>
              n[side] && (
                <Group key={side}>
                  <Line
                    points={[n.x, n.y, n.x + n[side]!.x, n.y + n[side]!.y]}
                    stroke="#72b7ff"
                    strokeWidth={1 / zoom}
                  />
                  <Circle
                    x={n.x + n[side]!.x}
                    y={n.y + n[side]!.y}
                    radius={3 / zoom}
                    fill="#72b7ff"
                  />
                </Group>
              ),
          )}
          <Circle
            x={n.x}
            y={n.y}
            radius={4 / zoom}
            fill={n.id === 'snap-preview' ? '#7aefbe' : '#fff'}
            stroke="#5ca7ff"
            strokeWidth={1 / zoom}
          />
        </Group>
      ))}
    </Group>
  )
}
export function PathPoints() {
  const tool = useEditorStore((s) => s.activeTool),
    ids = useEditorStore((s) => s.selectedObjectIds),
    selected = useEditorStore((s) => s.editPoint),
    zoom = useEditorStore((s) => s.viewport.zoom)
  const object = useProjectStore((s) => s.objects.find((o) => o.id === ids[0])),
    map = useProjectStore((s) => s.map), grid = interactionGrid(map)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        useEditorStore.getState().activeTool !== 'editPath' ||
        isEditing(e.target) ||
        (e.target instanceof Element && e.target.closest('dialog'))
      )
        return
      if (['Enter', 'Escape', 'Delete', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (e.key === 'Enter' || e.key === 'Escape')
          endPathEdit(e.key === 'Escape')
        else {
          const i = useEditorStore.getState().editPoint
          if (i !== null) {
            changePath((p) => removePathNode(p, i))
            useEditorStore.setState({ editPoint: null })
          }
        }
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [])
  if (tool !== 'editPath' || object?.kind !== 'path') return null
  return (
    <Group>
      <Shape
        stroke="#5ca7ff"
        strokeWidth={2 / zoom}
        hitStrokeWidth={14 / zoom}
        sceneFunc={(c, s) => {
          pathTrace(c._context, object)
          c.strokeShape(s)
        }}
        onDblClick={(e) => {
          const p = e.target.getStage()?.getRelativePointerPosition()
          if (p)
            changePath((o) => {
              const n = nearestPathPoint(o, p)
              return insertPathNode(o, n.segment, n.t)
            })
          e.cancelBubble = true
        }}
      />
      {object.nodes.map((n, i) => (
        <Group key={n.id}>
          {(['in', 'out'] as const).map(
            (side) =>
              n[side] && (
                <Group key={side}>
                  <Line
                    points={[n.x, n.y, n.x + n[side]!.x, n.y + n[side]!.y]}
                    stroke="#72b7ff"
                    strokeWidth={1 / zoom}
                    listening={false}
                  />
                  <Circle
                    x={n.x + n[side]!.x}
                    y={n.y + n[side]!.y}
                    radius={4 / zoom}
                    fill="#72b7ff"
                    stroke="#163b61"
                    strokeWidth={1 / zoom}
                    draggable
                    onMouseDown={(e) => {
                      e.cancelBubble = true
                      useEditorStore.setState({ editPoint: i })
                    }}
                    onDragEnd={(e) => {
                      const latest=useProjectStore.getState().objects.find(o=>o.id===object.id)
                      if(latest?.kind==='path'){const node=latest.nodes[i],handle=node[side];if(handle)e.target.position({x:node.x+handle.x,y:node.y+handle.y})}
                    }}
                    onDragMove={(e) => {
                      const v = { x: e.target.x() - n.x, y: e.target.y() - n.y }
                      changePath((o) =>
                        withPathGeometry(
                          o,
                          o.nodes.map((node, j) =>
                            i === j ? setPathHandle(node, side, v) : node,
                          ),
                        ),
                      )
                    }}
                  />
                </Group>
              ),
          )}
          <Circle
            x={n.x}
            y={n.y}
            radius={5 / zoom}
            stroke="#163b61"
            strokeWidth={1 / zoom}
            fill={i === selected ? '#ffd478' : '#fff'}
            draggable
            onMouseDown={(e) => {
              e.cancelBubble = true
              useEditorStore.setState({ editPoint: i })
            }}
            onDragMove={(e) => {
              const editor=useEditorStore.getState(),project=useProjectStore.getState(),allowed=editableProjectIds(project,editor.soloLayerId)
              const snapped=(object.pathKind==='wall'||object.route)?snapPathPoint({x:e.target.x(),y:e.target.y()},project.objects.filter(o=>allowed.has(o.id)),effectiveLayers(project,editor.soloLayerId),project.map,grid,zoom,editor.objectSnap,Boolean(e.evt.altKey),object.id,object.route?'routes':'walls'):null
              if(snapped)useEditorStore.setState({wallSnap:snapped})
              const point = snapped ? snapped.point : snapPoint(
                { x: e.target.x(), y: e.target.y() },
                grid,
                Boolean(e.evt.altKey),
              )
              changePath((o) =>
                withPathGeometry(
                  o,
                  o.nodes.map((node, j) =>
                    i === j ? { ...node, ...point, junction:snapped?.objectId } : node,
                  ),
                ),
              )
            }}
            onDragEnd={(e) => {
              const latest = useProjectStore
                .getState()
                .objects.find((o) => o.id === object.id)
              if (latest?.kind === 'path') e.target.position(latest.nodes[i])
            }}
          />
        </Group>
      ))}
    </Group>
  )
}




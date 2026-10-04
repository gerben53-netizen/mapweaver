import { interactionGrid } from '../domain/mapSettings'
import { useEffect } from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'
import 'konva/lib/shapes/Circle'
import 'konva/lib/shapes/Line'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { allRings } from '../domain/areas'
import { snapPoint } from '../domain/mapSettings'
import { changeAreaPoint, endAreaEdit } from '../store/areaEditing'
import { isEditing } from '../store/shortcuts'
export function AreaPoints() {
  const tool = useEditorStore((s) => s.activeTool),
    ids = useEditorStore((s) => s.selectedObjectIds),
    ringIndex = useEditorStore((s) => s.editRing),
    selected = useEditorStore((s) => s.editPoint),
    zoom = useEditorStore((s) => s.viewport.zoom)
  const object = useProjectStore((s) => s.objects.find((o) => o.id === ids[0])),
    map = useProjectStore((s) => s.map)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        useEditorStore.getState().activeTool !== 'editArea' ||
        isEditing(e.target) ||
        (e.target instanceof Element && e.target.closest('dialog'))
      )
        return
      if (['Enter', 'Escape', 'Delete', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (e.key === 'Enter' || e.key === 'Escape')
          endAreaEdit(e.key === 'Escape')
        else changeAreaPoint('remove')
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [])
  const ceilingsVisible=useEditorStore(s=>s.ceilingsVisible)
  if (object?.kind==='area'&&object.ceiling&&!ceilingsVisible)return null
  if (tool !== 'editArea' || object?.kind !== 'area') return null
  const ring = allRings(object.geometry)[ringIndex]
  if (!ring) return null
  return (
    <Group>
      <Line
        points={ring.flatMap((p) => [p.x, p.y])}
        closed
        stroke="#5ca7ff"
        strokeWidth={2 / zoom}
        hitStrokeWidth={14 / zoom}
        onDblClick={(e) => {
          const p = e.target.getStage()?.getRelativePointerPosition()
          if (p) changeAreaPoint('add', p)
          e.cancelBubble = true
        }}
      />
      {ring.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={5 / zoom}
          stroke="#163b61"
          strokeWidth={1 / zoom}
          fill={i === selected ? '#ffd478' : '#ffffff'}
          draggable
          onMouseDown={(e) => {
            e.cancelBubble = true
            useEditorStore.setState({ editPoint: i })
          }}
          onDragStart={() => useEditorStore.setState({ editPoint: i })}
          onDragEnd={(e) => {
            const target = e.target,
              point = snapPoint(
                { x: target.x(), y: target.y() },
                interactionGrid(map),
                Boolean(e.evt.altKey),
              )
            changeAreaPoint('move', point)
            const latest = useProjectStore
              .getState()
              .objects.find((o) => o.id === object.id)
            if (latest?.kind === 'area') {
              const saved = allRings(latest.geometry)[ringIndex][i]
              target.position(saved)
            }
          }}
        />
      ))}
    </Group>
  )
}

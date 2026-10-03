import { softShadowStyle } from '../domain/mapEffects'
import { paintStampEffects } from './drawStampEffects'
import { isAnnotation } from '../domain/annotations'
import { AnnotationPaint } from './AnnotationPaint'
import { interactionGrid } from '../domain/mapSettings'
import { ScatterPaint } from './ScatterPaint'
import { effectiveLayers, editableProjectIds } from '../domain/projectView'
import { PathPaint } from './PathPaint'
import { AreaPaint } from './AreaPaint'
import { objectAssetId } from '../domain/areas'
import { patternNodeTransform } from '../domain/patterns'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Group, Image as KonvaImage, Rect, Text, Shape } from 'react-konva/lib/ReactKonvaCore'
import type Konva from 'konva'
import 'konva/lib/shapes/Image'
import type { OpeningObject, PlacedObject } from '../domain/models'
import { normalizeNodeTransform, objectNodeProps, snapRotation } from '../domain/transforms'
import { useImage } from '../images/useImage'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { beginObjectEdit } from '../store/objectEdits'
import { finishObjectGesture, ownObjectGesture } from './interaction'
import { selectionBounds } from '../domain/layers'
import { buildSnapTargets, snapSelection } from '../domain/objectSnapping'
import type { SnapTargets, SnapBox } from '../domain/objectSnapping'

type Edit = NonNullable<ReturnType<typeof beginObjectEdit>>
type Session = { bypass: boolean; group: PlacedObject[]; targets: SnapTargets; bounds: SnapBox; rawDelta?: { x: number; y: number }; edit: Edit; kind: 'move' | 'rotate' | 'resize'; release: () => void }
export const EditableStamp = memo(function EditableStamp({ object, register, connections, openings, viewportSize, locked = false }: { object: PlacedObject; viewportSize?:{width:number;height:number}; openings?: OpeningObject[]; connections?: {x:number;y:number}[]; locked?: boolean; register: (id: string, node: Konva.Group | null) => void }) {
  const { image, error } = useImage(isAnnotation(object)?'':objectAssetId(object) || '', 'asset', object.kind === 'stamp' ? 'stamp' : 'fillPattern')
  const mapEffects=useProjectStore(s=>s.map.effects)
  const node = useRef<Konva.Group | null>(null)
  const session = useRef<Session | null>(null)
  const shiftPress = useRef(false)
  // Freeze React's drawing props only while Konva owns the active pointer gesture.
  const [base, setBase] = useState<PlacedObject | null>(null)
  const drawn = base || object
  const attach = useCallback((value: Konva.Group | null) => { node.current = value; register(object.id, value) }, [object.id, register])
  function preview(current: Session, finishing = false) {
    const target = node.current
    if (!target) return
    const nodeTransform = {
      x: target.x(), y: target.y(), width: target.width(), height: target.height(), scaleX: target.scaleX(), scaleY: target.scaleY(), rotation: target.rotation(),
    }
    const transform = current.edit.before.kind === 'patternFill' ? patternNodeTransform(nodeTransform) : normalizeNodeTransform(current.edit.before, nodeTransform, current.kind)
    if (current.kind === 'move') {
      const editor = useEditorStore.getState(), state = useProjectStore.getState()
      const delta = finishing && current.rawDelta ? current.rawDelta : { x: transform.x - current.edit.before.x, y: transform.y - current.edit.before.y }
      current.rawDelta = delta
      const snapped = snapSelection({ ...current.bounds, x: current.bounds.x + delta.x, y: current.bounds.y + delta.y }, current.targets, interactionGrid(state.map), editor.viewport.zoom, editor.objectSnap, current.bypass)
      state.translate(current.group, { x: delta.x + snapped.delta.x, y: delta.y + snapped.delta.y })
      target.position({ x: current.edit.before.x + current.edit.before.width / 2 + delta.x + snapped.delta.x, y: current.edit.before.y + current.edit.before.height / 2 + delta.y + snapped.delta.y })
      useEditorStore.setState({ snapGuides: editor.smartGuides ? snapped.guides : [] })
    }
    else current.edit.preview(transform)
  }
  function finish(cancelled = false) {
    const current = session.current
    if (!current) return
    session.current = null
    current.release()
    if (!cancelled) preview(current, true)
    const target = node.current
    target?.stopDrag()
    target?.getStage()?.find('Transformer').forEach((transformer) => (transformer as Konva.Transformer).stopTransform())
    if (cancelled) current.edit.cancel()
    else if (current.group.length > 1) useProjectStore.getState().commitTranslation(current.group, useProjectStore.getState().objects.filter((item) => current.group.some((before) => before.id === item.id)))
    else current.edit.finish()
    const saved = useProjectStore.getState().objects.find((item) => item.id === object.id)
    if (target && saved) target.setAttrs(objectNodeProps(saved))
    useEditorStore.setState({ snapGuides: [] })
    setBase(null)
  }
  function begin(kind: Session['kind'], bypass = false) {
    finishObjectGesture()
    const edit = beginObjectEdit(object.id, kind === 'move' ? 'Move objects' : kind === 'resize' ? 'Resize object' : 'Rotate object')
    if (!edit) return
    const ids = useEditorStore.getState().selectedObjectIds
    const state = useProjectStore.getState()
    const group = kind === 'move' ? state.objects.filter((item) => ids.includes(item.id) || item.id === object.id) : []
    const allowed = editableProjectIds(state, useEditorStore.getState().soloLayerId)
    const current: Session = { bypass, group, targets: buildSnapTargets(state.objects.filter(o => allowed.has(o.id)), effectiveLayers(state, useEditorStore.getState().soloLayerId), group.map(item => item.id), state.map), bounds: selectionBounds(group.length ? group : [edit.before]), edit, kind, release: () => {} }
    session.current = current
    setBase(edit.before)
    current.release = ownObjectGesture(() => finish(), () => finish(true))
  }
  useEffect(() => () => {
    const current = session.current
    if (!current) return
    session.current = null
    current.release(); current.edit.cancel(); useEditorStore.setState({ snapGuides: [] })
  }, [])
  return <Group id={object.id} ref={attach} {...objectNodeProps(drawn)} draggable={!locked} listening={!locked}
    onMouseDown={(event) => {
      if (event.evt.button !== 0) return
      finishObjectGesture()
      shiftPress.current = event.evt.shiftKey
      const editor = useEditorStore.getState()
      if (event.evt.shiftKey) editor.select(object.id, true)
      else if (!editor.selectedObjectIds.includes(object.id)) editor.select(object.id)
      event.cancelBubble = true
    }}
    onDblClick={() => { const group = useProjectStore.getState().objectGroups.find(g => g.objectIds.includes(object.id)); if (group) { useProjectStore.getState().editGroup(group.id); useEditorStore.getState().select(object.id) } }}
    onClick={(event) => { if (!event.evt.shiftKey && event.evt.button === 0) useEditorStore.getState().select(object.id) }}
    onDragStart={(event) => { if (shiftPress.current) { node.current?.stopDrag(); return }; begin('move', Boolean(event.evt.altKey)) }}
    onDragMove={(event) => { if (session.current) { session.current.bypass = Boolean(event.evt.altKey); preview(session.current) } }}
    onDragEnd={(event) => { if (session.current) session.current.bypass = Boolean(event.evt.altKey); finish() }}
    onTransformStart={() => {
      const transformer = node.current?.getStage()?.findOne('Transformer') as Konva.Transformer | undefined
      begin(transformer?.getActiveAnchor() === 'rotater' ? 'rotate' : 'resize')
    }}
    onTransform={(event) => {
      if (session.current?.kind === 'rotate' && node.current) node.current.rotation(snapRotation(node.current.rotation(), Boolean((event.evt as MouseEvent).shiftKey)))
      if (session.current) preview(session.current)
    }}
    onTransformEnd={() => finish()}>
    {isAnnotation(drawn)?<AnnotationPaint object={drawn}/>:drawn.kind === 'scatter' ? <ScatterPaint object={drawn}/> : drawn.kind === 'path' ? <PathPaint viewportSize={viewportSize} openings={openings} object={drawn} image={image} connections={connections} /> : drawn.kind === 'area' ? <AreaPaint object={drawn} image={image} /> : <><Rect width={drawn.width} height={drawn.height} fill="rgba(0,0,0,0)" />{image && drawn.kind === 'stamp' && (softShadowStyle(drawn,mapEffects).enabled || drawn.effects?.shadow.enabled || drawn.effects?.glow.enabled) && <Shape listening={false} perfectDrawEnabled={false} width={drawn.width} height={drawn.height} sceneFunc={c=>paintStampEffects(c._context,drawn,image,mapEffects)}/>}{image ? <KonvaImage image={image} width={drawn.width} height={drawn.height} x={drawn.scaleX < 0 ? drawn.width : 0} y={drawn.scaleY < 0 ? drawn.height : 0} scaleX={drawn.scaleX} scaleY={drawn.scaleY} opacity={drawn.opacity} listening={false} /> : <Text text={error || 'Loading…'} width={drawn.width} height={drawn.height} fontSize={12} fill="#733d30" listening={false} />}</>}
  </Group>
})











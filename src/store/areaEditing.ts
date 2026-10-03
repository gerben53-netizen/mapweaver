import type { AreaObject } from '../domain/models'
import type { Point } from '../canvas/viewport'
import { allRings, closestPoint, distance, withGeometry } from '../domain/areas'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history } from './history'
import { ownObjectGesture, finishObjectGesture } from '../canvas/interaction'
let current: { id: string; release: () => void } | null = null
export function endAreaEdit(cancel = false) {
  if (!current) return
  const session = current
  current = null
  session.release()
  if (cancel) history.cancel()
  else history.commit()
  useEditorStore.setState({ activeTool: 'select', editPoint: null })
}
export function startAreaEdit(object: AreaObject) {
  finishObjectGesture()
  history.begin('Edit area points')
  current = { id: object.id, release: () => {} }
  current.release = ownObjectGesture(
    () => endAreaEdit(),
    () => endAreaEdit(true),
  )
  useEditorStore.setState({
    activeTool: 'editArea',
    selectedObjectIds: [object.id],
    editRing: 0,
    editPoint: null,
  })
}
export function changeAreaPoint(
  action: 'move' | 'add' | 'remove',
  point?: Point,
) {
  const editor = useEditorStore.getState(),
    o = useProjectStore.getState().objects.find((o) => o.id === current?.id)
  if (o?.kind !== 'area') return
  try {
    const geometry = structuredClone(o.geometry),
      ring = allRings(geometry)[editor.editRing]
    if (!ring) throw new Error('Select a ring first.')
    if (action === 'remove') {
      if (ring.length <= 3)
        throw new Error('A ring needs at least three points.')
      if (editor.editPoint === null) return
      ring.splice(editor.editPoint, 1)
    }
    if (action === 'move' && point && editor.editPoint !== null)
      ring[editor.editPoint] = point
    if (action === 'add' && point) {
      let index = 0,
        best = Infinity,
        insert = point
      ring.forEach((p, i) => {
        const q = closestPoint(point, p, ring[(i + 1) % ring.length]),
          d = distance(q, point)
        if (d < best) {
          best = d
          index = i + 1
          insert = q
        }
      })
      ring.splice(index, 0, insert)
    }
    useProjectStore.getState().updateArea(withGeometry(o, geometry))
    useEditorStore.setState({
      message: '',
      ...(action === 'remove' ? { editPoint: null } : {}),
    })
  } catch (error) {
    useEditorStore.setState({
      message: error instanceof Error ? error.message : 'Invalid point edit.',
    })
  }
}

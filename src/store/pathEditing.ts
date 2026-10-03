import type { PathObject } from '../domain/models'
import { validatePath } from '../domain/paths'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { editableProjectIds } from '../domain/projectView'
import { history } from './history'
import { ownObjectGesture, finishObjectGesture } from '../canvas/interaction'
let current: { id: string; release: () => void } | null = null
export function endPathEdit(cancel = false) {
  if (!current) return
  const session = current
  current = null
  session.release()
  if (cancel) history.cancel()
  else history.commit()
  useEditorStore.setState({ activeTool: 'select', editPoint: null, wallSnap:null })
}
export function startPathEdit(object: PathObject) {
  finishObjectGesture()
  const state = useProjectStore.getState()
  if (!editableProjectIds(state).has(object.id)) return
  history.begin('Edit path')
  current = { id: object.id, release: () => {} }
  current.release = ownObjectGesture(
    () => endPathEdit(),
    () => endPathEdit(true),
  )
  useEditorStore.setState({
    activeTool: 'editPath',
    selectedObjectIds: [object.id],
    editPoint: null,
  })
}
export function changePath(edit: (path: PathObject) => PathObject) {
  const o = useProjectStore.getState().objects.find((o) => o.id === current?.id)
  if (o?.kind !== 'path') return
  try {
    useProjectStore.getState().updatePath(validatePath(edit(o)))
    useEditorStore.setState({ message: '' })
  } catch (e) {
    useEditorStore.setState({
      message: e instanceof Error ? e.message : 'Invalid path edit.',
    })
  }
}


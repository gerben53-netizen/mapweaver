import { fitEditorView } from '../canvas/viewActions'
import { undoLibrary } from '../library/libraryHistory'
import { saveLocalProject } from '../projects/localSession'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history, useHistoryStore } from './history'
import { cancelObjectGesture, finishObjectGesture, objectGestureActive } from '../canvas/interaction'
export function isEditing(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="spinbutton"], [role="combobox"]'))
}
export function handleEditorShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || (event.target instanceof Element && event.target.closest('dialog'))) return
  if (!(event.target instanceof Element) || !event.target.closest('[data-mapweaver-editor]')) return
  const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey
  if (modifier && key === 's') { event.preventDefault(); if (!event.repeat && useEditorStore.getState().workspace === 'editor') void saveLocalProject(); return }
  if (!isEditing(event.target) && useEditorStore.getState().workspace === 'library' && modifier && ['z','y'].includes(key)) { event.preventDefault(); if (!event.repeat) void undoLibrary(key==='y'||event.shiftKey); return }
  if (key === 'escape' && useEditorStore.getState().activeTool === 'placeStamp') { event.preventDefault(); cancelObjectGesture(); useEditorStore.setState({ activeTool: 'select', message: '' }); return }
  if (event.target.closest('[data-stamp-ui], [data-scene-ui]') && !modifier) return
  if (isEditing(event.target) || useEditorStore.getState().workspace !== 'editor') return
  if (modifier && (key === 'z' || key === 'y')) {
    event.preventDefault()
    if (event.repeat) return
    if (objectGestureActive() || useHistoryStore.getState().busy) {
      useEditorStore.setState({ message: 'Finish the current gesture or press Escape before undo or redo.' }); return
    }
    if (key === 'y' || event.shiftKey) history.redo(); else history.undo()
    return
  }
  const project = useProjectStore.getState()
  let action: (() => void) | undefined
  if (modifier) {
    if (key === 'g') action = event.shiftKey ? project.ungroupSelected : project.groupSelected
    if (key === 'd') action = project.duplicate
    if (key === 'c') action = project.copy
    if (key === 'v') action = project.paste
  } else {
    if(key === 'f') action = () => fitEditorView(event.shiftKey)
    if(key === '\\') action = () => useEditorStore.setState(s=>({focusMode:!s.focusMode}))
    if(key === 'v') action = () => useEditorStore.setState({activeTool:'select'})
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key) && useEditorStore.getState().activeTool === 'select' && useEditorStore.getState().selectedObjectIds.length) {
      const step = event.shiftKey ? project.map.grid.visible || project.map.grid.snapEnabled ? project.map.grid.cellSize : 10 : 1
      action = () => project.nudge({ x: key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0, y: key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0 })
    }
    if (key === 'delete' || key === 'backspace') action = project.deleteSelection
    if (key === 'enter') action = () => { const ids=useEditorStore.getState().selectedObjectIds, group=project.objectGroups.find(g=>g.objectIds.some(id=>ids.includes(id))); if(group)project.editGroup(group.id) }
    if (key === 'escape') action = () => { if(objectGestureActive()){cancelObjectGesture();return} if(useEditorStore.getState().editingGroupId){project.editGroup(null);return} useEditorStore.setState({ activeTool: 'select', picker: null, patternReplacementId: null, selectedObjectIds: [] }) }
  }
  if (action) { event.preventDefault(); if (event.repeat) return; if (key !== 'escape') finishObjectGesture(); action() }
}



import { mapCapabilities } from '../domain/mapCapabilities'
import { routePreset, type RouteKind } from '../domain/routes'
import { finishObjectGesture } from '../canvas/interaction'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

/** Route remains an internal drawing mode so snapping, continuation and previews stay shared. */
export function PathTypeChoice() {
  const tool = useEditorStore(s => s.activeTool), kind = useEditorStore(s => s.routeStyle.route.kind)
  const capabilities = mapCapabilities(useProjectStore(s => s.map.mapType))
  return <label>Path type<select aria-label="Path type" value={tool === 'route' ? kind : 'generic'} onChange={e => {
    finishObjectGesture()
    if (e.target.value === 'generic') useEditorStore.setState({ activeTool: 'path', message: '' })
    else useEditorStore.setState({ activeTool: 'route', routeStyle: routePreset(e.target.value as RouteKind), message: '' })
  }}>
    <option value="generic">Generic</option>
    {(capabilities.tools.includes('route') || tool === 'route') && <><option value="river">River</option><option value="road">Road</option><option value="border">Border</option></>}
  </select></label>
}

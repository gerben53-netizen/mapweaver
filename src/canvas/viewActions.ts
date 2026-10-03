import { fitToMap } from './viewport'
import { selectionBounds } from '../domain/layers'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
export function fitEditorView(selection=false) {
 const rect=document.querySelector('[aria-label="Map canvas"]')?.getBoundingClientRect()
 if(!rect?.width||!rect.height)return
 const editor=useEditorStore.getState(),project=useProjectStore.getState()
 const objects=project.objects.filter(o=>editor.selectedObjectIds.includes(o.id))
 if(selection&&!objects.length)return
 const bounds=selection?selectionBounds(objects):{x:0,y:0,width:project.map.width,height:project.map.height}
 const v=fitToMap({width:Math.max(1,bounds.width),height:Math.max(1,bounds.height)},rect)
 useEditorStore.setState({viewport:{zoom:v.zoom,pan:{x:v.pan.x-bounds.x*v.zoom,y:v.pan.y-bounds.y*v.zoom}}})
}

import { scatterDefaults } from '../domain/scatter'
import { canCreateWithTool, mapCapabilities } from '../domain/mapCapabilities'
import { cancelObjectGesture } from '../canvas/interaction'
import { useEditorStore as editor } from './editorStore'
import { useProjectStore as project } from './projectStore'

/** Mounted once by the editor; guards all activation paths, including future shortcuts. */
export function watchMapToolContext() {
 let updating=false
 const enforce=(typeChanged=false)=>{
  if(updating)return
  const p=project.getState(),e=editor.getState(),cap=mapCapabilities(p.map.mapType)
  const continuation=e.continueWall&&p.objects.find(o=>o.id===e.continueWall?.id)
  const editingExisting=!typeChanged&&continuation?.kind==='path'&&((e.activeTool==='route'&&!!continuation.route)||(e.activeTool==='wall'&&continuation.pathKind==='wall'))
  const invalid=!canCreateWithTool(p.map.mapType,e.activeTool)&&!editingExisting
  if(!invalid&&(!typeChanged||cap.geographicAreas||e.areaRole==='area'))return
  updating=true
  try {
   cancelObjectGesture()
   editor.setState({...(invalid?{activeTool:'select',continueWall:null,snapGuides:[],wallSnap:null}:{}),...(!cap.geographicAreas?{areaRole:'area',areaPreview:null}:{})})
  } finally {updating=false}
 }
 const stopEditor=editor.subscribe(()=>enforce()),stopProject=project.subscribe((s,p)=>{if(s.map.mapType!==p.map.mapType){editor.setState({scatterSettings:scatterDefaults(s.map.mapType)});enforce(true)}})
 enforce()
 return()=>{stopEditor();stopProject()}
}

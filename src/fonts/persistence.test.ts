import { expect,it } from 'vitest'
import { createLabel,restyleLabel } from '../domain/annotations'
import { parseProject } from '../projects/format'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { defaultGeography } from '../domain/geography'
import { defaultMapStyle } from '../domain/mapSettings'
it('round-trips chosen font IDs and records font changes as normal undoable edits',()=>{
 const object=createLabel({x:250,y:250},'The Amber Coast'),map={width:1000,height:800,...defaultMapStyle(),background:null,mapType:'world-map' as const,geography:defaultGeography('world-map')}
 const doc={formatVersion:12,id:'font-test',name:'Fonts',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects:[object],layers:[{id:'text',name:'Text',visible:true,locked:false,objectIds:[object.id]}],layerTree:{roots:['text'],groups:[]},objectGroups:[],assets:[]}
 useProjectStore.setState(doc);useEditorStore.setState({activeLayerId:'text',selectedObjectIds:[object.id],editingGroupId:null,soloLayerId:null});history.reset()
 const next=restyleLabel(object,{...object.style,font:'cormorantgaramond',italic:true})
 useProjectStore.getState().updateAnnotations([next]);expect(useProjectStore.getState().objects[0]).toEqual(next)
 history.undo();expect(useProjectStore.getState().objects[0]).toEqual(object);history.redo();expect(useProjectStore.getState().objects[0]).toEqual(next)
 expect(parseProject(JSON.parse(JSON.stringify({...doc,objects:[next]}))).objects[0]).toEqual(next)
})


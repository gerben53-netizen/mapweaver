import { moveSceneObjects } from '../domain/sceneMove'
import type { SceneDestination } from '../domain/sceneMove'
import { remapOpening, isOpening } from '../domain/openings'
import type { StoreApi } from 'zustand'
import type { ProjectState } from './projectStore'
import type { LayerGroup, ObjectGroup } from '../domain/grouping'
import { createObjectGroup, flatLayerTree, moveLayerEntry, validateLayerTree, validateObjectGroups } from '../domain/grouping'
import { editableProjectIds, effectiveLayers, expandGroupSelection } from '../domain/projectView'
import { transformSelection } from '../domain/selectionTransform'
import type { SelectionTransform } from '../domain/selectionTransform'
import { DOCUMENT_LIMITS } from '../domain/documentLimits'
import type { PlacedObject } from '../domain/models'
import { useEditorStore as editor } from './editorStore'
import { history } from './history'

export interface ManagementActions {
  moveSceneObjects: (ids:string[], target:SceneDestination)=>void
  groupSelected: () => void
  ungroupSelected: () => void
  editGroup: (id: string | null) => void
  changeGroup: (id: string, patch: Partial<Pick<ObjectGroup,'name'|'visible'|'locked'>>) => void
  groupMember: (id: string, groupId: string | null) => void
  changeObject: (id: string, patch: { name?: string; visible?: boolean; locked?: boolean }) => void
  transformSelected: (transform: Partial<SelectionTransform>) => void
  addLayerGroup: () => void
  changeLayerGroup: (id: string, patch: Partial<Pick<LayerGroup,'name'|'visible'|'locked'>>) => void
  moveTreeEntry: (id: string, parentId: string | null, index?: number) => void
  reorderTreeEntry: (id: string, direction: -1 | 1) => void
  duplicateTreeEntry: (id: string) => void
  deleteTreeEntry: (id: string, confirmed?: boolean) => void
  soloLayer: (id: string | null) => void
}
const validName=(name:string)=>{if(!name.trim()||name.length>120||[...name].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw new Error('Use 1–120 printable characters.');return name.trim()}
export function createManagementActions(set: StoreApi<ProjectState>['setState'], get:()=>ProjectState, canAdd:(state:ProjectState,objects:PlacedObject[])=>boolean):ManagementActions {
  const report=(message:string)=>editor.setState({message})
  const run=(label:string,action:()=>void)=>{try{history.run(label,action);const state=get(),allowed=editableProjectIds(state,editor.getState().soloLayerId);editor.setState(s=>({selectedObjectIds:s.selectedObjectIds.filter(id=>allowed.has(id)),editingGroupId:state.objectGroups.some(g=>g.id===s.editingGroupId)?s.editingGroupId:null}));}catch(error){report((error as Error).message)}}
  const selected=()=>{const s=get(),e=editor.getState(),ids=expandGroupSelection(e.selectedObjectIds,s.objectGroups,e.editingGroupId),allowed=editableProjectIds(s,e.soloLayerId);if(ids.some(id=>!allowed.has(id)))throw new Error('Unlock and show the entire selection first.');return ids}
  const tree=()=>get().layerTree||flatLayerTree(get().layers)
  const descendants=(id:string)=>{const result:string[]=[],groups=new Map(tree().groups.map(g=>[g.id,g]));const visit=(key:string)=>{result.push(key);groups.get(key)?.children.forEach(visit)};visit(id);return result}
  return {
    moveSceneObjects:(ids,target)=>run('Move scene objects',()=>{set(moveSceneObjects(get(),ids,target,editor.getState().soloLayerId));report('')}),
    groupSelected:()=>run('Group objects',()=>{const s=get(),ids=selected();const group=createObjectGroup(crypto.randomUUID(),'Group',ids,s.objectGroups,s.layers,s.objects);set({objectGroups:[...s.objectGroups,group]});editor.setState({editingGroupId:null,selectedObjectIds:group.objectIds,message:''})}),
    ungroupSelected:()=>run('Ungroup objects',()=>{const ids=selected();set({objectGroups:get().objectGroups.filter(group=>!group.objectIds.some(id=>ids.includes(id)))});editor.setState({editingGroupId:null,message:''})}),
    editGroup:id=>{if(id!==null&&!get().objectGroups.some(group=>group.id===id))return;editor.setState({editingGroupId:id,message:''})},
    changeGroup:(id,patch)=>run('Change object group',()=>{if(patch.name!==undefined)patch={...patch,name:validName(patch.name)};const s=get(),groups=s.objectGroups.map(group=>group.id===id?{...group,...patch}:group);validateObjectGroups(groups,s.layers,s.objects);set({objectGroups:groups})}),
    groupMember:(id,groupId)=>run('Change group membership',()=>{const s=get();if(!editableProjectIds(s).has(id))throw new Error('Unlock and show this object first.');let groups=s.objectGroups.map(g=>({...g,objectIds:g.objectIds.filter(member=>member!==id)}));if(groupId){const group=groups.find(g=>g.id===groupId);if(!group||group.locked||!group.visible)throw new Error('Choose a visible, unlocked group.');const layer=s.layers.find(layer=>layer.id===group.layerId)!;if(!layer.objectIds.includes(id))throw new Error('A group can only contain objects from its layer.');group.objectIds=layer.objectIds.filter(member=>member===id||group.objectIds.includes(member))}groups=groups.filter(g=>g.objectIds.length);validateObjectGroups(groups,s.layers,s.objects);set({objectGroups:groups})}),
    changeObject:(id,patch)=>run('Change object',()=>{if(patch.name!==undefined)patch={...patch,name:validName(patch.name)};set({objects:get().objects.map(o=>o.id===id?{...o,...patch}:o)})}),
    transformSelected:transform=>run('Transform selection',()=>{const s=get(),ids=new Set(selected());for(const o of s.objects)if((isOpening(o)&&ids.has(o.wallId))||(o.kind==='label'&&o.ownerId&&ids.has(o.ownerId))){if(!editableProjectIds(s).has(o.id))throw new Error('Unlock and show the whole wall assembly first.');ids.add(o.id)}const replacements=new Map(transformSelection(s.objects.filter(o=>ids.has(o.id)),transform).map(o=>[o.id,o]));const objects=s.objects.map(o=>replacements.get(o.id)||o);if(canAdd({...s,objects},[]))set({objects})}),
    addLayerGroup:()=>run('Add layer group',()=>{const t=tree(),id=crypto.randomUUID();const next={roots:[id,...t.roots],groups:[...t.groups,{id,name:'Layer group',children:[],visible:true,locked:false}]};validateLayerTree(next,get().layers);set({layerTree:next})}),
    changeLayerGroup:(id,patch)=>run('Change layer group',()=>{if(patch.name!==undefined)patch={...patch,name:validName(patch.name)};const t=tree();const next={...t,groups:t.groups.map(group=>group.id===id?{...group,...patch}:group)};validateLayerTree(next,get().layers);set({layerTree:next})}),
    moveTreeEntry:(id,parentId,index=1e6)=>run('Move layer entry',()=>{const s=get();if(effectiveLayers(s).some(l=>l.id===id&&l.locked))throw new Error('Unlock the layer before moving it.');set({layerTree:moveLayerEntry(tree(),s.layers,id,parentId,index)})}),
    reorderTreeEntry:(id,direction)=>run('Reorder layer entry',()=>{const t=tree(),parent=t.groups.find(g=>g.children.includes(id)),siblings=parent?.children||t.roots,index=siblings.indexOf(id),next=index+direction;if(index<0||next<0||next>=siblings.length)return;set({layerTree:moveLayerEntry(t,get().layers,id,parent?.id||null,next)})}),
    duplicateTreeEntry:id=>run('Duplicate layer entry',()=>{
      const s=get(),t=tree(),branch=new Set(descendants(id)),sourceLayers=s.layers.filter(l=>branch.has(l.id))
      if(!branch.has(id)||s.layers.length+sourceLayers.length>DOCUMENT_LIMITS.layers)throw new Error('Layer limit exceeded.')
      const layerIds=new Map(sourceLayers.map(l=>[l.id,crypto.randomUUID()])), groupIds=new Map(t.groups.filter(g=>branch.has(g.id)).map(g=>[g.id,crypto.randomUUID()]))
      const members=new Set(sourceLayers.flatMap(l=>l.objectIds)), objectIds=new Map([...members].map(key=>[key,crypto.randomUUID()]))
      const copies=s.objects.filter(o=>members.has(o.id)).map(o=>({...remapOpening(structuredClone(o),objectIds),id:objectIds.get(o.id)!}))
      if(!canAdd(s,copies))return
      const layers=[...s.layers,...sourceLayers.map(l=>({...l,id:layerIds.get(l.id)!,name:`${l.name.slice(0,110)} copy`,objectIds:l.objectIds.map(key=>objectIds.get(key)!)}))]
      const remap=(key:string)=>layerIds.get(key)||groupIds.get(key)!
      const duplicateId=remap(id);if(!duplicateId)throw new Error('Layer entry no longer exists.')
      const parent=t.groups.find(g=>g.children.includes(id));const insert=(ids:string[])=>ids.flatMap(key=>key===id?[key,duplicateId]:[key])
      const layerTree={roots:parent?t.roots:insert(t.roots),groups:[...t.groups.map(g=>g.id===parent?.id?{...g,children:insert(g.children)}:g),...t.groups.filter(g=>branch.has(g.id)).map(g=>({...g,id:groupIds.get(g.id)!,name:`${g.name.slice(0,110)} copy`,children:g.children.map(remap)}))]}
      const objectGroups=[...s.objectGroups,...s.objectGroups.filter(g=>layerIds.has(g.layerId)).map(g=>({...g,id:crypto.randomUUID(),layerId:layerIds.get(g.layerId)!,objectIds:g.objectIds.map(key=>objectIds.get(key)!)}))]
      validateLayerTree(layerTree,layers);validateObjectGroups(objectGroups,layers,[...s.objects,...copies]);set({layers,objects:[...s.objects,...copies],objectGroups,layerTree})
    }),
    deleteTreeEntry:(id,confirmed=false)=>run('Delete layer entry',()=>{const s=get(),t=tree(),branch=new Set(descendants(id)),removed=s.layers.filter(l=>branch.has(l.id));if(removed.length===s.layers.length)throw new Error('Keep at least one layer.');if(effectiveLayers(s).some(l=>branch.has(l.id)&&l.locked)||t.groups.some(g=>branch.has(g.id)&&g.locked))throw new Error('Unlock every affected layer first.');const members=new Set(removed.flatMap(l=>l.objectIds));if((members.size||removed.length>1)&&!confirmed)throw new Error(`Confirm deleting ${removed.length} layers and ${members.size} objects.`);const layers=s.layers.filter(l=>!branch.has(l.id));set({layers,objects:s.objects.filter(o=>!members.has(o.id)),objectGroups:s.objectGroups.filter(g=>!branch.has(g.layerId)),layerTree:{roots:t.roots.filter(key=>!branch.has(key)),groups:t.groups.filter(g=>!branch.has(g.id)).map(g=>({...g,children:g.children.filter(key=>!branch.has(key))}))}});if(branch.has(editor.getState().activeLayerId))editor.setState({activeLayerId:layers[0].id});if(branch.has(editor.getState().soloLayerId||''))editor.setState({soloLayerId:null})}),
    soloLayer:id=>{editor.setState({soloLayerId:id});const allowed=editableProjectIds(get(),id);editor.setState(s=>({selectedObjectIds:s.selectedObjectIds.filter(key=>allowed.has(key))}))},
  }
}

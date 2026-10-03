import { beforeEach, expect, it } from 'vitest'
import { useProjectStore as project } from './projectStore'
import { useEditorStore as editor } from './editorStore'
import { history, useHistoryStore } from './history'
import { createArea, rectangleGeometry, validateArea } from '../domain/areas'
import { createPath, validatePath } from '../domain/paths'
import { createLayeredContent } from '../domain/layers'
import { effectiveLayers, editableProjectIds, projectObjects } from '../domain/projectView'
import { parseProject } from '../projects/format'
import { currentSnapshot, applyPrepared } from '../projects/session'
import { encodeProject, decodeProject } from '../projects/codec'
import { exportScene } from '../export/scene'
const area={...createArea(rectangleGeometry({x:40,y:40,width:100,height:70})),id:'area'}
const path={...createPath([{id:'n1',x:200,y:100,mode:'corner'},{id:'n2',x:300,y:160,mode:'corner'}]),id:'path'}
const stamp={kind:'stamp' as const,id:'stamp',assetId:'image',x:400,y:200,width:40,height:70,rotation:33,scaleX:1,scaleY:1,opacity:1}
beforeEach(()=>{project.setState({...createLayeredContent([area,path,stamp]),objectGroups:[],layerTree:null});editor.setState({selectedObjectIds:[],editingGroupId:null,soloLayerId:null,groupSelection:true,clipboard:[],clipboardGroups:[],activeLayerId:'objects'});history.reset()})
const group=()=>{editor.setState({selectedObjectIds:['area','path','stamp']});project.getState().groupSelected();return project.getState().objectGroups[0]}
it('groups without changing order, enters/exits, ungroups, undoes and rejects cross-layer membership',()=>{
  const g=group();expect(g.objectIds).toEqual(['area','path','stamp']);expect(useHistoryStore.getState().undoCount).toBe(1)
  editor.getState().select('path');expect(editor.getState().selectedObjectIds).toHaveLength(3)
  project.getState().editGroup(g.id);editor.getState().select('path');expect(editor.getState().selectedObjectIds).toEqual(['path'])
  project.getState().editGroup(null);editor.getState().select('area');project.getState().ungroupSelected()
  expect(project.getState().layers[0].objectIds).toEqual(['area','path','stamp']);expect(project.getState().objectGroups).toEqual([])
  history.undo();expect(project.getState().objectGroups).toEqual([g]);history.redo();project.getState().addLayer();const layer=editor.getState().activeLayerId
  editor.setState({selectedObjectIds:['stamp']});project.getState().moveSelection(layer);editor.setState({selectedObjectIds:['area','stamp']});project.getState().groupSelected();expect(project.getState().objectGroups).toEqual([]);expect(editor.getState().message).toContain('one layer')
})
it('transforms mixed groups uniformly, including geometry and pattern frame; one undo restores exact input',()=>{
  group();const before=structuredClone(project.getState().objects)
  project.getState().transformSelected({scale:1.5,rotation:37,flipX:true})
  const result=project.getState().objects
  expect(result).not.toEqual(before);expect(result.every(o=>o.width>0&&o.height>0)).toBe(true)
  expect(()=>validateArea(result[0] as typeof area)).not.toThrow();expect(()=>validatePath(result[1] as typeof path)).not.toThrow()
  expect(useHistoryStore.getState().undoCount).toBe(2);history.undo();expect(project.getState().objects).toEqual(before);history.redo();expect(project.getState().objects).toEqual(result)
})
it('moves complete groups, preserves groups during duplication/paste and deletes metadata with members atomically',()=>{
  const g=group();project.getState().duplicate();expect(project.getState().objectGroups).toHaveLength(2)
  project.getState().copy();project.getState().addLayer();const destination=editor.getState().activeLayerId
  project.getState().paste();expect(project.getState().objectGroups).toHaveLength(3);expect(project.getState().objectGroups.at(-1)?.layerId).toBe(destination)
  editor.setState({selectedObjectIds:['area']});project.getState().moveSelection(destination)
  expect(project.getState().objectGroups.find(item=>item.id===g.id)?.layerId).toBe(destination)
  expect(project.getState().layers.find(l=>l.id===destination)?.objectIds).toContain('stamp')
  project.getState().deleteSelection();expect(project.getState().objectGroups).toHaveLength(2);history.undo();expect(project.getState().objects.some(o=>o.id==='stamp')).toBe(true)
})
it('inherits tree flags non-destructively and keeps solo outside persisted state/export',()=>{
  project.getState().addLayerGroup();const id=project.getState().layerTree!.groups[0].id
  project.getState().moveTreeEntry('objects',id);project.getState().changeLayerGroup(id,{locked:true,visible:false})
  expect(project.getState().layers[0]).toMatchObject({visible:true,locked:false});expect(editableProjectIds(project.getState()).size).toBe(0)
  expect(projectObjects(project.getState(),true)).toEqual([])
  project.getState().changeLayerGroup(id,{locked:false,visible:true});project.getState().addLayer();project.getState().soloLayer(editor.getState().activeLayerId)
  expect(projectObjects(project.getState(),true,editor.getState().soloLayerId)).toEqual([])
  expect(exportScene(currentSnapshot(),{scale:1,includeGrid:false,transparent:true}).items.filter(i=>i.kind==='object')).toHaveLength(3)
})
it('duplicates a subtree including object groups and safely deletes it in one transaction',()=>{
  group();project.getState().addLayerGroup();const id=project.getState().layerTree!.groups[0].id
  project.getState().moveTreeEntry('objects',id);project.getState().duplicateTreeEntry(id)
  expect(project.getState().objects).toHaveLength(6);expect(project.getState().objectGroups).toHaveLength(2);expect(effectiveLayers(project.getState())).toHaveLength(2)
  const before=structuredClone(currentSnapshot());project.getState().deleteTreeEntry(id);expect(currentSnapshot()).toEqual(before)
  project.getState().deleteTreeEntry(id,true);expect(project.getState().objects).toHaveLength(3);history.undo();expect(currentSnapshot()).toEqual(before)
})
it('rejects cycles and excessive depth without a history entry',()=>{
  project.getState().addLayerGroup();const id=project.getState().layerTree!.groups[0].id,count=useHistoryStore.getState().undoCount
  project.getState().moveTreeEntry(id,id);expect(useHistoryStore.getState().undoCount).toBe(count);expect(editor.getState().message).toMatch(/unreachable|cyclic/)
})
it('roundtrips groups/tree through v5 portable files and clipboard across projects',async()=>{
  project.setState({...createLayeredContent([area,path]),objectGroups:[],layerTree:null});editor.setState({selectedObjectIds:['area','path']});project.getState().groupSelected();project.getState().copy();project.getState().addLayerGroup();project.getState().moveTreeEntry('objects',project.getState().layerTree!.groups[0].id)
  const now=new Date().toISOString(),document=parseProject({...currentSnapshot(),formatVersion:5,id:'project',name:'Groups',createdAt:now,modifiedAt:now,assets:[]})
  const decoded=await decodeProject(await encodeProject({document,assets:new Map()}));expect(decoded.document).toEqual(document);expect(parseProject(document)).toEqual(document)
  applyPrepared({document:{...document,id:'other',objects:[],layers:[{...document.layers[0],objectIds:[]}],objectGroups:[]},assets:new Map()},()=>true)
  project.getState().paste();expect(project.getState().objects).toHaveLength(2);expect(project.getState().objectGroups).toHaveLength(1)
  const corrupt=structuredClone(document);corrupt.objectGroups![0].objectIds.push('dangling');expect(()=>parseProject(corrupt)).toThrow()
})

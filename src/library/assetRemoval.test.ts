import { createLabel } from '../domain/annotations'
import { beforeEach, expect, it } from 'vitest'
import { registerTestAssets } from '../test/assets'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { cleanRemovedAssets, currentMapUsage, prepareAssetRemoval } from './assetRemoval'
import { projectAssets } from '../projects/assets'
const asset={kind:'stamp' as const,id:'tree',name:'Tree',naturalWidth:40,naturalHeight:60,mimeType:'image/png',categoryId:'',contentHash:'',createdAt:''}
const place=(id='tree')=>project.getState().place({...asset,id},{x:100,y:100})
beforeEach(()=>{
 history.cancel();registerTestAssets({tree:'stamp',rock:'stamp'})
 project.setState({objectGroups:[],layerTree:null,map:{width:600,height:400,background:null,...defaultMapStyle()},...createLayeredContent()})
 editor.setState({...editor.getInitialState(),activeLayerId:'objects'});history.reset()
})
it('permits clipboard-only deletion, preserves unrelated clipboard and clears tool/resource references',()=>{
 place();place('rock');const objects=project.getState().objects
 editor.setState({clipboard:objects,selectedObjectIds:objects.map(o=>o.id),stampAsset:asset,recentAssets:[{id:'tree',kind:'stamp',source:'library'}]})
 project.getState().deleteSelection();history.reset()
 expect(()=>prepareAssetRemoval(['tree'])).not.toThrow()
 expect(cleanRemovedAssets(new Set(['tree']))).toMatchObject({clipboard:true,history:false,tools:true})
 expect(editor.getState().clipboard.map(o=>o.assetId)).toEqual(['rock']);expect(editor.getState().stampAsset).toBeNull()
 expect(editor.getState().recentAssets).toEqual([]);expect(projectAssets().map(a=>a.id)).toEqual(['rock'])
})
it.each(['undo','redo'])('invalidates %s-only references without marking unsaved changes clean',direction=>{
 place();const id=project.getState().objects[0].id
 if(direction==='redo')history.undo()
 else {editor.setState({selectedObjectIds:[id]});project.getState().deleteSelection()}
 // A separate, unsaved map edit must remain dirty after history cleanup.
 project.setState(s=>({map:{...s.map,width:700}}))
 expect(()=>prepareAssetRemoval(['tree'])).not.toThrow()
 expect(cleanRemovedAssets(new Set(['tree'])).history).toBe(true)
 expect(useHistoryStore.getState()).toMatchObject({undoCount:0,redoCount:0,dirty:true})
 expect(history.undo()).toBe(false);expect(history.redo()).toBe(false);expect(project.getState().map.width).toBe(700)
})
it('preserves unrelated undo history and distinguishes actual current-map use',()=>{
 place('rock');const before=useHistoryStore.getState().undoCount
 expect(currentMapUsage(['tree','rock'])).toEqual(['rock'])
 expect(()=>prepareAssetRemoval(['rock'])).toThrow(/current map/)
 expect(cleanRemovedAssets(new Set(['tree'])).history).toBe(false)
 expect(useHistoryStore.getState().undoCount).toBe(before);expect(history.undo()).toBe(true)
})

it('prunes dependent labels and group membership while keeping the unrelated clipboard asset usable',()=>{
 place();place('rock');const objects=project.getState().objects,label=createLabel({x:0,y:0},'Tree label',objects[0])
 editor.setState({selectedObjectIds:objects.map(o=>o.id)});project.getState().copy()
 editor.setState({clipboard:[...objects,label],clipboardGroups:[{id:'group',name:'Mixed',layerId:'objects',visible:true,locked:false,objectIds:[...objects.map(o=>o.id),label.id]}]})
 project.getState().deleteSelection();history.reset();cleanRemovedAssets(new Set(['tree']))
 expect(editor.getState().clipboard).toEqual([objects[1]]);expect(editor.getState().clipboardGroups).toEqual([])
 project.getState().paste();expect(project.getState().objects.map(o=>o.assetId)).toEqual(['rock'])
})

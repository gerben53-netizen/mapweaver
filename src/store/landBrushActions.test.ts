import { createLabel } from '../domain/annotations'
import { beforeEach, expect, it } from 'vitest'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history, useHistoryStore } from './history'
import { applyLandStroke, defaultLandBrush } from '../domain/landBrush'
import { commitLandStroke, landBrushInput } from './landBrushActions'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { gatherProject, encodeProject, decodeProject } from '../projects/archive'
import { currentSnapshot } from '../projects/session'
import { parseProject } from '../projects/format'
// Campfire revision increases on history transitions; compare authored content, as history.test.ts does.
const content=(s:ReturnType<typeof currentSnapshot>)=>{const {campfireRevision:revision,...map}=s.map;void revision;return {...s,map}}
beforeEach(()=>{
 useProjectStore.setState({map:{...defaultMapStyle(),width:1024,height:768,mapType:'world-map',geography:defaultGeography('world-map'),background:null},objects:[],layers:[{id:'layer',name:'Land',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['layer'],groups:[]}})
 useEditorStore.setState({activeLayerId:'layer',soloLayerId:null,selectedObjectIds:[]});history.reset()
})
const island=()=>{const before=currentSnapshot(),result=applyLandStroke(landBrushInput(before,defaultLandBrush,[{x:400,y:350}],1,'island'));commitLandStroke(before,result,'add');return result}
it('commits once, restores exact geometry/metadata on undo/redo and rejects stale results',()=>{
 const before=currentSnapshot(),result=island(),after=currentSnapshot()
 expect(useHistoryStore.getState().undoCount).toBe(1);expect(after.map.landEditing?.revision).toBe(1)
 expect(after.layers[0].objectIds).toEqual(['island']);expect(after.objects).toEqual(result.added)
 history.undo();expect(content(currentSnapshot())).toEqual(content(before));history.redo();expect(content(currentSnapshot())).toEqual(content(after))
 expect(()=>commitLandStroke(before,result,'add')).toThrow('changed')
 const redo=currentSnapshot(),brush={...defaultLandBrush,action:'remove' as const,size:400}
 const removed=applyLandStroke(landBrushInput(redo,brush,[{x:400,y:350}],1,'unused'))
 useEditorStore.setState({selectedObjectIds:['island']});commitLandStroke(redo,removed,'remove')
 expect(currentSnapshot().objects).toEqual([]);expect(currentSnapshot().layers[0].objectIds).toEqual([]);expect(useEditorStore.getState().selectedObjectIds).toEqual([])
 history.undo();expect(content(currentSnapshot())).toEqual(content(after))
})
it('refuses hidden/locked layers and ignores no-op strokes',()=>{
 const before=currentSnapshot();commitLandStroke(before,{added:[],removed:[],replacements:[]},'add');expect(useHistoryStore.getState().undoCount).toBe(0)
 const result=applyLandStroke(landBrushInput(before,defaultLandBrush,[{x:400,y:350}],1,'island'))
 useProjectStore.setState({layers:[{...before.layers[0],locked:true}]})
 expect(()=>commitLandStroke(currentSnapshot(),result,'add')).toThrow('unlocked')
 expect(currentSnapshot().objects).toEqual([])
})
it('preserves native geometry and optional metadata through map settings, parser and ZIP',async()=>{
 const now='2026-09-26T00:00:00.000Z',info={id:'land-project',name:'Land project',createdAt:now,modifiedAt:now}
 expect((await gatherProject(currentSnapshot(),info)).document.map.landEditing).toBeUndefined()
 island();const before=currentSnapshot();useProjectStore.getState().applyMapSettings({...before.map,width:900},()=>true)
 const prepared=await gatherProject(currentSnapshot(),info),loaded=await decodeProject(await encodeProject(prepared))
 expect(loaded.document.map.landEditing).toEqual(before.map.landEditing);expect(loaded.document.objects).toEqual(before.objects)
 expect(()=>parseProject({...prepared.document,map:{...prepared.document.map,landEditing:{version:9}}})).toThrow()
})

it('keeps linked label positions and cleans memberships when land is removed',()=>{
 island();const s=useProjectStore.getState(),owner=s.objects[0],label={...createLabel({x:0,y:0},'Island',owner),id:'label'}
 useProjectStore.setState({objects:[owner,label],layers:[{...s.layers[0],objectIds:['island','label']}],objectGroups:[{id:'group',name:'Land and name',layerId:'layer',objectIds:['island','label'],visible:true,locked:false}]})
 const before=currentSnapshot(),brush={...defaultLandBrush,action:'remove' as const,size:400},result=applyLandStroke(landBrushInput(before,brush,[{x:400,y:350}],1,'unused'))
 commitLandStroke(before,result,'remove');const after=currentSnapshot(),remaining=after.objects[0]
 expect(remaining).toMatchObject({id:'label',x:label.x,y:label.y});expect('ownerId' in remaining).toBe(false);expect(after.objectGroups?.flatMap(g=>g.objectIds)).not.toContain('island')
 history.undo();expect(content(currentSnapshot())).toEqual(content(before))
})

it('restores hex land, water and clipping exactly and round-trips portable geometry',async()=>{
 const before=currentSnapshot(),brush={...defaultLandBrush,shape:'hexagon' as const},result=applyLandStroke(landBrushInput(before,brush,[{x:400,y:350}],1,'hex'))
 commitLandStroke(before,result,'add');const after=currentSnapshot()
 expect(after.objects[0].kind==='area'&&after.objects[0].geometry.polygons[0].outer).toHaveLength(6)
 expect(history.undo()).toBe(true);expect(content(currentSnapshot())).toEqual(content(before))
 expect(history.redo()).toBe(true);expect(content(currentSnapshot())).toEqual(content(after))
 const now='2026-09-26T00:00:00.000Z',prepared=await gatherProject(after,{id:'hex-map',name:'Hex map',createdAt:now,modifiedAt:now})
 const loaded=await decodeProject(await encodeProject(prepared));expect(loaded.document.objects).toEqual(after.objects);expect(loaded.document.map).toEqual(after.map)
})

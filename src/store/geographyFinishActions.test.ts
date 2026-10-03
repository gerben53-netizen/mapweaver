import { beforeEach,expect,it } from 'vitest'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history,useHistoryStore } from './history'
import { currentSnapshot } from '../projects/session'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { finishPreset } from '../domain/geographyFinish'
import { TerrainStroke,defaultTerrainBrush } from '../domain/terrainBrush'
import { commitTerrainPaint } from './terrainPaintActions'
import { applyLandStroke,defaultLandBrush } from '../domain/landBrush'
import { commitLandStroke,landBrushInput } from './landBrushActions'
import { gatherProject,encodeProject,decodeProject } from '../projects/archive'
beforeEach(()=>{useProjectStore.setState({map:{...defaultMapStyle(),width:1024,height:768,mapType:'world-map',geography:defaultGeography('world-map'),background:null},objects:[],layers:[{id:'land',name:'Land',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['land'],groups:[]}});useEditorStore.setState({activeLayerId:'land',soloLayerId:null});history.reset()})
it('applies/removes finish atomically, supports exact undo and preserves both brushes and ZIP',async()=>{
 const before=currentSnapshot();useProjectStore.getState().applyMapSettings({...before.map,geographyFinish:finishPreset()},()=>true)
 expect(useHistoryStore.getState().undoCount).toBe(1);expect(history.undo()).toBe(true);expect(currentSnapshot()).toEqual(before);expect(history.redo()).toBe(true)
 const brushBefore=currentSnapshot(),land=applyLandStroke(landBrushInput(brushBefore,defaultLandBrush,[{x:400,y:350}],1,'island'));commitLandStroke(brushBefore,land,'add')
 expect(currentSnapshot().map.geographyFinish).toEqual(finishPreset())
 const stroke=new TerrainStroke(undefined,defaultTerrainBrush,currentSnapshot().map);stroke.add({x:400,y:350});const paint=stroke.finish();commitTerrainPaint(paint,undefined,'Paint terrain')
 const withPaint=currentSnapshot();useProjectStore.getState().applyMapSettings({...withPaint.map,geographyFinish:undefined},()=>true)
 expect(currentSnapshot().map.geographyFinish).toBeUndefined();expect(currentSnapshot().map.terrainPaint).toEqual(paint);expect(currentSnapshot().objects).toEqual(withPaint.objects)
 history.undo();expect(currentSnapshot()).toEqual(withPaint)
 const now='2026-09-26T00:00:00.000Z',prepared=await gatherProject(currentSnapshot(),{id:'finish-test',name:'Finish test',createdAt:now,modifiedAt:now}),decoded=await decodeProject(await encodeProject(prepared))
 expect(decoded.document.map.geographyFinish).toEqual(finishPreset());expect(decoded.document.map.terrainPaint).toEqual(paint);expect(decoded.document.objects).toEqual(withPaint.objects)
})

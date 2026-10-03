import { beforeEach, expect, it } from 'vitest'
import { useProjectStore } from './projectStore'
import { history, useHistoryStore } from './history'
import { TerrainStroke, defaultTerrainBrush } from '../domain/terrainBrush'
import { changeTerrainPaint, commitTerrainPaint } from './terrainPaintActions'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { gatherProject, encodeProject, decodeProject } from '../projects/archive'
import { currentSnapshot } from '../projects/session'
import { parseProject } from '../projects/format'
beforeEach(()=>{
  useProjectStore.setState({map:{...defaultMapStyle(),width:1024,height:768,mapType:'world-map',geography:defaultGeography('world-map'),background:null},objects:[],layers:[{id:'layer',name:'Terrain',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null});history.reset()
})
it('commits one stroke once, reuses snapshots for undo/redo and preserves non-paint state',()=>{
  const before=useProjectStore.getState(),stroke=new TerrainStroke(undefined,defaultTerrainBrush,before.map)
  for(let x=40;x<500;x+=20){stroke.add({x,y:200});stroke.snapshot()}
  expect(useHistoryStore.getState().undoCount).toBe(0);expect(useProjectStore.getState().map).toBe(before.map)
  const paint=stroke.finish();commitTerrainPaint(paint,undefined,'Paint terrain')
  expect(useHistoryStore.getState().undoCount).toBe(1);expect(useProjectStore.getState().objects).toBe(before.objects)
  expect(history.undo()).toBe(true);expect(useProjectStore.getState().map).toBe(before.map)
  expect(history.redo()).toBe(true);expect(useProjectStore.getState().map.terrainPaint).toBe(paint)
  changeTerrainPaint({visible:false,locked:true});expect(useProjectStore.getState().map.terrainPaint).toMatchObject({visible:false,locked:true})
  history.undo();expect(useProjectStore.getState().map.terrainPaint).toBe(paint)
  expect(()=>commitTerrainPaint(paint,undefined,'Stale')).toThrow('changed')
})
it('retains painting through map settings and ZIP, while unpainted documents stay unpainted',async()=>{
  const state=useProjectStore.getState(),now='2026-09-26T00:00:00.000Z',info={id:'paint-project',name:'Paint project',createdAt:now,modifiedAt:now}
  const {map,objects,layers,objectGroups,layerTree}=state
  expect((await gatherProject({map,objects,layers,objectGroups,layerTree},info)).document.map.terrainPaint).toBeUndefined()
  const stroke=new TerrainStroke(undefined,defaultTerrainBrush,map);stroke.add({x:100,y:100});const paint=stroke.finish();commitTerrainPaint(paint,undefined,'Paint terrain')
  state.applyMapSettings({...useProjectStore.getState().map,width:512},()=>true)
  expect(useProjectStore.getState().map.terrainPaint).toBe(paint)
  const prepared=await gatherProject(currentSnapshot(),info)
  expect(parseProject(prepared.document).map.terrainPaint).toEqual(paint)
  const loaded=await decodeProject(await encodeProject(prepared))
  expect(loaded.document.map.terrainPaint).toEqual(paint);expect(loaded.assets.size).toBe(0)
})

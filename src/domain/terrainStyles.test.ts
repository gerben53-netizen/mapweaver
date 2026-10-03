import { beforeEach, expect, it } from 'vitest'
import { TERRAIN_STYLES, COAST_STYLES, WATER_STYLES, terrainAppearance, waterAppearance, validateTerrainAppearance, validateWaterAppearance } from './terrainStyles'
import { createArea, rectangleGeometry, validateArea } from './areas'
import { defaultLandArea } from './landAreas'
import { defaultMapStyle, normalizeMapSettings } from './mapSettings'
import { defaultGeography } from './geography'
import { flatLayerTree } from './grouping'
import { parseProject } from '../projects/format'
import { encodeProject, decodeProject } from '../projects/archive'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { exportScene } from '../export/scene'
import { styleWorld } from '../world/styleWorld'
import { generateWorld } from '../world/generate'
import { WORLD_DEFAULTS } from '../world/model'
const area = () => ({...createArea(rectangleGeometry({x:20,y:20,width:200,height:160})),land:{...defaultLandArea('landmass'),appearance:terrainAppearance('grassland')}})
function document() {
  const o = area(),layers=[{id:'land',name:'Land',visible:true,locked:false,objectIds:[o.id]}]
  return {formatVersion:12 as const,id:'terrain',name:'Terrain',createdAt:'2026-09-25T00:00:00.000Z',modifiedAt:'2026-09-25T00:00:00.000Z',assets:[],map:{width:800,height:600,...defaultMapStyle(),campfireRevision:1,background:null,mapType:'world-map' as const,geography:defaultGeography('world-map'),water:waterAppearance('calm')},objects:[o],layers,objectGroups:[],layerTree:flatLayerTree(layers)}
}
beforeEach(()=>{const d=document();store.setState(d);editor.setState({activeLayerId:'land',selectedObjectIds:[]});history.reset()})
it('validates every versioned terrain/coast/water preset and bounded fractional scales',()=>{
  for(const style of Object.keys(TERRAIN_STYLES))for(const coast of Object.keys(COAST_STYLES))expect(validateTerrainAppearance({...terrainAppearance(style as never),coast:coast as never,patternScale:.25}).patternScale).toBe(.25)
  for(const style of Object.keys(WATER_STYLES))expect(validateWaterAppearance(waterAppearance(style as never)).version).toBe(1)
  for(const patch of [{version:2},{style:'unknown'},{style:'toString'},{patternScale:0},{patternScale:NaN},{textureOpacity:2},{feather:101},{blend:-1},{coastScale:Infinity},{extra:1}])expect(()=>validateTerrainAppearance({...terrainAppearance('land'),...patch} as never)).toThrow()
  for(const patch of [{version:2},{style:'toString'},{patternScale:0},{vignette:.8},{textureOpacity:-1},{extra:1}])expect(()=>validateWaterAppearance({...waterAppearance('calm'),...patch} as never)).toThrow()
})
it('round-trips styled areas and water through the project archive and retains old appearance absence',async()=>{
  const d=document();d.objects[0].land.appearance.patternScale=.125
  expect(parseProject(d)).toEqual(d)
  const decoded=await decodeProject(await encodeProject({document:d,assets:new Map()}))
  expect(decoded.document).toEqual(d)
  const old=structuredClone(d);delete (old.map as {water?:unknown}).water;delete (old.objects[0].land as {appearance?:unknown}).appearance
  expect(parseProject(old)).toEqual(old)
  expect(()=>parseProject({...d,map:{...d.map,water:{...d.map.water,version:2}}})).toThrow()
  expect(()=>validateArea({...d.objects[0],land:{...d.objects[0].land,appearance:{...d.objects[0].land.appearance,feather:NaN}}})).toThrow()
})
it('changes and removes styling in single undoable actions without changing geometry, fills or frames',()=>{
  const before=store.getState(),o=before.objects[0];if(o.kind!=='area')throw Error('Area required')
  history.run('Terrain',()=>store.getState().updateArea({...o,land:{...o.land!,appearance:terrainAppearance('desert')}}))
  expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(store.getState().objects).toEqual(before.objects);history.redo()
  const after=store.getState().objects[0];if(after.kind!=='area')throw Error('Area required')
  expect(after.geometry).toEqual(o.geometry);expect(after.patternFrame).toEqual(o.patternFrame);expect(after.fill).toEqual(o.fill)
  store.getState().applyMapSettings({...before.map,water:undefined},()=>true);expect(store.getState().map.water).toBeUndefined();history.undo();expect(store.getState().map.water).toEqual(before.map.water)
  expect(normalizeMapSettings({...before.map,width:1000}).water).toEqual(before.map.water)
})
it('keeps optional generator appearance deterministic and separates it from canonical geography',()=>{
  const r=generateWorld(WORLD_DEFAULTS),original=structuredClone(r),a=styleWorld(r)
  expect(styleWorld(r)).toEqual(a);expect(r).toEqual(original);expect(a.map.generation).toEqual(r.map.generation)
  for(let i=0;i<r.objects.length;i++){const o=r.objects[i],styled=a.objects[i];expect(styled.id).toBe(o.id);if(o.kind==='area'&&styled.kind==='area'){expect(styled.geometry).toEqual(o.geometry);expect(styled.fill).toEqual(o.fill);expect(styled.land?.appearance).toBeDefined()}if(o.kind==='path'&&styled.kind==='path')expect(styled.nodes).toEqual(o.nodes)}
  expect(a.layers).toEqual(r.layers)
})
it('carries appearance to both export sizes, omitting map water on transparent export',()=>{
  const d=document(),copy=structuredClone(d)
  for(const scale of [1,2] as const){const scene=exportScene(d,{scale,includeGrid:false,transparent:false});expect(scene.map.water).toEqual(d.map.water);expect(scene.items.some(i=>i.kind==='color')).toBe(true)}
  expect(exportScene(d,{scale:1,includeGrid:false,transparent:true}).items.some(i=>i.kind==='color')).toBe(false)
  expect(d).toEqual(copy)
})

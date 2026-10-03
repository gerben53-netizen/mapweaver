import { createArea, rectangleGeometry } from '../domain/areas'
import { beforeEach, expect, it } from 'vitest'
import { useProjectStore as project } from './projectStore'
import { history, useHistoryStore } from './history'
import { defaultTerrainBrush } from '../domain/terrainBrush'
import { TextureStroke } from '../domain/textureStroke'
import { changeTexturePaint, commitTexturePaint } from './terrainPaintActions'
import { defaultMapStyle } from '../domain/mapSettings'
import { registerTestAssets } from '../test/assets'
import { currentMapUsage, prepareAssetRemoval, cleanRemovedAssets } from '../library/assetRemoval'
import { referencedAssets } from '../projects/format'
beforeEach(()=>{registerTestAssets({wood:'fillPattern'});project.setState({map:{...defaultMapStyle(),width:512,height:512,background:null},objects:[],layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null});history.reset()})
it('commits once per Paint/Erase/Blend, restores exact state and protects current/history asset use',()=>{
 for(const mode of ['paint','blend','erase'] as const){const before=project.getState().map,stroke=new TextureStroke(before.texturePaint,{...defaultTerrainBrush,mode,assetId:'wood'},before,[],false),count=useHistoryStore.getState().undoCount;stroke.add({x:100,y:100});stroke.add({x:300,y:100});stroke.snapshot();expect(project.getState().map).toBe(before);const paint=stroke.finish();commitTexturePaint(paint,before.texturePaint,mode);expect(useHistoryStore.getState().undoCount).toBe(count+1);history.undo();expect(project.getState().map).toBe(before);history.redo();expect(project.getState().map.texturePaint).toBe(paint)}
 expect(referencedAssets(project.getState())).toContain('wood');expect(currentMapUsage(['wood'])).toEqual(['wood']);expect(()=>prepareAssetRemoval(['wood'])).toThrow()
 while(history.undo()){ /* Move the painted asset entirely into redo history. */ }
 expect(currentMapUsage(['wood'])).toEqual([]);expect(cleanRemovedAssets(new Set(['wood'])).history).toBe(true);expect(history.redo()).toBe(false)
})
it('makes visibility, lock and opacity reversible; refuses stale commits',()=>{
 changeTexturePaint({visible:false,locked:true,opacity:.3});expect(project.getState().map.texturePaint).toMatchObject({visible:false,locked:true,opacity:.3});history.undo();expect(project.getState().map.texturePaint).toBeUndefined();history.redo()
 expect(()=>commitTexturePaint(project.getState().map.texturePaint!,undefined,'stale')).toThrow('changed')
})

it('commits base and Area surface edits together as one reversible action',()=>{
 const floor=createArea(rectangleGeometry({x:160,y:60,width:140,height:160}));project.setState(v=>({objects:[floor],layers:v.layers.map(l=>({...l,objectIds:[floor.id]}))}));history.reset()
 const before=project.getState().map,stroke=new TextureStroke(undefined,{...defaultTerrainBrush,assetId:'wood',size:60},before,[floor],true);stroke.add({x:80,y:100});stroke.add({x:240,y:100});const paint=stroke.finish();expect(Object.keys(paint.tiles).length).toBeGreaterThan(0);expect(Object.keys(paint.baseTiles!).length).toBeGreaterThan(0)
 commitTexturePaint(paint,undefined,'Paint texture');expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(project.getState().map).toBe(before);history.redo();expect(project.getState().map.texturePaint).toBe(paint);expect(project.getState().objects).toEqual([floor])
})

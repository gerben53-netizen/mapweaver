import {expect,it} from 'vitest'
import {mkdtempSync} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {Storage} from './storage'
import {createBackup,extractArchive,validateDataset} from './archives'
import {generation} from './safety'
import {defaultGeography,landLayers} from '../src/domain/geography'
import {createRoute,routePreset} from '../src/domain/routes'

import {defaultMapStyle} from '../src/domain/mapSettings'
import {flatLayerTree} from '../src/domain/grouping'
it('keeps typed routes, concrete styles and scale through SQLite, conflicts, portable transfer and verified backup restore',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-routes-'));let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
 try{
  const nodes=[{id:'a',x:40,y:50,mode:'corner' as const},{id:'b',x:180,y:120,mode:'corner' as const},{id:'c',x:400,y:50,mode:'corner' as const}]
  const objects=(['river','road','border'] as const).map(kind=>createRoute(nodes,kind==='border',routePreset(kind))),layers=landLayers();layers[3].objectIds=objects.map(o=>o.id);const now=new Date().toISOString()
  const input={formatVersion:11,id:crypto.randomUUID(),name:'World',createdAt:now,modifiedAt:now,map:{width:1000,height:700,...defaultMapStyle(),background:null,mapType:'world-map',geography:{...defaultGeography('world-map'),unit:'mi',northDegrees:25,origin:{xKm:-20,yKm:30},exportScaleBar:true}},objects,layers,objectGroups:[],layerTree:flatLayerTree(layers),assets:[]}
  const saved=source.writeProject(input);expect(saved.formatVersion).toBe(12)
  expect(()=>source.writeProject({...input,map:{...input.map,geography:{...input.map.geography,widthKm:0}}},saved.revision)).toThrow();expect(source.project(saved.id).revision).toBe(saved.revision)
  expect(()=>source.writeProject(input,0)).toThrow();source.close();source=new Storage(path.join(root,'source'));expect(source.project(saved.id).document.map).toEqual(input.map);expect(source.project(saved.id).document.objects).toEqual(objects)
  const transfer=await target.importProject(await source.exportProject(saved.id));expect(transfer.document.map).toEqual(input.map);expect(transfer.document.objects).toEqual(objects)
  const c=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),c.signal,()=>{});await extractArchive(backup.file,path.join(root,'restore'),c.signal,()=>{});expect(await validateDataset(path.join(root,'restore'))).toMatchObject({projects:1,assets:0});restored=new Storage(path.join(root,'restore'));expect(restored.project(saved.id).document).toEqual(source.project(saved.id).document)
 }finally{source.close();target.close();restored?.close()}
})

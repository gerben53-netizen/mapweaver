import {expect,it} from 'vitest'
import {mkdtempSync} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {Storage} from './storage'
import {createBackup,extractArchive,validateDataset} from './archives'
import {generation} from './safety'
import {defaultGeography,landLayers} from '../src/domain/geography'
import {defaultLandArea} from '../src/domain/landAreas'
import {createArea,rectangleGeometry,withGeometry} from '../src/domain/areas'
import {defaultMapStyle} from '../src/domain/mapSettings'
import {flatLayerTree} from '../src/domain/grouping'
it('keeps land metadata, masks and scale through SQLite, conflicts, portable transfer and verified backup restore',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-geography-'));let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
 try{
  const land={...createArea(rectangleGeometry({x:20,y:30,width:800,height:500})),land:{...defaultLandArea('landmass'),coastline:{seed:87,roughness:5,step:10}}};land.geometry.polygons[0].holes=[rectangleGeometry({x:300,y:200,width:100,height:100}).polygons[0].outer]
  const objects=[withGeometry(land,land.geometry),{...createArea(rectangleGeometry({x:100,y:100,width:100,height:80})),land:{...defaultLandArea('terrain-region'),terrain:'forest' as const}}],layers=landLayers();layers[4].objectIds=[objects[1].id];layers[5].objectIds=[objects[0].id];const now=new Date().toISOString()
  const input={formatVersion:10,id:crypto.randomUUID(),name:'World',createdAt:now,modifiedAt:now,map:{width:1000,height:700,...defaultMapStyle(),background:null,mapType:'world-map',geography:{...defaultGeography('world-map'),unit:'mi',northDegrees:25,origin:{xKm:-20,yKm:30},exportScaleBar:true}},objects,layers,objectGroups:[],layerTree:flatLayerTree(layers),assets:[]}
  const saved=source.writeProject(input);expect(saved.formatVersion).toBe(12)
  expect(()=>source.writeProject({...input,map:{...input.map,geography:{...input.map.geography,widthKm:0}}},saved.revision)).toThrow();expect(source.project(saved.id).revision).toBe(saved.revision)
  expect(()=>source.writeProject(input,0)).toThrow();source.close();source=new Storage(path.join(root,'source'));expect(source.project(saved.id).document.map).toEqual(input.map);expect(source.project(saved.id).document.objects).toEqual(objects)
  const transfer=await target.importProject(await source.exportProject(saved.id));expect(transfer.document.map).toEqual(input.map);expect(transfer.document.objects).toEqual(objects)
  const c=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),c.signal,()=>{});await extractArchive(backup.file,path.join(root,'restore'),c.signal,()=>{});expect(await validateDataset(path.join(root,'restore'))).toMatchObject({projects:1,assets:0});restored=new Storage(path.join(root,'restore'));expect(restored.project(saved.id).document).toEqual(source.project(saved.id).document)
 }finally{source.close();target.close();restored?.close()}
})

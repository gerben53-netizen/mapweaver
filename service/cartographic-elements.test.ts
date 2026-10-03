import {expect,it} from 'vitest'
import {mkdtempSync} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {Storage} from './storage'
import {createMapElement} from '../src/domain/decorations'
import {CARTOGRAPHIC_ELEMENT_PRESETS} from '../src/domain/cartographicPresets'
import type {ElementKind} from '../src/domain/cartographicPresets'
import {defaultGeography} from '../src/domain/geography'
import {defaultMapStyle} from '../src/domain/mapSettings'
it('roundtrips every built-in preset through SQLite restart and portable map transfer without asset rows',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-cartography-'));let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'))
 try{
  const map={width:1200,height:800,...defaultMapStyle(),background:null,mapType:'world-map' as const,geography:defaultGeography('world-map')}
  const objects=(Object.keys(CARTOGRAPHIC_ELEMENT_PRESETS) as ElementKind[]).flatMap(kind=>CARTOGRAPHIC_ELEMENT_PRESETS[kind].map(p=>createMapElement(kind,{x:400,y:300},map,[],p.id))),now=new Date().toISOString()
  const input={formatVersion:12,id:crypto.randomUUID(),name:'All map elements',createdAt:now,modifiedAt:now,map,objects,layers:[{id:'objects',name:'Map elements',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]}
  const saved=source.writeProject(input)
  source.close();source=new Storage(path.join(root,'source'));expect(source.project(saved.id).document.objects).toEqual(objects)
  const transferred=await target.importProject(await source.exportProject(saved.id));expect(transferred.document.objects).toEqual(objects);expect(transferred.document.assets).toEqual([])
  const altered=objects.map(o=>o.kind==='title'?{...o,elementVersion:99}:o)
  expect(()=>source.writeProject({...input,objects:altered},saved.revision)).toThrow();expect(source.project(saved.id).document.objects).toEqual(objects)
 }finally{source.close();target.close()}
})

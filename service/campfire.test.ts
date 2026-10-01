import { expect,it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Storage } from './storage'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { defaultGeography } from '../src/domain/geography'
import { createWall } from '../src/domain/walls'
import { createOpening } from '../src/domain/openings'
import { createLayeredContent } from '../src/domain/layers'
import { newPointLight } from '../src/campfire/authoring'
import { serializeCampfire } from '../src/campfire/serialize'
it('preserves map/wall/door/light IDs across SQLite reopen; revision changes for edits/rename, not save/read; copies have independent identity',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-campfire-'));let storage=new Storage(root)
 try{const w=createWall([{id:'a',x:20,y:100,mode:'corner'},{id:'b',x:700,y:100,mode:'corner'}]),door=createOpening(w,.5,'door',40),light=newPointLight(400,300),now=new Date().toISOString();let row=storage.writeProject({formatVersion:12,id:crypto.randomUUID(),name:'Campfire',createdAt:now,modifiedAt:now,map:{...defaultMapStyle(),mapType:'battlemap',geography:defaultGeography(),width:800,height:600,background:null,grid:{...defaultMapStyle().grid,physicalScale:{unit:'ft',distancePerCell:5}},lighting:{ambient:{intensity:.4},lights:[light]}},...createLayeredContent([w,door]),objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]});expect(row.document.map.campfireRevision).toBe(1);row=storage.writeProject(row.document,row.revision);expect(row.document.map.campfireRevision).toBe(1);row=storage.writeProject({...row.document,name:'Renamed'},row.revision);expect(row.document.map.campfireRevision).toBe(2);row=storage.writeProject({...row.document,map:{...row.document.map,lighting:{ambient:{intensity:.2},lights:[light]}}},row.revision);expect(row.document.map.campfireRevision).toBe(3);const payload=serializeCampfire(row.document,row.document);storage.close();storage=new Storage(root);row=storage.project(row.id);expect(serializeCampfire(row.document,row.document)).toEqual(payload);expect(row.document.objects.map(o=>o.id)).toEqual([w.id,door.id]);expect(row.document.map.lighting!.lights[0].id).toBe(light.id);const copied=storage.writeProject({...row.document,id:crypto.randomUUID(),name:'Copy'});expect(copied.id).not.toBe(row.id);expect(copied.document.map.campfireRevision).toBe(1);const imported=await storage.importProject(await storage.exportProject(row.id));expect(imported.id).not.toBe(row.id);expect(imported.document.map.lighting!.lights[0].id).toBe(light.id)}finally{storage.close()}
})

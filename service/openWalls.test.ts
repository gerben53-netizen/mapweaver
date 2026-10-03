import { defaultGeography } from '../src/domain/geography'
import { expect,it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createOpening } from '../src/domain/openings'
import { Storage } from './storage'
import { generatedWallStyle } from '../src/domain/generatedWalls'
import { createWall,SIMPLE_WALL } from '../src/domain/walls'
import { generatedPlacements } from '../src/domain/generatedWallGeometry'
import { defaultMapStyle } from '../src/domain/mapSettings'
it('preserves independent open/closed walls and manual openings through SQLite reopen and ZIP import/export',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-generated-')),target=new Storage(path.join(root,'target'));let source=new Storage(path.join(root,'source'))
 try{const map={...defaultMapStyle(),mapType:'battlemap' as const,geography:defaultGeography(),width:800,height:600,background:null},wall=createWall([{id:'a',x:80,y:100,mode:'corner'},{id:'b',x:700,y:100,mode:'corner'}],false,generatedWallStyle(SIMPLE_WALL,map)),now=new Date().toISOString(),doc={formatVersion:12,id:crypto.randomUUID(),name:'Generated wall',createdAt:now,modifiedAt:now,map,objects:[wall,createWall([{id:'d',x:100,y:350,mode:'corner'},{id:'e',x:600,y:350,mode:'corner'},{id:'f',x:400,y:500,mode:'corner'}],true),createOpening(wall,.25,'door',40),{...createOpening(wall,.75,'door',40),doorType:'passage' as const}],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]};doc.layers[0].objectIds=doc.objects.map(o=>o.id);const saved=source.writeProject(doc);source.close();source=new Storage(path.join(root,'source'));const read=source.project(saved.id);expect(read.document.objects).toEqual(JSON.parse(JSON.stringify(doc.objects)));const imported=await target.importProject(await source.exportProject(saved.id));expect(imported.document.objects).toEqual(read.document.objects);expect(imported.document.assets).toEqual([]);const loaded=imported.document.objects[0];if(loaded.kind!=='path')throw Error('Expected native wall');expect(generatedPlacements(loaded)).toEqual(generatedPlacements(wall))}finally{source.close();target.close()}
})

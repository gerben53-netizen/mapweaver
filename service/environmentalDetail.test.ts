import { expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Storage } from './storage'
import { applyDetailStroke, defaultDetailBrush, makeDetailStroke } from '../src/domain/environmentalDetail'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { defaultGeography } from '../src/domain/geography'
it.each(['dev.decals.leaves','premium.environmental.decals.leaves'])('persists/reopens %s, bumps the normal map revision and round-trips archives without library components',async(presetId)=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mw-environment-'));let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'))
 try{const map={width:600,height:400,background:null,...defaultMapStyle(),mapType:'battlemap' as const,geography:defaultGeography()},now=new Date().toISOString(),doc={formatVersion:12,id:crypto.randomUUID(),name:'Environmental fixture',createdAt:now,modifiedAt:now,map,objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]};const old=source.writeProject(doc);expect(old.document.map.environmentalDetail).toBeUndefined();const detail=applyDetailStroke(undefined,makeDetailStroke([{x:20,y:50},{x:580,y:50}],{...defaultDetailBrush,mode:'decals',presetId,sizeMin:2.5,sizeMax:10,density:120},map,[],2,'stroke'));const updated=source.writeProject({...old.document,map:{...old.document.map,environmentalDetail:detail}},old.revision);expect(updated.document.map.campfireRevision).toBe(old.document.map.campfireRevision!+1);source.close();source=new Storage(path.join(root,'source'));const read=source.project(doc.id);expect(read.document.map.environmentalDetail).toEqual(detail);const imported=await target.importProject(await source.exportProject(read.id));expect(imported.document.map.environmentalDetail).toEqual(detail);expect(imported.document.assets).toEqual([]);expect(source.db.prepare('SELECT count(*) AS n FROM assets').get()).toEqual({n:0});expect(target.db.prepare('SELECT count(*) AS n FROM assets').get()).toEqual({n:0})}finally{source.close();target.close();rmSync(root,{recursive:true,force:true})}
})

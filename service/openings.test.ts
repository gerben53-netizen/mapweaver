import { expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { Storage } from './storage'
import { createWall } from '../src/domain/walls'
import { createOpening, reconcileOpenings, isOpening } from '../src/domain/openings'
import { detectRooms, roomFloor } from '../src/domain/rooms'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'

it('preserves wall links, symbols and room provenance through SQLite restart, portable remap and full backup restore',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-openings-')),data=path.join(root,'source');let source=new Storage(data)
  const target=new Storage(path.join(root,'portable'));let restored:Storage|undefined
  try{
    const bytes=await sharp({create:{width:8,height:8,channels:4,background:'#a3b4c5'}}).png().toBuffer()
    const asset=(await source.importAsset(new File([new Uint8Array(bytes)],'symbol.png',{type:'image/png'}),'stamp','Symbol')).asset
    const wall=createWall([{id:'a',x:50,y:50,mode:'corner'},{id:'b',x:450,y:50,mode:'corner'},{id:'c',x:450,y:350,mode:'corner'},{id:'d',x:50,y:350,mode:'corner'}],true)
    const door={...createOpening(wall,.1,'door'),assetId:asset.id},window=createOpening(wall,.4,'window'),floor=roomFloor(detectRooms([wall]).rooms[0]),objects=[wall,door,window,floor],now=new Date().toISOString()
    const input={formatVersion:7,id:crypto.randomUUID(),name:'Openings',createdAt:now,modifiedAt:now,map:{width:600,height:400,...defaultMapStyle(),background:null},objects,layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[{id:asset.id,kind:'stamp',fileName:'symbol.png',mimeType:asset.mimeType,width:asset.width,height:asset.height,hash:asset.sha256,path:`assets/${asset.sha256}.png`}]}
    const saved=source.writeProject(input);expect(saved.formatVersion).toBe(10)
    for(const invalid of [{...input,objects:objects.filter(o=>o.id!==wall.id),layers:[{...input.layers[0],objectIds:objects.filter(o=>o.id!==wall.id).map(o=>o.id)}]},{...input,objects:objects.map(o=>o.id===door.id?{...door,wallId:'missing'}:o)}])expect(()=>source.writeProject(invalid,saved.revision)).toThrow()
    expect(source.project(saved.id).revision).toBe(saved.revision)
    source.close();source=new Storage(data);expect(source.project(saved.id).document.objects).toEqual(objects)
    const transferred=await target.importProject(await source.exportProject(saved.id));reconcileOpenings(transferred.document.objects,transferred.document.layers,true)
    const symbol=transferred.document.objects.find(o=>isOpening(o)&&o.assetId);expect(symbol&&isOpening(symbol)?symbol.assetId:null).toBe(transferred.document.assets[0].id)
    expect(target.bytes(target.asset(transferred.document.assets[0].id),false)).toEqual(bytes)
    const controller=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),controller.signal,()=>{})
    await extractArchive(backup.file,path.join(root,'restored'),controller.signal,()=>{});await expect(validateDataset(path.join(root,'restored'))).resolves.toMatchObject({projects:1,assets:1})
    restored=new Storage(path.join(root,'restored'));expect(restored.project(saved.id).document.objects).toEqual(objects)
  }finally{source.close();target.close();restored?.close()}
})

import { defaultGeography } from '../src/domain/geography'
import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import { prepareWallSet, importWallSet, listWallSets } from './wallSets'
import { Storage } from './storage'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'
import { materialStyle } from '../src/domain/wallSets'
import { materialPieces } from '../src/domain/wallMaterialGeometry'
import { createWall, SIMPLE_WALL } from '../src/domain/walls'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { continuousRecipe } from '../src/domain/continuousWall.fixture'
import { wallField, organicOffset } from '../src/domain/continuousWallGeometry'
const bytes=()=>new Uint8Array(readFileSync('public/wall-sets/cave-rock.zip'))
const continuousBytes=()=>{const files=unzipSync(bytes()),manifest=JSON.parse(new TextDecoder().decode(files['wall-set.json']));Object.assign(manifest,{id:'continuous-test',renderingMode:'continuous',continuous:continuousRecipe()});files['wall-set.json']=strToU8(JSON.stringify(manifest));return zipSync(files,{level:0})}
it('registers continuous packs through the existing library and preserves material state through a portable roundtrip',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'continuous-wall-')),store=new Storage(path.join(root,'source')),target=new Storage(path.join(root,'target'))
  try{
    const registered=await importWallSet(store,continuousBytes());expect(await importWallSet(store,continuousBytes())).toEqual(registered)
    const asset=store.asset(registered.assetId),wall=createWall([{id:'a',x:30,y:30,mode:'corner'},{id:'b',x:350,y:30,mode:'corner'}],false,materialStyle(registered,SIMPLE_WALL)),now=new Date().toISOString()
    const saved=store.writeProject({formatVersion:12,id:'continuous',name:'Continuous',createdAt:now,modifiedAt:now,map:{width:400,height:300,background:null,...defaultMapStyle(),mapType:'battlemap',geography:defaultGeography('battlemap')},objects:[wall],layers:[{id:'walls',name:'Walls',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['walls'],groups:[]},assets:[{id:asset.id,kind:'fillPattern',fileName:'atlas.png',mimeType:'image/png',width:asset.width,height:asset.height,hash:asset.sha256,path:`assets/${asset.sha256}.png`}]})
    expect(store.project(saved.id).document.objects[0]).toEqual(wall)
    const imported=await target.importProject(await store.exportProject(saved.id)),copy=imported.document.objects[0];if(copy.kind!=='path')throw Error('Expected native wall')
    expect(copy.wall).toEqual(wall.wall);expect(organicOffset(wallField(copy),100,30)).toEqual(organicOffset(wallField(wall),100,30))
    expect(target.bytes(target.asset(imported.document.assets[0].id))).toEqual(store.bytes(asset))
  }finally{store.close();target.close()}
})
it('validates all authored sets and rejects unsafe paths, missing art, bad dimensions and future versions',async()=>{
  for(const id of ['masonry','timber','cave-rock'])expect((await prepareWallSet(new Uint8Array(readFileSync(`public/wall-sets/${id}.zip`)))).definition.id).toBe(id)
  for(const change of [(files:Record<string,Uint8Array>)=>{files['../escape.png']=files['assets/cave-1.png']},(files:Record<string,Uint8Array>)=>{delete files['assets/cave-1.png']},(files:Record<string,Uint8Array>)=>{const d=JSON.parse(new TextDecoder().decode(files['wall-set.json']));d.bodyVariants[0].width=999;files['wall-set.json']=strToU8(JSON.stringify(d))},(files:Record<string,Uint8Array>)=>{const d=JSON.parse(new TextDecoder().decode(files['wall-set.json']));d.schemaVersion=99;files['wall-set.json']=strToU8(JSON.stringify(d))}]){
    const files=unzipSync(bytes());change(files);await expect(prepareWallSet(zipSync(files,{level:0}))).rejects.toThrow()
  }
})
it('preview/cancel is read-only; failed disk writes leave no registration or orphan, and revisions are immutable',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'wall-import-')),store=new Storage(root);let fault=false
  const failing=new Storage(mkdtempSync(path.join(os.tmpdir(),'wall-failure-')),()=>{if(fault)throw new Error('disk failure')})
  try{
    await prepareWallSet(bytes());expect(listWallSets(store)).toEqual([]);expect(store.integrity().orphaned).toEqual([])
    fault=true;await expect(importWallSet(failing,bytes())).rejects.toThrow('disk failure');expect(listWallSets(failing)).toEqual([]);expect(failing.integrity().orphaned).toEqual([])
    const first=await importWallSet(store,bytes());expect(await importWallSet(store,bytes())).toEqual(first)
    const files=unzipSync(bytes()),d=JSON.parse(new TextDecoder().decode(files['wall-set.json']));d.title='Changed';files['wall-set.json']=strToU8(JSON.stringify(d));await expect(importWallSet(store,zipSync(files,{level:0}))).rejects.toThrow(/Version conflict/)
    expect(listWallSets(store)).toEqual([first]);expect(()=>store.db.prepare('DELETE FROM assets WHERE id=?').run(first.assetId)).toThrow()
  }finally{store.close();failing.close()}
})
it('preserves definitions, atlas bytes and deterministic placement through portable and clean backup restore',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'wall-transfer-')),store=new Storage(path.join(root,'source')),target=new Storage(path.join(root,'target'));let restored:Storage|undefined
  try{
    const registered=await importWallSet(store,bytes()),asset=store.asset(registered.assetId),wall=createWall([{id:'a',x:100,y:100,mode:'corner'},{id:'b',x:500,y:150,mode:'corner'}],false,materialStyle(registered,SIMPLE_WALL)),now=new Date().toISOString()
    const saved=store.writeProject({formatVersion:8,id:'materials',name:'Materials',createdAt:now,modifiedAt:now,map:{width:800,height:600,background:null,...defaultMapStyle()},objects:[wall],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[{id:asset.id,kind:'fillPattern',fileName:'cave.png',mimeType:'image/png',width:asset.width,height:asset.height,hash:asset.sha256,path:`assets/${asset.sha256}.png`}]})
    const imported=await target.importProject(await store.exportProject(saved.id)),copy=imported.document.objects[0]
    expect(copy.kind).toBe('path');if(copy.kind!=='path')throw new Error('Expected wall')
    expect(materialPieces(copy)).toEqual(materialPieces(wall));expect(target.bytes(target.asset(imported.document.assets[0].id))).toEqual(store.bytes(asset))
    const controller=new AbortController(),backup=await createBackup(store,path.join(root,'backup'),generation(store),controller.signal,()=>{})
    await extractArchive(backup.file,path.join(root,'restored'),controller.signal,()=>{});await validateDataset(path.join(root,'restored'))
    restored=new Storage(path.join(root,'restored'));expect(listWallSets(restored)).toEqual([registered]);expect(restored.project(saved.id).document.objects[0]).toEqual(wall)
  }finally{store.close();target.close();restored?.close()}
})

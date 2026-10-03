import { expect,it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { Storage } from './storage'
import { createScatter,generateScatter } from '../src/domain/scatter'
import { rectangleGeometry } from '../src/domain/areas'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { createBackup,extractArchive,validateDataset } from './archives'
import { generation } from './safety'
import { createApp } from './app'
it('preserves every shared scatter source and placement through SQLite, conflicts, portable transfer and backup',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-scatter-'));let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
  try{
    const assets=[];for(const color of ['#2d6839','#507c35','#55766b','#658538']){const bytes=await sharp({create:{width:24,height:32,channels:4,background:color}}).png().toBuffer();assets.push((await source.importAsset(new File([new Uint8Array(bytes)],'tree.png',{type:'image/png'}),'stamp','Tree')).asset)}
    const scatter=generateScatter({...createScatter(assets.map(a=>({assetId:a.id,weight:1,width:24,height:32}))),area:rectangleGeometry({x:20,y:20,width:950,height:850})}),now=new Date().toISOString()
    const input={formatVersion:9,id:crypto.randomUUID(),name:'Forest',createdAt:now,modifiedAt:now,map:{width:1000,height:900,...defaultMapStyle(),background:null},objects:[scatter],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[scatter.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:assets.map(a=>({id:a.id,kind:'stamp',fileName:a.name+'.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}))}
    const saved=source.writeProject(input);expect(saved.formatVersion).toBe(10)
    expect(()=>source.writeProject({...input,objects:[{...scatter,engineVersion:2}]},saved.revision)).toThrow();expect(source.project(saved.id).revision).toBe(saved.revision)
    expect(()=>source.writeProject(input,0)).toThrow();expect(source.db.prepare('SELECT COUNT(*) AS count FROM project_assets WHERE projectId=?').get(saved.id)).toMatchObject({count:4})
    source.close();source=new Storage(path.join(root,'source'));expect(source.project(saved.id).document.objects).toEqual([scatter])
    const transfer=await target.importProject(await source.exportProject(saved.id)),copy=transfer.document.objects[0];if(copy.kind!=='scatter')throw Error('Expected scatter')
    expect(copy.instances.map(i=>({...i,assetId:''}))).toEqual(scatter.instances.map(i=>({...i,assetId:''})));expect(new Set(copy.sources.map(a=>a.assetId))).toEqual(new Set(transfer.document.assets.map(a=>a.id)))
    expect(generateScatter(copy).instances).toEqual(copy.instances);for(const a of transfer.document.assets)expect(target.bytes(target.asset(a.id)).length).toBeGreaterThan(0)
    const c=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),c.signal,()=>{});await extractArchive(backup.file,path.join(root,'restore'),c.signal,()=>{});expect(await validateDataset(path.join(root,'restore'))).toMatchObject({projects:1,assets:4});restored=new Storage(path.join(root,'restore'));expect(restored.project(saved.id).document.objects).toEqual([scatter])
  }finally{source.close();target.close();restored?.close()}
})
it('persists bounded recent scatter sets in existing SQLite settings, rejecting non-stamps and malformed weights',async()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),'mapweaver-scatter-presets-')),{app,store}=await createApp({directory});try{
    const health=(await app.inject({url:'/api/v1/health',headers:{host:'127.0.0.1:47831'}})).json(),headers={'X-Mapweaver':'1','X-Mapweaver-Generation':health.generation,'X-Mapweaver-Instance':health.instanceId,host:'127.0.0.1:47831','content-type':'application/json'}
    expect((await app.inject({url:'/api/v1/scatter-presets',headers})).json()).toEqual([])
    const bytes=await sharp({create:{width:8,height:8,channels:4,background:'#123456'}}).png().toBuffer(),a=(await store.importAsset(new File([new Uint8Array(bytes)],'a.png',{type:'image/png'}),'stamp','Tree')).asset
    const saved=await app.inject({url:'/api/v1/scatter-presets',method:'POST',headers,payload:[{assetId:a.id,weight:2}]});expect(saved.statusCode).toBe(200);expect(saved.json()).toEqual([[{assetId:a.id,weight:2}]])
    const bad=await app.inject({url:'/api/v1/scatter-presets',method:'POST',headers,payload:[{assetId:'x',weight:-1}]});expect(bad.statusCode).toBeGreaterThanOrEqual(400)
    expect((await app.inject({url:'/api/v1/scatter-presets',headers})).json()).toEqual([[{assetId:a.id,weight:2}]])
    expect(JSON.parse((store.db.prepare("SELECT value FROM settings WHERE key='scatterRecentSets'").get() as {value:string}).value)).toEqual([[{assetId:a.id,weight:2}]])
  }finally{await app.close()}
})

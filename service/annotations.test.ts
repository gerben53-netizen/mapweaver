import {createMarkerBundle} from '../src/domain/markers'
import {markerDefaults} from '../src/domain/markerRegistry'
import {expect,it} from 'vitest'
import {mkdtempSync} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {Storage} from './storage'
import {createBackup,extractArchive,validateDataset} from './archives'
import {generation} from './safety'
import {createPlace,createLabel,createLegend,createCompass,legendEntries} from '../src/domain/annotations'
import {defaultGeography} from '../src/domain/geography'
import {defaultMapStyle} from '../src/domain/mapSettings'
it('roundtrips text, relations and all symbol references through SQLite, conflicts, portable transfer and verified backup',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-annotations-'));let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
 try{
  const bytes=await sharp({create:{width:8,height:8,channels:4,background:'#71934e'}}).png().toBuffer(),a=(await source.importAsset(new File([new Uint8Array(bytes)],'symbol.png',{type:'image/png'}),'stamp','Symbol')).asset
  const map={width:1200,height:800,...defaultMapStyle(),background:null,mapType:'world-map' as const,geography:defaultGeography('world-map')},p={...createPlace({x:300,y:300},'Port','city',map),assetId:a.id},l=createLabel({x:0,y:0},'Port\nCapital',p),legend=createLegend({x:600,y:600},legendEntries([p])),compass={...createCompass({x:1000,y:100}),assetId:a.id},smart=createMarkerBundle({x:800,y:400},markerDefaults('world-map'),map),objects=[p,l,legend,compass,...smart],now=new Date().toISOString()
  const input={formatVersion:12,id:crypto.randomUUID(),name:'Places',createdAt:now,modifiedAt:now,map,objects,layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[{id:a.id,kind:'stamp',fileName:'symbol.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]}
  const saved=source.writeProject(input);expect(saved.formatVersion).toBe(12)
  expect(()=>source.writeProject({...input,objects:[p,{...l,ownerId:'missing'},legend,compass]},saved.revision)).toThrow();expect(source.project(saved.id).revision).toBe(saved.revision);expect(()=>source.writeProject(input,0)).toThrow()
  source.close();source=new Storage(path.join(root,'source'));expect(source.project(saved.id).document.objects).toEqual(objects)
  const transfer=await target.importProject(await source.exportProject(saved.id)),assetId=transfer.document.assets[0].id
  expect(transfer.document.objects).toEqual([ {...p,assetId},l,{...legend,entries:legend.entries.map(e=>({...e,assetId}))},{...compass,assetId},...smart]);expect(target.bytes(target.asset(assetId))).toEqual(bytes)
  const c=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),c.signal,()=>{});await extractArchive(backup.file,path.join(root,'restore'),c.signal,()=>{});expect(await validateDataset(path.join(root,'restore'))).toMatchObject({projects:1,assets:1});restored=new Storage(path.join(root,'restore'));expect(restored.project(saved.id).document).toEqual(source.project(saved.id).document)
 }finally{source.close();target.close();restored?.close()}
})

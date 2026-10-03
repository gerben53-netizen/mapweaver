import { expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { exportLibrary, previewPack, commitPack } from './libraryPacks'
import { Storage } from './storage'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'
import { patchAsset, libraryCommand, libraryQuery, libraryRevision } from './library'
import { TextureStroke } from '../src/domain/textureStroke'
import { TerrainStroke, defaultTerrainBrush } from '../src/domain/terrainBrush'
import { texturePaintAssetIds, remapTexturePaint } from '../src/domain/terrainPaint'
import { defaultGeography } from '../src/domain/geography'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { parseAssetManifest } from '../src/domain/assetManifest'
it.each(['legacy','base'] as const)('preserves %s material masks and original pixels through reopen, ZIP remapping and verified backup restore',async(surface)=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-texture-paint-'))
 let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
 try{
  const bytes=await sharp({create:{width:256,height:256,channels:4,background:'#855633'}}).png().toBuffer(),file=new File([bytes],'wood.png',{type:'image/png'}),{asset}=await source.importAsset(file,'fill-pattern','Worn planks')
  patchAsset(source,asset.id,{patternScale:.75,applicableMapTypes:['battlemap']});expect(source.asset(asset.id).patternScale).toBe(.75)
  expect(libraryQuery(source,{type:'fill-pattern',search:'planks',mapType:'battlemap'}).assets.map(a=>a.id)).toContain(asset.id)
  const map={...defaultMapStyle(),width:512,height:512,background:null,mapType:'battlemap' as const,geography:defaultGeography()},stroke=surface==='base'?new TextureStroke(undefined,{...defaultTerrainBrush,assetId:asset.id,textureScale:.75},map,[],false):new TerrainStroke(undefined,{...defaultTerrainBrush,assetId:asset.id,textureScale:.75},map,undefined,undefined,undefined,true)
  stroke.add({x:80,y:150});stroke.add({x:400,y:150});const texturePaint=stroke.finish(),now=new Date().toISOString()
  const document={formatVersion:12,id:crypto.randomUUID(),name:'Painted floor',createdAt:now,modifiedAt:now,map:{...map,texturePaint},objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[{id:asset.id,kind:'fillPattern',fileName:'wood.png',mimeType:asset.mimeType,width:asset.width,height:asset.height,hash:asset.sha256,path:'assets/wood.png'}]}
  const saved=source.writeProject(document);source.close();source=new Storage(path.join(root,'source'))
  expect(source.project(saved.id).document.map.texturePaint).toEqual(texturePaint)
  const transfer=await target.importProject(await source.exportProject(saved.id)),id=texturePaintAssetIds(transfer.document.map.texturePaint)[0]
  expect(id).not.toBe(asset.id);expect(transfer.document.map.texturePaint).toEqual(remapTexturePaint(texturePaint,new Map([[asset.id,id]])))
  expect(target.bytes(target.asset(id))).toEqual(bytes)
  const pack=await previewPack(target,exportLibrary(source,[asset.id]));expect(pack.errors).toEqual([]);commitPack(target,{token:pack.token,revision:pack.revision,duplicate:'overwrite',createCategories:true,useExistingCategories:true});expect(target.asset(id).patternScale).toBe(.75)
  const c=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),c.signal,()=>{})
  await extractArchive(backup.file,path.join(root,'restore'),c.signal,()=>{});expect(await validateDataset(path.join(root,'restore'))).toMatchObject({projects:1,assets:1})
  restored=new Storage(path.join(root,'restore'));expect(restored.project(saved.id).document).toEqual(source.project(saved.id).document);expect(restored.asset(asset.id).patternScale).toBe(.75)
  const revised=source.project(saved.id).document;expect(()=>source.writeProject({...revised,assets:[]},saved.revision)).toThrow()
  libraryCommand(source,{revision:libraryRevision(source),op:'copy-role',ids:[asset.id]});const stamp=libraryQuery(source,{type:'stamp'}).assets[0];expect(stamp.patternScale).toBeNull()
 }finally{source.close();target.close();restored?.close()}
})
it('validates recommended fractional scale only on fill patterns',()=>{
 const entry={file:'wood.png',type:'fillPattern',patternScale:.75}
 expect(parseAssetManifest({schemaVersion:1,assets:[entry]}).manifest.assets[0].patternScale).toBe(.75)
 for(const patch of [{patternScale:0},{patternScale:Infinity},{type:'stamp'}])expect(()=>parseAssetManifest({schemaVersion:1,assets:[{...entry,...patch}]})).toThrow()
})

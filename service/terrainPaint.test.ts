import { expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Storage } from './storage'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'
import { generateWorld } from '../src/world/generate'
import { WORLD_DEFAULTS } from '../src/world/model'
import { TerrainStroke, defaultTerrainBrush } from '../src/domain/terrainBrush'

it('preserves independent paint through SQLite updates, reopen, ZIP and verified backup restore',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-terrain-paint-'))
  let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
  try{
    const result=generateWorld({...WORLD_DEFAULTS,width:1024,height:768,seed:'paint-persistence'}),stroke=new TerrainStroke(undefined,defaultTerrainBrush,result.map)
    stroke.add({x:200,y:200});stroke.add({x:600,y:400});const terrainPaint=stroke.finish(),now=new Date().toISOString()
    const document={formatVersion:12,id:crypto.randomUUID(),name:'Painted world',createdAt:now,modifiedAt:now,map:{...result.map,terrainPaint},objects:result.objects,layers:result.layers,layerTree:result.layerTree,objectGroups:[],assets:[]}
    let saved=source.writeProject(document)
    const next={...document,map:{...document.map,terrainPaint:{...terrainPaint,opacity:.7,locked:true}}}
    saved=source.writeProject(next,saved.revision)
    expect(()=>source.writeProject({...next,map:{...next.map,terrainPaint:{...terrainPaint,version:99}}},saved.revision)).toThrow()
    source.close();source=new Storage(path.join(root,'source'))
    expect(source.project(saved.id).document.map).toEqual(next.map)
    const transfer=await target.importProject(await source.exportProject(saved.id))
    expect(transfer.document.map).toEqual(next.map);expect(transfer.document.objects).toEqual(result.objects)
    const c=new AbortController(),backup=await createBackup(source,path.join(root,'backup'),generation(source),c.signal,()=>{})
    await extractArchive(backup.file,path.join(root,'restore'),c.signal,()=>{})
    expect(await validateDataset(path.join(root,'restore'))).toMatchObject({projects:1,assets:0})
    restored=new Storage(path.join(root,'restore'));expect(restored.project(saved.id).document).toEqual(source.project(saved.id).document)
  }finally{source.close();target.close();restored?.close()}
})

import { expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Storage } from './storage'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'
import { generateWorld } from '../src/world/generate'
import { WORLD_DEFAULTS } from '../src/world/model'
import { applyLandStroke, defaultLandBrush } from '../src/domain/landBrush'
import { isLandmass } from '../src/domain/landEditing'

it('preserves edited land through SQLite updates, reopen, ZIP and verified backup restore',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-land-brush-'))
  let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
  try{
    const result=generateWorld({...WORLD_DEFAULTS,width:1024,height:768,seed:'paint-persistence'})
    const lands=result.objects.filter(isLandmass),edit=applyLandStroke({lands,editable:lands.map(o=>o.id),map:result.map,brush:defaultLandBrush,points:[lands[0].geometry.polygons[0].outer[0]],seed:1,newId:'added'})
    const changed=new Map(edit.replacements.map(o=>[o.id,o]));result.objects=[...result.objects.filter(o=>!edit.removed.includes(o.id)).map(o=>changed.get(o.id)||o),...edit.added]
    const landEditing={version:1 as const,manual:true as const,revision:1},now=new Date().toISOString()
    const document={formatVersion:12,id:crypto.randomUUID(),name:'Painted world',createdAt:now,modifiedAt:now,map:{...result.map,landEditing},objects:result.objects,layers:result.layers,layerTree:result.layerTree,objectGroups:[],assets:[]}
    let saved=source.writeProject(document)
    const next={...document,map:{...document.map,landEditing:{...landEditing,revision:2}}}
    saved=source.writeProject(next,saved.revision)
    expect(()=>source.writeProject({...next,map:{...next.map,landEditing:{...landEditing,version:99}}},saved.revision)).toThrow()
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

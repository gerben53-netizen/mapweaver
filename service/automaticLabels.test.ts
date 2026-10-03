import { expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Storage } from './storage'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'
import { generateWorld } from '../src/world/generate'
import { WORLD_DEFAULTS } from '../src/world/model'
import { generateAutomaticLabels, AUTO_LABEL_DEFAULTS } from '../src/domain/automaticLabels'
import { isLandmass } from '../src/domain/landEditing'

it('preserves automatic labels through SQLite updates, reopen, ZIP and verified backup restore',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-automatic-labels-'))
  let source=new Storage(path.join(root,'source'));const target=new Storage(path.join(root,'target'));let restored:Storage|undefined
  try{
    const result=generateWorld({...WORLD_DEFAULTS,width:1024,height:768,seed:'paint-persistence'})
    const land=result.objects.find(isLandmass)!;land.name='Amber Reach'
    const labels=generateAutomaticLabels({...result,objectGroups:[]},AUTO_LABEL_DEFAULTS).labels
    result.objects.push(...labels);result.layers.unshift({id:'automatic',name:'Automatic labels',visible:true,locked:false,objectIds:labels.map(o=>o.id)});result.layerTree.roots.unshift('automatic')
    const now=new Date().toISOString()
    const document={formatVersion:12,id:crypto.randomUUID(),name:'Painted world',createdAt:now,modifiedAt:now,map:result.map,objects:result.objects,layers:result.layers,layerTree:result.layerTree,objectGroups:[],assets:[]}
    let saved=source.writeProject(document)
    const next={...document,name:'Updated labels'}
    saved=source.writeProject(next,saved.revision)
    expect(()=>source.writeProject({...next,objects:next.objects.map(o=>o.kind==='label'?{...o,automatic:{...o.automatic,version:99}}:o)},saved.revision)).toThrow()
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

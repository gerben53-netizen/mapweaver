import { afterEach, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { zipSync, strToU8, unzipSync } from 'fflate'
import sharp from 'sharp'
import { ZipFile } from 'yazl'
import { Storage, hash } from './storage'
import { createApp } from './app'
import { createBackup, extractArchive, inspectArchive, space } from './archives'
import { generation, lease, operationRoot, replaceDataset, recoverInterrupted } from './safety'
import { defaultMapStyle } from '../src/domain/mapSettings'
const roots:string[]=[],stores:Storage[]=[],apps:Awaited<ReturnType<typeof createApp>>[]=[]
const temp=()=>{const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-s13-'));roots.push(root);return root}
const document=(name='Map')=>{const now=new Date().toISOString();return{formatVersion:2,id:randomUUID(),name,createdAt:now,modifiedAt:now,map:{width:800,height:600,...defaultMapStyle(),background:null},layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:[]}],objects:[],assets:[]}}
const signal=()=>new AbortController().signal
async function fixture(){const store=new Storage(temp());stores.push(store);const bytes=await sharp({create:{width:32,height:24,channels:4,background:'#abcdef'}}).png().toBuffer(),a=(await store.importAsset(new File([new Uint8Array(bytes)],'source.png',{type:'image/png'}),'background','Private asset')).asset;const d=document('Private map');store.writeProject({...d,map:{...d.map,background:{id:a.id,name:'Background',width:a.width,height:a.height}},assets:[{id:a.id,kind:'stamp',fileName:'source.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]});const shared=store.db.prepare('SELECT document FROM projects').get() as {document:string};store.writeProject({...JSON.parse(shared.document),id:randomUUID(),name:'Second shared project'});store.db.prepare("UPDATE assets SET sizingMode='grid',defaultWidth=2,defaultHeight=3,sizingUnit='cells' WHERE id=?").run(a.id);return store}
async function backup(store:Storage){return createBackup(store,path.join(temp(),'work'),generation(store),signal(),()=>{})}
afterEach(async()=>{vi.restoreAllMocks();for(const {app}of apps.splice(0))await app.close();for(const store of stores.splice(0))if(store.db.open)store.close();for(const root of roots.splice(0)){if(path.dirname(root)!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('mapweaver-s13-'))throw new Error('Unsafe cleanup');for(const owned of [root,root+'.operations'])rmSync(owned,{recursive:true,force:true})}})
it('streams an empty dataset and accepts the original Sprint 12 backup format',async()=>{
  const source=new Storage(temp());stores.push(source);const result=await backup(source),checked=await inspectArchive(result.file);expect(checked.manifest.formatVersion).toBe(2);checked.zip.close()
  const legacyFile=path.join(temp(),'legacy.zip'),dbfile=path.join(temp(),'snapshot.sqlite3');await source.db.backup(dbfile);const legacy=new (await import('better-sqlite3')).default(dbfile);for(const row of legacy.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as {name:string}[])legacy.exec(`DROP TRIGGER ${row.name}`);legacy.exec("DROP TABLE library_members;DROP TABLE library_collections;DROP TABLE wall_sets;DROP INDEX assets_active;DROP INDEX categories_parent;DELETE FROM settings WHERE key='libraryRevision'");for(const col of ['prefab','description','favorite','author','source','license','applicableMapTypes','deletedAt'])legacy.exec(`ALTER TABLE assets DROP COLUMN ${col}`);for(const col of ['parentId','sortOrder','modifiedAt'])legacy.exec(`ALTER TABLE categories DROP COLUMN ${col}`);legacy.exec('DROP INDEX projects_deleted; ALTER TABLE projects DROP COLUMN deletedAt; DELETE FROM schema_migrations WHERE version>=3');legacy.close();const bytes=readFileSync(dbfile)
  writeFileSync(legacyFile,zipSync({'mapweaver.sqlite3':bytes,'manifest.json':strToU8(JSON.stringify({formatVersion:1,schemaVersion:2,createdAt:new Date().toISOString(),files:{'mapweaver.sqlite3':{size:bytes.length,sha256:hash(bytes)}}}))},{level:0}))
  await expect(extractArchive(legacyFile,path.join(temp(),'stage'),signal(),()=>{})).resolves.toMatchObject({formatVersion:1})
})
it('replaces another dataset, retains rollback and preserves IDs, revisions, bytes and sizing',async()=>{
  const source=await fixture(),d=source.db.prepare('SELECT * FROM projects ORDER BY id').all(),a=source.db.prepare('SELECT * FROM assets').get(),result=await backup(source)
  let active=new Storage(temp());active.writeProject(document('Later change'));const root=active.root,id=randomUUID(),oldGeneration=generation(active)
  await extractArchive(result.file,path.join(operationRoot(root),id+'-stage'),signal(),()=>{})
  await replaceDataset(root,id,active,s=>{active=s});stores.push(active)
  expect(active.db.prepare('SELECT * FROM projects ORDER BY id').all()).toEqual(d);expect(active.db.prepare('SELECT * FROM assets').get()).toEqual(a)
  expect(generation(active)).not.toBe(oldGeneration);expect(readdirSync(operationRoot(root))).toContain(id+'-rollback')
})
it.each(['before-close','before-swap','after-old-moved','after-swap','after-open'])('rolls back a forced failure at %s',async step=>{
  const result=await backup(await fixture());let active=new Storage(temp());const old=active.writeProject(document('Keep this')),root=active.root,id=randomUUID(),gen=generation(active)
  await extractArchive(result.file,path.join(operationRoot(root),id+'-stage'),signal(),()=>{})
  await expect(replaceDataset(root,id,active,s=>{active=s},point=>{if(point===step)throw new Error('Injected switch failure')})).rejects.toThrow('Injected')
  stores.push(active);expect(active.project(old.id).document).toEqual(old.document);expect(generation(active)).toBe(gen)
})
it('recovers a process interruption after moving the old dataset',()=>{
  const root=temp(),store=new Storage(root),row=store.writeProject(document('Before crash'));store.close();const id=randomUUID(),ops=operationRoot(root)
  writeFileSync(path.join(ops,'restore-journal.json'),JSON.stringify({id,phase:'prepared'}));renameSync(root,path.join(ops,id+'-rollback'))
  recoverInterrupted(root);const reopened=new Storage(root);stores.push(reopened);expect(reopened.project(row.id).name).toBe('Before crash')
})
it('rejects broken manifests, missing/unexpected entries, traversal, bombs and checksum corruption without touching active data',async()=>{
  const source=await fixture(),before=source.db.prepare('SELECT * FROM projects').all(),result=await backup(source)
  const original=unzipSync(readFileSync(result.file)),manifest=JSON.parse(new TextDecoder().decode(original['manifest.json']))
  // Convert to legacy manifest to make content corruption tests independent of ZIP64 size bookkeeping.
  manifest.formatVersion=1
  for(const kind of ['manifest','missing','unexpected','traversal','bomb','checksum']){
    const files={...original,'manifest.json':strToU8(JSON.stringify(manifest))}
    if(kind==='manifest')files['manifest.json']=strToU8('{}')
    if(kind==='missing')delete files['mapweaver.sqlite3']
    if(kind==='unexpected')files['evil.exe']=strToU8('never run')
    if(kind==='traversal')files['../escape']=strToU8('unsafe')
    if(kind==='bomb')files['mapweaver.sqlite3']=new Uint8Array(4*1024*1024)
    if(kind==='checksum')files['mapweaver.sqlite3']=new Uint8Array(files['mapweaver.sqlite3'].length)
    const file=path.join(temp(),'bad.zip');writeFileSync(file,zipSync(files,{level:kind==='bomb'?9:0}))
    await expect(extractArchive(file,path.join(temp(),'stage'),signal(),()=>{})).rejects.toThrow()
    expect(source.db.prepare('SELECT * FROM projects').all()).toEqual(before)
  }
})
it('cancels staging and rejects insufficient free space before replacing anything',async()=>{
  const source=await fixture(),result=await backup(source),controller=new AbortController();controller.abort()
  await expect(extractArchive(result.file,path.join(temp(),'stage'),controller.signal,()=>{})).rejects.toThrow()
  expect(()=>space(source.root,Number.MAX_SAFE_INTEGER)).toThrow('free disk space')
})
it('allows one lease per data directory and releases it after stopping',async()=>{
  const root=temp(),release=await lease(root)
  try{await expect(lease(root)).rejects.toThrow('already in use')}finally{await release()}
  const second=await lease(root);await second()
})
it('blocks stale clients after UI restore and excludes personal content from diagnostics',async()=>{
  const result=await backup(await fixture()),instance=await createApp({directory:temp()});apps.push(instance)
  const old=instance.store.writeProject(document('Later data')),headers={host:'127.0.0.1:47831','x-mapweaver':'1','x-mapweaver-generation':generation(instance.store)}
  const upload=await instance.app.inject({method:'POST',url:'/api/v1/restores',headers:{...headers,'content-type':'application/x-mapweaver-backup'},payload:readFileSync(result.file)});expect(upload.statusCode,upload.body).toBe(200)
  const job=instance.jobs.job(upload.json().id)
  while(job.state==='running')await new Promise(r=>setTimeout(r,10));expect(job.state,job.error).toBe('ready')
  expect((await instance.app.inject({method:'POST',url:`/api/v1/restores/${job.id}/commit`,headers,payload:{replace:true}})).statusCode).toBe(200)
  while(job.state==='running')await new Promise(r=>setTimeout(r,10));expect(job.state,job.error).toBe('complete')
  const stale=await instance.app.inject({method:'PUT',url:`/api/v1/projects/${old.id}`,headers,payload:{document:old.document,revision:old.revision}});expect(stale.json().code).toBe('DATASET_CHANGED')
  const fresh={...headers,'x-mapweaver-generation':generation(instance.store)}
  const response=await instance.app.inject({method:'POST',url:'/api/v1/diagnostics',headers:fresh}),data=new TextDecoder().decode(unzipSync(response.rawPayload)['diagnostics.json'])
  expect(data).not.toContain('Private');expect(data).not.toContain(instance.store.root);expect(data).not.toContain('document');expect(JSON.parse(data).assets).toBe(1)
})
it('Trash retains asset references, restores identity and requires explicit permanent deletion',async()=>{
  const instance=await createApp({directory:temp()});apps.push(instance);const row=instance.store.writeProject(document()),headers={host:'127.0.0.1:47831','x-mapweaver':'1','x-mapweaver-generation':generation(instance.store)}
  await instance.app.inject({method:'DELETE',url:`/api/v1/projects/${row.id}`,headers,payload:{revision:1}})
  expect((await instance.app.inject({url:'/api/v1/projects',headers})).json()).toEqual([])
  expect((await instance.app.inject({url:'/api/v1/projects?trash=true',headers})).json()[0].id).toBe(row.id)
  await instance.app.inject({method:'POST',url:`/api/v1/projects/${row.id}/restore`,headers,payload:{revision:2}})
  expect(instance.store.project(row.id).document).toEqual(row.document)
})
it.skipIf(process.env.MAPWEAVER_LARGE_TEST!=='1')('streams a dataset beyond 512 MiB with bounded process memory',async()=>{
  const source=new Storage(temp());stores.push(source)
  const chunk='x'.repeat(1024*1024),insert=source.db.prepare('INSERT INTO settings VALUES(?,?)')
  source.db.transaction(()=>{for(let i=0;i<540;i++)insert.run('large-fixture-'+i,chunk)})();source.db.pragma('wal_checkpoint(TRUNCATE)')
  const baseline=process.memoryUsage().rss;let peak=baseline
  const timer=setInterval(()=>{peak=Math.max(peak,process.memoryUsage().rss)},20)
  try{const result=await backup(source);expect(statSync(result.file).size).toBeGreaterThan(512*1024**2);expect(peak-baseline).toBeLessThan(400*1024**2);writeFileSync(path.join(process.cwd(),'.sprint13-large-result.local'),JSON.stringify({sourceBytes:result.manifest.sourceBytes,archiveBytes:statSync(result.file).size,baselineRss:baseline,peakRss:peak},null,2))}finally{clearInterval(timer)}
},180000)

it('rejects duplicate entries and excessive declared entry counts before extraction',async()=>{
 const file=path.join(temp(),'duplicate.zip'),zip=new ZipFile(),chunks:Buffer[]=[]
 zip.outputStream.on('data',(chunk:Buffer)=>chunks.push(chunk))
 const ended=new Promise<void>((resolve,reject)=>{zip.outputStream.on('end',resolve);zip.outputStream.on('error',reject)})
 zip.addBuffer(Buffer.from('{}'),'manifest.json');zip.addBuffer(Buffer.from('{}'),'manifest.json');zip.end();await ended;writeFileSync(file,Buffer.concat(chunks))
 await expect(inspectArchive(file)).rejects.toThrow()
 const countFile=path.join(temp(),'count.zip'),bytes=Buffer.from(zipSync({'manifest.json':strToU8('{}')},{level:0}));bytes.writeUInt16LE(65535,bytes.length-12);bytes.writeUInt16LE(65535,bytes.length-14);writeFileSync(countFile,bytes)
 await expect(inspectArchive(countFile)).rejects.toThrow()
})
it('does not accept an executable or corrupt preview as a valid restored dataset',async()=>{
 const source=await fixture(),asset=source.db.prepare('SELECT * FROM assets').get() as {previewPath:string};writeFileSync(path.join(source.root,asset.previewPath),'<script>never execute</script>')
 await expect(backup(source)).rejects.toThrow()
})

it('rolls back when the reopened candidate loses an asset and when SQLite refuses to close',async()=>{
 const source=await fixture(),result=await backup(source);let active=new Storage(temp());const original=active.writeProject(document('Retain original')),root=active.root,id=randomUUID()
 await extractArchive(result.file,path.join(operationRoot(root),id+'-stage'),signal(),()=>{})
 const a=source.db.prepare('SELECT originalPath FROM assets').get() as {originalPath:string}
 await expect(replaceDataset(root,id,active,s=>{active=s},step=>{if(step==='after-swap')writeFileSync(path.join(root,a.originalPath),'corrupt candidate')})).rejects.toThrow()
 expect(active.project(original.id).document).toEqual(original.document)
 const second=randomUUID();await extractArchive(result.file,path.join(operationRoot(root),second+'-stage'),signal(),()=>{})
 const close=vi.spyOn(active,'close').mockImplementationOnce(()=>{throw new Error('Cannot close database')})
 await expect(replaceDataset(root,second,active,s=>{active=s})).rejects.toThrow('Cannot close')
 close.mockRestore();stores.push(active);expect(active.project(original.id).document).toEqual(original.document)
})

it('keeps maintenance health available while SQLite is closed and refuses a false healthy state after failure',async()=>{
 const instance=await createApp({directory:temp()});apps.push(instance);const token=generation(instance.store),root=instance.store.root
 instance.store.close();instance.jobs.maintenance=true
 const response=await instance.app.inject({url:'/api/v1/health',headers:{host:'127.0.0.1:47831'}})
 expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({maintenance:true,generation:token})
 instance.jobs.maintenance=false
 expect((await instance.app.inject({url:'/api/v1/health',headers:{host:'127.0.0.1:47831'}})).statusCode).toBe(503)
 instance.jobs.setStore(new Storage(root))
})

it('does not turn a missing committed dataset into an empty healthy database on restart',()=>{
 const root=temp(),ops=operationRoot(root),id=randomUUID();writeFileSync(path.join(ops,'restore-journal.json'),JSON.stringify({id,phase:'committed'}))
 expect(()=>recoverInterrupted(root)).toThrow('manual attention')
 expect(readdirSync(root)).toEqual([]);expect(readdirSync(ops)).toContain('restore-journal.json')
})

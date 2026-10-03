import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { unzipSync } from 'fflate'
import Database from 'better-sqlite3'
import { generation } from './safety'
import { createApp } from './app'
import { Storage, SCHEMA_VERSION, managedPath, hash, dataDirectory } from './storage'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { decodeProject } from '../src/projects/codec'
import { validateImage } from './storage'
const directories:string[]=[]
const services:Awaited<ReturnType<typeof createApp>>[]=[]
const directory=()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'mapweaver-sprint12-'));directories.push(dir);return dir}
const document=()=>{const now=new Date().toISOString();return {formatVersion:2,id:randomUUID(),name:'Test map',createdAt:now,modifiedAt:now,map:{width:800,height:600,...defaultMapStyle(),background:null},layers:[{id:'layer',name:'Layer',visible:true,locked:false,objectIds:[]}],objects:[],assets:[]}}
async function setup(){const result=await createApp({directory:directory()});services.push(result);headers['x-mapweaver-generation']=generation(result.store);return result}
const headers:Record<string,string>={host:'127.0.0.1:47831','x-mapweaver':'1'}
const png=async()=>new File([new Uint8Array(await sharp({create:{width:32,height:24,channels:4,background:'#127abc'}}).png().toBuffer())],'image.png',{type:'image/png'})
afterEach(async()=>{for(const {app} of services.splice(0))await app.close();for(const dir of directories.splice(0)){if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'mapweaver-sprint12-'))throw new Error('Unsafe test cleanup');rmSync(dir,{recursive:true,force:true})}})
describe('local storage integrity',()=>{
  it('migrates empty/existing databases, preserves rows and rejects a future schema',()=>{
    const dir=directory(),first=new Storage(dir),row=first.writeProject(document());first.close()
    const second=new Storage(dir);expect(second.project(row.id).name).toBe('Test map');expect(second.db.prepare('SELECT * FROM schema_migrations').all()).toHaveLength(SCHEMA_VERSION);second.db.prepare('INSERT INTO schema_migrations VALUES(?,?,?)').run(SCHEMA_VERSION+1,'Future',new Date().toISOString());second.close()
    expect(()=>new Storage(dir)).toThrow('newer');const raw=new Database(path.join(dir,'mapweaver.sqlite3'));expect(raw.prepare('SELECT * FROM projects').all()).toHaveLength(1);raw.close()
  })
  it('upgrades populated schema 1 without changing assets, references or project documents',async()=>{
    const dir=directory(),first=new Storage(dir),a=(await first.importAsset(await png(),'stamp','Existing')).asset,d=document()
    const row=first.writeProject({...d,map:{...d.map,background:{id:a.id,name:a.name,width:a.width,height:a.height}},assets:[{id:a.id,kind:'stamp',fileName:'image.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]})
    first.close()
    // Recreate the pre-upgrade schema around real populated records and files.
    const legacy=new Database(path.join(dir,'mapweaver.sqlite3'))
    for(const t of legacy.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as {name:string}[])legacy.exec(`DROP TRIGGER ${t.name}`)
    legacy.exec("DROP TABLE campaign_nodes;DROP TABLE campaigns;DROP TABLE library_members;DROP TABLE library_collections;DROP INDEX assets_generator_type;DROP INDEX assets_active;DROP INDEX categories_parent;DELETE FROM settings WHERE key='libraryRevision';")
    for(const column of ['quality','patternScale','generator','prefab','description','favorite','author','source','license','applicableMapTypes','deletedAt'])legacy.exec(`ALTER TABLE assets DROP COLUMN ${column}`)
    for(const column of ['parentId','sortOrder','modifiedAt'])legacy.exec(`ALTER TABLE categories DROP COLUMN ${column}`)
    for(const column of ['sizingMode','defaultWidth','defaultHeight','sizingUnit','aspectRatioLocked','sizingScope'])legacy.exec(`ALTER TABLE assets DROP COLUMN ${column}`)
    legacy.exec('DROP TABLE wall_sets; DROP INDEX IF EXISTS projects_deleted; ALTER TABLE projects DROP COLUMN deletedAt; DELETE FROM schema_migrations WHERE version>=2');legacy.close()
    const upgraded=new Storage(dir)
    try {
      expect(upgraded.asset(a.id)).toEqual(a)
      expect(readdirSync(path.join(dir,'backups')).some(name=>name.startsWith('pre-library-'))).toBe(true)
      expect(upgraded.asset(a.id)).toMatchObject({sizingMode:'native',defaultWidth:null,defaultHeight:null,sizingUnit:null,aspectRatioLocked:true,sizingScope:'any'})
      expect(upgraded.project(row.id)).toEqual(row)
      expect(hash(upgraded.bytes(upgraded.asset(a.id)))).toBe(a.sha256)
      expect(upgraded.db.prepare('SELECT * FROM project_assets').all()).toHaveLength(1)
      upgraded.migrate();expect(upgraded.db.prepare('SELECT * FROM schema_migrations').all()).toHaveLength(SCHEMA_VERSION)
    } finally { upgraded.close() }
  })
  it('exposes sizing defaults for every asset type and preserves reserved metadata through normal updates and backup',async()=>{
    const {store,app}=await setup(),image=await png()
    for(const type of ['stamp','fill-pattern','background']){
      const imported=await app.inject({method:'POST',url:`/api/v1/assets?type=${type}&name=Sizing&filename=image.png`,headers:{...headers,'content-type':'image/png'},payload:Buffer.from(await image.arrayBuffer())})
      expect(imported.statusCode).toBe(200)
      expect(imported.json().asset).toMatchObject({sizingMode:'native',defaultWidth:null,defaultHeight:null,sizingUnit:null,aspectRatioLocked:true,sizingScope:'any'})
    }
    const a=(await store.importAsset(image,'stamp','Duplicate')).asset
    store.db.prepare("UPDATE assets SET sizingMode='world',defaultWidth=2.5,defaultHeight=4,sizingUnit='m',aspectRatioLocked=0,sizingScope='regional-map' WHERE id=?").run(a.id)
    const expected={sizingMode:'world',defaultWidth:2.5,defaultHeight:4,sizingUnit:'m',aspectRatioLocked:false,sizingScope:'regional-map'}
    expect((await store.importAsset(image,'stamp','Again')).asset).toMatchObject(expected)
    const changed=await app.inject({method:'PATCH',url:`/api/v1/assets/${a.id}`,headers,payload:{name:'Renamed',categoryId:'uncategorized'}})
    expect(changed.json()).toMatchObject(expected)
    expect((await app.inject({url:`/api/v1/assets/${a.id}`,headers})).json()).toMatchObject(expected)
    expect((await app.inject({url:'/api/v1/assets?type=stamp',headers})).json()[0]).toMatchObject(expected)
    expect((await app.inject({url:'/api/v1/storage',headers})).json().schemaVersion).toBe(SCHEMA_VERSION)
    for(const [column,value] of [['sizingMode','invalid'],['sizingScope','invalid'],['sizingUnit','px'],['aspectRatioLocked',2],['defaultWidth',0],['defaultHeight',-1],['defaultWidth',Infinity],['defaultHeight','invalid']]){
      expect(()=>store.db.prepare(`UPDATE assets SET ${column}=? WHERE id=?`).run(value,a.id)).toThrow()
    }
    const backup=await app.inject({method:'POST',url:'/api/v1/backup',headers}),files=unzipSync(backup.rawPayload)
    expect(JSON.parse(new TextDecoder().decode(files['manifest.json'])).schemaVersion).toBe(SCHEMA_VERSION)
    const snapshot=path.join(directory(),'backup.sqlite3');writeFileSync(snapshot,files['mapweaver.sqlite3'])
    const db=new Database(snapshot,{readonly:true})
    try { expect(db.prepare('SELECT * FROM assets WHERE id=?').get(a.id)).toMatchObject({...expected,aspectRatioLocked:0}) } finally { db.close() }
  })
  it('validates directories and refuses traversal / absolute managed paths',()=>{
    expect(()=>dataDirectory('relative')).toThrow();const dir=directory()
    for(const unsafe of ['../outside','C:/secret','assets/originals/../../x.png','assets/originals/x.svg'])expect(()=>managedPath(dir,unsafe)).toThrow()
  })
  it('does not accept a non-directory destination or claim success from read-only SQLite',async()=>{
    const dir=directory(),file=path.join(dir,'occupied');writeFileSync(file,'keep')
    expect(()=>new Storage(file)).toThrow()
    const {store,app}=await setup(),row=store.writeProject(document());store.db.pragma('query_only = ON')
    const result=await app.inject({method:'PUT',url:`/api/v1/projects/${row.id}`,headers,payload:{document:{...row.document,name:'Blocked'},revision:row.revision}})
    expect(result.statusCode).toBe(500);expect(store.project(row.id).name).toBe('Test map')
  })
  it('opens only its own configured data folder, ignoring caller-supplied paths',async()=>{
    const opened:string[]=[],result=await createApp({directory:directory(),openFolder:async dir=>{opened.push(dir)}});services.push(result);headers['x-mapweaver-generation']=generation(result.store)
    const response=await result.app.inject({method:'POST',url:'/api/v1/storage/open-folder',headers,payload:{path:'C:/Windows',command:'untrusted'}})
    expect(response.statusCode).toBe(200);expect(opened).toEqual([result.store.root])
  })
  it('creates, reads, updates, renames, duplicates and deletes with revision conflicts',async()=>{
    const {app}=await setup()
    const made=await app.inject({method:'POST',url:'/api/v1/projects',headers,payload:document()});expect(made.statusCode).toBe(200);const row=made.json()
    expect((await app.inject({method:'GET',url:`/api/v1/projects/${row.id}`,headers})).json().revision).toBe(1)
    const updated=await app.inject({method:'PUT',url:`/api/v1/projects/${row.id}`,headers,payload:{document:{...row.document,name:'Changed'},revision:1}});expect(updated.json().revision).toBe(2)
    const conflict=await app.inject({method:'PUT',url:`/api/v1/projects/${row.id}`,headers,payload:{document:row.document,revision:1}});expect(conflict.statusCode).toBe(409);expect(conflict.json().code).toBe('REVISION_CONFLICT')
    expect((await app.inject({method:'PATCH',url:`/api/v1/projects/${row.id}`,headers,payload:{name:'Renamed',revision:2}})).json().name).toBe('Renamed')
    const copy=(await app.inject({method:'POST',url:`/api/v1/projects/${row.id}/duplicate`,headers})).json();expect(copy.id).not.toBe(row.id)
    expect((await app.inject({method:'DELETE',url:`/api/v1/projects/${row.id}`,headers,payload:{revision:2}})).statusCode).toBe(409)
    expect((await app.inject({method:'DELETE',url:`/api/v1/projects/${row.id}`,headers,payload:{revision:3}})).statusCode).toBe(200)
    expect((await app.inject({method:'GET',url:'/api/v1/projects?trash=true',headers})).json()).toHaveLength(1)
    expect((await app.inject({method:'DELETE',url:`/api/v1/projects/${row.id}`,headers,payload:{revision:4,permanent:true}})).statusCode).toBe(200)
    expect((await app.inject({method:'GET',url:`/api/v1/projects/${row.id}`,headers})).statusCode).toBe(404)
  })
  it('decodes real images, deduplicates shared bytes across types and blocks referenced deletion',async()=>{
    const {store,app}=await setup(),image=await png(),stamp=await store.importAsset(image,'stamp','Stamp'),fill=await store.importAsset(image,'fill-pattern','Fill')
    expect((await store.importAsset(image,'stamp','Again')).added).toBe(false)
    expect(fill.asset.id).not.toBe(stamp.asset.id);expect(fill.asset.originalPath).toBe(stamp.asset.originalPath);expect(readdirSync(path.join(store.root,'assets/originals'))).toHaveLength(1)
    const d=document(),a=stamp.asset
    const saved=store.writeProject({...d,map:{...d.map,background:{id:a.id,name:'Background',width:32,height:24}},assets:[{id:a.id,kind:'stamp',fileName:'image.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]})
    const blocked=await app.inject({method:'DELETE',url:`/api/v1/assets/${a.id}`,headers});expect(blocked.statusCode).toBe(409);expect(blocked.json().message).toContain(saved.name)
    const response=await app.inject({method:'GET',url:`/api/v1/assets/${a.id}/content`,headers});expect(response.headers['x-content-type-options']).toBe('nosniff');expect(hash(response.rawPayload)).toBe(a.sha256)
    await expect(store.importAsset(new File(['<script>evil</script>'],'bad.png',{type:'image/png'}),'stamp','Bad')).rejects.toThrow()
    await expect(store.importAsset(new File([image],'../bad.png',{type:'image/png'}),'stamp','Bad')).rejects.toThrow()
  })
  it('preserves EXIF-oriented JPEG bytes and records browser-oriented dimensions',async()=>{
    const {store}=await setup(),bytes=await sharp({create:{width:32,height:24,channels:3,background:'#abc'}}).jpeg().withMetadata({orientation:6}).toBuffer()
    const result=await store.importAsset(new File([new Uint8Array(bytes)],'rotated.jpg',{type:'image/jpeg'}),'stamp','Rotated')
    expect(result.asset.width).toBe(24);expect(result.asset.height).toBe(32);expect(hash(store.bytes(result.asset))).toBe(hash(bytes))
  })
  it('cleans temporary files after an injected disk-write failure, leaves no committed metadata',async()=>{
    const store=new Storage(directory(),()=>{throw Object.assign(new Error('full'),{code:'ENOSPC'})})
    try{await expect(store.importAsset(await png(),'stamp','Fail')).rejects.toThrow('full');expect(readdirSync(path.join(store.root,'assets/originals'))).toEqual([]);expect(store.db.prepare('SELECT * FROM assets').all()).toEqual([])}finally{store.close()}
  })
  it('imports/exports portable projects and resumes idempotently after previously imported assets',async()=>{
    const {store}=await setup(),a=(await store.importAsset(await png(),'background','Backdrop')).asset,d=document()
    const row=store.writeProject({...d,map:{...d.map,background:{id:a.id,name:'Background',width:a.width,height:a.height}},assets:[{id:a.id,kind:'stamp',fileName:'image.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]})
    const bytes=await store.exportProject(row.id),first=await store.importProject(bytes,'test-profile:project:1'),second=await store.importProject(bytes,'test-profile:project:1')
    expect(first.id).toBe(second.id);expect(first.id).not.toBe(row.id);expect(store.db.prepare('SELECT * FROM assets').all()).toHaveLength(1)
    const portable=await decodeProject(await store.exportProject(first.id),validateImage);expect(portable.document.map.background?.width).toBe(32);expect(portable.assets.size).toBe(1)
  })
  it('makes a verified SQLite snapshot plus assets; snapshot opens independently',async()=>{
    const {store,app}=await setup(),a=(await store.importAsset(await png(),'stamp','Keep')).asset,d=document()
    const original=store.writeProject({...d,map:{...d.map,background:{id:a.id,name:'Background',width:a.width,height:a.height}},assets:[{id:a.id,kind:'stamp',fileName:'image.png',mimeType:a.mimeType,width:a.width,height:a.height,hash:a.sha256,path:`assets/${a.sha256}.png`}]})
    const response=await app.inject({method:'POST',url:'/api/v1/backup',headers});expect(response.statusCode,response.body.slice(0,100)).toBe(200)
    const files=unzipSync(response.rawPayload),manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']))
    for(const [name,meta] of Object.entries(manifest.files) as [string,{sha256:string}][])expect(hash(files[name])).toBe(meta.sha256)
    const target=directory();writeFileSync(path.join(target,'snapshot.sqlite3'),files['mapweaver.sqlite3']);const db=new Database(path.join(target,'snapshot.sqlite3'),{readonly:true});expect(db.pragma('integrity_check',{simple:true})).toBe('ok');expect(db.prepare('SELECT * FROM projects').all()).toHaveLength(1);db.close()
    // Restore only this test-generated, hash-verified archive into a fresh test directory.
    const restoredDirectory=directory()
    for(const [name,bytes] of Object.entries(files)){
      if(name==='manifest.json')continue
      const file=name==='mapweaver.sqlite3'?path.join(restoredDirectory,name):managedPath(restoredDirectory,name)
      mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,bytes)
    }
    const restored=new Storage(restoredDirectory)
    try{expect(restored.integrity()).toEqual({missing:[],damaged:[],orphaned:[],temporary:[]});expect(restored.project(original.id).document).toEqual(original.document);expect(hash(restored.bytes(restored.asset(a.id)))).toBe(a.sha256);expect((await decodeProject(await restored.exportProject(original.id),validateImage)).assets.size).toBe(1)}finally{restored.close()}
    expect(readdirSync(path.join(store.root,'backups'))).toEqual([])
  })
  it('reports missing/damaged/orphan/temp files without deleting anything',async()=>{
    const {store,app}=await setup(),a=(await store.importAsset(await png(),'stamp','Keep')).asset
    writeFileSync(managedPath(store.root,a.originalPath),'damaged');const orphan=path.join(store.root,'assets/originals','unregistered.bin');writeFileSync(orphan,'keep');writeFileSync(orphan+'.tmp','keep')
    expect(store.integrity().damaged).toContain(a.id);expect(store.integrity().orphaned).toHaveLength(1);expect(store.integrity().temporary).toHaveLength(1);expect(existsSync(orphan)).toBe(true);expect(()=>store.bytes(a)).toThrow('missing or damaged')
    unlinkSync(managedPath(store.root,a.originalPath)) // This test's own generated file only.
    expect(store.integrity().missing).toContain(a.id)
    expect((await app.inject({method:'GET',url:`/api/v1/assets/${a.id}/content`,headers})).json().code).toBe('ASSET_UNREADABLE')
    expect((await app.inject({method:'POST',url:'/api/v1/backup',headers})).json().code).toBe('BACKUP_INCOMPLETE')
  })
  it('rejects cross-origin / rebinding and mutation requests without application header',async()=>{
    const {app}=await setup()
    for(const h of [{host:'evil.test:47831'},{...headers,origin:'https://evil.test'},{...headers,'sec-fetch-site':'cross-site'}])expect((await app.inject({url:'/api/v1/projects',headers:h})).statusCode).toBe(403)
    expect((await app.inject({method:'POST',url:'/api/v1/projects',headers:{host:headers.host},payload:document()})).statusCode).toBe(403)
  })
  it('returns a recoverable error while SQLite is locked, without overwriting the saved document',async()=>{
    const {app,store}=await setup(),row=store.writeProject(document()),other=new Database(path.join(store.root,'mapweaver.sqlite3'))
    other.exec('BEGIN IMMEDIATE')
    try{
      const response=await app.inject({method:'PUT',url:`/api/v1/projects/${row.id}`,headers,payload:{document:{...row.document,name:'Must not commit'},revision:row.revision}})
      expect(response.statusCode).toBe(500);expect(response.json().message).toContain('busy');expect(store.project(row.id).name).toBe('Test map')
    }finally{other.exec('ROLLBACK');other.close()}
  },10000)
})

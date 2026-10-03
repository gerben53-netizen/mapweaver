import 'fake-indexeddb/auto'
import { expect,it,vi } from 'vitest'
import { mkdtempSync,rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createApp } from './app'
import { validateImage } from './storage'
import { LibraryDatabase } from '../src/storage/database'
import { LibraryRepository } from '../src/storage/libraryRepository'
import { RecoveryRepository } from '../src/projects/recoveryRepository'
import { migrateLegacy,migrationDatabase,migrationState } from '../src/storage/migration'
import type { MigrationReport } from '../src/storage/migration'
import { contentHash } from '../src/imports/readImage'
import { defaultMapStyle } from '../src/domain/mapSettings'
it('copies legacy Dexie data, safely resumes interruption, verifies project bytes, leaves every source row intact',async()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),'mapweaver-migrate-test-')),legacy=new LibraryDatabase(`test-migrate-${crypto.randomUUID()}`),repo=new LibraryRepository(legacy),{app,store}=await createApp({directory})
  vi.stubGlobal('fetch',async(url:string,options:RequestInit={})=>{
    const payload=options.body instanceof Blob?Buffer.from(await options.body.arrayBuffer()):options.body as string|undefined
    const result=await app.inject({url,method:(options.method||'GET') as 'GET'|'POST',headers:{host:'127.0.0.1:47831',...(options.headers as Record<string,string>)},payload})
    return new Response(new Uint8Array(result.rawPayload),{status:result.statusCode,headers:{'content-type':String(result.headers['content-type']||'application/json')}})
  })
  try{
    const [profileA,profileB]=await Promise.all([migrationState(),migrationState()]);expect(profileA.profile).toBe(profileB.profile)
    await repo.initialize();const now=new Date().toISOString(),blob=new Blob([new Uint8Array(await sharp({create:{width:10,height:10,channels:4,background:'#aabbcc'}}).png().toBuffer())],{type:'image/png'}),digest=await contentHash(blob)
    const asset={id:'old-asset',kind:'stamp' as const,name:'Old stamp',categoryId:'uncategorized',createdAt:now,contentHash:digest,mimeType:blob.type,naturalWidth:10,naturalHeight:10}
    await repo.add(asset,blob)
    const id=crypto.randomUUID(),manifest={id:asset.id,kind:'stamp' as const,fileName:'old.png',mimeType:blob.type,width:10,height:10,hash:digest,path:`assets/${digest}.png`}
    await new RecoveryRepository(legacy).save({document:{formatVersion:2,id,name:'Old project',createdAt:now,modifiedAt:now,map:{width:600,height:400,...defaultMapStyle(),background:{id:asset.id,name:'Old background',width:10,height:10}},objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],assets:[manifest]},assets:new Map([[asset.id,{manifest,blob}]])},null)
    let report:MigrationReport={profile:crypto.randomUUID(),completed:false,steps:[],mappings:{},error:'',updatedAt:now}
    report=await migrateLegacy(report,r=>{report=r},legacy,()=>report.steps.length>=2,validateImage)
    expect(report.completed).toBe(false);expect(report.error).toContain('interrupted');expect(store.db.prepare('SELECT * FROM assets').all()).toHaveLength(1)
    report=await migrateLegacy(report,()=>{},legacy,()=>false,validateImage);expect(report.error).toBe('');expect(report.completed).toBe(true)
    const count=(store.db.prepare('SELECT count(*) AS n FROM projects').get() as {n:number}).n
    const repeated=await migrateLegacy(report,()=>{},legacy,()=>false,validateImage);expect(repeated.completed).toBe(true);expect((store.db.prepare('SELECT count(*) AS n FROM projects').get() as {n:number}).n).toBe(count)
    expect(await legacy.assets.count()).toBe(1);expect(await legacy.blobs.count()).toBe(1);expect(await legacy.recoveryProjects.count()).toBe(1);expect(await contentHash((await legacy.blobs.get(asset.id))!.blob)).toBe(digest)
  }finally{vi.unstubAllGlobals();await app.close();await legacy.delete();await migrationDatabase.delete();if(path.basename(directory).startsWith('mapweaver-migrate-test-')&&path.dirname(directory)===path.resolve(os.tmpdir()))rmSync(directory,{recursive:true,force:true})}
})

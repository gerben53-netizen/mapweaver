import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createApp } from './app'
import { generation } from './safety'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { defaultGeography } from '../src/domain/geography'
import { clearStartupProject, rememberStartupProject, startupProject } from './startupProject'
const services:Awaited<ReturnType<typeof createApp>>[]=[]
const directories:string[]=[]
afterEach(async()=>{for(const {app} of services.splice(0))await app.close();for(const dir of directories.splice(0)){if(!dir.startsWith(path.join(os.tmpdir(),'mapweaver-startup-')))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true})}})
async function setup(){const dir=mkdtempSync(path.join(os.tmpdir(),'mapweaver-startup-'));directories.push(dir);const service=await createApp({directory:dir});services.push(service);return service}
function document(){const now=new Date().toISOString();return {formatVersion:12,id:randomUUID(),name:'Startup map',createdAt:now,modifiedAt:now,map:{width:800,height:600,...defaultMapStyle(),background:null,mapType:'battlemap',geography:defaultGeography('battlemap')},layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:[]}],layerTree:{roots:['layer'],groups:[]},objectGroups:[],objects:[],assets:[]}}
it('persists only acknowledged opens; rename/duplicate preserve IDs; trash clears the target',async()=>{
 const {app,store}=await setup(),health=(await app.inject({url:'/api/v1/health',headers:{host:'127.0.0.1:47831'}})).json(),headers={host:'127.0.0.1:47831','x-mapweaver':'1','x-mapweaver-generation':generation(store),'x-mapweaver-instance':health.instanceId}
 const row=store.writeProject(document());expect(startupProject(store)).toBeNull()
 expect((await app.inject({url:`/api/v1/projects/${row.id}`,headers})).statusCode).toBe(200);expect(startupProject(store)).toBeNull()
 expect((await app.inject({method:'POST',url:`/api/v1/projects/${row.id}/opened`,headers})).statusCode).toBe(200);expect(startupProject(store)).toBe(row.id)
 const renamed=await app.inject({method:'PATCH',url:`/api/v1/projects/${row.id}`,headers,payload:{revision:row.revision,name:'Renamed'}});expect(renamed.statusCode).toBe(200);expect(startupProject(store)).toBe(row.id)
 expect((await app.inject({method:'POST',url:`/api/v1/projects/${row.id}/duplicate`,headers})).statusCode).toBe(200);expect(startupProject(store)).toBe(row.id)
 expect((await app.inject({method:'DELETE',url:`/api/v1/projects/${row.id}`,headers,payload:{revision:renamed.json().revision}})).statusCode).toBe(200);expect(startupProject(store)).toBeNull()
 expect((await app.inject({url:`/api/v1/projects/${row.id}`,headers})).statusCode).toBe(409)
 expect(()=>rememberStartupProject(store,row.id)).toThrow(/Trash/)
})
it('compare-and-clear cannot erase another window’s newer choice and clears malformed references',async()=>{
 const {store}=await setup(),a=store.writeProject(document()),b=store.writeProject(document());rememberStartupProject(store,a.id);rememberStartupProject(store,b.id)
 expect(clearStartupProject(store,a.id)).toBe(false);expect(startupProject(store)).toBe(b.id);expect(clearStartupProject(store,b.id)).toBe(true);expect(startupProject(store)).toBeNull()
 store.db.prepare("INSERT INTO settings VALUES('lastOpenedProject',?)").run('../missing');expect(clearStartupProject(store,'../missing')).toBe(true);expect(()=>rememberStartupProject(store,randomUUID())).toThrow()
})

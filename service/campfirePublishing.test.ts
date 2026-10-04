import { afterEach,beforeEach,expect,it } from 'vitest'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { mkdtempSync,readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { Storage } from './storage'
import { createApp } from './app'
import { CampfireClient,campfireUrl,chooseContract } from './campfirePublishing'
import type { Discovery } from './campfirePublishing'
import { mapContractSchemaV1,mapContractSchemaV2,mapContractSchemaV3 } from '../src/campfire/generated/index'
import fixture from '../src/campfire/generated/canonical-fixture.json'
const token='cfmi_'+ 'x'.repeat(43),planId='18eb3d80-62fc-4984-97bf-1094dd4fc609'
const describe=(schema:typeof mapContractSchemaV1|typeof mapContractSchemaV2|typeof mapContractSchemaV3)=>({version:schema.properties.version.const,schema,schemaHash:createHash('sha256').update(JSON.stringify(schema)).digest('hex'),capabilities:{walls:true,doors:true,pointLights:true,windows:'windows' in schema.properties,ceilingRegions:'ceilingRegions' in schema.properties,ceilingRendering:false}})
const discovery=():Discovery=>({currentVersion:3,supportedVersions:[1,2,3],contracts:[mapContractSchemaV1,mapContractSchemaV2,mapContractSchemaV3].map(describe),constraints:{bytes:6*1024*1024,jsonBytes:200000,imageBytes:5*1024*1024,files:2,image:{minDimension:128,dimension:8192,pixels:20_000_000,mapFullBytes:5*1024*1024,thumbnailBytes:65536},lighting:{count:32,radiusPx:8192},grid:{minSizePx:1,minFeetPerCell:.1},transport:'multipart/form-data',archives:false,fields:['contract','image'],confirm:'CAMPAIGN_DM_SESSION'}})
let server:Server,store:Storage,client:CampfireClient,url:string,errorCode='',status='READY_FOR_REVIEW',uploads:{key:string;contract:unknown;image:Buffer}[]=[],requests:string[]=[],remote=discovery(),responseLost=false
const contract=()=>({...structuredClone(fixture),version:3,image:{path:'map.png',mimeType:'image/png'},lighting:{ambient:{intensity:.5},lights:[]},dimensions:{pixelWidth:128,pixelHeight:128},walls:[],doors:[],windows:[],ceilingRegions:[]})
const image=()=>sharp({create:{width:128,height:128,channels:4,background:'#ac9070'}}).png().toBuffer()
beforeEach(async()=>{
 errorCode='';status='READY_FOR_REVIEW';uploads=[];requests=[];remote=discovery();responseLost=false
 store=new Storage(mkdtempSync(path.join(os.tmpdir(),'mapweaver-publish-qa-')));client=new CampfireClient(()=>store)
 server=createServer(async(req,res)=>{requests.push(req.url!);expect(req.headers.authorization).toBe('Bearer '+token);expect(req.headers.cookie).toBeUndefined();res.setHeader('Content-Type','application/json');if(errorCode){res.statusCode=409;res.end(JSON.stringify({error:'private remote details '+token,code:errorCode}));return}
  if(req.url==='/api/map-contract'){res.end(JSON.stringify(remote));return}
  if(req.url==='/api/map-contract/3'){res.end(JSON.stringify({...remote,...remote.contracts[2]}));return}
  if(req.method==='POST'){expect(req.url).toBe('/api/integrations/maps/imports');const chunks:Buffer[]=[];for await(const b of req)chunks.push(b);const form=await new Request(url,{method:'POST',headers:{'Content-Type':req.headers['content-type']!},body:new Uint8Array(Buffer.concat(chunks))}).formData();expect([...form.keys()].sort()).toEqual(['contract','image']);const json=form.get('contract') as File,png=form.get('image') as File;expect(json.type).toBe('application/json');expect(png.type).toBe('image/png');const key=String(req.headers['idempotency-key']);expect(key).toMatch(/^[A-Za-z0-9_.:-]{1,120}$/);uploads.push({key,contract:JSON.parse(await json.text()),image:Buffer.from(await png.arrayBuffer())});if(responseLost){req.socket.destroy();return}}
  res.end(JSON.stringify({id:planId,status,expiresAt:new Date(Date.now()+1800000).toISOString(),plan:{warnings:[]}}))
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+(server.address() as {port:number}).port;client.configure({name:'QA only',baseUrl:url,token})
})
afterEach(async()=>{store.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))})
it('tests discovery only, verifies schema hashes and selects mutually supported versions',async()=>{
 expect(await client.test()).toMatchObject({message:'Verbonden',version:3});expect(requests).toEqual(['/api/map-contract']);expect((await client.getContractVersion(3)).schemaHash).toBe(remote.contracts[2].schemaHash)
 for(const v of [1,2,3]){const d=discovery();d.supportedVersions=[v];expect(chooseContract(d)).toBe(v)}
 const d=discovery();d.supportedVersions=[4];expect(()=>chooseContract(d)).toThrow('Geen gezamenlijk');d.supportedVersions=[3];d.contracts[2].schemaHash='0'.repeat(64);expect(()=>chooseContract(d)).toThrow('schema wijkt')
})
it('requires HTTPS outside numeric loopback and rejects credential URLs',()=>{
 expect(campfireUrl('https://campfire.example')).toBe('https://campfire.example');expect(()=>campfireUrl('http://campfire.example')).toThrow('HTTPS');expect(()=>campfireUrl('http://localhost')).toThrow('HTTPS');expect(()=>campfireUrl('https://a:b@campfire.example')).toThrow('geldige');expect(()=>campfireUrl('https://campfire.example/api')).toThrow('geldige');expect(()=>campfireUrl('file:///map')).toThrow()
})
it('uploads exact canonical contract and original bitmap without ZIP and preserves retry identity',async()=>{
 const bytes=await image(),m=contract(),input={contract:m,imageBase64:bytes.toString('base64')};expect(await client.publishMap(input)).toMatchObject({status:'READY_FOR_REVIEW',mapId:m.mapId,revision:m.revision});expect(uploads[0].contract).toEqual(m);expect(uploads[0].image).toEqual(bytes)
 await client.publishMap(input);expect(uploads[1].key).toBe(uploads[0].key);await client.publishMap({...input,replacement:true});expect(uploads[2].key).not.toBe(uploads[1].key);await client.publishMap({...input,contract:{...m,revision:m.revision+1}});expect(uploads[3].key).not.toBe(uploads[2].key);expect(requests.some(p=>p.includes('confirm'))).toBe(false)
})
it('preserves nonempty v3 ceiling, window, door and light data over actual multipart bytes',async()=>{
 const geometry={start:{x:16,y:32},end:{x:112,y:32}},m={...contract(),walls:[{id:'wall',...geometry,blocksVision:true}],doors:[{id:'door',geometry:{start:{x:16,y:96},end:{x:48,y:96}},blocksVisionWhenClosed:true}],windows:[{id:'window',wallId:'wall',geometry,transmitsExteriorLight:true,exteriorLightTransmission:.7}],ceilingRegions:[{id:'roof',points:[{x:8,y:8},{x:120,y:8},{x:120,y:120},{x:8,y:120}]}],lighting:{ambient:{intensity:.3},lights:[{id:'lamp',type:'point',position:{x:64,y:64},radiusFt:5,intensity:.8,color:'#aabbcc',enabled:true,affectsVision:true}]}}
 await client.publishMap({contract:m,imageBase64:(await image()).toString('base64')});expect(uploads[0].contract).toEqual(m)
 remote.constraints.lighting.count=1;await expect(client.publishMap({contract:{...m,lighting:{...m.lighting,lights:[...m.lighting.lights,{...m.lighting.lights[0],id:'lamp2'}]}},imageBase64:(await image()).toString('base64')})).rejects.toThrow('geldig pakket');expect(uploads).toHaveLength(1)
})
it('retains safe retry identity for an uncertain network outcome',async()=>{
 responseLost=true;const input={contract:contract(),imageBase64:(await image()).toString('base64')};await expect(client.publishMap(input)).rejects.toThrow('niet bereikbaar');const key=uploads[0].key;responseLost=false;await client.publishMap(input);expect(uploads[1].key).toBe(key)
})
it.each(['READY_FOR_REVIEW','CONFIRMED','EXPIRED','CANCELLED'])('reads %s without attempting confirmation',async next=>{
 const input={contract:contract(),imageBase64:(await image()).toString('base64')};await client.publishMap(input);status=next;expect((await client.getImportStatus(contract().mapId)).status).toBe(next);if(['EXPIRED','CANCELLED'].includes(next)){await client.publishMap(input);expect(uploads[1].key).not.toBe(uploads[0].key)}expect(requests.some(p=>p.includes('confirm'))).toBe(false)
})
it.each(['UNAUTHORIZED','SCOPE_DENIED','UNSUPPORTED_VERSION','REVISION_CONFLICT','IDEMPOTENCY_CONFLICT','PACKAGE_TOO_LARGE','SCHEMA_INVALID','PACKAGE_INVALID','STALE_PLAN','EXPIRED_PLAN','INTERACTIVE_DM_REQUIRED'])('maps %s safely and invalidates bad credentials',async code=>{
 errorCode=code;let message='';try{await client.test()}catch(e){message=(e as Error).message}expect(message).not.toContain(token);expect(message).not.toContain('private remote');if(['UNAUTHORIZED','SCOPE_DENIED'].includes(code)){expect(client.view()).toMatchObject({hasToken:false,attention:true});const count=requests.length;await expect(client.test()).rejects.toThrow();expect(requests.length).toBe(count)}
})
it('enforces discovered byte/dimension/grid/lighting limits before HTTP upload',async()=>{
 const input={contract:contract(),imageBase64:(await image()).toString('base64')};remote.constraints.jsonBytes=1;await expect(client.publishMap(input)).rejects.toThrow('limieten');remote=discovery();remote.constraints.image.minDimension=256;await expect(client.publishMap(input)).rejects.toThrow('limieten');remote=discovery();remote.constraints.bytes=1;await expect(client.publishMap(input)).rejects.toThrow('limieten');remote=discovery();remote.constraints.grid.minSizePx=1000;await expect(client.publishMap(input)).rejects.toThrow('geldig pakket');expect(uploads).toHaveLength(0)
})
it('blocks invalid decoded image dimensions, MIME and canonical geometry locally',async()=>{
 const m=contract(),bytes=await image();await expect(client.publishMap({contract:{...m,dimensions:{pixelWidth:256,pixelHeight:128}},imageBase64:bytes.toString('base64')})).rejects.toThrow('geldig pakket');await expect(client.publishMap({contract:{...m,image:{...m.image,mimeType:'image/jpeg'}},imageBase64:bytes.toString('base64')})).rejects.toThrow('geldig pakket');await expect(client.publishMap({contract:{...m,format:'invalid'},imageBase64:bytes.toString('base64')})).rejects.toThrow('canonieke contract');expect(uploads).toHaveLength(0)
})
it('keeps the token out of persisted settings and loses credentials on restart',async()=>{
 await client.publishMap({contract:contract(),imageBase64:(await image()).toString('base64')});const rows=JSON.stringify(store.db.prepare('SELECT * FROM settings').all());expect(rows).not.toContain(token);expect(rows).not.toContain('imageBase64');expect(rows).not.toContain('Authorization');expect(JSON.stringify(client.view())).not.toContain(token);const restarted=new CampfireClient(()=>store);expect(restarted.view()).toMatchObject({hasToken:false});expect(restarted.view()?.receipts[0].id).toBe(planId);expect(readFileSync(path.join(store.root,'mapweaver.sqlite3')).includes(Buffer.from(token))).toBe(false)
})
it('bridges local authenticated routes to network HTTP without exposing the token or enabling confirm',async()=>{
 const {app}=await createApp({directory:mkdtempSync(path.join(os.tmpdir(),'mapweaver-api-qa-')),port:48597})
 try{
  const host='127.0.0.1:48597',health=(await app.inject({url:'/api/v1/health',headers:{host}})).json(),headers={host,'x-mapweaver':'1','x-mapweaver-generation':health.generation}
  const config=await app.inject({method:'PUT',url:'/api/v1/campfire/connection',headers,payload:{name:'QA',baseUrl:url,token}});expect(config.statusCode).toBe(200);expect(config.body).not.toContain(token)
  const rejected=await app.inject({method:'PUT',url:'/api/v1/campfire/connection',headers:{...headers,origin:'https://foreign.example'},payload:{name:'QA',baseUrl:url,token}});expect(rejected.statusCode).toBe(403)
  const tested=await app.inject({method:'POST',url:'/api/v1/campfire/test',headers});expect(tested.json()).toMatchObject({version:3,message:'Verbonden'})
  const result=await app.inject({method:'POST',url:'/api/v1/campfire/publish',headers,payload:{contract:contract(),imageBase64:(await image()).toString('base64')}});expect(result.statusCode).toBe(200);expect(result.json()).toMatchObject({id:planId,status:'READY_FOR_REVIEW'})
  expect((await app.inject({url:'/api/v1/campfire/connection',headers:{host}})).body).not.toContain(token)
  expect((await app.inject({method:'POST',url:'/api/v1/campfire/confirm',headers})).statusCode).toBe(404)
 }finally{await app.close()}
})

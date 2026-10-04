import type { FastifyInstance } from 'fastify'
import { createHash, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { Storage, StorageError, label } from './storage'
import { mapContractSchemaV1,mapContractSchemaV2,mapContractSchemaV3,validateMapContract } from '../src/campfire/generated/index'
import { publishingMessages } from '../src/campfire/publishing'
import type { ConnectionView,ImportStatus,PublishReceipt } from '../src/campfire/publishing'
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex')
const schemas=[mapContractSchemaV1,mapContractSchemaV2,mapContractSchemaV3]
interface Limits {bytes:number;jsonBytes:number;imageBytes:number;files:number;image:{minDimension:number;dimension:number;pixels:number;mapFullBytes:number;thumbnailBytes:number};lighting:{count:number;radiusPx:number};grid:{minSizePx:number;minFeetPerCell:number};transport:string;archives:boolean;fields:string[];confirm:string}
interface Descriptor {version:number;schema:unknown;schemaHash:string;capabilities:{walls:boolean;doors:boolean;pointLights:boolean;windows:boolean;ceilingRegions:boolean;ceilingRendering:boolean}}
export interface Discovery {currentVersion:number;supportedVersions:number[];constraints:Limits;contracts:Descriptor[]}
interface Configuration {id:string;name:string;baseUrl:string;receipts:PublishReceipt[]}
function fail(code:string):never{throw new StorageError(code,publishingMessages[code]||'Campfire heeft de aanvraag geweigerd. Controleer de verbinding en probeer opnieuw.',400)}
export function campfireUrl(value:unknown){
 if(typeof value!=='string'||value.length>2048)fail('INVALID_CONNECTION')
 let u:URL;try{u=new URL(value as string)}catch{fail('INVALID_CONNECTION')}
 if(u!.username||u!.password||u!.search||u!.hash||u!.pathname!=='/')fail('INVALID_CONNECTION')
 // Numeric loopback only: no DNS/Host-header exception or remote HTTP redirect.
 if(u!.protocol!=='https:'&&!(u!.protocol==='http:'&&['127.0.0.1','[::1]'].includes(u!.hostname)))fail('HTTPS_REQUIRED')
 return u!.origin
}
export function chooseContract(discovery:Discovery):1|2|3 {
 if(!discovery||!Array.isArray(discovery.supportedVersions)||!Array.isArray(discovery.contracts))fail('UNSUPPORTED_VERSION')
 const selected=[3,2,1].find(v=>discovery.supportedVersions.includes(v)&&discovery.contracts.some(d=>d.version===v))
 if(!selected)fail('UNSUPPORTED_VERSION')
 const d=discovery.contracts.find(d=>d.version===selected)!,s=schemas[selected!-1]
 if(d.schemaHash!==sha(JSON.stringify(d.schema))||d.schemaHash!==sha(JSON.stringify(s)))fail('SCHEMA_MISMATCH')
 if(!d.capabilities?.walls||!d.capabilities.doors||!d.capabilities.pointLights||d.capabilities.ceilingRendering!==false||(selected!>=2&&!d.capabilities.windows)||(selected===3&&!d.capabilities.ceilingRegions))fail('SCHEMA_MISMATCH')
 const c=discovery.constraints
 if(!c||c.transport!=='multipart/form-data'||c.archives!==false||c.files!==2||c.confirm!=='CAMPAIGN_DM_SESSION'||JSON.stringify(c.fields)!==JSON.stringify(['contract','image']))fail('PACKAGE_INVALID')
 const numeric=[c.bytes,c.jsonBytes,c.imageBytes,c.image?.minDimension,c.image?.dimension,c.image?.pixels,c.image?.mapFullBytes,c.image?.thumbnailBytes,c.lighting?.count,c.lighting?.radiusPx,c.grid?.minSizePx,c.grid?.minFeetPerCell]
 if(numeric.some(n=>!Number.isFinite(n)||n<=0))fail('PACKAGE_INVALID')
 return selected as 1|2|3
}
export class CampfireClient {
 private token='';private tokenConnection='';private attention=false;private busy=false
 constructor(private store:()=>Storage){}
 private config():Configuration|undefined{const row=this.store().db.prepare("SELECT value FROM settings WHERE key='campfirePublishing'").get() as {value:string}|undefined;return row?JSON.parse(row.value):undefined}
 private write(c:Configuration){this.store().db.prepare("INSERT INTO settings VALUES ('campfirePublishing',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(c))}
 view():ConnectionView|undefined{const c=this.config();return c?{...c,hasToken:!!this.token&&this.tokenConnection===c.id,attention:this.attention}:undefined}
 configure(input:{name:string;baseUrl:string;token?:string}){
  if(this.busy)fail('UPLOAD_BUSY')
  const baseUrl=campfireUrl(input?.baseUrl),name=label(input?.name)
  if(input.token!==undefined&&(typeof input.token!=='string'||!/^cfmi_[A-Za-z0-9_-]{43}$/.test(input.token)))fail('INVALID_CONNECTION')
  const old=this.config();if(!old||old.baseUrl!==baseUrl){this.token='';this.write({id:randomUUID(),name,baseUrl,receipts:[]})}else this.write({...old,name})
  if(input.token){this.token=input.token;this.tokenConnection=this.config()!.id}
  this.attention=false;return this.view()
 }
 disconnect(){if(this.busy)fail('UPLOAD_BUSY');this.token='';this.attention=false;this.store().db.prepare("DELETE FROM settings WHERE key='campfirePublishing'").run();return {disconnected:true}}
 private async http(path:string,options:RequestInit={}){
  const c=this.config();if(!c||!this.token||this.tokenConnection!==c.id||this.attention)fail('UNAUTHORIZED')
  let response:Response;try{response=await fetch(c!.baseUrl+path,{...options,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(45000),headers:{...options.headers,Authorization:'Bearer '+this.token}})}catch{fail('OFFLINE')}
  if(!response!.ok){const error=await response!.json().catch(()=>({code:'REQUEST_FAILED'})) as {code?:string};const code=typeof error.code==='string'&&publishingMessages[error.code]?error.code:response!.status===401?'UNAUTHORIZED':response!.status===403?'SCOPE_DENIED':'REQUEST_FAILED';if(['UNAUTHORIZED','SCOPE_DENIED'].includes(code)){this.attention=true;this.token=''}fail(code)}
  const text=await response!.text();if(text.length>2*1024*1024)fail('PACKAGE_INVALID');try{return JSON.parse(text)}catch{fail('PACKAGE_INVALID')}
 }
 async discoverContract(){const d=await this.http('/api/map-contract') as Discovery;chooseContract(d);return d}
 async getContractVersion(version:1|2|3){const detail=await this.http('/api/map-contract/'+version) as Omit<Discovery,'contracts'>&Descriptor;const discovery={...detail,contracts:[detail]};chooseContract(discovery);return detail}
 async test(){const d=await this.discoverContract();return {message:'Verbonden',version:chooseContract(d),constraints:d.constraints}}
 private receipt(value:unknown,metadata:Omit<PublishReceipt,'id'|'status'>):PublishReceipt{
  const p=value as {id:string;status:ImportStatus};if(!p||typeof p.id!=='string'||!/^[-a-f0-9]{36}$/i.test(p.id)||!['READY_FOR_REVIEW','CONFIRMED','EXPIRED','CANCELLED'].includes(p.status))fail('PACKAGE_INVALID')
  return {...metadata,id:p.id,status:p.status}
 }
 async publishMap(input:{contract:unknown;imageBase64:string;replacement?:boolean}){
  if(this.busy)fail('UPLOAD_BUSY');this.busy=true;const storage=this.store()
  try{
   const d=await this.discoverContract(),version=chooseContract(d),checked=validateMapContract(input?.contract)
   if(!checked.valid)fail('SCHEMA_INVALID');const m=checked.value
   if(m.version!==version)fail('UNSUPPORTED_VERSION')
   const c=d.constraints,json=JSON.stringify(m),size=Buffer.byteLength(json),max=Math.min(c.imageBytes,c.image.mapFullBytes,16*1024*1024)
   if(size>c.jsonBytes||typeof input.imageBase64!=='string'||input.imageBase64.length>Math.ceil(max/3)*4)fail('PACKAGE_TOO_LARGE')
   if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.imageBase64))fail('PACKAGE_INVALID')
   const bytes=Buffer.from(input.imageBase64,'base64'),{pixelWidth:w,pixelHeight:h}=m.dimensions
   if(bytes.length>max||w<c.image.minDimension||h<c.image.minDimension||w>c.image.dimension||h>c.image.dimension||w*h>c.image.pixels)fail('PACKAGE_TOO_LARGE')
   if(m.grid.sizePx<c.grid.minSizePx||m.grid.feetPerCell<c.grid.minFeetPerCell||(m.lighting?.lights.length||0)>c.lighting.count||(m.lighting?.lights||[]).some(l=>l.radiusFt*m.grid.sizePx/m.grid.feetPerCell>c.lighting.radiusPx))fail('PACKAGE_INVALID')
   try{const decoder=sharp(bytes,{limitInputPixels:Math.min(c.image.pixels,20_000_000),failOn:'warning'}),meta=await decoder.metadata(),mime={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[meta.format as 'png'|'jpeg'|'webp'];if((meta.pages||1)!==1||mime!==m.image.mimeType)fail('PACKAGE_INVALID');const decoded=await decoder.autoOrient().raw().toBuffer({resolveWithObject:true});if(decoded.info.width!==w||decoded.info.height!==h)fail('PACKAGE_INVALID')}catch{fail('PACKAGE_INVALID')}
   if(this.store()!==storage)fail('DATASET_CHANGED')
   const config=this.config()!,fingerprint=sha(json+'\n'+sha(bytes)),old=config.receipts.find(r=>r.mapId===m.mapId),key=!input.replacement&&old?.fingerprint===fingerprint&&!['EXPIRED','CANCELLED'].includes(old.status)?old.key:randomUUID(),metadata={mapId:m.mapId,revision:m.revision,timestamp:new Date().toISOString(),key,fingerprint}
   // Persist safe retry identity before network I/O. A lost response can be retried unchanged.
   const pending:PublishReceipt={...metadata,id:old?.key===key?old.id:'',status:old?.key===key?old.status:'READY_FOR_REVIEW'};this.write({...config,receipts:[pending,...config.receipts.filter(r=>r.mapId!==m.mapId)].slice(0,100)})
   const form=new FormData();form.set('contract',new Blob([json],{type:'application/json'}),'map.json');form.set('image',new Blob([new Uint8Array(bytes)],{type:m.image.mimeType}),'map.png')
   const request=new Request(config.baseUrl+'/api/integrations/maps/imports',{method:'POST',body:form}),body=await request.arrayBuffer();if(body.byteLength>c.bytes)fail('PACKAGE_TOO_LARGE')
   const result=this.receipt(await this.http('/api/integrations/maps/imports',{method:'POST',headers:{'Content-Type':request.headers.get('content-type')!,'Idempotency-Key':key},body}),metadata)
   if(this.store()!==storage)fail('DATASET_CHANGED')
   this.write({...config,receipts:[result,...config.receipts.filter(r=>r.mapId!==m.mapId)].slice(0,100)});return result
  }finally{this.busy=false}
 }
 async getImportStatus(mapId:string){
  if(this.busy)fail('UPLOAD_BUSY');this.busy=true;const storage=this.store()
  try{const c=this.config(),old=c?.receipts.find(r=>r.mapId===mapId);if(!old?.id)fail('EXPIRED_PLAN');const result=this.receipt(await this.http('/api/integrations/maps/imports/'+encodeURIComponent(old.id)),{...old,timestamp:new Date().toISOString()});if(this.store()!==storage)fail('DATASET_CHANGED');this.write({...c!,receipts:c!.receipts.map(r=>r.mapId===mapId?result:r)});return result}finally{this.busy=false}
 }
}
export function registerCampfirePublishing(app:FastifyInstance,store:()=>Storage){
 const client=new CampfireClient(store)
 app.get('/api/v1/campfire/connection',()=>client.view()||null)
 app.put('/api/v1/campfire/connection',r=>client.configure(r.body as Parameters<CampfireClient['configure']>[0]))
 app.delete('/api/v1/campfire/connection',()=>client.disconnect())
 app.post('/api/v1/campfire/test',()=>client.test())
 app.post('/api/v1/campfire/publish',{bodyLimit:24*1024*1024},r=>client.publishMap(r.body as Parameters<CampfireClient['publishMap']>[0]))
 app.get('/api/v1/campfire/status/:mapId',r=>client.getImportStatus((r.params as {mapId:string}).mapId))
}

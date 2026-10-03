import type { ProjectFile } from '../projects/types'
import type { AssetSizing } from '../domain/assetSizing'
export interface RemoteAsset extends AssetSizing { quality?: string | import('../domain/assetQuality').AssetQuality | null; patternScale?:number|null; applicableMapTypes?: import('../domain/geography').MapType[]; id:string;type:'stamp'|'fill-pattern'|'background'|'prefab';name:string;originalName:string;mimeType:string;width:number;height:number;size:number;sha256:string;categoryId:string;createdAt:string;modifiedAt:string }
export interface RemoteProject { id:string;name:string;revision:number;createdAt:string;modifiedAt:string;document:ProjectFile }
export class ApiError extends Error { constructor(public code:string,message:string) { super(message) } }
export let storageWork = 0
export const beginStorageWork = () => { storageWork++; return () => { storageWork-- } }
export let lifecyclePausesAutosave = false
export const pauseLifecycleAutosave = (paused: boolean) => { lifecyclePausesAutosave = paused }
export const browserClientId = crypto.randomUUID()
let instanceId: string | undefined
let datasetGeneration: string | undefined
let connecting: Promise<string> | undefined
export async function clientGeneration() {
  if (datasetGeneration) return datasetGeneration
  connecting ||= fetch('/api/v1/health').then(async response => {
    if (!response.ok) throw new Error('Local service healthcheck failed.')
    const health = await response.json() as { generation: string; instanceId?: string }
    if (!health.generation) throw new Error('Local service needs an update.')
    instanceId = health.instanceId
    datasetGeneration = health.generation; return health.generation
  }).finally(() => { connecting = undefined })
  return connecting
}
export async function request(path:string, options:RequestInit = {}) {
  let response:Response
  try { const generation = await clientGeneration(); response = await fetch(`/api/v1${path}`, { ...options, headers:{'X-Mapweaver':'1','X-Mapweaver-Generation':generation,'X-Mapweaver-Client':browserClientId,...(instanceId ? {'X-Mapweaver-Instance':instanceId} : {}),...options.headers} }) }
  catch { throw new ApiError('OFFLINE','Local Mapweaver service is unavailable. Start it and retry; unsaved changes are kept open.') }
  if (!response.ok) { const error = await response.json().catch(() => ({code:'REQUEST_FAILED',message:'Local storage request failed.'})); throw new ApiError(error.code,error.message) }
  return response
}
export async function api<T>(path:string, method='GET', body?:unknown):Promise<T> { return (await request(path,{method,...(body === undefined ? {} : {headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})})).json() }
const blobs = new Map<string,Blob>()
let blobGeneration = 0
const remember=(key:string,blob:Blob)=>{
  blobs.delete(key);blobs.set(key,blob)
  let bytes=[...blobs.values()].reduce((n,b)=>n+b.size,0)
  for(const [old,value] of blobs){if(bytes<=128*1024*1024)break;blobs.delete(old);bytes-=value.size}
}
export async function assetBlob(id:string, preview=false) {
  const key = `${id}:${preview}`, generation = blobGeneration
  if (blobs.has(key)) return blobs.get(key)!
  const blob = await (await request(`/assets/${encodeURIComponent(id)}/${preview ? 'preview' : 'content'}`)).blob()
  if (generation === blobGeneration) remember(key,blob); return blob
}
export async function uploadAsset(blob:Blob, type:string, name:string, filename:string, category='uncategorized') {
  const q = new URLSearchParams({type,name,filename,category})
  const result = await (await request(`/assets?${q}`,{method:'POST',headers:{'Content-Type':blob.type},body:blob})).json() as {asset:RemoteAsset;added:boolean}
  remember(`${result.asset.id}:false`,blob)
  return result
}
export async function downloadResponse(path:string,filename:string,method='GET') {
  const blob = await (await request(path,{method})).blob()
  downloadBlob(blob,filename)
}
export function downloadBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob),a=document.createElement('a'); a.href=url;a.download=filename;document.body.append(a)
  try { a.click() } finally { a.remove();setTimeout(() => URL.revokeObjectURL(url),30000) }
}
export interface StorageOperation { id:string; kind:'backup'|'restore';state:'running'|'ready'|'complete'|'error'|'cancelled';error?:string;filename?:string;manifest?:{createdAt:string;projects?:number;assets?:number};progress:{phase:string;bytes:number;files:number;totalBytes:number;totalFiles:number} }
export async function waitOperation(id:string, progress:(job:StorageOperation)=>void) {
  for (;;) {
    const job=await api<StorageOperation>(`/operations/${id}`);progress(job)
    if(job.state==='error'||job.state==='cancelled')throw new Error(job.error||'Operation cancelled.')
    if(job.state!=='running')return job
    await new Promise(resolve=>setTimeout(resolve,350))
  }
}
export async function backUpAllData(progress:(job:StorageOperation)=>void=()=>{}) {
  type Handle={createWritable():Promise<{write(bytes:Uint8Array):Promise<void>;close():Promise<void>;abort():Promise<void>}>}
  const picker=(window as Window & {showSaveFilePicker?:(options:unknown)=>Promise<Handle>}).showSaveFilePicker
  const handle=picker?await picker.call(window,{suggestedName:'Mapweaver-backup.zip',types:[{description:'Mapweaver backup',accept:{'application/zip':['.zip']}}]}):undefined
  const job=await api<StorageOperation>('/backups','POST');progress(job)
  await waitOperation(job.id,progress)
  if(!handle){ const a=document.createElement('a');a.href=`/api/v1/operations/${job.id}/download`;a.download='Mapweaver-backup.zip';a.click();return }
  const response=await request(`/operations/${job.id}/download`),reader=response.body!.getReader(),writer=await handle.createWritable()
  try { for (;;) {const chunk=await reader.read();if(chunk.done)break;await writer.write(chunk.value)} await writer.close() }
  catch(e){await reader.cancel().catch(()=>{});await writer.abort().catch(()=>{});throw e}
}

export function invalidateAssetBlobs(ids: Set<string>) { blobGeneration++; for (const id of ids) { blobs.delete(`${id}:true`); blobs.delete(`${id}:false`) } }

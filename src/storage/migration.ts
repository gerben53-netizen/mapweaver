import Dexie from 'dexie'
import type { Table } from 'dexie'
import { LibraryDatabase } from './database'
import { RecoveryRepository } from '../projects/recoveryRepository'
import { encodeProject, decodeProject } from '../projects/codec'
import { contentHash } from '../imports/readImage'
import { api, uploadAsset, request } from './api'
import type { RemoteAsset, RemoteProject } from './api'
import type { ProjectFile } from '../projects/types'
import type { ImageValidator } from '../projects/archive'

export interface MigrationReport { profile:string;completed:boolean;steps:string[];mappings:Record<string,string>;error:string;updatedAt:string }
class MigrationDatabase extends Dexie { state!:Table<MigrationReport,string>;constructor(){super('mapweaver-migration');this.version(1).stores({state:'profile'})} }
export const migrationDatabase=new MigrationDatabase()
export async function migrationState(){return migrationDatabase.transaction('rw',migrationDatabase.state,async()=>{const prior=await migrationDatabase.state.toCollection().first();if(prior)return prior;const state:MigrationReport={profile:crypto.randomUUID(),completed:false,steps:[],mappings:{},error:'',updatedAt:new Date().toISOString()};await migrationDatabase.state.put(state);return state})}
export async function inventory(database?:LibraryDatabase) {
  const db=database || new LibraryDatabase()
  try{
  const [assets,projects,blobs,embedded,categories]=await Promise.all([db.assets.toArray(),db.recoveryProjects.toArray(),db.blobs.toArray(),db.projectAssets.toArray(),db.categories.toArray()])
  return {assets,projects,blobs,embedded,categories,bytes:blobs.reduce((n,b)=>n+b.blob.size,0)+embedded.reduce((n,a)=>n+a.blob.size,0),backgrounds:projects.filter(p=>p.document.map.background).length}
  }finally{if(!database)db.close()}
}
export async function migrateLegacy(report:MigrationReport, progress:(report:MigrationReport)=>void,database:LibraryDatabase|undefined=undefined, interrupted=()=>false, validate?:ImageValidator) {
  const db=database || new LibraryDatabase()
  const state:MigrationReport={...report,completed:false,error:'',steps:[...report.steps],mappings:{...report.mappings}}
  const checkpoint=async(message:string)=>{if(!state.steps.includes(message))state.steps.push(message);state.updatedAt=new Date().toISOString();await migrationDatabase.state.put(state);progress({...state});if(interrupted())throw new Error('Migration interrupted. Run again to safely resume.')}
  try{
    await api('/storage');await checkpoint('Service and destination checked')
    const source=await inventory(db),categoryMap=new Map<string,string>([['uncategorized','uncategorized']])
    for(const c of source.categories){const target=await api<{id:string}>('/categories','POST',{name:c.name});categoryMap.set(c.id,target.id)}
    // Each image is one bounded request. Never delete or rewrite any legacy row.
    for(const a of source.assets){
      const blob=source.blobs.find(b=>b.id===(a.blobId||a.id))?.blob
      if(!blob)throw new Error(`Missing browser image: ${a.name}`)
      const sourceHash=await contentHash(blob)
      if(sourceHash!==a.contentHash)throw new Error(`Browser image checksum mismatch: ${a.name}`)
      const result=await uploadAsset(blob,a.kind==='fillPattern'?'fill-pattern':'stamp',a.name,`${a.id}.${a.mimeType==='image/png'?'png':a.mimeType==='image/jpeg'?'jpg':'webp'}`,categoryMap.get(a.categoryId))
      const check=await api<RemoteAsset>(`/assets/${result.asset.id}`)
      const saved=await(await request(`/assets/${result.asset.id}/content`)).blob()
      if(check.sha256!==sourceHash||await contentHash(saved)!==sourceHash||check.width!==a.naturalWidth||check.height!==a.naturalHeight)throw new Error(`Migration verification failed: ${a.name}`)
      state.mappings[`asset:${a.id}`]=result.asset.id;await checkpoint(`Verified asset ${a.id}`)
    }
    const recovery=new RecoveryRepository(db)
    for(const row of source.projects){
      const prepared=await recovery.read(row.id),bytes=await encodeProject(prepared)
      const fingerprint=await contentHash(new Blob([JSON.stringify(prepared.document)]))
      const key=`${state.profile}:${row.id}:${fingerprint}`
      const target=await(await request('/projects/import',{method:'POST',headers:{'Content-Type':'application/zip','X-Migration-Key':key},body:new Blob([new Uint8Array(bytes)],{type:'application/zip'})})).json() as RemoteProject
      const saved=await decodeProject(new Uint8Array(await(await request(`/projects/${target.id}/export`)).arrayBuffer()), validate)
      const comparable=(d:ProjectFile)=>{
        const key=(id:string)=>{const a=d.assets.find(a=>a.id===id);return a?`${a.hash}:${a.kind}`:id}
        return JSON.stringify({name:d.name,map:{...d.map,background:d.map.background?{...d.map.background,id:key(d.map.background.id)}:null},layers:d.layers,objectGroups:d.objectGroups,layerTree:d.layerTree,objects:d.objects.map(o=>(o.kind === 'path' ? {...o,stroke:o.stroke.kind === 'texture'?{...o.stroke,assetId:key(o.stroke.assetId)}:o.stroke} : o.kind === 'area' ? {...o,fill:o.fill.kind === 'pattern'?{...o.fill,assetId:key(o.fill.assetId)}:o.fill} : {...o,...(o.assetId?{assetId:key(o.assetId)}:{})}))})
      }
      if(comparable(saved.document)!==comparable(prepared.document))throw new Error(`Project model verification failed: ${row.name}`)
      state.mappings[`project:${row.id}`]=target.id;await checkpoint(`Verified project ${row.id} → ${target.id}`)
    }
    state.completed=true;await checkpoint('All copied data verified; local service is primary. Original browser data retained.')
  }catch(e){state.error=e instanceof Error?e.message:'Migration failed.';state.completed=false;await migrationDatabase.state.put(state);progress({...state})}finally{if(!database)db.close()}
  return state
}

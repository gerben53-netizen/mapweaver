import { newMapSnapshot } from './newMap'
import { useProjectStore } from '../store/projectStore'
import type { WorldResult } from '../world/model'
import { openedCampaignMap, mapCreationQuery, useCampaignStore } from '../campaigns/session'
import { useEditorStore } from '../store/editorStore'
import type { MapType } from '../domain/geography'
import { objectAssetIds } from '../domain/areas'
import Dexie from 'dexie'
import type { Table } from 'dexie'
import { lifecyclePausesAutosave, api, ApiError, clientGeneration, assetBlob, request, downloadBlob } from '../storage/api'
import type { RemoteProject } from '../storage/api'
import { currentSnapshot, useProjectSession, applyPrepared, hasUnsavedChanges } from './session'
import { history, useHistoryStore } from '../store/history'
import { gatherProject, downloadName, encodeProject } from './archive'
import { parseProject } from './format'
import { finishObjectGesture, objectGestureActive } from '../canvas/interaction'
import type { PreparedProject, ProjectFile } from './types'

export interface PendingCopy { generation?:string;id:string;revision:number|null;prepared:PreparedProject;updatedAt:string }
class PendingDatabase extends Dexie {
  pending!:Table<PendingCopy,string>
  constructor(){super('mapweaver-unsynced');this.version(1).stores({pending:'id,updatedAt'})}
}
export const pendingDatabase=new PendingDatabase()
export async function preparedDocument(document:ProjectFile):Promise<PreparedProject> {
  const parsed=parseProject(document),assets=new Map()
  for(const manifest of parsed.assets){
    try { assets.set(manifest.id,{manifest,blob:await assetBlob(manifest.id)}) }
    catch(error){
      const users=parsed.objects.filter(o=>objectAssetIds(o).includes(manifest.id))
      const materialOnly=parsed.map.background?.id!==manifest.id&&users.length>0&&users.every(o=>o.kind==='scatter'||o.kind==='path'&&!!o.wall?.material)
      if(!materialOnly||!(error instanceof ApiError)||!['ASSET_UNREADABLE','NOT_FOUND'].includes(error.code))throw error
      // Retain the exact reference/definition for repair; never substitute fake image bytes.
      assets.set(manifest.id,{manifest,blob:new Blob([],{type:manifest.mimeType}),unavailable:true})
    }
  }
  return {document:parsed,assets}
}
async function openedProject(id:string) {
  useCampaignStore.setState({browsing:false})
  useEditorStore.setState({workspace:'editor'})
  try {const result=await api<{campaignId?:string}>(`/projects/${id}/opened`,'POST');if(result.campaignId){await openedCampaignMap(result.campaignId,id)}}
  catch {useProjectSession.setState({warning:'Project opened, but the startup preference could not be saved. Open it again from Projects when storage is available.'})}
}
export async function loadLocalProject(id:string,confirm:()=>boolean) {
  if(hasUnsavedChanges()&&!confirm())return false
  const row=await api<RemoteProject>(`/projects/${id}`),prepared=await preparedDocument(row.document)
  applyPrepared(prepared,()=>true)
  useProjectSession.setState({revision:row.revision,saveStatus:'clean',savedAt:row.modifiedAt,recoveryDirty:false})
  await openedProject(row.id)
  return true
}
export async function createLocalProject(name:string,width:number,height:number,backgroundColor:string,confirm:()=>boolean,mapType:MapType='battlemap',widthKm?:number,themeId='') {
  if(hasUnsavedChanges()&&!confirm())return false
  const now=new Date().toISOString()
  const document=parseProject({formatVersion:12,id:crypto.randomUUID(),name:name.trim(),createdAt:now,modifiedAt:now,...newMapSnapshot(width,height,backgroundColor,mapType,widthKm,themeId),assets:[]})
  const row=await api<RemoteProject>('/projects'+mapCreationQuery(),'POST',document)
  applyPrepared({document:row.document,assets:new Map()},()=>true)
  useProjectSession.setState({revision:row.revision,saveStatus:'clean',savedAt:row.modifiedAt})
  await openedProject(row.id)
  return true
}
export async function createGeneratedWorld(name:string,result:WorldResult) {
  if(hasUnsavedChanges()){await saveLocalProject();if(hasUnsavedChanges())throw Error('Save or resolve the current map before creating a generated world.')}
  if(result.map.mapType!=='world-map'||!result.map.generation)throw Error('Expected a generated world map.')
  const now=new Date().toISOString(),document=parseProject({formatVersion:12,id:crypto.randomUUID(),name:name.trim(),createdAt:now,modifiedAt:now,map:result.map,objects:result.objects,layers:result.layers,layerTree:result.layerTree,objectGroups:[],assets:(result.assets??[]).map(a=>a.manifest)})
  const row=await api<RemoteProject>('/projects'+mapCreationQuery(),'POST',document)
  applyPrepared({document:row.document,assets:new Map((result.assets??[]).map(a=>[a.manifest.id,a]))},()=>true)
  // Creation opens a new project; the initial detail pass is one undoable edit.
  const generated=new Set(result.map.generation.scatter?.placements.map(p=>p.id)??[])
  if(generated.size){const full=useProjectStore.getState();useProjectStore.setState({objects:full.objects.filter(o=>!generated.has(o.id)),layers:full.layers.map(l=>({...l,objectIds:l.objectIds.filter(id=>!generated.has(id))}))});history.run('Generate terrain stamps',()=>useProjectStore.setState({objects:full.objects,layers:full.layers}));history.markClean()}
  useProjectSession.setState({revision:row.revision,saveStatus:'clean',savedAt:row.modifiedAt})
  await openedProject(row.id)
}
let queued=Promise.resolve()
const recoverySession=crypto.randomUUID()
export function saveLocalProject() {
  finishObjectGesture()
  const execute=async()=>{
    const session=useProjectSession.getState()
    if(session.revision===null){useProjectSession.setState({error:'Create or open a local project before saving.',saveStatus:'error'});return}
    if(session.saveStatus==='conflict')return
    const snapshot=currentSnapshot(),signature=JSON.stringify(snapshot),generation=session.generation,pendingKey=`${recoverySession}:${session.info.id}`
    useProjectSession.setState({saveStatus:'saving',error:''})
    try{
      const prepared=await gatherProject(snapshot,session.info)
      // Recovery is distinct from old browser data, and is never labelled permanently saved.
      try{await pendingDatabase.pending.put({generation:await clientGeneration(),id:pendingKey,revision:session.revision,prepared,updatedAt:new Date().toISOString()})}catch{useProjectSession.setState({warning:'Browser recovery buffer unavailable. Keep this window open until the service confirms saving.'})}
      const row=await api<RemoteProject>(`/projects/${session.info.id}`,'PUT',{document:prepared.document,revision:session.revision})
      if(generation!==useProjectSession.getState().generation)return
      const unchanged=JSON.stringify(currentSnapshot())===signature&&!useHistoryStore.getState().busy&&!objectGestureActive()
      useProjectSession.setState({warning:session.warning.startsWith('Wall material')?'':session.warning,revision:row.revision,saveStatus:unchanged?'saved':'dirty',savedAt:row.modifiedAt,info:{...session.info,modifiedAt:row.modifiedAt},recoveryDirty:!unchanged})
      if(unchanged){useProjectStore.setState({map:{...useProjectStore.getState().map,campfireRevision:row.document.map.campfireRevision}});history.markClean();await pendingDatabase.pending.delete(pendingKey).catch(()=>{})}
    }catch(error){if(generation===useProjectSession.getState().generation)useProjectSession.setState({saveStatus:error instanceof ApiError&&error.code==='REVISION_CONFLICT'?'conflict':'error',error:error instanceof Error?error.message:'Save failed.',recoveryDirty:true})}
  }
  queued=queued.then(execute,execute);return queued
}
export function startLocalAutosave(){
  let timer:ReturnType<typeof setTimeout>|undefined,last=JSON.stringify(currentSnapshot()),generation=useProjectSession.getState().generation,pending=false
  const stop=useHistoryStore.subscribe(state=>{
    if(state.busy){clearTimeout(timer);return}
    const session=useProjectSession.getState(),next=JSON.stringify(currentSnapshot())
    if(session.generation!==generation){generation=session.generation;last=next;pending=false;clearTimeout(timer);return}
    if(next===last&&!pending)return;last=next;clearTimeout(timer)
    if(session.saveStatus==='conflict')return
    useProjectSession.setState({saveStatus:'dirty'})
    pending=true
    const attempt=()=>{if(lifecyclePausesAutosave||useHistoryStore.getState().busy||objectGestureActive()){timer=setTimeout(attempt,700);return}pending=false;void saveLocalProject()}
    timer=setTimeout(attempt,700)
  })
  return()=>{stop();clearTimeout(timer)}
}
export async function exportLocalProject(){
  finishObjectGesture()
  const session=useProjectSession.getState(),prepared=await gatherProject(currentSnapshot(),session.info)
  const bytes=await encodeProject(prepared)
  downloadBlob(new Blob([new Uint8Array(bytes)],{type:'application/zip'}),downloadName(session.info.name))
  // A transfer/backup never claims that SQLite has saved these edits.
}
export async function importLocalProject(file:File,confirm:()=>boolean,standalone=false){
  if(hasUnsavedChanges()&&!confirm())return false
  if(!/\.mapweaver$/i.test(file.name)||file.size>128*1024*1024)throw new Error('Choose a .mapweaver file of at most 128 MiB.')
  const row=await(await request('/projects/import'+(standalone?'':mapCreationQuery()),{method:'POST',headers:{'Content-Type':'application/zip'},body:file})).json() as RemoteProject
  return loadLocalProject(row.id,()=>true)
}
export async function saveSeparateCopy(){
  const s=useProjectSession.getState(),prepared=await gatherProject(currentSnapshot(),{...s.info,name:`${s.info.name.slice(0,110)} copy`})
  const row=await api<RemoteProject>('/projects'+mapCreationQuery(),'POST',prepared.document)
  applyPrepared({...prepared,document:row.document},()=>true);useProjectSession.setState({revision:row.revision,saveStatus:'saved',savedAt:row.modifiedAt})
  await openedProject(row.id)
  await pendingDatabase.pending.delete(`${recoverySession}:${s.info.id}`).catch(()=>{})
}
export async function resumePending(copy:PendingCopy){
  if(!applyPrepared(copy.prepared,()=>window.confirm('Replace open changes with the recovery copy?'),true))return
  useProjectSession.setState({revision:copy.revision,saveStatus:'dirty',recoveryDirty:true})
  if(!copy.generation||copy.generation!==await clientGeneration()){useProjectSession.setState({saveStatus:'conflict',error:'Recovery belongs to an older or unknown dataset. Export it or save a separate project.'});return}
  await saveLocalProject()
  if(useProjectSession.getState().saveStatus==='saved')await pendingDatabase.transaction('rw',pendingDatabase.pending,async()=>{
    const current=await pendingDatabase.pending.get(copy.id)
    // Another still-open tab may have refreshed this source buffer during recovery.
    if(current&&current.updatedAt===copy.updatedAt&&JSON.stringify(current.prepared.document)===JSON.stringify(copy.prepared.document))await pendingDatabase.pending.delete(copy.id)
  })
}

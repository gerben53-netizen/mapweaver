import { NewMapWizard } from './NewMapWizard'
import { initialMapDraft } from '../projects/newMap'
import { WorldWizard } from '../world/WorldWizard'
import { createGeneratedWorld } from '../projects/localSession'
import { CampaignPicker } from '../campaigns/CampaignPicker'
import { useCampaignStore, enterCampaign } from '../campaigns/session'
import { initializeProjects } from '../projects/startup'
import { SaveStatus } from './SaveStatus'
import { LibraryHistoryControls } from '../library/LibraryHistoryControls'
import { startLifecycleClient } from '../projects/lifecycleClient'
import { useEffect,useRef,useState } from 'react'
import { HistoryControls } from './HistoryControls'
import { ExportControls } from './ExportControls'
import { Modal } from './Modal'
import { StorageDialog } from './StorageDialog'
import { api,clientGeneration } from '../storage/api'
import { useProjectSession,hasUnsavedChanges,runProjectTask } from '../projects/session'
import { createLocalProject,loadLocalProject,saveLocalProject,exportLocalProject,importLocalProject,startLocalAutosave,saveSeparateCopy,pendingDatabase,resumePending } from '../projects/localSession'
import type { PendingCopy } from '../projects/localSession'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import styles from './ProjectControls.module.css'
const confirmReplace=()=>window.confirm('Replace unsaved changes? Keep a recovery copy or save a separate project first if needed.')
export function ProjectControls(){
  const [storageNotice,setStorageNotice]=useState('')
  const workspace=useEditorStore(s=>s.workspace)
  const clipboard=useEditorStore(s=>s.clipboard)
  const session=useProjectSession(),input=useRef<HTMLInputElement>(null),importStandalone=useRef(false)
  const [view,setView]=useState<'projects'|'new'|'generate'|'storage'|'recovery'|null>(null),[pending,setPending]=useState<PendingCopy[]>([]),[migrationRequired,setMigrationRequired]=useState(true),[checking,setChecking]=useState(true)
  const startup=useRef<ReturnType<typeof initializeProjects>|null>(null)
  const [draft,setDraft]=useState(initialMapDraft)
  const refresh=async()=>{setPending(await pendingDatabase.pending.toArray())}
  const run=(label:string,action:()=>Promise<void>)=>runProjectTask(label,action)
  useEffect(()=>{
    let active=true
    const stop=startLocalAutosave()
    const stopLifecycle=startLifecycleClient()
    startup.current ||= initializeProjects()
    void startup.current.then(async result=>{if(!active)return;setPending(result.pending);setMigrationRequired(result.migrationRequired);setChecking(false);if(result.opened){setView(null);return}if(!result.error&&!result.migrationRequired){try{const {id}=await api<{id:string|null}>('/startup-campaign');if(id){await enterCampaign(id);if(active)setView(null);return}}catch{/* A missing campaign falls back to the chooser. */}}if(active)setView('projects')})

    const heartbeat=setInterval(()=>{void Promise.all([clientGeneration(),fetch('/api/v1/health').then(r=>r.json())]).then(([known,current])=>{if(active)setStorageNotice(current.generation!==known?'Local data was restored. Export unsaved work before reloading.':current.maintenance?'Storage maintenance is active. Keep unsaved work open.':'')}).catch(()=>{})},2000)
    const unload=(e:BeforeUnloadEvent)=>{if(hasUnsavedChanges()){e.preventDefault();e.returnValue=''}}
    window.addEventListener('beforeunload',unload)
    return()=>{active=false;clearInterval(heartbeat);stopLifecycle();stop();window.removeEventListener('beforeunload',unload)}
  },[])
  useEffect(()=>{const show=()=>setView('projects');window.addEventListener('mapweaver:projects',show);return()=>window.removeEventListener('mapweaver:projects',show)},[])
  useEffect(()=>useCampaignStore.subscribe(state=>{if(state.newMap){setView('new');useCampaignStore.setState({newMap:false})}}),[])
  const close=()=>{if(useCampaignStore.getState().snapshot)setView(null);else setView('projects')}
  return <div className={styles.projects}><div className={styles.identity}><strong>{session.revision===null?'No local project open':session.info.name}</strong><SaveStatus saveStatus={session.saveStatus} recoveryDirty={session.recoveryDirty} savedAt={session.savedAt}/></div><div inert={!!session.busy}>{workspace==='editor'?<HistoryControls/>:<LibraryHistoryControls/>}</div>{storageNotice&&<div role="alert">{storageNotice}<button onClick={()=>void exportLocalProject()}>Export unsaved project</button><button onClick={()=>{if(!hasUnsavedChanges()||confirmReplace())window.location.reload()}}>Reload</button></div>}
    <button disabled={checking||!!session.busy} onClick={()=>{setView('projects');void refresh()}}>Projects</button>
    {workspace==='editor'&&<><button title="Save now (Ctrl/Cmd+S). Autosave also saves completed edits." disabled={!!session.busy||session.revision===null||session.saveStatus==='conflict'} onClick={()=>{void saveLocalProject()}}>Save</button>
    <ExportControls/></>}
    <details className={styles.edit}><summary>Project</summary><div className={styles.menu}>
      <button disabled={!!session.busy||migrationRequired} onClick={()=>setView('new')}>New map</button>
      <button disabled={!!session.busy||session.revision===null} onClick={()=>{void run('Exporting project…',exportLocalProject)}}>Export map only</button>
      <button disabled={!!session.busy||migrationRequired} onClick={()=>input.current?.click()}>Import map file</button>
      <button disabled={!!session.busy} onClick={()=>setView('storage')}>Storage</button>
      <button disabled={!!session.busy} onClick={()=>{void run('Loading recovery…',async()=>{await refresh();setView('recovery')})}}>Recovery</button>
      <button disabled={!!session.busy||!clipboard.length} onClick={()=>useProjectStore.getState().paste()}>Paste objects</button>
    </div></details>
    <input ref={input} hidden type="file" accept=".mapweaver" aria-label="Mapweaver project file" onChange={e=>{const file=e.target.files?.[0],standalone=importStandalone.current;importStandalone.current=false;e.target.value='';if(file)void run('Importing project…',async()=>{if(await importLocalProject(file,confirmReplace,standalone)){setView(null);await refresh()}})}}/>
    {(session.busy||session.error||session.warning)&&<div className={styles.notice} role={session.error?'alert':'status'}>{session.busy||session.error||session.warning}{!session.busy&&<button onClick={()=>useProjectSession.setState({error:'',warning:''})}>Dismiss</button>}</div>}
    {session.saveStatus==='conflict'&&<Modal title="Save conflict" busy={!!session.busy} onClose={()=>{}}><p>The saved project changed in another browser. Your local edits have not overwritten it.</p><button onClick={()=>{void run('Exporting unsynced project…',exportLocalProject)}}>Export unsaved project</button><button onClick={()=>{void run('Saving separate copy…',saveSeparateCopy)}}>Save as separate project</button><button onClick={()=>{void run('Reloading saved project…',async()=>{await loadLocalProject(session.info.id,confirmReplace)})}}>Reload saved version</button></Modal>}
    {view==='projects'&&<CampaignPicker onClose={close} onStorage={()=>setView('storage')} onRecovery={()=>{void refresh();setView('recovery')}} onImport={()=>{importStandalone.current=true;input.current?.click()}}/>}
    {view==='generate'&&<WorldWizard initialThemeId={draft.themeId} name={draft.name} width={Number(draft.width)} height={Number(draft.height)} widthKm={Number(draft.widthKm)} busy={!!session.busy} error={session.error} onClose={()=>setView('new')} onApply={result=>run('Creating generated world…',async()=>{await createGeneratedWorld(draft.name,result);setView(null);await refresh()})}/>}
    {view==='new'&&<NewMapWizard draft={draft} setDraft={setDraft} busy={!!session.busy} error={session.error} onClose={close} onCreate={()=>{if(draft.startingPoint==='generate'){setView('generate');return}void run('Creating project…',async()=>{if(await createLocalProject(draft.name,Number(draft.width),Number(draft.height),draft.color,confirmReplace,draft.mapType,Number(draft.widthKm),draft.themeId)){setView(null);await refresh()}})}}/>}
    {view==='storage'&&<StorageDialog onClose={()=>setView('projects')} onMigrated={()=>{setMigrationRequired(false);void refresh()}}/>}
    {view==='recovery'&&<Modal title="Unsynced recovery copies" busy={!!session.busy} onClose={()=>setView('projects')}><p>These browser copies are not permanently saved. Opening one retries its original revision; conflicting edits are never overwritten.</p>{pending.map(copy=><div key={copy.id}><strong>{copy.prepared.document.name}</strong><p>{new Date(copy.updatedAt).toLocaleString()} · base revision {copy.revision}</p><button onClick={()=>{void run('Recovering changes…',async()=>{await resumePending(copy);setView(null)})}}>Recover unsynced changes</button></div>)}{!pending.length&&<p>No unsynced copies.</p>}<button onClick={()=>setView('projects')}>Close</button></Modal>}
  </div>
}

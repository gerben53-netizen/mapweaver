import { useEffect,useState,useRef } from 'react'
import { StorageBackups } from './StorageBackups'
import { RemoteLibrary } from '../storage/remoteLibrary'
import { Modal } from './Modal'
import { api } from '../storage/api'
import { inventory,migrationState,migrateLegacy } from '../storage/migration'
import type { MigrationReport } from '../storage/migration'
import styles from './StorageDialog.module.css'
interface StorageInfo {location:string;canOpenDataFolder:boolean;usedBytes:number;usage:Record<string,number>;lastBackup:{value:string}|null;integrity:{missing:string[];damaged:string[];orphaned:string[];temporary:string[]}}
export function StorageDialog({onClose,onMigrated}:{onClose:()=>void;onMigrated?:()=>void}){
  const [info,setInfo]=useState<StorageInfo|null>(null),[source,setSource]=useState<Awaited<ReturnType<typeof inventory>>|null>(null),[report,setReport]=useState<MigrationReport|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const [conflicts,setConflicts]=useState({assets:0,projects:0})
  const interrupted=useRef(false)
  useEffect(()=>{let active=true;void Promise.all([api<StorageInfo>('/storage'),inventory(),migrationState(),new RemoteLibrary().snapshot(),api<{id:string}[]>('/projects')]).then(([i,s,r,library,projects])=>{if(active){setInfo(i);setSource(s);setReport(r);setConflicts({assets:s.assets.filter(a=>library.assets.some(b=>a.contentHash===b.contentHash&&a.kind===b.kind)).length,projects:s.projects.filter(p=>projects.some(q=>q.id===p.id)).length})}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;interrupted.current=true}},[])
  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <Modal title="Storage" busy={busy} onClose={onClose} wide><p>SQLite and managed image files store your projects on this computer. IndexedDB is only a replaceable cache and an unsynced recovery buffer.</p>{info&&<><p>Data location: <code>{info.location}</code></p>{info.canOpenDataFolder&&<button disabled={busy} onClick={()=>{void run(async()=>{await api('/storage/open-folder','POST')})}}>Open data folder</button>}<dl>{Object.entries(info.usage).map(([name,bytes])=><div key={name}><dt>{name}</dt><dd>{(bytes/1024/1024).toFixed(2)} MiB</dd></div>)}</dl><p>Last verified backup: {info.lastBackup?.value||'None'}</p><StorageBackups/></>}
    <h3>Migrate this browser's previous data</h3>{source&&<p>{source.assets.length} library images, {source.projects.length} recovery projects, {source.backgrounds} backgrounds, {source.blobs.length} shared source blobs;  {(source.bytes/1024/1024).toFixed(2)} MiB including shared recovery copies. {conflicts.assets} existing type/hash matches merge; {conflicts.projects} project-ID conflicts require an explicit mapping; conflicting project IDs receive new IDs listed in the report. Source data is never deleted.</p>}
    <button disabled={busy||!source||!report||!info} onClick={()=>{if(report)void run(async()=>{interrupted.current=false;const result=await migrateLegacy(report,setReport,undefined,()=>interrupted.current);setReport(result);if(result.completed)onMigrated?.()})}}>Copy and verify browser data</button>{busy&&<button onClick={()=>{interrupted.current=true}}>Stop after current item</button>}
    {report&&<><p role="status">{report.completed?'Migration verified. Local service is primary.':`${report.steps.length} verified steps. Safe to retry after interruption.`}</p><textarea className={styles.report} aria-label="Migration report" readOnly rows={6} value={JSON.stringify(report,null,2)}/><button disabled={busy} onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Mapweaver-migration-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}}>Download migration report</button>{report.error&&<p role="alert">{report.error}</p>}</>}
    {error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={onClose}>Close</button></Modal>
}

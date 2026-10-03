import { useRef, useState } from 'react'
import { beginStorageWork, api, request, backUpAllData, waitOperation, downloadResponse } from '../storage/api'
import type { StorageOperation } from '../storage/api'
import { hasUnsavedChanges } from '../projects/session'
export function StorageBackups() {
  const [job,setJob]=useState<StorageOperation|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[integrity,setIntegrity]=useState('')
  const input=useRef<HTMLInputElement>(null),upload=useRef<AbortController|null>(null)
  const run=async(action:()=>Promise<void>)=>{const finish=beginStorageWork();setBusy(true);setMessage('');try{await action()}catch(e){setMessage((e as Error).message)}finally{finish();setBusy(false)}}
  return <section aria-label="Backups and restore"><h3>Storage &amp; backups</h3>
    <p>Save writes the open project to SQLite. Export project transfers one map. A full backup includes every local project and library asset; restore replaces the complete dataset.</p>
    <p>For archives over 4 GiB, choose an NTFS or exFAT destination. The browser cannot check destination filesystem limits in advance.</p>
    <button disabled={busy||job?.state==='ready'} onClick={()=>void run(async()=>{await backUpAllData(setJob);setMessage('Backup validated. If a browser download opened, check that it finishes successfully.')})}>Back up all data</button>
    <button disabled={busy||job?.state==='ready'} onClick={()=>input.current?.click()}>Restore all data</button>
    <input ref={input} hidden style={{display:'none'}} type="file" accept=".zip" aria-label="Full Mapweaver backup" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{
      upload.current=new AbortController();setJob(null);setMessage('Uploading backup for validation. The active dataset is unchanged.')
      const created=await(await request('/restores',{method:'POST',headers:{'Content-Type':'application/x-mapweaver-backup','X-Filename':encodeURIComponent(file.name)},body:file,signal:upload.current.signal})).json() as StorageOperation
      upload.current=null;setJob(created);await waitOperation(created.id,setJob)
    })}}/>
    {job&&<p role="status">{job.progress.phase}: {job.progress.bytes.toLocaleString()} / {job.progress.totalBytes.toLocaleString()} bytes · {job.progress.files} / {job.progress.totalFiles} files · {job.state}</p>}
    {(busy||job?.state==='ready')&&!job?.progress.phase.startsWith('Replacing')&&<button onClick={()=>{if(upload.current){upload.current.abort();upload.current=null}else if(job)void run(async()=>{setJob(await api<StorageOperation>(`/operations/${job.id}/cancel`,'POST'))})}}>Cancel storage operation</button>}
    {job?.state==='ready'&&<div role="alert"><p>Validated backup: {(job.filename||'backup.zip')} · {job.manifest?.createdAt}. Replace all local projects and assets? Current data will be retained as a recovery point. Save or export unsaved work in every open browser first.</p><button className="destructive" onClick={()=>void run(async()=>{
      if(hasUnsavedChanges())throw new Error('Save or export and close your unsaved project before replacing local data.')
      if(!window.confirm(`Replace all local data with ${(job.filename||'backup.zip')} from ${job.manifest?.createdAt}? This replaces every project and asset. The current dataset is retained as a recovery point.`))return
      setJob(await api<StorageOperation>(`/restores/${job.id}/commit`,'POST',{replace:true}));await waitOperation(job.id,setJob);setMessage('Restore complete and validated. Reload to open the restored dataset.')
    })}>Replace all local data</button></div>}
    {job?.kind==='restore'&&job.state==='complete'&&<button onClick={()=>{if(!hasUnsavedChanges()||window.confirm('Discard unsaved local edits and reload restored data?'))window.location.reload()}}>Reload restored data</button>}
    <button disabled={busy} onClick={()=>void run(async()=>{const result=await api('/storage/integrity','POST');setIntegrity(JSON.stringify(result,null,2))})}>Check data integrity</button>
    {integrity&&<pre style={{whiteSpace:'pre-wrap',maxHeight:180,overflow:'auto'}}>{integrity}</pre>}
    <p>Diagnostics include versions, OS/runtime, health, counts, storage sizes and integrity status. They exclude names, paths, maps, images, browser data and the database.</p>
    <button disabled={busy} onClick={()=>void run(()=>downloadResponse('/diagnostics','Mapweaver-diagnostics.zip','POST'))}>Create diagnostics package</button>
    <button disabled={busy} onClick={()=>void run(async()=>{if(window.confirm('Stop Mapweaver? All tabs will disconnect after active work and pending saves finish. Use the tray menu to keep running or review blocked work.')){await api('/stop','POST');setMessage('Mapweaver is stopping. Use the launcher to start again.')}})}>Stop Mapweaver</button>
    <p><a style={{color:'#b1d9cf'}} href="/backup-help.html" target="_blank" rel="noreferrer">Backup, restore and recovery-point guide</a></p>
    {message&&<p role="status">{message}</p>}
  </section>
}

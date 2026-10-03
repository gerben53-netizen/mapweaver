import { materialMapReference } from '../domain/continuousWallMaterial'
import { useProjectStore } from '../store/projectStore'
import { useEffect, useState } from 'react'
import type { RegisteredWallSet, WallSetDefinition } from '../domain/wallSets'
import { materialStyle } from '../domain/wallSets'
import type { WallStyle } from '../domain/walls'
import { api, request } from '../storage/api'
import { libraryRepository } from '../storage/libraryRepository'
import { adoptLibraryAsset } from '../projects/assets'
import { Modal } from './Modal'
import styles from './WallSetPicker.module.css'
interface Preview { definition:WallSetDefinition; preview:string; conflict:string|null }
export function WallSetPicker({value,onChange}:{value:WallStyle;onChange:(value:WallStyle)=>void}) {
  const [open,setOpen]=useState(false),[sets,setSets]=useState<RegisteredWallSet[]>([]),[preview,setPreview]=useState<Preview|null>(null),[bytes,setBytes]=useState<Blob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{if(open)api<RegisteredWallSet[]>('/wall-sets').then(setSets).catch(e=>setError(e.message))},[open])
  const inspect=async(file:Blob)=>{setBusy(true);setError('');setPreview(null);setBytes(null);try{
    if(file.size>32*1024*1024)throw new Error('Wall set ZIP exceeds 32 MiB.')
    const p=await(await request('/wall-sets/preview',{method:'POST',headers:{'Content-Type':'application/zip'},body:file})).json() as Preview
    setPreview(p);setBytes(file)
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const choose=async(set:RegisteredWallSet)=>{
    const asset=await libraryRepository.getAsset(set.assetId);if(!asset)throw new Error('Wall atlas is missing. Reimport the set or restore a backup.')
    const adopted=await adoptLibraryAsset(asset);onChange(materialStyle({...set,assetId:adopted.id},set.definition.continuous?{...value,wall:{...value.wall,...materialMapReference(useProjectStore.getState().map)}}:value));setOpen(false);setPreview(null)
  }
  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <>
    <button type="button" onClick={()=>setOpen(true)}>{value.wall.material?.set.title||'Choose wall set'}</button>
    {open&&<Modal title="Wall materials" busy={busy} onClose={()=>{setOpen(false);setPreview(null);setBytes(null)}} wide>
      <p>Choose a material for this wall. The centerline and thickness stay unchanged.</p>
      <div className={styles.sets}>
        {['masonry','timber','cave-rock'].map((id,i)=><button type="button" disabled={busy} key={id} onClick={()=>void run(async()=>{const existing=sets.find(s=>s.definition.id===id&&s.definition.version==='1.0');if(existing)await choose(existing);else await inspect(await(await fetch(`/wall-sets/${id}.zip`)).blob())})}>
          <img src={`/wall-sets/${id}-preview.png`} alt=""/>{['Masonry','Timber','Cave rock'][i]}
        </button>)}
        {sets.filter(s=>!['masonry','timber','cave-rock'].includes(s.definition.id)).map(s=><button type="button" disabled={busy} key={s.definition.revision} onClick={()=>void run(()=>choose(s))}><img src={`/api/v1/assets/${s.assetId}/preview`} alt=""/>{s.definition.title} · {s.definition.version}</button>)}
      </div>
      <label>Import wall set <input aria-label="Import wall set" type="file" accept=".zip,application/zip" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void inspect(file);e.target.value=''}}/></label>
      {preview&&<section className={styles.preview}>
        <h3>{preview.definition.title} · {preview.definition.version}</h3>
        <img src={preview.preview} alt={`${preview.definition.title} artwork preview`}/>
        <p>{preview.definition.description}</p><p>{preview.definition.renderingMode} · {preview.definition.bodyVariants.length} body variants · {preview.definition.nominalWidthPx} px core</p>
        {preview.conflict&&<p role="status">{preview.conflict}</p>}
        <button type="button" disabled={busy||!!preview.conflict&&preview.conflict!=='Already imported'} onClick={()=>void run(async()=>{const registered=await(await request('/wall-sets/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:bytes})).json() as RegisteredWallSet;await choose(registered)})}>Import and use wall set</button>
        <button type="button" disabled={busy} onClick={()=>{setPreview(null);setBytes(null)}}>Cancel import</button>
      </section>}
      {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Validating wall artwork…</p>}
      <button type="button" disabled={busy} onClick={()=>{setOpen(false);setPreview(null);setBytes(null)}}>Close</button>
    </Modal>}
  </>
}

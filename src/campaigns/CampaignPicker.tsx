import { useEffect, useState } from 'react'
import { api } from '../storage/api'
import type { Campaign, CampaignSnapshot } from './model'
import { enterCampaign, useCampaignStore } from './session'
import { runProjectTask, useProjectSession } from '../projects/session'
import { Modal } from '../app/Modal'
export function CampaignPicker({onClose,onStorage,onRecovery,onImport}:{onClose:()=>void;onStorage:()=>void;onRecovery:()=>void;onImport:()=>void}) {
 const [rows,setRows]=useState<Campaign[]>([]),[trash,setTrash]=useState(false),[loading,setLoading]=useState(true)
 const busy=useProjectSession(s=>s.busy),error=useProjectSession(s=>s.error),active=useCampaignStore(s=>s.snapshot)
 const refresh=async(showTrash=trash)=>{setRows(await api<Campaign[]>(`/campaigns${showTrash?'?trash=true':''}`));setLoading(false)}
 useEffect(()=>{let active=true;api<Campaign[]>('/campaigns').then(rows=>{if(active){setRows(rows);setLoading(false)}},e=>{if(active){useProjectSession.setState({error:e.message});setLoading(false)}});return()=>{active=false}},[])
 const run=(label:string,fn:()=>Promise<void>)=>{void runProjectTask(label,fn)}
 return <Modal title={!loading&&!rows.length&&!trash&&!error?'Create your first campaign':'Projects — Campaigns'} onClose={onClose} busy={!!busy} wide>
  <p>Campaigns organize your maps. Open a campaign, then use its explorer to switch maps.</p>
  {error&&<p role="alert">{error}</p>}
  <button className="primary" data-autofocus onClick={()=>{const name=window.prompt('Campaign name','My campaign');if(name)run('Creating campaign…',async()=>{const result=await api<CampaignSnapshot>('/campaigns','POST',{name});await enterCampaign(result.campaign.id);onClose()})}}>New campaign</button> <button onClick={onImport}>Import map as campaign</button>
  <details><summary>More</summary><button onClick={()=>{setTrash(!trash);run('Loading campaigns…',()=>refresh(!trash))}}>{trash?'Active campaigns':'Campaign Trash'}</button><button onClick={()=>run('Refreshing…',()=>refresh())}>Refresh campaigns</button><button onClick={onStorage}>Storage / full backup</button><button onClick={onRecovery}>Recovery</button></details>
  <p className="muted">Single-map exports do not contain campaign organization. Back up all data in Storage preserves campaigns, folders, maps and favorites together.</p>
  {loading?<p>Loading campaigns…</p>:!rows.length?<p>{trash?'Campaign Trash is empty.':'Create a campaign or import an existing map to get started.'}</p>:rows.map(c=><div key={c.id} style={{padding:'12px 0',borderBottom:'1px solid var(--color-border)'}}><strong>{c.name}</strong> <small>{new Date(c.modifiedAt).toLocaleDateString()}</small> {trash?<button onClick={()=>run('Restoring campaign…',async()=>{await api(`/campaigns/${c.id}/command`,'POST',{op:'restore',revision:c.revision});await refresh()})}>Restore {c.name}</button>:<button className="primary" onClick={()=>run('Opening campaign…',async()=>{await enterCampaign(c.id);onClose()})}>Open campaign {c.name}</button>}</div>)}
  {active&&<button onClick={onClose}>Back to campaign</button>}
 </Modal>
}

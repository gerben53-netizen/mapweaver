import { currentRenderRequest } from '../export/currentRender'
import { assertCurrent } from '../export/renderCache'
import { ArlExportChoice } from './ArlExportChoice'
import type { ArlMode } from '../store/arlStore'
import { useEffect,useState } from 'react'
import { Modal } from './Modal'
import { api } from '../storage/api'
import { currentSnapshot,useProjectSession } from '../projects/session'
import { saveLocalProject } from '../projects/localSession'
import { statusMessage } from '../campfire/publishing'
import type { ConnectionView,PublishReceipt } from '../campfire/publishing'
export function CampfirePublishingDialog({onClose}:{onClose:()=>void}){
 const [arlMode,setArlMode]=useState<ArlMode>('OFF')
 const [connection,setConnection]=useState<ConnectionView|null>(null),[name,setName]=useState('Campfire'),[url,setUrl]=useState(''),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[replacement,setReplacement]=useState(false)
 const mapId=useProjectSession(s=>s.info.id),receipt=connection?.receipts.find(r=>r.mapId===mapId)
 useEffect(()=>{let active=true;api<ConnectionView|null>('/campfire/connection').then(c=>{if(active){setConnection(c);setName(c?.name||'Campfire');setUrl(c?.baseUrl||'');setLoaded(true)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await action()}catch(cause){setError((cause as Error).message);const c=await api<ConnectionView|null>('/campfire/connection').catch(()=>connection);setConnection(c)}finally{setBusy(false)}}
 async function configure(){const c=await api<ConnectionView>('/campfire/connection','PUT',{name,baseUrl:url,...(token?{token}:{})});setConnection(c);setToken('');return c}
 const changed=name!==connection?.name||url!==connection?.baseUrl||!!token
 async function test(){await configure();const d=await api<{message:string;version:number}>('/campfire/test','POST');setMessage(`${d.message} · contract v${d.version}`)}
 async function publish(){
  if(changed)await configure()
  const d=await api<{version:1|2|3;constraints:{image:{minDimension:number;dimension:number;pixels:number}}}>('/campfire/test','POST')
  useProjectSession.setState({busy:'Kaart naar Campfire sturen…'})
  try{
   await saveLocalProject();if(useProjectSession.getState().saveStatus!=='saved')throw Error(useProjectSession.getState().error||'Sla de huidige kaart op en los eventuele conflicten op voordat je publiceert.')
   const request=currentRenderRequest(),snapshot=currentSnapshot(),limits=d.constraints.image
   if(snapshot.map.width<limits.minDimension||snapshot.map.height<limits.minDimension||snapshot.map.width>limits.dimension||snapshot.map.height>limits.dimension||snapshot.map.width*snapshot.map.height>limits.pixels)throw Error('De kaart overschrijdt de geadverteerde afbeeldingslimieten. Pas de kaartafmetingen aan.')
   const {prepareCampfire}=await import('../campfire/package')
   const {payload,image}=await prepareCampfire(snapshot,useProjectSession.getState().info,d.version,arlMode,request),bytes=new Uint8Array(await image.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768))
   assertCurrent(request)
   const r=await api<PublishReceipt>('/campfire/publish','POST',{contract:payload,imageBase64:btoa(binary),replacement});setConnection(c=>c?{...c,receipts:[r,...c.receipts.filter(r=>r.mapId!==mapId)]}:c);setReplacement(false);setMessage(statusMessage(r.status))
  }finally{useProjectSession.setState({busy:''})}
 }
 return <Modal title="Naar Campfire sturen" busy={busy} onClose={onClose}>
  <p>Een Campaign-DM maakt de verbinding in Campfire → Maps → MapWeaver verbindingen. De token bepaalt de campagne; je hoeft geen campagne-ID in te vullen.</p>
  <ArlExportChoice value={arlMode} disabled={busy} onChange={setArlMode}/>
  <label>Naam<input disabled={busy} value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Campfire URL<input disabled={busy} type="url" placeholder="https://campfire.example" value={url} onChange={e=>setUrl(e.target.value)}/></label>
  <label>Integration token<input disabled={busy} type="password" autoComplete="off" value={token} placeholder={connection?.hasToken?'Token actief; leeg laten behoudt hem':'Eenmalige token invoeren'} onChange={e=>setToken(e.target.value)}/></label>
  <p>De token blijft uitsluitend in het lokale servicegeheugen. Voer hem na een herstart opnieuw in. Hij wordt niet opgeslagen in kaarten, backups of exports.</p>
  {connection?.attention&&<p role="alert">De verbinding vereist aandacht. Voer een geldige nieuwe token in.</p>}
  {receipt?.id&&<p role="status">{statusMessage(receipt.status)}<br/>Revision {receipt.revision} · {receipt.timestamp}</p>}
  {receipt&&!receipt.id&&<p>De ontvangst is nog niet bevestigd. Opnieuw sturen gebruikt dezelfde aanvraag voor ongewijzigde inhoud.</p>}
  {receipt&&<label><input type="checkbox" disabled={busy} checked={replacement} onChange={e=>setReplacement(e.target.checked)}/>Nieuwe beoordelingsaanvraag in plaats van dezelfde upload opnieuw proberen</label>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <button disabled={busy||!loaded||!url||(!token&&!connection?.hasToken)} onClick={()=>void run(test)}>Verbinding testen</button>
  <button disabled={busy||!loaded||!url||(!token&&!connection?.hasToken)} onClick={()=>void run(publish)}>Naar Campfire sturen</button>
  <button disabled={busy||!receipt?.id||!connection?.hasToken||changed} onClick={()=>void run(async()=>{const r=await api<PublishReceipt>('/campfire/status/'+encodeURIComponent(mapId));setConnection(c=>c?{...c,receipts:c.receipts.map(old=>old.mapId===mapId?r:old)}:c);setMessage(statusMessage(r.status))})}>Status controleren</button>
  {connection&&<button disabled={busy} onClick={()=>void run(async()=>{await api('/campfire/connection','DELETE');setConnection(null);setToken('');setMessage('Lokale verbinding verwijderd. Trek de token zo nodig ook in Campfire in.')})}>Verbinding verwijderen</button>}
  <button disabled={busy} onClick={onClose}>Sluiten</button>
 </Modal>
}

import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { useProjectStore } from '../store/projectStore'
import { isLandMap } from '../domain/geography'
import { AUTO_LABEL_DEFAULTS, generateAutomaticLabels, type AutoLabelOptions, type AutoLabelResult } from '../domain/automaticLabels'
import { LABEL_CATEGORIES, type LabelCategory } from '../domain/automaticLabelMetadata'
import { currentSnapshot } from '../projects/session'
import type { ProjectSnapshot } from '../store/history'
import { applyAutomaticLabels, automaticLabelSnapshot } from '../store/automaticLabelActions'
import { finishObjectGesture, objectGestureActive } from '../canvas/interaction'
const names:Record<LabelCategory,string>={regions:'Regions',settlements:'Cities & settlements',rivers:'Rivers',water:'Seas & lakes',mountains:'Mountain ranges',landmarks:'Landmarks'}
function LabelDialog({close}:{close:()=>void}){
 const [options,setOptions]=useState<AutoLabelOptions>(AUTO_LABEL_DEFAULTS),[preview,setPreview]=useState<{snapshot:ProjectSnapshot;result:AutoLabelResult;url:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),alive=useRef(true),url=useRef('')
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;URL.revokeObjectURL(url.current)}},[])
 const change=(next:AutoLabelOptions)=>{setOptions(next);setPreview(null);URL.revokeObjectURL(url.current);url.current=''}
 async function calculate(){
  setBusy(true);setError('');setPreview(null)
  try{finishObjectGesture();if(objectGestureActive())throw Error('Finish the current edit before generating labels.');await new Promise(r=>setTimeout(r,0));const snapshot=currentSnapshot(),result=generateAutomaticLabels(snapshot,options),{exportPng}=await import('../export/render');const blob=await exportPng(automaticLabelSnapshot(snapshot,result),{scale:1,transparent:false,includeGrid:false});if(!alive.current)return;URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setPreview({snapshot,result,url:url.current})}catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setBusy(false)}
 }
 return <Modal title="Automatic labels" onClose={close} busy={busy} wide><p>Create or update native labels from existing names. Manual labels and overrides are preserved.</p><fieldset disabled={busy}><legend>Categories</legend><div style={{display:'flex',flexWrap:'wrap',gap:'8px 20px'}}>{LABEL_CATEGORIES.map(c=><label key={c}><input type="checkbox" checked={options.categories.includes(c)} onChange={e=>change({...options,categories:e.target.checked?[...options.categories,c]:options.categories.filter(v=>v!==c)})}/>{names[c]}</label>)}</div><label>Density<select aria-label="Automatic label density" value={options.density} onChange={e=>change({...options,density:e.target.value as AutoLabelOptions['density']})}><option value="low">Low — major names</option><option value="medium">Medium — towns, rivers and landmarks</option><option value="high">High — include minor features</option></select></label></fieldset>
 {preview&&<><p role="status">{preview.result.labels.length-preview.result.suppressed} placed · {preview.result.suppressed} hidden by automatic layout · {preview.result.preserved} existing labels protected · {preview.result.omitted} omitted by density.</p><img src={preview.url} alt="Automatic label preview" style={{display:'block',width:'100%',maxHeight:380,objectFit:'contain'}}/><details><summary>Hidden labels</summary><ul>{preview.result.labels.filter(o=>o.automatic?.suppressed).map(o=><li key={o.id}>{o.text} — no clear position; reveal and place manually from Objects after Apply.</li>)}</ul></details></>}
 {busy&&<p role="status">Laying out labels and rendering preview…</p>}{error&&<p role="alert">{error}</p>}<button data-autofocus disabled={busy||!options.categories.length} onClick={()=>void calculate()}>Preview labels</button><button disabled={busy||!preview} onClick={()=>{try{if(preview)applyAutomaticLabels(preview.snapshot,preview.result);close()}catch(e){setError((e as Error).message)}}}>Apply labels</button><button disabled={busy} onClick={close}>Cancel</button><p>Use this action again to update labels after naming or changing features. No names are invented. Hidden or locked source layers are skipped.</p></Modal>
}
export function AutomaticLabels(){const map=useProjectStore(s=>s.map),[open,setOpen]=useState(false);return isLandMap(map)?<><button onClick={()=>setOpen(true)}>Automatic labels…</button>{open&&<LabelDialog close={()=>setOpen(false)}/>}</>:null}

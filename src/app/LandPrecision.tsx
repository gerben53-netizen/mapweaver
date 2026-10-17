import { useEffect, useState } from 'react'
import type { AreaObject } from '../domain/models'
import { allRings, geometryBounds } from '../domain/areas'
import { contourIndices, precisionSmooth } from '../domain/landPrecision'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { commitLandStroke } from '../store/landBrushActions'
import { Modal } from './Modal'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './LandPrecision.module.css'

/** A bounded authoring session: the parent keys this component to the source geometry. */
export function LandPrecision({object}:{object:AreaObject}) {
  const rings=allRings(object.geometry)
  const [open,setOpen]=useState(false),[ringIndex,setRing]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(Math.min(12,rings[0].length-1)),[protectedPoints,setProtected]=useState<number[]>([]),[amount,setAmount]=useState(35),[pick,setPick]=useState('start'),[error,setError]=useState(''),[preview,setPreview]=useState<AreaObject|null>(null)
  const ring=rings[ringIndex]
  const [focus,setFocus]=useState(true)
  useEffect(()=>()=>{useEditorStore.setState({areaPreview:null})},[])
  function clear(){setPreview(null);useEditorStore.setState({areaPreview:null});setError('')}
  function close(){clear();setOpen(false)}
  let selected:number[]=[]
  try{selected=contourIndices(ring.length,start,end)}catch{/* Incomplete form; Preview reports the error. */}
  const path=(o:AreaObject)=>allRings(o.geometry).map(r=>'M'+r.map(p=>`${p.x},${p.y}`).join('L')+'Z').join(' ')
  const mark=(i:number)=>{clear();if(pick==='start')setStart(i);else if(pick==='end')setEnd(i);else setProtected(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])}
  const bounds=focus&&selected.length>1?geometryBounds({polygons:[{outer:selected.map(i=>ring[i]),holes:[]}]}):object
  const radius=Math.max(bounds.width,bounds.height,1)/100
  return <><button onClick={()=>{finishObjectGesture();setOpen(true)}}>Local contour precision</button>{open&&<Modal title="Local contour precision" wide onClose={close}>
    <p>Select endpoints along the stored ring direction, then Preview. Amber dashed: original; cyan: proposal. Endpoints and their tangents stay fixed.</p>
    <div className={styles.controls}>
    <label>Contour ring<select aria-label="Precision ring" value={ringIndex} onChange={e=>{clear();const i=Number(e.target.value);setRing(i);setStart(0);setEnd(Math.min(12,rings[i].length-1));setProtected([])}}>{rings.map((_,i)=><option value={i} key={i}>Ring {i+1}</option>)}</select></label>
    <label>Start point<input aria-label="Contour start point" type="number" min={0} max={ring.length-1} value={start} onChange={e=>{clear();setStart(Number(e.target.value))}}/></label>
    <label>End point<input aria-label="Contour end point" type="number" min={0} max={ring.length-1} value={end} onChange={e=>{clear();setEnd(Number(e.target.value))}}/></label>
    <button onClick={()=>{clear();setStart(end);setEnd(start)}}>Reverse range</button>
    <label>Click a point to<select aria-label="Contour point action" value={pick} onChange={e=>setPick(e.target.value)}><option value="start">Set start</option><option value="end">Set end</option><option value="protect">Protect / release landmark</option></select></label>
    <label>Smoothing strength<input aria-label="Local smoothing strength" type="number" min={1} max={50} value={amount} onChange={e=>{clear();setAmount(Number(e.target.value))}}/></label>
    <label className={styles.focus}><input type="checkbox" checked={focus} onChange={e=>setFocus(e.target.checked)}/>Focus selected segment</label>
    </div>
    <svg aria-label="Local contour editor" className={styles.preview} viewBox={`${bounds.x-radius*5} ${bounds.y-radius*5} ${Math.max(radius*10,bounds.width+radius*10)} ${Math.max(radius*10,bounds.height+radius*10)}`}>
      <path d={path(object)} fill="#b9b18b" fillRule="evenodd" opacity=".3"/>
      <path d={path(object)} fill="none" stroke="#e5bb75" strokeWidth={radius*.35} strokeDasharray={`${radius} ${radius}`}/>
      <polyline points={selected.map(i=>`${ring[i].x},${ring[i].y}`).join(' ')} fill="none" stroke="#fff2a6" strokeWidth={radius*.6}/>
      {preview&&<path d={path(preview)} fill="none" stroke="#5ce3e6" strokeWidth={radius*.6}/>}
      {ring.map((p,i)=><g key={i} role="button" aria-label={`Contour point ${i}${protectedPoints.includes(i)?' protected':''}`} tabIndex={0} onClick={()=>mark(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mark(i)}}} style={{cursor:'pointer'}}><circle cx={p.x} cy={p.y} r={i===start||i===end||protectedPoints.includes(i)?radius:radius*.6} fill={protectedPoints.includes(i)?'#ff8dcb':i===start?'#7cffb2':i===end?'#ffb76d':'#fff'} stroke="#20333b" strokeWidth={radius*.2}/></g>)}
    </svg>
    <p>Start {start} · End {end} · {selected.length} points · Protected: {protectedPoints.join(', ')||'none'}. Pink landmarks and adjacent tangents stay exact.</p>
    <p>Protection lasts for this unchanged contour session only; it is cleared after Apply, direct geometry edits, undo or reopen. Close this dialog to deliberately move/delete points with Edit points.</p>
    {error&&<p role="alert">{error}</p>}
    <button onClick={()=>{clear();try{const others=useProjectStore.getState().objects.filter((o):o is AreaObject=>o.kind==='area'&&o.land?.role==='landmass');const next=precisionSmooth(object,{ring:ringIndex,start,end,protectedPoints,amount},others);setPreview(next);useEditorStore.setState({areaPreview:next})}catch(e){setError((e as Error).message)}}}>Preview local smoothing</button>
    <button disabled={!preview} onClick={()=>{try{const state=useProjectStore.getState();if(state.objects.find(o=>o.id===object.id)!==object)throw Error('The source changed. Select the contour again.');if(!preview)return;precisionSmooth(object,{ring:ringIndex,start,end,protectedPoints,amount},state.objects.filter((o):o is AreaObject=>o.kind==='area'&&o.land?.role==='landmass'));commitLandStroke(state,{replacements:[preview],added:[],removed:[]},'smooth');close()}catch(e){setError((e as Error).message)}}}>Apply local smoothing</button>
    <button onClick={close}>Cancel</button>
  </Modal>}</>
}

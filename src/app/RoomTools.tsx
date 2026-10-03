import { mapCapabilities } from '../domain/mapCapabilities'
import { useEffect, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { projectObjects } from '../domain/projectView'
import { detectRoomsInWorker } from '../canvas/roomsClient'
import { roomContains } from '../domain/rooms'
import type { RoomDetection } from '../domain/rooms'
import type { AreaGeometry } from '../domain/models'
import { Modal } from './Modal'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './RoomTools.module.css'

const outline=(g:AreaGeometry)=>g.polygons.flatMap(p=>[p.outer,...p.holes]).map(r=>'M'+r.map(p=>`${p.x},${p.y}`).join('L')+'Z').join(' ')
function RoomDialog(){
  const replaceId=useEditorStore(s=>s.roomFloorId),[source]=useState(()=>useProjectStore.getState()),[result,setResult]=useState<RoomDetection|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState<string[]>([]),[confirmed,setConfirmed]=useState(false)
  const current=source.objects.find(o=>o.id===replaceId),close=()=>useEditorStore.setState({roomDialog:false,roomFloorId:null})
  const visible=projectObjects(source,true,useEditorStore.getState().soloLayerId),missingSource=current?.kind==='area'&&current.roomSource?.wallIds.some(id=>!visible.some(o=>o.id===id))
  useEffect(()=>{const abort=new AbortController();let active=true
    const visible=projectObjects(source,true,useEditorStore.getState().soloLayerId)
    if(missingSource)return
    detectRoomsInWorker(visible,abort.signal).then(value=>{if(!active)return;setResult(value);if(current?.kind==='area'&&current.roomSource){const match=value.rooms.find(r=>roomContains(r,current.roomSource!.seed));setSelected(match?[match.id]:[])}},e=>{if(active)setError((e as Error).message)})
    return()=>{active=false;abort.abort()}
  },[source,current,missingSource])
  function apply(){try{const now=useProjectStore.getState();if(now.objects!==source.objects||now.layers!==source.layers)throw new Error('The map changed while the preview was open. Close it and detect rooms again.');if(replaceId&&!confirmed)throw new Error('Confirm replacing manual floor edits.');now.createRoomFloors(result!.rooms.filter(r=>selected.includes(r.id)),replaceId||undefined);close()}catch(e){setError((e as Error).message)}}
  return <Modal title={replaceId?'Regenerate room floor':'Detect rooms'} wide onClose={close}>
    {!result&&!error&&!missingSource&&<p role="status">Detecting bounded wall faces…</p>}
    {result&&<><p>{result.rooms.length} rooms · {result.gaps.length} open endpoints · {result.crossings.length} invalid crossings. Floors follow wall centerlines and are placed behind objects on the active layer.</p>
      <svg className={styles.preview} viewBox={`0 0 ${source.map.width} ${source.map.height}`} aria-label="Room detection preview" role="img">
        {current?.kind==='area'&&<path d={outline(current.geometry)} fill="none" stroke="#f3c06c" strokeWidth="4" strokeDasharray="8 4"/>}
        {result.rooms.map((r,i)=><g key={r.id}><path d={outline(r.geometry)} fill={selected.includes(r.id)?'#81b69d':'#626d72'} fillRule="evenodd" stroke="#e6e9e2" strokeWidth="2"/><text x={r.seed.x+10} y={r.seed.y+24} fontSize="22" fill="#fff">{i+1}</text></g>)}
        {[...result.gaps,...result.crossings].map((p,i)=><g key={i} stroke="#ff6878" strokeWidth="5"><path d={`M${p.x-9},${p.y-9}l18,18m-18,0l18,-18`}/></g>)}
      </svg>
      {result.crossings.length>0&&<p role="alert">Crossings or overlapping walls prevent reliable room detection. Split or reconnect these walls at explicit nodes, then retry.</p>}
      {result.gaps.length>0&&<p>Red crosses mark open endpoints. Closed rooms remain selectable; open contours are not silently repaired.</p>}
      <div className={styles.list}>{result.rooms.map((r,i)=><label key={r.id}><input type={replaceId?'radio':'checkbox'} name="room" checked={selected.includes(r.id)} onChange={e=>setSelected(replaceId?[r.id]:e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/> Room {i+1} · {r.geometry.polygons.reduce((n,p)=>n+p.holes.length,0)} holes {r.overlaps.length>0&&`· overlaps ${r.overlaps.length} existing area(s)`}</label>)}</div>
      {replaceId&&<label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Replace this floor geometry, including all manual area edits. The dashed outline is the current floor.</label>}
    </>}
    {missingSource&&<p role="alert">A source wall is missing or hidden. Restore/show those walls before regenerating.</p>}{error&&<p role="alert">{error}</p>}
    <div className={styles.actions}><button disabled={!result||!selected.length||!!replaceId&&!confirmed} onClick={apply}>{replaceId?'Replace room floor':'Create selected floors'}</button><button data-autofocus onClick={close}>Cancel</button></div>
  </Modal>
}
export function RoomTools(){const open=useEditorStore(s=>s.roomDialog),allowed=mapCapabilities(useProjectStore(s=>s.map.mapType)).rooms;return <>{allowed&&<button onClick={()=>{finishObjectGesture();useEditorStore.setState({roomDialog:true,roomFloorId:null})}}>Detect rooms</button>}{open&&<RoomDialog/>}</>}

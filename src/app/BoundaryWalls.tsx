import { useState } from 'react'
import type { AreaObject } from '../domain/models'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'
import { WallFields } from './WallFields'
export function BoundaryWalls({area}:{area:AreaObject}) {
  const [open,setOpen]=useState(false),[outer,setOuter]=useState(true),[holes,setHoles]=useState(false),[style,setStyle]=useState(useEditorStore.getState().wallStyle),[error,setError]=useState('')
  return <><button type="button" onClick={()=>setOpen(true)}>Create boundary walls</button>{open&&<Modal title="Create boundary walls" onClose={()=>setOpen(false)}>
    <p>Copy the chosen contours once, with the wall centerline on the boundary. The Area remains unchanged. Later Area edits do not move these walls.</p>
    <WallFields value={style} onChange={setStyle} compact/>
    <label><input type="checkbox" checked={outer} onChange={e=>setOuter(e.target.checked)}/>Outer contours</label>
    <label><input type="checkbox" checked={holes} onChange={e=>setHoles(e.target.checked)}/>Include holes</label>
    {error&&<p role="alert">{error}</p>}
    <button type="button" onClick={()=>{try{useProjectStore.getState().createBoundaryWalls(area.id,style,outer,holes);setOpen(false)}catch(e){setError((e as Error).message)}}}>Create walls</button>
    <button type="button" onClick={()=>setOpen(false)}>Cancel</button>
  </Modal>}</>
}

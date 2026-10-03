import { canCreateWithTool } from '../domain/mapCapabilities'
import { useState } from 'react'
import type { PathObject } from '../domain/models'
import { convertRoute } from '../domain/routes'
import type { RouteKind } from '../domain/routes'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { Modal } from './Modal'
import { RoutePreview } from './RoutePreview'
export function RouteConversion({object}:{object:PathObject}){
  const [kind,setKind]=useState<RouteKind|'generic'>('river'),[preview,setPreview]=useState<PathObject|null>(null)
  const allowed=canCreateWithTool(useProjectStore(s=>s.map.mapType),'route')
  if(object.pathKind==='wall'||!allowed)return null
  return <details><summary>Convert path type</summary><label>Target type<select aria-label="Convert path type" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>{['generic','river','road','border'].map(v=><option key={v}>{v}</option>)}</select></label><button disabled={kind===object.pathKind} onClick={()=>{try{setPreview(convertRoute(object,kind))}catch(e){useEditorStore.setState({message:(e as Error).message})}}}>Preview conversion</button>{preview&&<Modal title="Path conversion preview" onClose={()=>setPreview(null)}><RoutePreview path={preview}/><p>{object.pathKind} → {preview.pathKind}. Keeps nodes, name, layer and order. {kind==='generic'?'Keeps the current base stroke.':'Replaces appearance with concrete defaults.'} Removes the previous width profile, units, outlines, markings and texture settings. {object.closed&&kind==='river'?'The closing segment will be removed.':''} One undo step; no live connection is created.</p><button onClick={()=>{try{if(useProjectStore.getState().objects.find(o=>o.id===object.id)!==object)throw Error('Object changed. Preview again.');history.run('Convert path type',()=>useProjectStore.getState().updatePath(preview));setPreview(null)}catch(e){useEditorStore.setState({message:(e as Error).message})}}}>Apply conversion</button><button onClick={()=>setPreview(null)}>Cancel</button></Modal>}</details>
}

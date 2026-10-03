import { useState } from 'react'
import { finishPreset } from '../domain/geographyFinish'
import type { GeographyFinish } from '../domain/geographyFinish'
import type { MapDocument } from '../domain/models'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
export function GeographyFinishSettings({map}:{map:MapDocument}) {
  const [draft,set]=useState(map.geographyFinish??finishPreset(map.theme?.id)),[error,setError]=useState('')
  function apply(value:GeographyFinish|undefined){try{finishObjectGesture();useProjectStore.getState().applyMapSettings({...useProjectStore.getState().map,geographyFinish:value},()=>true);setError('')}catch(e){setError((e as Error).message)}}
  return <details><summary>Geography & terrain finish</summary><p>Relief and coast depth follow visible land and terrain. Geometry and manual paint are preserved. Apply is one undo step.</p>
    <label><input type="checkbox" checked={draft.relief.enabled} onChange={e=>set({...draft,relief:{...draft.relief,enabled:e.target.checked}})}/>Relief enabled</label>
    {([['Relief strength','strength',0,1],['Light direction (degrees clockwise from north)','light',0,360],['Relief softness','softness',0,1],['Relief contrast','contrast',.25,2]] as const).map(([label,key,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} step="any" value={Number.isNaN(draft.relief[key])?'':draft.relief[key]} onChange={e=>set({...draft,relief:{...draft.relief,[key]:e.target.valueAsNumber}})}/></label>)}
    <label>Material transitions<select value={draft.transitions} onChange={e=>set({...draft,transitions:e.target.value as GeographyFinish['transitions']})}><option value="off">Original feathering</option><option value="natural">Natural material edges</option><option value="wash">Restrained wash</option></select></label>
    <label>Coast falloff<select value={draft.coast} onChange={e=>set({...draft,coast:e.target.value as GeographyFinish['coast']})}><option value="off">Original coast</option><option value="natural">Natural shelf & shore</option><option value="ink">Ink-wash coast</option></select></label>
    <label>Ocean depth<select value={draft.ocean} onChange={e=>set({...draft,ocean:e.target.value as GeographyFinish['ocean']})}><option value="off">Original water</option><option value="shelf">Subtle shelf</option><option value="deep">Shelf, mid-depth & deep ocean</option></select></label>
    <button onClick={()=>set(finishPreset(map.theme?.id))}>Use theme finish defaults</button><button onClick={()=>apply(draft)}>Apply geography finish</button>
    {map.geographyFinish&&<button onClick={()=>apply(undefined)}>Remove geography finish</button>}{error&&<p role="alert">{error}</p>}
  </details>
}

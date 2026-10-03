import { useState } from 'react'
import type { MapDocument } from '../domain/models'
import { WATER_STYLES, waterAppearance } from '../domain/terrainStyles'
import type { WaterStyleId } from '../domain/terrainStyles'
import { useProjectStore } from '../store/projectStore'
export function WaterAppearanceSettings({map}:{map:MapDocument}) {
  const [value,set] = useState(map.water ?? waterAppearance('calm')), [error,setError] = useState('')
  function apply(enabled:boolean) {
    try { useProjectStore.getState().applyMapSettings({...useProjectStore.getState().map,water:enabled?value:undefined},()=>true);setError('') }
    catch(e) {setError((e as Error).message)}
  }
  return <fieldset><legend>Water appearance</legend>
    <p>Map-bound water under your artwork. Transparent export omits it.</p>
    <label>Water style<select aria-label="Water style" value={value.style} onChange={e=>set(waterAppearance(e.target.value as WaterStyleId))}>{Object.entries(WATER_STYLES).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select></label>
    {([['Water texture scale','patternScale',.01,100],['Water texture opacity','textureOpacity',0,1],['Water edge darkening','vignette',0,.7]] as const).map(([label,key,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} step="any" value={Number.isNaN(value[key])?'':value[key]} onChange={e=>set({...value,[key]:e.target.valueAsNumber})}/></label>)}
    <button onClick={()=>apply(true)}>Apply water appearance</button>
    {map.water&&<button onClick={()=>apply(false)}>Use plain map color</button>}
    {error&&<p role="alert">{error}</p>}
  </fieldset>
}

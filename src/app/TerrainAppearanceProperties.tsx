import { useState } from 'react'
import type { AreaObject } from '../domain/models'
import { defaultLandArea } from '../domain/landAreas'
import { COAST_STYLES, TERRAIN_STYLES, terrainAppearance, validateTerrainAppearance } from '../domain/terrainStyles'
import type { TerrainStyleId, CoastStyleId } from '../domain/terrainStyles'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'
import styles from './Geography.module.css'
export function TerrainAppearanceProperties({object}:{object:AreaObject}) {
  const [value,set] = useState(object.land?.appearance ?? terrainAppearance('land',useProjectStore.getState().map.width))
  const [error,setError] = useState('')
  function apply(enabled: boolean) {
    try {
      const land = {...(object.land ?? defaultLandArea()),appearance: enabled ? validateTerrainAppearance(value) : undefined}
      history.run('Change terrain appearance',()=>useProjectStore.getState().updateArea({...object,land}))
      setError('')
    } catch(e) { setError((e as Error).message) }
  }
  const number = (label:string,key:'patternScale'|'textureOpacity'|'feather'|'blend'|'coastScale',min:number,max:number) => <label>{label}<input type="number" step="any" min={min} max={max} value={Number.isNaN(value[key])?'':value[key]} onChange={e=>set({...value,[key]:e.target.valueAsNumber})}/></label>
  return <details className={styles.controls}><summary>Terrain appearance</summary>
    <p>Visual terrain preset only; biome classification stays unchanged. Original geometry and fill remain editable. Custom Fill Patterns draw over the built-in ground.</p>
    <label>Terrain style<select aria-label="Terrain style" value={value.style} onChange={e=>set({...value,color:undefined,style:e.target.value as TerrainStyleId})}>{Object.entries(TERRAIN_STYLES).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select></label>
    <label>Terrain color<input type="color" value={value.color??TERRAIN_STYLES[value.style].color} onChange={e=>set({...value,color:e.target.value})}/></label>
    {number('Terrain texture scale','patternScale',.01,100)}{number('Terrain texture opacity','textureOpacity',0,1)}
    {number('Feather width (map px)','feather',0,100)}{number('Edge blend strength','blend',0,1)}
    {object.land?.role==='landmass'&&<><label>Coast style<select aria-label="Coast style" value={value.coast} onChange={e=>set({...value,coast:e.target.value as CoastStyleId})}>{Object.entries(COAST_STYLES).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select></label>{number('Coast size','coastScale',.1,10)}</>}
    <button onClick={()=>apply(true)}>Apply terrain appearance</button>
    {object.land?.appearance&&<button onClick={()=>apply(false)}>Use original fill and stroke</button>}
    {error&&<p role="alert">{error}</p>}
  </details>
}

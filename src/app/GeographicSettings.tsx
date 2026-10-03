import styles from './Geography.module.css'
import { useEditorStore } from '../store/editorStore'
import { useState } from 'react'
import type { MapDocument } from '../domain/models'
import type { MapType,DistanceUnit } from '../domain/geography'
import { mapWorkspace,mapTypeName,unitKm,validateGeography,localExtent } from '../domain/geography'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { Modal } from './Modal'
export function GeographicSettings({map}:{map:MapDocument}) {
  const initial=mapWorkspace(map),[type,setType]=useState(initial.mapType),[g,setG]=useState(initial.geography),[preview,setPreview]=useState(false),[error,setError]=useState('')
  let extent={maxXKm:0,maxYKm:0};try{extent=localExtent({...map,geography:g})}catch{/* Invalid drafts are reported on preview. */}
  const land=type!=='battlemap'
  return <details className={styles.controls} open={map.mapType!==undefined&&map.mapType!=='battlemap'}><summary>{mapTypeName(map.mapType)} · workspace</summary><form onSubmit={e=>{e.preventDefault();try{validateGeography(g);setPreview(true);setError('')}catch(e){setError((e as Error).message)}}}>
    <label>Map type<select aria-label="Map type" value={type} onChange={e=>setType(e.target.value as MapType)}><option value="battlemap">Battlemap</option><option value="regional-map">Regional map</option><option value="world-map">World map</option></select></label>
    {land&&<><p>A flat creative canvas. Distances are planar; no latitude, longitude or Earth projection.</p>
      <label>Map width in distance<input type="number" step="any" min="0" value={g.widthKm/unitKm(g.unit)} onChange={e=>setG({...g,widthKm:Number(e.target.value)*unitKm(g.unit)})}/></label>
      <label>Distance unit<select aria-label="Distance unit" value={g.unit} onChange={e=>setG({...g,unit:e.target.value as DistanceUnit})}><option>km</option><option>mi</option></select></label>
      <label>North orientation (degrees)<input type="number" step="any" value={g.northDegrees} onChange={e=>setG({...g,northDegrees:Number(e.target.value)})}/></label>
      <label>Projection annotation<select aria-label="Projection annotation" value={g.projection} onChange={e=>setG({...g,projection:e.target.value as typeof g.projection})}><option value="none">None</option><option value="abstract">Abstract</option></select></label>
      <label><input type="checkbox" checked={g.origin!==null} onChange={e=>setG({...g,origin:e.target.checked?{xKm:0,yKm:0}:null})}/>Local fictional extent</label>
      {g.origin&&<>{(['xKm','yKm'] as const).map(key=><label key={key}>Origin {key}<input type="number" step="any" value={g.origin![key]} onChange={e=>setG({...g,origin:{...g.origin!,[key]:Number(e.target.value)}})}/></label>)}<p>Extent to {extent.maxXKm.toPrecision(5)}, {extent.maxYKm.toPrecision(5)} km. Axes follow the canvas; north is an annotation.</p></>}
      {(['ruler','scaleBar','exportScaleBar','graticule'] as const).map((key,i)=><label key={key}><input type="checkbox" checked={g[key]} onChange={e=>setG({...g,[key]:e.target.checked})}/>{['Ruler readout','Editor scale bar','Export scale bar by default','Local coordinate grid'][i]}</label>)}
    </>}
    {error&&<p role="alert">{error}</p>}<button type="submit">Preview workspace change</button>
  </form>{map.generation&&<details><summary>Generation source</summary><label>Generation seed<input readOnly value={map.generation.parameters.seed}/></label><p>World generator version {map.generation.generatorVersion}. The original seed and settings remain saved after manual edits. To generate again, create a new world map; this version never replaces existing content.</p><dl>{[['Continents',map.generation.parameters.continents],['Water level',`${Math.round(map.generation.parameters.water*100)}%`],['Land roughness',`${Math.round(map.generation.parameters.roughness*100)}%`],['Mountains',`${Math.round(map.generation.parameters.mountains*100)}%`],['Forests',`${Math.round(map.generation.parameters.forests*100)}%`],['Rivers',map.generation.parameters.rivers],['Islands',`${Math.round(map.generation.parameters.islands*100)}%`],['Climate',map.generation.parameters.climate],['Original canvas',`${map.generation.parameters.width} × ${map.generation.parameters.height} px`],['World width',`${map.generation.parameters.widthKm} km`]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}{preview&&<Modal title="Preview workspace change" onClose={()=>setPreview(false)}><p>{mapTypeName(initial.mapType)} → {mapTypeName(type)}</p><p>Map width: {initial.geography.widthKm} → {g.widthKm} km. Canvas: {map.width} × {map.height} px. Existing objects, layers, colors and positions stay unchanged. Future world-sized assets and distance readings use the new scale. Battlemap grid settings are retained; geographic maps use their local coordinate grid.</p><p>Tools become contextual. This is one undoable change.</p><button onClick={()=>{finishObjectGesture();useProjectStore.getState().applyMapSettings({...map,mapType:type,geography:g},()=>true);useEditorStore.setState({activeTool:'select',areaRole:'area'});setPreview(false)}}>Apply workspace change</button><button onClick={()=>setPreview(false)}>Cancel</button></Modal>}</details>
}

import { CoastalContourControls } from './CoastalContourControls'
import { BrushNumber } from './TerrainBrushTools'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { commitWaterDepth, useWaterDepthStore } from '../store/waterDepthStore'
import { waterDepthPreset, type WaterDepth, type WaterDepthBrush } from '../domain/waterDepth'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './TerrainBrushTools.module.css'
export function WaterDepthTools(){
 const tool=useEditorStore(s=>s.activeTool),map=useProjectStore(s=>s.map),brush=useWaterDepthStore(s=>s.settings)
 if(tool!=='waterDepth')return null
 const value=map.waterDepth
 const change=(patch:Partial<WaterDepth>)=>{finishObjectGesture();try{commitWaterDepth({...value||waterDepthPreset(map.water?.style),...patch},value)}catch(e){useEditorStore.setState({message:(e as Error).message})}}
 const settings=(patch:Partial<WaterDepthBrush>)=>{finishObjectGesture();useWaterDepthStore.setState({settings:{...brush,...patch}})}
 return <div className={styles.tools} aria-label="Water Depth controls">
  <strong>Water Depth</strong>
  <CoastalContourControls/>
  <label className={styles.inlineCheck}><input type="checkbox" checked={!!value?.enabled} onChange={e=>change({enabled:e.target.checked})}/>Use automatic depth</label>
  <label>Depth mode<select aria-label="Depth mode" value={brush.mode} onChange={e=>settings({mode:e.target.value as WaterDepthBrush['mode']})}><option value="shallow">Paint Shallow</option><option value="deep">Paint Deep</option><option value="erase">Erase / Reset to automatic</option><option value="blend">Blend / Soften</option></select></label>
  {(['size','softness','strength'] as const).map(key=><label key={key}>{key==='size'?'Brush size':'softness'===key?'Softness':'Strength'}<input aria-label={'Water '+key} type="range" min={key==='size'?8:0} max={key==='size'?512:1} step={key==='size'?1:.01} value={brush[key]} onChange={e=>settings({[key]:Number(e.target.value)})}/><output>{key==='size'?brush[key]+' px':Math.round(brush[key]*100)+'%'}</output></label>)}
  <details><summary>Water appearance</summary><div className={styles.materialPanel}>
   {value&&value.model!=='bathymetry'&&<p>Legacy water appearance. Apply the current water style to use refined bathymetry while keeping your painted depth.</p>}
   <p>Depth follows visible coasts, islands and inland water. Brush strokes refine it without changing geography.</p>
   {(['shallow','mid','deep'] as const).map(key=><label key={key}>{key==='mid'?'Medium depth':key==='shallow'?'Shallow water':'Deep water'}<input aria-label={'Water '+key+' color'} type="color" value={(value||waterDepthPreset(map.water?.style))[key]} onChange={e=>change({[key]:e.target.value})}/></label>)}
   <label>Coastal shelf (map px)<BrushNumber label="Coastal shelf (map px)" min={8} max={2000} value={value?.shelf??140} change={raw=>{const n=Number(raw);if(raw!==''&&Number.isFinite(n)&&n>=8&&n<=2000)change({shelf:n})}}/></label>
   {(['softness','texture','mouths'] as const).map(key=><label key={key}>{key==='softness'?'Depth blend softness':key==='texture'?'Water texture':'River mouth blending'}<input aria-label={'Depth '+key} type="range" min={0} max={key==='texture'?.3:1} step={.01} value={(value||waterDepthPreset(map.water?.style))[key]} onChange={e=>change({[key]:Number(e.target.value)})}/></label>)}
   {value?.model==='bathymetry'&&<label className={styles.inlineCheck}><input type="checkbox" checked={!!value.coastEdge} onChange={e=>change({coastEdge:e.target.checked})}/>Thin shoreline edge</label>}
   <button onClick={()=>change({...waterDepthPreset(map.water?.style),paint:value?.paint})}>Apply current water style</button>
  </div></details>
  <button disabled={!value?.paint||!Object.keys(value.paint.tiles).length} onClick={()=>change({paint:undefined})}>Reset painted depth</button>
  <button onClick={()=>{finishObjectGesture();useEditorStore.setState({activeTool:'select'})}}>Done</button>
  {!value?.enabled&&<small>Enable automatic depth to preview and paint. Disabling preserves your strokes.</small>}
 </div>
}

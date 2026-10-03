import styles from './TerrainBrushTools.module.css'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'
import { finishObjectGesture } from '../canvas/interaction'
import { CONTOUR_PRESETS, contourPreset, validateCoastalContours, type CoastalContours } from '../domain/coastalContours'
import { BrushNumber } from './TerrainBrushTools'
export function CoastalContourControls(){
 const map=useProjectStore(s=>s.map),value=map.coastalContours??{...contourPreset(map.theme?.id,Math.max(map.width,map.height)),enabled:false}
 const change=(patch:Partial<CoastalContours>)=>{finishObjectGesture();const next=validateCoastalContours({...value,...patch});history.run('Change coastal contours',()=>useProjectStore.setState(s=>({map:{...s.map,coastalContours:next}})))}
 return <details><summary>Coastal contours</summary><div className={styles.materialPanel}>
 <label className={styles.inlineCheck}><input type="checkbox" checked={value.enabled} onChange={e=>change({enabled:e.target.checked})}/>Enable coastal contours</label>
 <label>Contour preset<select aria-label="Contour preset" value={value.preset} onChange={e=>change(contourPreset(e.target.value,Math.max(map.width,map.height)))}>{Object.entries(CONTOUR_PRESETS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 <label>Contour lines<select aria-label="Contour lines" value={value.count} onChange={e=>change({count:Number(e.target.value)})}>{[0,1,2,3].map(n=><option key={n} value={n}>{n||'Off'}</option>)}</select></label>
 <label>Contour spacing<select aria-label="Contour spacing" value={[.65,1,1.5].find(f=>Math.abs(value.spacing-contourPreset(value.preset,Math.max(map.width,map.height)).spacing*f)<.01)??'custom'} onChange={e=>change({spacing:contourPreset(value.preset,Math.max(map.width,map.height)).spacing*Number(e.target.value)})}><option value={.65}>Close</option><option value={1}>Medium</option><option value={1.5}>Wide</option><option value="custom" disabled>Custom</option></select></label>
 <label>Contour opacity {Math.round(value.opacity*100)}%<input aria-label="Contour opacity" type="range" min="0" max="1" step=".01" value={value.opacity} onChange={e=>change({opacity:Number(e.target.value)})}/></label>
 <label>Contour variation<select aria-label="Contour variation" value={value.variation} onChange={e=>change({variation:Number(e.target.value)})}><option value={0}>None</option><option value={.08}>Very low</option><option value={.12}>Low</option><option value={.25}>Moderate</option></select></label>
 <details><summary>Advanced contour settings</summary>{(['spacing','width','falloff'] as const).map(key=><label key={key}>{key==='spacing'?'Spacing (map px)':key==='width'?'Line width (map px)':'Opacity falloff'}<BrushNumber label={'Contour '+key+(key==='falloff'?'':' (map px)')} value={value[key]} min={key==='spacing'?2:key==='width'?.25:0} max={key==='spacing'?500:key==='width'?8:.8} change={raw=>{const n=Number(raw),min=key==='spacing'?2:key==='width'?.25:0,max=key==='spacing'?500:key==='width'?8:.8;if(raw!==''&&Number.isFinite(n)&&n>=min&&n<=max)change({[key]:n})}}/></label>)}<label>Contour color<input type="color" value={value.color} onChange={e=>change({color:e.target.value})}/></label><label className={styles.inlineCheck}><input type="checkbox" checked={value.lakes} onChange={e=>change({lakes:e.target.checked})}/>Include lakes</label></details>
 <small>Map-space lines follow visible coasts. Small islands and narrow water automatically show fewer lines. Independent of Water Depth.</small>
 </div></details>
}

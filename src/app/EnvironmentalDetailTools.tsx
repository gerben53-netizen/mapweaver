import { DETAIL_PRESETS, emptyEnvironmentalDetail, type DetailBrush } from '../domain/environmentalDetail'
import { commitEnvironmentalDetail, updateDetailBrush, useEnvironmentalDetailStore } from '../store/environmentalDetailStore'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { finishObjectGesture } from '../canvas/interaction'
import { metersPerPixel } from '../domain/mapScale'
import { BrushNumber } from './TerrainBrushTools'
import styles from './TerrainBrushTools.module.css'
import { PRODUCTION_DETAIL_PRESETS, productionDetailPreset } from '../domain/environmentalProduction'
export function EnvironmentalDetailTools(){const tool=useEditorStore(s=>s.activeTool),brush=useEnvironmentalDetailStore(s=>s.settings),map=useProjectStore(s=>s.map);if(tool!=='environmentalDetail')return null
 const feet=metersPerPixel(map),factor=feet===null?1:feet/.3048,unit=feet===null?'map px':'ft',pixelsPerFoot=feet===null?10:1/factor,data=map.environmentalDetail||emptyEnvironmentalDetail()
 const update=(patch:Partial<DetailBrush>)=>{finishObjectGesture();updateDetailBrush(patch)}
 const choose=(id:string)=>{const p=productionDetailPreset(id)!,nominal=p.components[0].widthFt*pixelsPerFoot;update({mode:p.mode,presetId:id,opacity:p.opacity,sizeMin:nominal*.5,sizeMax:nominal*1.5})}
 const production=productionDetailPreset(brush.presetId),nominal=production?production.components[0].widthFt*pixelsPerFoot:null
 const number=(label:string,key:'radius'|'density'|'sizeMin'|'sizeMax'|'rotation'|'opacity'|'softness',min:number,max:number,scale=1)=><label>{label}<BrushNumber label={label} value={Number((brush[key]*scale).toFixed(3))} min={min*scale} max={max*scale} change={raw=>{const n=Number(raw)/scale;if(raw.trim()&&Number.isFinite(n)&&n>=min&&n<=max)update({[key]:n})}}/></label>
 const layer=(patch:Partial<typeof data>)=>{finishObjectGesture();try{commitEnvironmentalDetail({...data,...patch},map.environmentalDetail,'Change environmental detail layer')}catch(e){useEditorStore.setState({message:(e as Error).message})}}
 return <div className={styles.tools} aria-label="Environmental Detail controls"><strong>Environmental Detail</strong>
 <label>Detail mode<select aria-label="Environmental mode" value={brush.mode} onChange={e=>{const mode=e.target.value as DetailBrush['mode'];choose(PRODUCTION_DETAIL_PRESETS.find(p=>p.mode===mode)!.id)}}><option value="surface">Surface</option><option value="decals">Decals</option></select></label>
 <label>Preset<select aria-label="Environmental preset" value={brush.presetId} onChange={e=>choose(e.target.value)}>{!production&&<option value={brush.presetId}>{DETAIL_PRESETS.find(p=>p.id===brush.presetId)?.name} · DEV (legacy)</option>}{PRODUCTION_DETAIL_PRESETS.filter(p=>p.mode===brush.mode).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label>Action<select aria-label="Environmental action" value={brush.action} onChange={e=>update({action:e.target.value as DetailBrush['action']})}><option value="paint">Paint</option><option value="erase">Erase</option></select></label>
 {number(`Radius (${unit})`,'radius',2,256,factor)}
 {number('Opacity (%)','opacity',0,1,100)}
 {brush.mode==='surface'?number('Softness (%)','softness',0,1,100):<>
 {number('Density / 100 ft² at 10 px/ft','density',1,200)}{number(`Minimum size (${unit})`,'sizeMin',nominal===null?.5:nominal*.5,brush.sizeMax,factor)}{number(`Maximum size (${unit})`,'sizeMax',brush.sizeMin,nominal===null?100:nominal*2,factor)}{number('Rotation variation (°)','rotation',0,180)}
 <label><input type="checkbox" checked={brush.variation} onChange={e=>update({variation:e.target.checked})}/>Visual variation</label>
 </>}
 <label>Edge bias<select aria-label="Environmental edge bias" value={brush.edgeBias} onChange={e=>update({edgeBias:e.target.value as DetailBrush['edgeBias']})}><option value="off">Off</option><option value="walls">Prefer walls</option></select></label>
 <button onClick={()=>layer({visible:!data.visible})}>{data.visible?'Hide':'Show'} detail</button><button onClick={()=>layer({locked:!data.locked})}>{data.locked?'Unlock':'Lock'} detail</button>
 <button onClick={()=>{finishObjectGesture();useEditorStore.setState({activeTool:'select'})}}>Done</button>
 <small>Production artwork · Erase affects only the selected detail mode · Multiply accumulates: start with low opacity</small>
 </div>
}

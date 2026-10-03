import { useTextureBrushStore } from '../store/textureBrushStore'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { changeTexturePaint } from '../store/terrainPaintActions'
import { finishObjectGesture } from '../canvas/interaction'
import { textureBrushUnits } from '../domain/textureBrush'
import type { TerrainBrush } from '../domain/terrainBrush'
import { BrushNumber } from './TerrainBrushTools'
import styles from './TerrainBrushTools.module.css'
export function TextureBrushTools(){
 const tool=useEditorStore(s=>s.activeTool),brush=useTextureBrushStore(s=>s.settings),name=useTextureBrushStore(s=>s.materialName),map=useProjectStore(s=>s.map)
 if(tool!=='textureBrush')return null
 const units=textureBrushUnits(map),paint=map.texturePaint
 const update=(patch:Partial<TerrainBrush>)=>{finishObjectGesture();useTextureBrushStore.setState({settings:{...brush,...patch}})}
 const number=(label:string,key:'size'|'softness'|'strength'|'textureScale',value:number,min:number,max:number,factor=1)=><label>{label}<BrushNumber label={label} value={Number(value.toFixed(3))} min={min} max={max} change={raw=>{const n=Number(raw);if(raw.trim()&&Number.isFinite(n)&&n>=min&&n<=max)update({[key]:n*factor})}}/></label>
 return <div className={styles.tools} aria-label="Texture Brush controls"><strong>Texture Brush</strong>
 <label>Mode<select aria-label="Texture brush mode" value={brush.mode} onChange={e=>update({mode:e.target.value as TerrainBrush['mode']})}>{['paint','erase','blend'].map(mode=><option key={mode} value={mode}>{mode[0].toUpperCase()+mode.slice(1)}</option>)}</select></label>
 <label>Material<button onClick={()=>{finishObjectGesture();useEditorStore.setState({picker:{kind:'fillPattern',purpose:'textureBrush'}})}} title="Browse Battlemap materials">{name} · Browse</button></label>
 {number(`Size (${units.unit})`,'size',brush.size*units.value,8*units.value,512*units.value,1/units.value)}
 {number('Softness (%)','softness',brush.softness*100,0,100,.01)}{number('Strength (%)','strength',brush.strength*100,0,100,.01)}{number('Texture scale','textureScale',brush.textureScale,.01,100)}
 <button onClick={()=>{finishObjectGesture();useEditorStore.setState({activeTool:'select'})}}>Done</button>
 {(paint?.locked||paint?.visible===false)&&<small>Show and unlock Texture paint in Layers to paint.</small>}
 {!brush.assetId&&brush.mode==='paint'&&<small>Browse to choose an existing floor material.</small>}
 </div>
}
export function TexturePaintLayerControls(){
 const paint=useProjectStore(s=>s.map.texturePaint)
 if(!paint)return null
 const change=(patch:Parameters<typeof changeTexturePaint>[0])=>{finishObjectGesture();try{changeTexturePaint(patch)}catch(e){useEditorStore.setState({message:(e as Error).message})}}
 return <section className={styles.layer} aria-label="Texture paint layer"><strong>Texture paint</strong><div><button aria-label={`${paint.visible?'Hide':'Show'} Texture paint`} onClick={()=>change({visible:!paint.visible})}>{paint.visible?'Hide':'Show'}</button><button aria-label={`${paint.locked?'Unlock':'Lock'} Texture paint`} onClick={()=>change({locked:!paint.locked})}>{paint.locked?'Unlock':'Lock'}</button><label>Opacity (%)<input aria-label="Texture paint opacity" type="number" min={0} max={100} value={Math.round(paint.opacity*100)} onChange={e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(n)&&n>=0&&n<=100)change({opacity:n/100})}}/></label></div><small>Paint directly on the map or on Areas · above the background, below other objects</small></section>
}

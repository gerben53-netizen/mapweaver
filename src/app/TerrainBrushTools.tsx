import { useState } from 'react'
import { useTerrainBrushStore } from '../store/terrainBrushStore'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { changeTerrainPaint } from '../store/terrainPaintActions'
import { BRUSH_PRESETS } from '../domain/terrainBrushPresets'
import type { TerrainBrush } from '../domain/terrainBrush'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './TerrainBrushTools.module.css'
import { PremiumTerrainLibrary } from './PremiumTerrainLibrary'

export function BrushNumber({label,value,min,max,step='any',disabled=false,change}:{label:string;value:number;min:number;max:number;step?:number|'any';disabled?:boolean;change:(raw:string)=>void}){
  const [draft,setDraft]=useState<string|null>(null)
  return <input aria-label={label} type="number" min={min} max={max} step={step} disabled={disabled} value={draft??value} onChange={e=>{setDraft(e.target.value);change(e.target.value)}} onBlur={()=>setDraft(null)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setDraft(null);e.currentTarget.blur()}}}/>
}
export function TerrainBrushTools(){
  const tool=useEditorStore(s=>s.activeTool),brush=useTerrainBrushStore(s=>s.settings),paint=useProjectStore(s=>s.map.terrainPaint)
  if(tool!=='terrainBrush')return null
  const update=(patch:Partial<TerrainBrush>)=>{finishObjectGesture();useTerrainBrushStore.setState({settings:{...brush,...patch}})}
  const value=(key:'size'|'softness'|'strength'|'textureScale',raw:string,min:number,max:number,percent=false)=>{const n=Number(raw);if(raw!==''&&Number.isFinite(n)&&n>=min&&n<=max)update({[key]:percent?n/100:n})}
  return <div className={styles.tools} aria-label="Terrain Brush controls">
    <strong>Terrain Brush</strong>
    <label>Mode<select aria-label="Mode" value={brush.mode} onChange={e=>update({mode:e.target.value as TerrainBrush['mode']})}><option value="paint">Paint</option><option value="erase">Erase</option><option value="blend">Blend</option></select></label>
    <PremiumTerrainLibrary brush={brush} update={update}/>
    <label>Brush Preset<select aria-label="Brush Preset" value={Object.entries(BRUSH_PRESETS).find(([,p])=>p.size===brush.size&&p.softness===brush.softness&&p.strength===brush.strength&&p.textureScale===brush.textureScale)?.[0]||''} onChange={e=>{const preset=BRUSH_PRESETS[e.target.value];if(preset)update(preset)}}>
      <option value="">Custom behavior</option>{Object.keys(BRUSH_PRESETS).map(name=><option key={name}>{name}</option>)}
    </select></label>
    <small>Visual detail only · biome data stays unchanged</small>
    <label>Size (map px)<BrushNumber label="Size (map px)" min={8} max={512} value={brush.size} change={raw=>value('size',raw,8,512)}/><input aria-label="Brush size slider" type="range" min={8} max={512} value={brush.size} onChange={e=>value('size',e.target.value,8,512)}/></label>
    <label>Softness (%)<BrushNumber label="Softness (%)" min={0} max={100} value={Math.round(brush.softness*100)} change={raw=>value('softness',raw,0,100,true)}/></label>
    <label>Strength (%)<BrushNumber label="Strength (%)" min={0} max={100} value={Math.round(brush.strength*100)} change={raw=>value('strength',raw,0,100,true)}/></label>
    <label>Texture scale<BrushNumber label="Texture scale" disabled={brush.mode!=='paint'} min={.01} max={100} step={.05} value={brush.textureScale} change={raw=>value('textureScale',raw,.01,100)}/></label>
    <button onClick={()=>{finishObjectGesture();useEditorStore.setState({activeTool:'select'})}}>Done</button>
    {(paint?.locked||paint?.visible===false)&&<span className="muted">Show and unlock Terrain paint in Layers to paint.</span>}
  </div>
}
export function TerrainPaintLayerControls(){
  const paint=useProjectStore(s=>s.map.terrainPaint)
  if(!paint)return null
  const change=(patch:Parameters<typeof changeTerrainPaint>[0])=>{finishObjectGesture();try{changeTerrainPaint(patch);useEditorStore.setState({message:''})}catch(error){useEditorStore.setState({message:(error as Error).message})}}
  return <section className={styles.layer} aria-label="Terrain paint layer"><strong>Terrain paint</strong><div>
    <button aria-label={`${paint.visible?'Hide':'Show'} Terrain paint`} onClick={()=>change({visible:!paint.visible})}>{paint.visible?'Hide':'Show'}</button>
    <button aria-label={`${paint.locked?'Unlock':'Lock'} Terrain paint`} onClick={()=>change({locked:!paint.locked})}>{paint.locked?'Unlock':'Lock'}</button>
    <label>Opacity (%)<input type="number" min={0} max={100} value={Math.round(paint.opacity*100)} onChange={e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(n)&&n>=0&&n<=100)change({opacity:n/100})}}/></label>
  </div><small>Above semantic terrain; below objects. Independent of layer solo.</small></section>
}

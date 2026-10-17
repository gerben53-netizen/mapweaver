import { isHexGrid, hexOrientation } from '../domain/hexGrid'
import { DEFAULT_HEX, HEX_EDGES, HEX_HELP } from '../domain/hexLandShape'
import { useState } from 'react'
import { useLandBrushStore } from '../store/landBrushStore'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { LAND_PRESETS, LAND_SHAPES, type LandBrush } from '../domain/landBrush'
import { pixelsToDistance, distanceToPixels, mapWorkspace } from '../domain/geography'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './TerrainBrushTools.module.css'

function NumberControl({label,value,min,max,change}:{label:string;value:number;min:number;max:number;change:(n:number)=>void}){
 const [draft,setDraft]=useState<string|null>(null)
 return <label>{label}<input aria-label={label} type="number" min={min} max={max} step="any" value={draft??Number(value.toPrecision(6))} onChange={e=>{setDraft(e.target.value);const n=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(n)&&n>=min&&n<=max)change(n)}} onBlur={()=>setDraft(null)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label>
}
export function LandBrushTools(){
 const tool=useEditorStore(s=>s.activeTool),{settings:b,busy}=useLandBrushStore(),map=useProjectStore(s=>s.map)
 if(tool!=='landBrush')return null
 const gridHex=isHexGrid(map.grid),aligned=gridHex&&b.shape==='hexagon'&&(b.action==='add'||b.action==='remove')&&b.snapHex,matched=aligned&&b.matchHex
 const hex=aligned?{...(b.hex??DEFAULT_HEX),orientation:hexOrientation(map.grid),rotation:0}:b.hex??DEFAULT_HEX,shaping=b.action==='add'||b.action==='remove',exact=b.shape==='hexagon'&&hex.edge==='exact'&&shaping
 const unit=mapWorkspace(map).geography.unit,update=(patch:Partial<LandBrush>)=>{finishObjectGesture();useLandBrushStore.setState({settings:{...b,...patch}})}
 return <fieldset disabled={busy} className={styles.tools} aria-label="Land / Water controls" style={{margin:0,borderTop:0,borderLeft:0,borderRight:0,minWidth:0}}>
  <strong>Land / Water</strong>
  <label>Preset<select aria-label="Land brush preset" value="" onChange={e=>update(LAND_PRESETS[e.target.value])}><option value="" disabled>Choose preset</option>{Object.keys(LAND_PRESETS).map(name=><option key={name}>{name}</option>)}</select></label>
  <label>Action<select aria-label="Land action" value={b.action} onChange={e=>update({action:e.target.value as LandBrush['action']})}>{Object.entries({add:'Add Land',remove:'Remove Land',smooth:'Smooth Coast',roughen:'Roughen Coast'}).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  <label>Shape<select aria-label="Land brush shape" value={b.shape} onChange={e=>update({shape:e.target.value as LandBrush['shape'],...(e.target.value==='hexagon'&&gridHex?{hex:{...(b.hex??DEFAULT_HEX),orientation:hexOrientation(map.grid)}}:{})})}>{Object.entries(LAND_SHAPES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  {b.shape==='hexagon'&&shaping&&<>
   {gridHex&&<><label><input type="checkbox" checked={!!b.snapHex} onChange={e=>update({snapHex:e.target.checked,...(!e.target.checked?{matchHex:false}:{})})}/>Snap to hex grid</label><label><input type="checkbox" checked={!!matched} onChange={e=>update({matchHex:e.target.checked,...(e.target.checked?{snapHex:true}:{})})}/>Match one hex cell</label><small>Snap aligns the center and orientation. Alt bypasses center snap and temporarily switches Add/Remove.</small></>}
   <label>Orientation<select disabled={!!aligned} aria-label="Hex orientation" value={hex.orientation} onChange={e=>update({hex:{...hex,orientation:e.target.value as typeof hex.orientation}})}><option value="flat">Flat top</option><option value="pointy">Pointy top</option></select></label>
   {!aligned&&<NumberControl label="Hex rotation (degrees)" min={0} max={360} value={hex.rotation} change={rotation=>update({hex:{...hex,rotation}})}/> }
   <label>Edge style<select aria-label="Hex edge style" title={HEX_HELP[hex.edge]} value={hex.edge} onChange={e=>update({hex:{...hex,edge:e.target.value as typeof hex.edge}})}>{Object.entries(HEX_EDGES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <small>{HEX_HELP[hex.edge]} Size is the opposite-corner diameter; rotation is relative to orientation. Click for one hex; drag joins footprints.</small>
  </>}
  {b.shape==='hexagon'&&!shaping&&<small>Smooth/Roughen adjusts existing coast with circular falloff. Choose Add/Remove Land to draw hex shapes.</small>}
  {matched?<span>One cell: {pixelsToDistance(map.grid.cellSize,map).toFixed(3)} {unit} corner to corner</span>:<><NumberControl key={unit} label={`Size (${unit})`} value={pixelsToDistance(b.size,map)} min={pixelsToDistance(12,map)} max={pixelsToDistance(1200,map)} change={n=>update({size:Math.max(12,Math.min(1200,distanceToPixels(n,unit,map)))})}/>
  <label>Size<input aria-label="Land brush size slider" title="Diameter in logical map pixels" type="range" min={12} max={1200} value={b.size} onChange={e=>update({size:Number(e.target.value)})}/></label></>}
  {!exact&&<><NumberControl label="Softness (%)" value={b.softness*100} min={0} max={100} change={n=>update({softness:n/100})}/>
  <NumberControl label="Roughness (%)" value={b.roughness*100} min={0} max={100} change={n=>update({roughness:n/100})}/>
  <label>Smoothing<select aria-label="Coast smoothing" value={b.smoothing} onChange={e=>update({smoothing:e.target.value as LandBrush['smoothing']})}>{['off','low','medium','high'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label></>}
  <button onClick={()=>{finishObjectGesture();useEditorStore.setState({activeTool:'select'})}}>Done</button>
  {b.action==='smooth'&&b.smoothing==='off'&&<p role="status">Smoothing is Off. Choose Low, Medium or High before using Smooth Coast; strokes will not change the coast.</p>}
  {busy&&<span role="status">Updating coastline… Escape cancels.</span>}
 </fieldset>
}

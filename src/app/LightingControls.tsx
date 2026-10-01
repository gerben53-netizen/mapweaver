import { useState } from 'react'
import { useLightingPreview } from '../store/lightingPreview'
import { Modal } from './Modal'
import { useProjectStore } from '../store/projectStore'
import { defaultLighting,newPointLight } from '../campfire/authoring'
import type { MapPointLightV1 } from '../campfire/authoring'
export function LightingControls(){
 const [open,setOpen]=useState(false),[error,setError]=useState(''),map=useProjectStore(s=>s.map),lighting=map.lighting||defaultLighting(),preview=useLightingPreview(s=>s.enabled),selected=useLightingPreview(s=>s.selectedId)
 const light=lighting.lights.find(l=>l.id===selected)
 function commit(value:typeof lighting){try{useProjectStore.getState().setLighting(value);setError('')}catch(cause){setError((cause as Error).message)}}
 function update(patch:Partial<MapPointLightV1>){if(light)commit({...lighting,lights:lighting.lights.map(l=>l.id===light.id?{...l,...patch}:l)})}
 return <><button onClick={()=>setOpen(true)}>Lighting</button>{open&&<Modal title="Lighting authoring" onClose={()=>setOpen(false)}><p>Author ambient and point lights for Campfire. This approximate MapWeaver preview is excluded from the exported image.</p>
 <label><input type="checkbox" checked={preview} onChange={e=>useLightingPreview.setState({enabled:e.target.checked})}/>Lighting preview</label>
 <label>Ambient intensity<input aria-label="Ambient intensity" type="number" min={0} max={1} step={.05} value={lighting.ambient.intensity} onChange={e=>commit({...lighting,ambient:{intensity:Number(e.target.value)}})}/></label>
 <button disabled={lighting.lights.length>=32} onClick={()=>{const l=newPointLight(map.width/2,map.height/2);commit({...lighting,lights:[...lighting.lights,l]});useLightingPreview.setState({enabled:true,selectedId:l.id})}}>Add point light</button>
 <label>Point light<select aria-label="Point light" value={light?.id||''} onChange={e=>useLightingPreview.setState({selectedId:e.target.value})}><option value="">Choose light</option>{lighting.lights.map((l,i)=><option key={l.id} value={l.id}>Point light {i+1} · {l.id.slice(0,8)}</option>)}</select></label>
 {light&&<fieldset><legend>Point light settings</legend><small>Stable ID: {light.id}</small>
 <label>X (map pixels)<input aria-label="Light X" type="number" min={0} max={map.width} value={light.position.x} onChange={e=>update({position:{...light.position,x:Number(e.target.value)}})}/></label>
 <label>Y (map pixels)<input aria-label="Light Y" type="number" min={0} max={map.height} value={light.position.y} onChange={e=>update({position:{...light.position,y:Number(e.target.value)}})}/></label>
 <label>Radius (ft)<input aria-label="Light radius" type="number" min={.01} max={500} value={light.radiusFt} onChange={e=>update({radiusFt:Number(e.target.value)})}/></label>
 <label>Intensity<input aria-label="Light intensity" type="number" min={0} max={1} step={.05} value={light.intensity} onChange={e=>update({intensity:Number(e.target.value)})}/></label>
 <label>Color<input aria-label="Light color" type="color" value={light.color} onChange={e=>update({color:e.target.value})}/></label>
 <label><input type="checkbox" checked={light.affectsVision} onChange={e=>update({affectsVision:e.target.checked})}/>Affects vision</label>
 <label><input type="checkbox" checked={light.enabled} onChange={e=>update({enabled:e.target.checked})}/>Enabled by default</label>
 <button onClick={()=>{const copy={...structuredClone(light),id:crypto.randomUUID()};commit({...lighting,lights:[...lighting.lights,copy]});useLightingPreview.setState({selectedId:copy.id})}} disabled={lighting.lights.length>=32}>Duplicate light</button>
 <button onClick={()=>{commit({...lighting,lights:lighting.lights.filter(l=>l.id!==light.id)});useLightingPreview.setState({selectedId:''})}}>Delete light</button></fieldset>}
 <p>{lighting.lights.length}/32 lights. Preview handles can be dragged after closing this dialog. Set the physical game scale in Map settings.</p>{error&&<p role="alert">{error}</p>}<button onClick={()=>setOpen(false)}>Close</button></Modal>}</>
}

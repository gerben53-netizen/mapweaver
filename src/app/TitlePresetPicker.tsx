import { useEffect, useRef, useState } from 'react'
import { CARTOGRAPHIC_ELEMENT_PRESETS } from '../domain/cartographicPresets'
import type { ElementPreset } from '../domain/cartographicPresets'
import { createMapElement, panelLayout } from '../domain/decorations'
import { paintAnnotation } from '../canvas/drawAnnotation'
import { loadAnnotationFonts } from '../canvas/annotationFonts'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'
import styles from './TitlePresets.module.css'
function Preview({id}:{id:ElementPreset}){
 const [error,setError]=useState('')
 const ref=useRef<HTMLCanvasElement>(null),map=useProjectStore(s=>s.map)
 useEffect(()=>{let active=true;void loadAnnotationFonts().then(()=>{
  const ctx=active?ref.current?.getContext('2d'):null;if(!ctx)return
  const o=createMapElement('title',{x:0,y:0},map,[],id);if(o.kind!=='title')return
  o.title='The Amber Coast';o.body='A traveller’s atlas';const layout=panelLayout(o);o.height=layout.height*o.width/layout.width
  ctx.clearRect(0,0,480,170);ctx.save();const scale=Math.min(450/o.width,145/o.height);ctx.translate((480-o.width*scale)/2,(170-o.height*scale)/2);ctx.scale(scale,scale);paintAnnotation(ctx,o,new Map(),map);ctx.restore();if(ref.current)ref.current.dataset.ready='true'
 }).catch(()=>{if(active)setError('Preview unavailable: bundled fonts could not load.')});return()=>{active=false}},[id,map])
 return <><canvas ref={ref} width={480} height={170} aria-hidden="true"/>{error&&<small role="status">{error}</small>}</>
}
export function TitlePresetPicker({value,onChange}:{value:ElementPreset;onChange:(id:ElementPreset)=>void}){
 const [open,setOpen]=useState(false)
 return <><button type="button" onClick={()=>setOpen(true)}>Preview title styles…</button>{open&&<Modal title="Title styles" onClose={()=>setOpen(false)} wide><p>Choose a carrier. Your title and subtitle remain editable.</p><div className={styles.grid} role="group" aria-label="Title presets" onKeyDown={e=>{const buttons=Array.from(e.currentTarget.querySelectorAll('button'));const at=buttons.indexOf(e.target as HTMLButtonElement);if(at<0)return;const offset=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;if(offset){e.preventDefault();buttons[(at+offset+buttons.length)%buttons.length].focus()}}}>{CARTOGRAPHIC_ELEMENT_PRESETS.title.map(p=><button type="button" key={p.id} aria-label={p.name} aria-pressed={value===p.id} onClick={()=>{onChange(p.id);setOpen(false)}}><Preview id={p.id}/><span>{value===p.id?'✓ ':''}{p.name}</span></button>)}</div><button type="button" onClick={()=>setOpen(false)}>Cancel</button></Modal>}</>
}

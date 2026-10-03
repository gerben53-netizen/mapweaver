import { mapCapabilities } from '../domain/mapCapabilities'
import { useEffect,useRef,useState } from 'react'
import { createPortal } from 'react-dom'
import { MAP_ELEMENTS,defaultElementPreset } from '../domain/cartographicPresets'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { Icon } from './Icon'
import styles from './MapElementsMenu.module.css'
export function MapElementsMenu(){
 const [position,setPosition]=useState<{left:number;top:number}|null>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null)
 const mapType=useProjectStore(s=>s.map.mapType)
 const entries=MAP_ELEMENTS.filter(e=>e.kind!=='place'&&mapCapabilities(mapType).tools.includes(e.kind))
 const active=useEditorStore(s=>entries.some(e=>e.kind===s.activeTool))
 useEffect(()=>{
  if(!position)return
  panel.current?.querySelector('button')?.focus()
  const down=(e:PointerEvent)=>{if(!panel.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setPosition(null)}
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setPosition(null);trigger.current?.focus()}}
  document.addEventListener('pointerdown',down);document.addEventListener('keydown',key,true)
  return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key,true)}
 },[position])
 return <><button ref={trigger} title="Add a label, compass, scale bar, title, legend or note" aria-label="Map Elements" aria-expanded={!!position} aria-controls={position?'map-elements-palette':undefined} aria-pressed={active} onClick={()=>{const r=trigger.current!.getBoundingClientRect();setPosition(position?null:{left:r.right+8,top:Math.max(8,Math.min(r.top,window.innerHeight-420))})}}><Icon name="map"/></button>
 {position&&createPortal(<div ref={panel} id="map-elements-palette" role="region" aria-label="Insert Map Elements" className={styles.palette} style={{...position,maxHeight:window.innerHeight-position.top-8,boxSizing:'border-box'}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))setPosition(null)}}><h2>Map Elements</h2><p>Choose an element, then click the map.</p>{entries.map(({kind,name,description})=><button key={kind} title={description} aria-label={name} onClick={()=>{finishObjectGesture();useEditorStore.setState({activeTool:kind,elementPreset:kind==='label'?null:defaultElementPreset(kind,useProjectStore.getState().map.mapType,useProjectStore.getState().map.theme?.id),message:''});setPosition(null);trigger.current?.focus()}}><strong>{name}</strong><span>{description}</span></button>)}</div>,document.body)}</>
}

import { useEffect, useRef, useState } from 'react'
import { fitToMap, wheelZoom, zoomAtPoint, type Viewport } from '../canvas/viewport'
import { readImage } from '../imports/readImage'
import { IMAGE_ACCEPT } from '../imports/limits'
import { useReferenceViewStore } from '../store/referenceViewStore'
import styles from './ReferenceView.module.css'

export function ReferenceView(){
  const open=useReferenceViewStore(s=>s.open),[width,setWidth]=useState(300),[image,setImage]=useState<{url:string;name:string;width:number;height:number}|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[view,setView]=useState<Viewport>({zoom:1,pan:{x:0,y:0}})
  const surface=useRef<HTMLDivElement>(null),request=useRef(0),drag=useRef<{id:number;x:number;y:number;pan:{x:number;y:number}}|null>(null)
  useEffect(()=>()=>{request.current++},[])
  useEffect(()=>{const stop=()=>{drag.current=null};window.addEventListener('blur',stop);return()=>window.removeEventListener('blur',stop)},[])
  useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url)},[image])
  useEffect(()=>{
    const el=surface.current;if(!el)return
    const wheel=(e:WheelEvent)=>{if(!image)return;e.preventDefault();const r=el.getBoundingClientRect();setView(v=>zoomAtPoint(v,{x:e.clientX-r.x,y:e.clientY-r.y},wheelZoom(v.zoom,e.deltaY,e.deltaMode,r.height)))}
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)
  },[image])
  function fit(){const el=surface.current;if(image&&el)setView(fitToMap(image,{width:el.clientWidth,height:el.clientHeight}))}
  function zoom(factor:number){const el=surface.current;if(el)setView(v=>zoomAtPoint(v,{x:el.clientWidth/2,y:el.clientHeight/2},v.zoom*factor))}
  return <aside aria-label="Reference view" className={styles.panel} style={{width}} hidden={!open}>
    <div className={styles.head}><strong>Reference view</strong><button aria-label="Hide reference view" onClick={()=>useReferenceViewStore.setState({open:false})}>Hide</button></div>
    <label>Reference image<input aria-label="Load reference image" type="file" accept={IMAGE_ACCEPT} disabled={loading} onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;const token=++request.current;setLoading(true);setError('')
      try{const next=await readImage(file);if(token!==request.current)return;const url=URL.createObjectURL(next.blob);setImage({url,name:file.name,width:next.width,height:next.height});const el=surface.current;if(el)setView(fitToMap(next,{width:el.clientWidth,height:el.clientHeight}))}catch(e){if(token===request.current)setError((e as Error).message)}finally{if(token===request.current)setLoading(false)}
    }}/></label>
    <label>Panel width<input aria-label="Reference panel width" type="range" min={220} max={480} value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
    <div className={styles.controls}><button disabled={!image} onClick={()=>zoom(1/1.25)} aria-label="Zoom reference out">−</button><output aria-label="Reference zoom">{Math.round(view.zoom*100)}%</output><button disabled={!image} onClick={()=>zoom(1.25)} aria-label="Zoom reference in">+</button><button disabled={!image} onClick={fit}>Fit reference</button><button disabled={!image} onClick={()=>{request.current++;setImage(null);setLoading(false);setError('');drag.current=null}}>Clear reference</button></div>
    <p>{loading?'Loading reference…':image?.name||'Load an image for comparison. It will never be added to your map or library.'}</p>
    {error&&<p role="alert">{error}</p>}
    <div className={styles.surface} ref={surface} aria-label="Reference image viewport" tabIndex={0} onKeyDown={e=>{if(!image)return;const delta=({ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();e.stopPropagation();setView(v=>({...v,pan:{x:v.pan.x+delta[0],y:v.pan.y+delta[1]}}))}}} onPointerDown={e=>{if(e.button!==0||!image)return;e.preventDefault();e.currentTarget.focus();drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,pan:view.pan};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;setView(v=>({...v,pan:{x:d.pan.x+e.clientX-d.x,y:d.pan.y+e.clientY-d.y}}))}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}>
      {image&&<img src={image.url} alt="Editor-only reference" draggable={false} style={{width:image.width,height:image.height,transform:`translate(${view.pan.x}px,${view.pan.y}px) scale(${view.zoom})`}}/>}
    </div><p>Wheel to zoom · Drag or arrow keys to pan. Independent navigation; no map calibration. Image and crop last only in this editor session.</p>
  </aside>
}

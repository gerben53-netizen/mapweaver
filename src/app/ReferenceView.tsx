import { useEffect, useRef, useState } from 'react'
import { fitToMap, mapToScreen, screenToMap, wheelZoom, zoomAtPoint } from '../canvas/viewport'
import { readImage } from '../imports/readImage'
import { IMAGE_ACCEPT } from '../imports/limits'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { addReferencePair, alignReferenceViews, calculateReferenceCalibration, installReferenceNavigation, invalidateReferenceCalibration, removeReferencePair, resetReferenceSession, setReferencePoint, useReferenceViewStore, type ReferenceMode } from '../store/referenceViewStore'
import styles from './ReferenceView.module.css'

export function ReferenceView(){
  const state=useReferenceViewStore(),[width,setWidth]=useState(300),[image,setImage]=useState<{url:string;name:string;width:number;height:number}|null>(null),[loadError,setLoadError]=useState(''),[loading,setLoading]=useState(false)
  const {open,view,pairs,pick,calibration,calibrating,mode,markers}=state
  const surface=useRef<HTMLDivElement>(null),request=useRef(0),drag=useRef<{id:number;x:number;y:number;pan:{x:number;y:number}}|null>(null)
  const following=mode==='map-reference',canLink=!!image&&!!calibration&&state.mapCanvasSize.width>0
  useEffect(()=>{const pending=request,off=installReferenceNavigation();return()=>{pending.current++;off();resetReferenceSession()}},[])
  useEffect(()=>{const stop=()=>{drag.current=null};window.addEventListener('blur',stop);return()=>window.removeEventListener('blur',stop)},[])
  useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url)},[image])
  useEffect(()=>useProjectStore.subscribe((s,p)=>{if(s.map.width!==p.map.width||s.map.height!==p.map.height)invalidateReferenceCalibration('Map dimensions changed. Recalculate calibration.')}),[])
  useEffect(()=>{
    const el=surface.current;if(!el)return
    const measure=()=>{if(!open)return;const next={width:el.clientWidth,height:el.clientHeight};if(!next.width||!next.height)return;const previous=useReferenceViewStore.getState();const old=previous.referenceSize;useReferenceViewStore.setState({referenceSize:next,view:old.width>0?{...previous.view,pan:{x:previous.view.pan.x+(next.width-old.width)/2,y:previous.view.pan.y+(next.height-old.height)/2}}:previous.view})}
    measure();if(typeof ResizeObserver==='undefined')return
    const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()
  },[open])
  useEffect(()=>{
    const el=surface.current;if(!el)return
    const wheel=(e:WheelEvent)=>{if(!image)return;e.preventDefault();e.stopPropagation();const s=useReferenceViewStore.getState();if(s.mode==='map-reference')return;const r=el.getBoundingClientRect();useReferenceViewStore.setState({view:zoomAtPoint(s.view,{x:e.clientX-r.x,y:e.clientY-r.y},wheelZoom(s.view.zoom,e.deltaY,e.deltaMode,r.height))})}
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)
  },[image])
  function fit(){const el=surface.current;if(image&&el)useReferenceViewStore.setState({view:fitToMap(image,{width:el.clientWidth,height:el.clientHeight})})}
  function zoom(factor:number){const el=surface.current;if(el)useReferenceViewStore.setState({view:zoomAtPoint(view,{x:el.clientWidth/2,y:el.clientHeight/2},view.zoom*factor)})}
  function hide(){drag.current=null;useReferenceViewStore.setState({open:false,mode:'independent',pick:null})}
  function arm(id:number,side:'image'|'map'){finishObjectGesture();useReferenceViewStore.setState({pick:{id,side}})}
  function pickImage(point:{x:number;y:number}){if(pick?.side==='image'&&image)setReferencePoint(pick.id,'image',screenToMap(point,view),image)}
  const coordinates=(p:{x:number;y:number}|null)=>p?p.x.toFixed(1)+', '+p.y.toFixed(1):'not set'
  return <aside aria-label="Reference view" className={styles.panel} style={{width}} hidden={!open}>
    <div className={styles.head}><strong>Reference view</strong><button aria-label="Hide reference view" onClick={hide}>Hide</button></div>
    <div className={styles.settings} aria-label="Reference controls">
    <label>Reference image<input aria-label="Load reference image" type="file" accept={IMAGE_ACCEPT} disabled={loading} onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;const token=++request.current;setLoading(true);setLoadError('')
      try{const next=await readImage(file);if(token!==request.current)return;const url=URL.createObjectURL(next.blob);resetReferenceSession();setImage({url,name:file.name,width:next.width,height:next.height});const el=surface.current;useReferenceViewStore.setState({imageSize:{width:next.width,height:next.height},referenceSize:el?{width:el.clientWidth,height:el.clientHeight}:{width:0,height:0},view:el?fitToMap(next,{width:el.clientWidth,height:el.clientHeight}):{zoom:1,pan:{x:0,y:0}}})}catch(e){if(token===request.current)setLoadError((e as Error).message)}finally{if(token===request.current)setLoading(false)}
    }}/></label>
    <label>Panel width<input aria-label="Reference panel width" type="range" min={220} max={480} value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
    <div className={styles.controls}><button disabled={!image||following} onClick={()=>zoom(1/1.25)} aria-label="Zoom reference out">−</button><output aria-label="Reference zoom">{Math.round(view.zoom*100)}%</output><button disabled={!image||following} onClick={()=>zoom(1.25)} aria-label="Zoom reference in">+</button><button disabled={!image||following} onClick={fit}>Fit reference</button><button disabled={!image} onClick={()=>{request.current++;setImage(null);setLoading(false);setLoadError('');drag.current=null;resetReferenceSession()}}>Clear reference</button></div>
    <p>{loading?'Loading reference…':image?.name||'Load an image for comparison. It will never be added to your map or library.'}</p>
    <div className={styles.controls}><button disabled={!image||!state.mapCanvasSize.width} aria-expanded={calibrating} onClick={()=>useReferenceViewStore.setState({calibrating:!calibrating,pick:null})}>Calibrate</button><button disabled={!canLink} onClick={()=>alignReferenceViews(mode==='map-reference'?'map-reference':'reference-map')}>Align Views</button></div>
    <label>Navigation<select aria-label="Reference navigation" value={mode} onChange={e=>useReferenceViewStore.setState({mode:e.target.value as ReferenceMode})}><option value="independent">Independent</option><option disabled={!canLink} value="reference-map">Reference → Map</option><option disabled={!canLink} value="map-reference">Map → Reference</option></select></label>
    {!calibration&&<p>Linking needs a valid calibration.</p>}{image&&!state.mapCanvasSize.width&&<p>Return to Edit to calibrate or link views.</p>}
    {calibration&&<p role="status">{pairs.length} pairs · Mean {calibration.meanError.toFixed(2)} map px · Max {calibration.maxError.toFixed(2)} map px · Rotation {(calibration.rotation*180/Math.PI).toFixed(2)}°. {pairs.length===2?'Two pairs fit exactly; accuracy is not independently checked.':'Residuals describe fit, not independent ground truth.'}</p>}
    {calibrating&&state.mapCanvasSize.width>0&&<div className={styles.calibration}>
      <p>Choose an image point, then the same map location. Add at least two pairs, spread across the map.</p>
      <ol>{pairs.map(p=><li key={p.id}><strong>Pair {p.id}</strong><span>Image: {coordinates(p.image)}</span><button disabled={!image} onClick={()=>arm(p.id,'image')}>Pick image {p.id}</button><span>Map: {coordinates(p.map)}</span><button disabled={!state.mapCanvasSize.width} onClick={()=>arm(p.id,'map')}>Pick map {p.id}</button><button onClick={()=>removeReferencePair(p.id)}>Remove pair {p.id}</button>{calibration&&<span>Error {calibration.residuals[pairs.indexOf(p)].toFixed(2)} map px</span>}</li>)}</ol>
      <div className={styles.controls}><button disabled={pairs.length>=16} onClick={()=>{finishObjectGesture();addReferencePair()}}>Add point pair</button><button onClick={()=>calculateReferenceCalibration(useProjectStore.getState().map)}>Recalculate</button><button disabled={!pairs.length} onClick={()=>useReferenceViewStore.setState({pairs:[],calibration:null,mode:'independent',pick:null,error:'',navigationNote:''})}>Clear calibration</button></div>
    </div>}
    <label><input type="checkbox" checked={markers} onChange={e=>useReferenceViewStore.setState({markers:e.target.checked})}/>Show point pairs</label>
    {pick&&<p role="status">Choose {pick.side==='image'?'reference image':'map'} point {pick.id}. Escape cancels; Enter in that viewport uses its centre.</p>}
    {(loadError||state.error)&&<p role="alert">{loadError||state.error}</p>}{state.navigationNote&&<p>{state.navigationNote}</p>}
    </div>
    <div className={styles.surface} ref={surface} aria-label="Reference image viewport" tabIndex={0} onKeyDown={e=>{if(!image)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();useReferenceViewStore.setState({pick:null});return}if(e.key==='Enter'&&pick?.side==='image'){e.preventDefault();e.stopPropagation();pickImage({x:e.currentTarget.clientWidth/2,y:e.currentTarget.clientHeight/2});return}const delta=({ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();e.stopPropagation();if(!following)useReferenceViewStore.setState({view:{...view,pan:{x:view.pan.x+delta[0],y:view.pan.y+delta[1]}}})}}} onPointerDown={e=>{if(e.button!==0||!image)return;e.preventDefault();e.stopPropagation();e.currentTarget.focus();if(pick?.side==='image'){const r=e.currentTarget.getBoundingClientRect();pickImage({x:e.clientX-r.x,y:e.clientY-r.y});return}if(following)return;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,pan:view.pan};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;useReferenceViewStore.setState({view:{...view,pan:{x:d.pan.x+e.clientX-d.x,y:d.pan.y+e.clientY-d.y}}})}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}>
      {image&&<img src={image.url} alt="Editor-only reference" draggable={false} style={{width:image.width,height:image.height,transform:'translate('+view.pan.x+'px,'+view.pan.y+'px) scale('+view.zoom+')'}}/>}
      {image&&markers&&pairs.filter(p=>p.image).map(p=>{const at=mapToScreen(p.image!,view);return <span className={styles.marker} key={p.id} style={{left:at.x,top:at.y}}>{p.id}</span>})}
    </div><p>Session only; image and calibration are not saved or exported. Hide keeps points but pauses linking. Wheel to zoom · Drag/arrows to pan. Views stay unrotated; calibration rotation maps their centres.</p>
  </aside>
}

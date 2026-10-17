import { useEffect } from 'react'
import { mapToScreen, screenToMap, type Size } from './viewport'
import { setReferencePoint, useReferenceViewStore } from '../store/referenceViewStore'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import styles from '../app/ReferenceView.module.css'

export function ReferenceMapOverlay({size}:{size:Size}){
  const open=useReferenceViewStore(s=>s.open),pick=useReferenceViewStore(s=>s.pick),pairs=useReferenceViewStore(s=>s.pairs),markers=useReferenceViewStore(s=>s.markers),viewport=useEditorStore(s=>s.viewport)
  useEffect(()=>{useReferenceViewStore.setState({mapCanvasSize:size});return()=>{useReferenceViewStore.setState({mapCanvasSize:{width:0,height:0}})}},[size])
  useEffect(()=>()=>{useReferenceViewStore.setState({mode:'independent',pick:null})},[])
  const choosing=open&&pick?.side==='map'
  return <div aria-label="Map calibration points" className={styles.mapOverlay} style={{pointerEvents:choosing?'auto':'none',cursor:choosing?'crosshair':undefined}} tabIndex={choosing?0:-1} onPointerDownCapture={e=>{
    if(!choosing||e.button!==0)return;e.preventDefault();e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setReferencePoint(pick.id,'map',screenToMap({x:e.clientX-r.x,y:e.clientY-r.y},viewport),useProjectStore.getState().map)
  }} onKeyDownCapture={e=>{if(!choosing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();useReferenceViewStore.setState({pick:null})}if(e.key==='Enter'){e.preventDefault();e.stopPropagation();setReferencePoint(pick.id,'map',screenToMap({x:size.width/2,y:size.height/2},viewport),useProjectStore.getState().map)}}}>
    {choosing&&<span className={styles.pickHint}>Choose map point {pick.id} · Esc cancels · Enter uses centre</span>}
    {open&&markers&&pairs.filter(p=>p.map).map(p=>{const at=mapToScreen(p.map!,viewport);return <span key={p.id} className={styles.marker} style={{left:at.x,top:at.y}}>{p.id}</span>})}
  </div>
}

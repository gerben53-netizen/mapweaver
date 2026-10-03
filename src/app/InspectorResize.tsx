import { useState } from 'react'
import styles from './Inspector.module.css'
export function InspectorResize({width,onChange}:{width:number;onChange:(n:number)=>void}){
  const [drag,setDrag]=useState<{x:number;width:number}|null>(null)
  return <div className={styles.resize} role="separator" aria-label="Resize inspector" aria-orientation="vertical" aria-valuemin={280} aria-valuemax={520} aria-valuenow={width} tabIndex={0} title="Drag to resize. Arrow keys adjust; Home/End choose minimum/maximum."
    onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);setDrag({x:e.clientX,width})}}
    onPointerMove={e=>{if(drag)onChange(drag.width+drag.x-e.clientX)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setDrag(null)}} onLostPointerCapture={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}
    onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();onChange(e.key==='Home'?280:e.key==='End'?520:width+(e.key==='ArrowLeft'?1:-1)*(e.shiftKey?40:10))}}/>
}

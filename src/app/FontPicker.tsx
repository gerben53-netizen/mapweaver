import { useState } from 'react'
import { FONT_LIBRARY,fontEntry,fontFamily,variant } from '../fonts/registry'
import type { TextStyle } from '../domain/annotations'
import styles from './FontPicker.module.css'
export function FontPicker({value,onChange}:{value:TextStyle;onChange:(style:TextStyle)=>void}){
 const [open,setOpen]=useState(false)
 const selected=fontEntry(value.font)
 return <div className={styles.picker}><button type="button" aria-label="Choose font" aria-expanded={open} onClick={()=>setOpen(!open)}>Font: {selected?.name??value.font}</button>{open&&<div role="group" aria-label="Font library" className={styles.options} onKeyDown={e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);e.currentTarget.parentElement?.querySelector('button')?.focus()}
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button')),i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}
 }}>{[...new Set(FONT_LIBRARY.map(f=>f.category))].map(category=><section key={category} aria-label={category}><h4>{category}</h4>{FONT_LIBRARY.filter(f=>f.category===category).map(f=><button type="button" key={f.id} aria-label={f.name} aria-pressed={selected?.id===f.id} onClick={()=>{const next={...value,font:f.id},v=variant(next);onChange({...next,bold:v.includes('Bold'),italic:v.includes('Italic')})}}><span>{f.name}</span><span aria-hidden="true" style={{fontFamily:fontFamily(f.id)}}>The Silver Coast</span></button>)}</section>)}{!selected&&<p>Current system/legacy font: {value.font}. Kept until you choose another.</p>}</div>}</div>
}

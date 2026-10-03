import { useId, useState, type ReactNode } from 'react'
import styles from './Inspector.module.css'
const expansion = new Map<string, boolean>()
/** Session-only disclosure, scoped to object type; closed editors are not mounted. */
export function InspectorSection({type,title,initial=false,forceOpen=false,children}:{type:string;title:string;initial?:boolean;forceOpen?:boolean;children:ReactNode}) {
  const key=type+':'+title,id=useId(),[open,setOpen]=useState(()=>expansion.get(key)??initial)
  const expanded=forceOpen||open
  return <section className={styles.section} aria-label={title}><h3><button type="button" aria-expanded={expanded} aria-controls={id} onClick={()=>{expansion.set(key,!open);setOpen(!open)}}><span aria-hidden="true">{expanded?'▾':'▸'}</span>{title}</button></h3><div id={id} className={styles.body} hidden={!expanded}>{expanded&&children}</div></section>
}

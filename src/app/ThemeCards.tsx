import { useEffect, useRef, useState } from 'react'
import type { WorldTheme } from '../domain/worldThemes'
import { themePreview } from '../world/themePreview'
import styles from './WorldThemePicker.module.css'

function ThemePreview({theme}:{theme:WorldTheme}) {
 const ref=useRef<HTMLDivElement>(null)
 const [result,setResult]=useState<{url:string;warning:string}|null>(null),[error,setError]=useState('')
 useEffect(()=>{let active=true,started=false;const render=()=>{if(started)return;started=true;void themePreview(theme.id).then(v=>{if(active)setResult(v)},e=>{if(active)setError(e.message)})};const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();render()}});if(observer&&ref.current)observer.observe(ref.current);else render();return()=>{active=false;observer?.disconnect()}},[theme.id])
 return <><div ref={ref} className={styles.preview}>{result?<img src={result.url} alt={`${theme.name} miniature map`}/>:<span>{error||'Rendering miniature map…'}</span>}</div>{result?.warning&&<small>{result.warning}</small>}</>
}
export function ThemeCards({themes,selected,onSelect,disabled=false}:{themes:WorldTheme[];selected:string;onSelect:(id:string)=>void;disabled?:boolean}) {
 const theme=themes.find(t=>t.id===selected)
 return <><div className={styles.cards} role="radiogroup" aria-label="World map themes">{themes.map((t,i)=><button type="button" role="radio" aria-checked={selected===t.id} tabIndex={selected===t.id||!themes.some(v=>v.id===selected)&&i===0?0:-1} disabled={disabled} className={styles.card} key={t.id} onClick={()=>onSelect(t.id)} onKeyDown={e=>{if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?themes.length-1:(i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+themes.length)%themes.length;onSelect(themes[index].id);(e.currentTarget.parentElement?.children[index] as HTMLElement)?.focus()}}>
  <ThemePreview theme={t}/><strong>{t.name}</strong><span>{t.description}</span>
 </button>)}</div>{theme&&['parchment','darkFantasy'].includes(theme.assetTheme)&&<p className="muted">This sample retains engraved stamps. Theme-specific replacements require matching library assets.</p>}</>
}

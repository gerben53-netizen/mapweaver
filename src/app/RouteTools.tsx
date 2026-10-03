import { routePreset } from '../domain/routes'
import { PathTypeChoice } from './PathTypeChoice'
import { useEditorStore } from '../store/editorStore'
import styles from './PathTools.module.css'
export function RouteTools(){
  const style=useEditorStore(s=>s.routeStyle),mode=useEditorStore(s=>s.pathMode),snap=useEditorStore(s=>s.wallSnap)
  return <div className={styles.bar} aria-label="Path controls">
    <PathTypeChoice/>
    {style.route.kind==='road'&&<label>Class<select aria-label="Road class" value={style.route.roadClass} onChange={e=>useEditorStore.setState({routeStyle:routePreset('road',e.target.value)})}>{['trail','road','major'].map(c=><option key={c}>{c}</option>)}</select></label>}
    <label>Mode<select aria-label="Path mode" value={mode} onChange={e=>useEditorStore.setState({pathMode:e.target.value as typeof mode})}><option value="straight">Straight</option><option value="curved">Curved</option></select></label>
    <label>{style.route.kind==='river'?'Mouth':'Width'}<input aria-label="Path drawing width" type="number" min="0.1" max="1024" value={style.strokeWidth} onChange={e=>{const n=Number(e.target.value);if(n>=.1&&n<=1024)useEditorStore.setState({routeStyle:{...style,strokeWidth:n,route:style.route.kind==='river'?{...style.route,endWidth:n}:style.route}})}}/></label>
    <span>Click nodes · Drag curves · Enter finishes · Alt free · Properties for appearance</span>
    {snap?.kind==='endpoint'&&<button onClick={()=>window.dispatchEvent(new Event('mapweaver-wall-continue'))}>Continue {style.route.kind}</button>}
    <button onClick={()=>window.dispatchEvent(new Event('mapweaver-path-done'))}>Done</button><button onClick={()=>useEditorStore.setState({activeTool:'select'})}>Select</button>
  </div>
}

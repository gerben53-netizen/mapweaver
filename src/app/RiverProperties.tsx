import { useEffect,useRef,useState } from 'react'
import type { PathObject } from '../domain/models'
import { defaultRiverAppearance,RIVER_SMOOTHING } from '../domain/riverAppearance'
import { RIVER_PRESETS,applyRiverPreset } from '../domain/riverPresets'
import type { RiverPresetId } from '../domain/riverPresets'
import { routeWidth,routeUnit,routeStyle } from '../domain/routes'
import { withPathGeometry,validatePath } from '../domain/paths'
import { isLandMap } from '../domain/geography'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { finishObjectGesture,ownObjectGesture } from '../canvas/interaction'
import { InspectorSection } from './InspectorSection'
import styles from './ObjectProperties.module.css'
export function RiverProperties({object,compact=false}:{object:PathObject;compact?:boolean}){
 const map=useProjectStore(s=>s.map),editing=useEditorStore(s=>s.activeTool==='editPath'),[error,setError]=useState(''),[raw,setRaw]=useState<{label:string;text:string}|null>(null),session=useRef<{finish:(cancel?:boolean)=>void}|null>(null),invalid=useRef(false)
 useEffect(()=>()=>session.current?.finish(true),[])
 useEffect(()=>{const blur=()=>session.current?.finish(invalid.current);window.addEventListener('blur',blur);return()=>window.removeEventListener('blur',blur)},[])
 if(object.route?.kind!=='river')return null
 const r=object.route,a=r.appearance??{...defaultRiverAppearance(),outlineEnabled:r.bank.width>0}
 const change=(edit:(p:PathObject)=>PathObject,continuous=false)=>{
  try{
   const current=useProjectStore.getState().objects.find(o=>o.id===object.id);if(current?.kind!=='path'||current.route?.kind!=='river')return
   const next=validatePath(withPathGeometry(edit(current)));invalid.current=false;setError('')
   if(!continuous){session.current?.finish();history.run('Change river style',()=>useProjectStore.getState().updatePath(next));return}
   if(!session.current){finishObjectGesture();history.begin('Change river style');let release=()=>{};const active={finish:(cancel=false)=>{if(session.current!==active)return;session.current=null;release();if(cancel)history.cancel();else history.commit();setRaw(null)}};session.current=active;release=ownObjectGesture(()=>active.finish(invalid.current),()=>active.finish(true))}
   useProjectStore.getState().updatePath(next)
  }catch(e){invalid.current=true;setError((e as Error).message)}
 }
 const upgraded=(p:PathObject)=>{const r=p.route!;if(r.kind!=='river')throw Error('Choose a river.');return {...p,route:{...r,startWidth:Math.max(.1,routeWidth(p,0)),endWidth:Math.max(.1,routeWidth(p,1)),startFactor:1,endFactor:1,appearance:r.appearance??{...defaultRiverAppearance(),outlineEnabled:r.bank.width>0}}}}
 const edit=(fn:(p:ReturnType<typeof upgraded>)=>PathObject,live=false)=>change(p=>fn(upgraded(p)),live)
 const numeric=(label:string,value:number,set:(p:ReturnType<typeof upgraded>,n:number)=>PathObject,min=0,max=1024,disabled=false)=><label className={styles.field}>{label}<input aria-label={label} type="number" step="any" min={min} max={max} disabled={disabled} value={raw?.label===label?raw.text:value} onChange={e=>{setRaw({label,text:e.target.value});const n=e.target.value.trim()?Number(e.target.value):NaN;if(!Number.isFinite(n)||n<min||n>max){invalid.current=true;setError(`Use ${min}–${max} for ${label}.`);return}edit(p=>set(p,n),true)}} onBlur={()=>{session.current?.finish(invalid.current);if(invalid.current){invalid.current=false;setRaw(null);setError('')}}} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();session.current?.finish(e.key==='Escape'||invalid.current);setRaw(null);setError('');invalid.current=false}}}/></label>
 const halo=(key: 'width'|'opacity'|'softness',n:number,p:ReturnType<typeof upgraded>)=>({...p,route:{...p.route,appearance:{...p.route.appearance,halo:{...p.route.appearance.halo,[key]:n}}}})
 return <section className={`${styles.content} ${styles.river}`} aria-label="River style"><h3>River style</h3><fieldset disabled={editing}>
 <label className={styles.field}>Style preset<select aria-label="River style preset" value={r.preset in RIVER_PRESETS?r.preset:''} onChange={e=>change(p=>applyRiverPreset(p,e.target.value as RiverPresetId))}><option value="" disabled>Legacy / Custom</option>{Object.entries(RIVER_PRESETS).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label>
 <InspectorSection type="river" title="Width setup" initial={!compact}>
 <label className={styles.field}>Width mode<select aria-label="River width mode" value={a.widthMode} onChange={e=>edit(p=>{const mode=e.target.value as typeof a.widthMode;return {...p,route:{...p.route,startWidth:mode==='uniform'?p.route.endWidth:mode==='downstream'?Math.max(.1,p.route.endWidth*.25):p.route.startWidth,appearance:{...p.route.appearance,widthMode:mode}}}})}><option value="uniform">Uniform</option><option value="downstream">Taper downstream</option><option value="manual">Manual</option></select></label>
 <label className={styles.field}>Width units<select aria-label="River width units" value={r.unit} onChange={e=>change(p=>({...p,...routeUnit(routeStyle(p),e.target.value as typeof r.unit,map)}))}><option value="px">Map pixels</option>{isLandMap(map)&&<><option value="km">Kilometres</option><option value="mi">Miles</option></>}</select></label>
 {numeric(`Start width (${r.unit})`,routeWidth(object,0)/r.pixelsPerUnit,(p,n)=>({...p,route:{...p.route,startWidth:n*r.pixelsPerUnit}}),.1/r.pixelsPerUnit,1024/r.pixelsPerUnit,a.widthMode!=='manual')}
 </InspectorSection>
 {numeric(`End width (${r.unit})`,routeWidth(object,1)/r.pixelsPerUnit,(p,n)=>{const width=n*r.pixelsPerUnit;return {...p,strokeWidth:width,route:{...p.route,endWidth:width,startWidth:a.widthMode==='uniform'?width:a.widthMode==='downstream'?Math.max(.1,width*.25):p.route.startWidth}}},.1/r.pixelsPerUnit,1024/r.pixelsPerUnit)}
 <label className={styles.field}>Smoothing<select aria-label="River smoothing" value={a.smoothing} onChange={e=>edit(p=>({...p,route:{...p.route,appearance:{...p.route.appearance,smoothing:e.target.value as typeof a.smoothing}}}))}>{RIVER_SMOOTHING.map(v=><option key={v}>{v}</option>)}</select></label>
 <label className={styles.field}>{object.stroke.kind==='texture'?'Main color (replaces texture)':'Main color'}<input aria-label="River main color" type="color" value={object.stroke.kind==='texture'?'#599fb5':object.stroke.color} onChange={e=>change(p=>({...p,stroke:{kind:'solid',color:e.target.value}}))}/></label>
 <label><input aria-label="River outline" type="checkbox" checked={a.outlineEnabled} onChange={e=>edit(p=>({...p,route:{...p.route,appearance:{...p.route.appearance,outlineEnabled:e.target.checked}}}))}/>Outline</label>
 <InspectorSection type="river" title="River appearance details" initial={!compact}>
 <details><summary>Texture surface</summary><button type="button" onClick={()=>{session.current?.finish(invalid.current);useEditorStore.setState({picker:{kind:'fillPattern',purpose:'pathTexture',replacementId:object.id}})}}>Choose river texture</button>{object.stroke.kind==='texture'&&numeric('River texture scale',object.stroke.scale,(p,n)=>({...p,stroke:p.stroke.kind==='texture'?{...p.stroke,scale:n}:p.stroke}),.01,100)}</details>
 {numeric('River opacity',object.opacity,(p,n)=>({...p,opacity:n}),0,1)}
 {a.outlineEnabled&&<><label className={styles.field}>Outline color<input aria-label="River outline color" type="color" value={r.bank.color} onChange={e=>edit(p=>({...p,route:{...p.route,bank:{...p.route.bank,color:e.target.value}}}))}/></label>{numeric('River outline width (px)',r.bank.width,(p,n)=>({...p,route:{...p.route,bank:{...p.route.bank,width:n}}}),0,128)}</>}
 <label><input aria-label="River halo" type="checkbox" checked={a.halo.enabled} onChange={e=>edit(p=>({...p,route:{...p.route,appearance:{...p.route.appearance,halo:{...p.route.appearance.halo,enabled:e.target.checked,width:p.route.appearance.halo.width||3}}}}))}/>Halo</label>
 {a.halo.enabled&&<><label className={styles.field}>Halo color<input aria-label="River halo color" type="color" value={a.halo.color} onChange={e=>edit(p=>({...p,route:{...p.route,appearance:{...p.route.appearance,halo:{...p.route.appearance.halo,color:e.target.value}}}}))}/></label>{numeric('River halo width (px)',a.halo.width,(p,n)=>halo('width',n,p),0,128)}{numeric('River halo opacity',a.halo.opacity,(p,n)=>halo('opacity',n,p),0,1)}{numeric('River halo softness',a.halo.softness,(p,n)=>halo('softness',n,p),0,1)}</>}
 <details><summary>Geometry and direction</summary><p>Native River Path · first node upstream, last node downstream. Rounded caps and joins. Automatic taper starts at one quarter of the end width. Explicit Bézier handles override smoothing locally.</p></details>
 </InspectorSection>
 </fieldset><p hidden={compact} className="muted">Live changes · Enter or leave a field to keep · Escape cancels. Finish node editing before changing style.</p>{error&&<p role="alert">{error}</p>}</section>
}

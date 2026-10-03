import { useState } from 'react'
import type { TextPanelObject } from '../domain/decorations'
import { panelLayout } from '../domain/decorations'
import { CARTOGRAPHIC_ELEMENT_PRESETS, elementPreset } from '../domain/cartographicPresets'
import type { ElementPreset } from '../domain/cartographicPresets'
import { useProjectStore } from '../store/projectStore'
import { TextFields } from './AnnotationProperties'
import { NumericProperty } from './ObjectProperties'
import { TitlePresetPicker } from './TitlePresetPicker'
import styles from './ObjectProperties.module.css'
export function TitleProperties({object}:{object:TextPanelObject}){
 const [o,set]=useState(object),[error,setError]=useState('')
 const patch=(change:Partial<TextPanelObject>)=>{const next={...o,...change},layout=panelLayout(next);set({...next,height:layout.height*o.width/layout.width})}
 const preset=(id:ElementPreset)=>{const p=elementPreset('title',id);patch({elementPreset:p.id,frame:p.frame!=='none',color:p.ink,background:p.paper,style:{...o.style,color:p.ink}})}
 const number=(key:'x'|'y'|'rotation'|'opacity',label:string)=><NumericProperty label={label} value={o[key]} onCommit={n=>set({...o,[key]:n})}/>
 return <form className={`${styles.content} ${styles.annotation}`} onSubmit={e=>{e.preventDefault();try{useProjectStore.getState().updateAnnotations([o]);setError('')}catch(e){setError((e as Error).message)}}}>
 <h3>Title / Cartouche</h3><label>Title<input aria-label="Element title" maxLength={120} value={o.title} onChange={e=>patch({title:e.target.value})}/></label>
 <label>Subtitle (optional)<textarea aria-label="Subtitle" maxLength={2048} value={o.body} onChange={e=>patch({body:e.target.value})}/></label>
 <label>Style preset<select aria-label="Element style preset" value={o.elementPreset} onChange={e=>preset(e.target.value as ElementPreset)}>{CARTOGRAPHIC_ELEMENT_PRESETS.title.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <TitlePresetPicker value={o.elementPreset} onChange={preset}/>
 {panelLayout(o).overflow&&<p role="status">Text does not fit at the minimum readable size. Shorten the title/subtitle or increase Wrap width. Text is not clipped.</p>}
 <TextFields style={o.style} decoration onChange={style=>patch({style})}/>
 <NumericProperty label="Element width" value={o.width} onCommit={width=>set({...o,width,height:o.height*width/o.width})}/><p className="muted">Width scales the complete title proportionally. Wrap width adjusts its text capacity.</p>
 <details><summary>Frame and placement</summary><label>Name<input aria-label="Object name" maxLength={120} value={o.name} onChange={e=>set({...o,name:e.target.value})}/></label><div className={styles.position}>{number('x','X')}{number('y','Y')}{number('rotation','Rotation')}{number('opacity','Opacity')}</div>
 {elementPreset('title',o.elementPreset).frame!=='none'&&<label><input type="checkbox" checked={o.frame} onChange={e=>set({...o,frame:e.target.checked})}/> Decorative frame / background</label>}
 <label>Frame ink<input aria-label="Frame ink" type="color" value={o.color} onChange={e=>set({...o,color:e.target.value})}/></label><label>Paper color<input aria-label="Paper color" type="color" value={o.background} onChange={e=>set({...o,background:e.target.value})}/></label></details>
 {error&&<p role="alert">{error}</p>}<button type="submit" className="primary">Apply properties</button><button type="button" onClick={()=>{set(object);setError('')}}>Reset changes</button></form>
}

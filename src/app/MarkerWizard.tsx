import { assetHasKind } from '../projects/assets'
import { IllustratedMarkerPicker } from './IllustratedMarkerPicker'
import { illustratedWidthKm } from '../domain/illustratedMarkers'
import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { markerDefaults, markerTypeName, PROMINENCE } from '../domain/markerRegistry'
import { createMarkerBundle } from '../domain/markers'
import type { MarkerChoice, MarkerType } from '../domain/markerRegistry'
import { MarkerFields, MarkerPreview, ProminenceField } from './MarkerFields'
import { Modal } from './Modal'
import styles from './Markers.module.css'
export function MarkerWizard(){
 const map=useProjectStore(s=>s.map)
 const [choice,setChoice]=useState<MarkerChoice>(()=>{const remembered=useEditorStore.getState().markerChoiceMapType===(map.mapType??'battlemap')?(useEditorStore.getState().markerChoice??markerDefaults(map.mapType)):markerDefaults(map.mapType);return remembered.illustration&&!assetHasKind(remembered.illustration.assetId,'stamp')?{...remembered,illustration:undefined}:remembered})
 const [mode,setMode]=useState<'symbol'|'illustrated'>(choice.illustration?'illustrated':'symbol'),[busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const close=()=>useEditorStore.setState({markerWizard:false})
 const objects=createMarkerBundle({x:0,y:0},{...choice,name:[...choice.name].filter(c=>c.charCodeAt(0)>=32&&c.charCodeAt(0)!==127).join('').trim()||'Marker'},map)
 return <Modal title="Create map marker" wide onClose={close}><form onSubmit={e=>{e.preventDefault();if(!choice.name.trim()||busy||(mode==='illustrated'&&!choice.illustration))return;try{createMarkerBundle({x:0,y:0},choice,map);useEditorStore.setState({markerChoice:{...choice,name:choice.name.trim()},markerChoiceMapType:map.mapType??'battlemap',markerWizard:false,activeTool:'place',message:'Click the map to place your marker. Escape cancels.'})}catch(e){setError((e as Error).message)}}}>
 <p>1. Configure your marker → 2. Place on the map</p><div className={styles.layout}><div className={styles.fields}>
 <label>Name<input data-autofocus aria-label="Marker name" maxLength={120} value={choice.name} onChange={e=>setChoice({...choice,name:e.target.value})}/></label>
 <label>Visual style<select aria-label="Marker visual mode" value={mode} onChange={e=>{setMode(e.target.value as typeof mode);setChoice({...choice,illustration:undefined})}}><option value="symbol">Symbol</option><option value="illustrated">Illustrated</option></select></label>
 {map.theme?.id==='world.painterlyFantasy'&&mode==='symbol'&&<p>Illustrated symbols complement this painterly theme.</p>}
 <MarkerFields illustrated={mode==='illustrated'} type={choice.type} marker={choice.marker} mapType={map.mapType} onChange={(type,marker)=>{const defaults=markerDefaults(map.mapType,type as MarkerType);setChoice({...choice,...(type!==choice.type?{illustration:undefined}:{}),type:type as MarkerType,marker:{...marker,...(type!==choice.type?{prominence:defaults.marker.prominence}:{})},...(type!==choice.type?{label:defaults.label,name:choice.name===markerTypeName(choice.type)?markerTypeName(type):choice.name}:{})})}}/>
 {mode==='illustrated'&&<><IllustratedMarkerPicker type={choice.type} mapType={map.mapType??'battlemap'} selected={choice.illustration?.assetId} onBusy={setBusy} onChoose={a=>setChoice(c=>({...c,illustration:{assetId:a.id,aspect:a.aspect,widthKm:c.illustration?.widthKm??illustratedWidthKm(map,c.type,c.marker.prominence)}}))}/>{choice.illustration&&<label>Illustrated width (km)<input aria-label="Illustrated width (km)" type="number" min="0.000001" step="any" value={choice.illustration.widthKm} onChange={e=>{const widthKm=Number(e.target.value);if(widthKm>0&&Number.isFinite(widthKm))setChoice({...choice,illustration:{...choice.illustration!,widthKm}})}}/></label>}</>}
 </div><div className={styles.fields}><MarkerPreview objects={objects}/><ProminenceField value={choice.marker.prominence} onChange={prominence=>setChoice({...choice,marker:{...choice.marker,prominence},...(choice.illustration?{illustration:{...choice.illustration,widthKm:choice.illustration.widthKm*PROMINENCE[prominence].scale/PROMINENCE[choice.marker.prominence].scale}}:{})})}/>
 <label><span><input type="checkbox" checked={choice.label} onChange={e=>setChoice({...choice,label:e.target.checked})}/> Show label</span></label>
 {choice.label&&<label>Label position<select aria-label="Marker label position" value={choice.position} onChange={e=>setChoice({...choice,position:e.target.value as MarkerChoice['position']})}>{['above','below','left','right'].map(p=><option key={p}>{p}</option>)}</select></label>}
 <p>Labels follow the marker name. After placement, edit the label separately to override its text. Illustrations use editable world dimensions with atlas-style exaggeration. Symbols use map pixels.</p>
 </div></div>{error&&<p role="alert">{error}</p>}<div className={styles.actions}><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit" disabled={!choice.name.trim()||busy||(mode==='illustrated'&&!choice.illustration)}>Place on map</button></div></form></Modal>
}

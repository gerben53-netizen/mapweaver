import { InspectorSection } from './InspectorSection'
import { IllustratedMarkerPicker } from './IllustratedMarkerPicker'
import { illustrateMarker, symbolizeMarker, illustratedWidthKm } from '../domain/illustratedMarkers'
import { FontPicker } from './FontPicker'
import { useState } from 'react'
import type { LabelObject, PlaceObject } from '../domain/annotations'
import { restyleLabel } from '../domain/annotations'
import { MARKER_TYPES, markerDefaults, PROMINENCE } from '../domain/markerRegistry'
import type { MarkerType, Prominence } from '../domain/markerRegistry'
import { markerLabel } from '../domain/markers'
import { pixelsPerKm } from '../domain/geography'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { NumericProperty } from './ObjectProperties'
import { MarkerFields, ProminenceField } from './MarkerFields'
import styles from './ObjectProperties.module.css'
export function MarkerProperties({object}:{object:PlaceObject}){
 const map=useProjectStore(s=>s.map)
 const [o,set]=useState(object),[error,setError]=useState(''),[busy,setBusy]=useState(false),[chooseIllustration,setChooseIllustration]=useState(object.visualMode==='illustrated')
 const [label,setLabel]=useState<LabelObject>(()=>useProjectStore.getState().objects.find((v):v is LabelObject=>v.kind==='label'&&v.ownerId===object.id)??markerLabel(object,'below',map))
 const [showLabel,setShowLabel]=useState(()=>useProjectStore.getState().objects.some(v=>v.kind==='label'&&v.ownerId===object.id))
 const resize=(width:number)=>set({...o,width,height:o.height*width/o.width,x:o.x+(o.width-width)*o.anchor.x,y:o.y+(o.height-o.height*width/o.width)*o.anchor.y})
 const prominence=(value:Prominence)=>{if(!o.marker)return;const factor=PROMINENCE[value].scale/PROMINENCE[o.marker.prominence].scale,width=o.width*factor,height=o.height*factor;set({...o,marker:{...o.marker,prominence:value},importance:PROMINENCE[value].importance,width,height,x:o.x+(o.width-width)*o.anchor.x,y:o.y+(o.height-height)*o.anchor.y});setLabel(restyleLabel(label,{...label.style,size:Math.min(200,Math.max(6,label.style.size*factor))}))}
 const number=(key:'x'|'y'|'rotation'|'opacity',name:string)=><NumericProperty key={key} label={name} value={o[key]} onCommit={value=>set({...o,[key]:value})}/>
 const submit=()=>{if(busy||(chooseIllustration&&o.visualMode!=='illustrated'))return;try{const nextLabel=label.markerName?restyleLabel(label,label.style,o.name):label;useProjectStore.getState().editMarker(o,nextLabel,showLabel);setError('')}catch(e){setError((e as Error).message)}}
 return <form className={`${styles.content} ${styles.annotation}`} onSubmit={e=>{e.preventDefault();submit()}}><h3>Marker</h3>
 <label>Name<input aria-label="Marker name" maxLength={120} value={o.name} onChange={e=>set({...o,name:e.target.value})}/></label>
 {o.marker?<><label>Visual style<select aria-label="Marker visual mode" value={chooseIllustration?'illustrated':'symbol'} onChange={e=>{const illustrated=e.target.value==='illustrated';setChooseIllustration(illustrated);if(!illustrated)set(symbolizeMarker(o,map))}}><option value="symbol">Symbol</option><option value="illustrated">Illustrated</option></select></label>
 {chooseIllustration&&<><IllustratedMarkerPicker type={o.placeType} mapType={map.mapType??'battlemap'} selected={o.assetId} onBusy={setBusy} onChoose={a=>set(current=>illustrateMarker(current,{assetId:a.id,aspect:a.aspect,widthKm:current.visualMode==='illustrated'?current.width/current.pixelsPerKm:illustratedWidthKm(map,current.placeType,current.marker!.prominence)},map))}/>{o.visualMode==='illustrated'&&<NumericProperty label="Illustrated width (km)" value={o.width/o.pixelsPerKm} onCommit={n=>resize(n*o.pixelsPerKm)}/>}</>}
 <MarkerFields illustrated={chooseIllustration} compact type={o.placeType} marker={o.marker} mapType={map.mapType} onChange={(placeType,marker)=>set({...o,placeType,marker})}/><ProminenceField value={o.marker.prominence} onChange={prominence}/></>:<><p>Legacy / Custom symbol — existing appearance and size preserved.</p><label>Type<input aria-label="Marker type" maxLength={60} value={o.placeType} onChange={e=>set({...o,placeType:e.target.value})}/></label><button type="button" onClick={()=>{const type=(MARKER_TYPES.some(t=>t[0]===o.placeType)?o.placeType:'custom') as MarkerType;set({...o,placeType:type,assetId:undefined,marker:markerDefaults(map.mapType,type).marker})}}>Use built-in marker…</button></>}
 <InspectorSection type="place" title="Label and appearance"><h4>Label</h4><label><input type="checkbox" checked={showLabel} onChange={e=>setShowLabel(e.target.checked)}/> Show label</label>
 {showLabel&&<><label><input type="checkbox" checked={label.markerName??false} onChange={e=>setLabel({...label,markerName:e.target.checked})}/> Follow marker name</label><label>Label text<textarea aria-label="Marker label text" maxLength={2048} disabled={label.markerName} value={label.markerName?o.name:label.text} onChange={e=>setLabel(restyleLabel({...label,markerName:false},label.style,e.target.value))}/></label><label>Position<select aria-label="Marker label position" value={label.preset} onChange={e=>setLabel({...label,preset:e.target.value as LabelObject['preset']})}>{['above','below','left','right','center'].map(p=><option key={p}>{p}</option>)}</select></label><FontPicker value={label.style} onChange={style=>setLabel(restyleLabel(label,style))}/><p>Select the linked label on the map to edit its halo or offset.</p></>}
 <h4>Appearance</h4>{number('opacity','Opacity')}{number('rotation','Rotation')}
 {o.marker&&!chooseIllustration&&<>{(['ink','outline'] as const).map(key=><label key={key}>{key==='ink'?'Main color':'Outline color'}<input type="color" aria-label={'Marker '+key} value={o.marker![key]} onChange={e=>set({...o,marker:{...o.marker!,[key]:e.target.value}})}/></label>)}</>}
 <details><summary>Metadata</summary><label>Note<textarea aria-label="Marker note" maxLength={1024} value={o.note} onChange={e=>set({...o,note:e.target.value})}/></label><label>Tags<input aria-label="Marker tags" value={o.tags.join(', ')} onChange={e=>set({...o,tags:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)})}/></label></details>
 <details><summary>Advanced</summary>{number('x','X')}{number('y','Y')}
 <label>Size mode<select aria-label="Symbol size mode" value={o.sizeMode} onChange={e=>set({...o,sizeMode:e.target.value as PlaceObject['sizeMode'],pixelsPerKm:pixelsPerKm(map)})}><option value="cartographic">Cartographic (map pixels)</option><option value="world">Map scale (km)</option></select></label>
 <NumericProperty label={o.sizeMode==='world'?'Symbol width (km)':'Symbol width (px at 1×)'} value={o.sizeMode==='world'?o.width/o.pixelsPerKm:o.width} onCommit={n=>resize(o.sizeMode==='world'?n*o.pixelsPerKm:n)}/>
 <label>Symbol anchor<select aria-label="Symbol anchor" value={o.anchor.y} onChange={e=>{const y=Number(e.target.value);set({...o,anchor:{x:o.anchor.x,y},y:o.y+(o.anchor.y-y)*o.height})}}><option value={.5}>Center</option><option value={1}>Bottom</option><option value={0}>Top</option></select></label>
 <p>Map-scale edits preserve existing artwork. World size uses the captured physical scale.</p>
 {!o.marker&&<><NumericProperty label="Legacy importance" value={o.importance} onCommit={importance=>set({...o,importance})}/><button type="button" onClick={()=>useEditorStore.setState({picker:{kind:'stamp',purpose:'annotationSymbol',replacementId:o.id}})}>Use custom asset…</button></>}
 </details></InspectorSection>{error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy||(chooseIllustration&&o.visualMode!=='illustrated')}>Apply properties</button><button type="button" onClick={()=>{set(object);setChooseIllustration(object.visualMode==='illustrated');const existing=useProjectStore.getState().objects.find((v):v is LabelObject=>v.kind==='label'&&v.ownerId===object.id);setLabel(existing??markerLabel(object,'below',map));setShowLabel(!!existing);setError('')}}>Reset changes</button></form>
}

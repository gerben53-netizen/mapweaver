import { StampVariantProperties } from './StampVariantProperties'
import { useState, useId } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useObjectBrowserData } from './useObjectBrowserData'
import { objectListName } from '../domain/objectList'
import { editableProjectIds } from '../domain/projectView'
import { parseNumericProperty } from '../domain/transforms'
import { worldDimension, formatSize } from '../domain/mapScale'
import { isLandMap } from '../domain/geography'
import { canCreateWithTool } from '../domain/mapCapabilities'
import { isOpening } from '../domain/openings'
import { isAnnotation, type LabelObject } from '../domain/annotations'
import type { PathObject } from '../domain/models'
import { InspectorSection } from './InspectorSection'
import { InspectorTransform } from './InspectorTransform'
import { AreaQuick, WallQuick, TextQuick, PathQuick, RouteQuick, PixelMetadata } from './InspectorQuickProperties'
import { ObjectActions } from './LayersPanel'
import { GroupControls, SelectionTransform } from './GroupControls'
import { AreaProperties, AreaBooleanActions } from './AreaProperties'
import { AreaIntentProperties } from './AreaIntentProperties'
import { LandAreaProperties } from './LandAreaProperties'
import { PathProperties } from './PathProperties'

import { RiverProperties } from './RiverProperties'
import { OpeningProperties } from './OpeningProperties'
import { AnnotationProperties, LabelBulkProperties, AddLinkedLabel } from './AnnotationProperties'
import { ScatterProperties, ScatterAreaAction } from './ScatterTools'
import { BoundaryWalls } from './BoundaryWalls'
import { WallBulkProperties } from './WallBulkProperties'
import { StampEffectSettings } from './EffectSettings'
import { AssetDefaultSummary } from '../library/AssetDefaultSummary'
import { AssetDefaultActions } from '../library/AssetDefaultActions'

import { startAreaEdit } from '../store/areaEditing'
import styles from './ObjectProperties.module.css'
import inspector from './Inspector.module.css'
export function NumericProperty({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const errorId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState(false)
  function commit(text: string) {
    const parsed = parseNumericProperty(text)
    if (parsed === null) { setError(true); return }
    try { onCommit(parsed); setDraft(null); setError(false) } catch { setError(true) }
  }
  return <label className={styles.field}>{label}<input type="number" step="any" value={draft ?? Number(value.toFixed(2))} aria-label={label} aria-describedby={error ? errorId : undefined} aria-invalid={error}
    onChange={(event) => { setDraft(event.target.value); setError(false) }}
    onBlur={(event) => { if (draft !== null) commit(event.target.value) }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') { event.preventDefault(); commit(event.currentTarget.value) }
      if (event.key === 'Escape') { setDraft(null); setError(false) }
    }} />{error && <span id={errorId} role="alert">Enter a valid finite value within ±1,000,000,000; dimensions must be positive.</span>}</label>
}
export function ObjectProperties() {
  const ids=useEditorStore(s=>s.selectedObjectIds),state=useProjectStore(),{rows,names,contexts}=useObjectBrowserData(),tool=useEditorStore(s=>s.activeTool)
  const chosen=state.objects.filter(o=>ids.includes(o.id)),selected=chosen.length===1?chosen[0]:undefined,row=rows.find(r=>r.id===selected?.id)
  const walls=chosen.filter((o):o is PathObject=>o.kind==='path'&&o.pathKind==='wall')
  if(!chosen.length)return <section className={inspector.inspector} aria-label="Object properties"><div className={styles.empty}><h2>No object selected</h2><p>Select an object to edit its properties.</p></div></section>
  const editable=editableProjectIds(state),locked=chosen.some(o=>!editable.has(o.id)),type=selected?.kind==='path'?selected.pathKind:selected?.kind||'multiple'
  const layer=state.layers.find(l=>l.objectIds.includes(selected?.id||'')),floor=selected?.kind==='area'&&selected.name==='Floor'
  const title=floor?layer?.name||'Floor':row?objectListName(row,names):`${chosen.length} objects selected`
  const w=selected&&worldDimension(selected.width,state.map),h=selected&&worldDimension(selected.height,state.map)
  const section=(title:string,children:React.ReactNode,initial=false)=><InspectorSection key={type+title} type={type} title={title} initial={initial} forceOpen={title==='Geometry'&&(tool==='editArea'||tool==='editPath')}>{children}</InspectorSection>
  return <section className={inspector.inspector} aria-label="Object properties">
    <header className={inspector.summary} aria-label="Selection identity"><h2>{title}</h2><p>{floor?'Floor · Area · '+layer?.name:row?contexts.get(row.id):[...new Set(chosen.map(o=>o.kind))].join(' · ')}</p>{w&&h&&selected&&selected.kind!=='path'&&!isOpening(selected)&&<strong>{formatSize(w.value)} × {formatSize(h.value)} {w.unit}</strong>}{selected&&isOpening(selected)&&<strong>{formatSize(selected.openingWidth/selected.pixelsPerUnit)} {selected.unit} opening</strong>}{locked&&<p role="status">Selection is hidden or locked. Show and unlock it before editing.</p>}</header>
    <fieldset disabled={locked} key={ids.join('|')}>
      {selected?.kind==='area'&&section('Appearance',<fieldset disabled={tool==='editArea'}><AreaQuick object={selected}/></fieldset>,true)}
      {selected?.kind==='path'&&section(selected.pathKind==='wall'?'Wall':selected.route?'Route':'Path',<fieldset disabled={tool==='editPath'}>{selected.pathKind==='wall'?<WallQuick object={selected}/>:selected.pathKind==='river'?<RiverProperties object={selected} compact/>:selected.route?<RouteQuick object={selected}/>:<PathQuick object={selected}/>}</fieldset>,true)}
      {selected?.kind==='stamp'&&section('Asset',<p>Asset: {names.get(selected.assetId)||'Stamp'}</p>,true)}
      {selected?.kind==='label'&&section('Text',<TextQuick object={selected}/>,true)}
      {selected&&isOpening(selected)&&section('Opening',<OpeningProperties key={JSON.stringify(selected)} object={selected}/>,true)}
      {selected&&isAnnotation(selected)&&selected.kind!=='label'&&section(selected.kind==='place'?'Marker':'Appearance',<AnnotationProperties key={JSON.stringify(selected)} object={selected}/>,true)}
      {selected?.kind==='scatter'&&section('Scatter',<ScatterProperties key={JSON.stringify(selected)} object={selected}/>,true)}
      {selected&&!isOpening(selected)&&section('Transform',<fieldset disabled={tool==='editArea'||tool==='editPath'}><InspectorTransform object={selected}/></fieldset>,true)}
      {!selected&&section('Transform',<SelectionTransform/>,true)}
      {selected?.kind==='area'&&section('Geometry',<AreaProperties key={JSON.stringify(selected)} object={selected} section="geometry"/>)}
      {selected?.kind==='path'&&section('Geometry',<PathProperties key={JSON.stringify(selected)} object={selected} section="geometry"/>)}
      {selected?.kind==='area'&&(isLandMap(state.map)||selected.land)&&section('Terrain',<><AreaIntentProperties object={selected}/><LandAreaProperties key={JSON.stringify(selected)} object={selected}/></>)}
      {selected?.kind==='area'&&section('Appearance details',<AreaProperties key={JSON.stringify(selected)} object={selected} section="appearance"/>)}
      {selected?.kind==='path'&&section('Style details',<PathProperties key={JSON.stringify(selected)} object={selected} section="appearance"/>)}
      {selected?.kind==='label'&&section('Text layout and links',<AnnotationProperties key={JSON.stringify(selected)} object={selected}/>)}
      {selected?.kind==='stamp'&&selected.family&&section('Variant',<StampVariantProperties object={selected}/>,true)}
      {selected?.kind==='stamp'&&section('Appearance',<StampEffectSettings object={selected}/>)}
      {chosen.length>1&&walls.length===chosen.length&&section('Wall style',<WallBulkProperties key={JSON.stringify(walls)} objects={walls}/>)}
      {chosen.length>1&&chosen.every(o=>o.kind==='label')&&section('Text style',<LabelBulkProperties objects={chosen as LabelObject[]}/>)}
      {section('Layer and arrangement',<ObjectActions/>,chosen.length>1)}
      {section('Actions',<>
        {selected?.kind==='area'&&<><div className={inspector.actions}><button onClick={()=>startAreaEdit(selected)}>Edit shape</button>{canCreateWithTool(state.map.mapType,'wall')&&<BoundaryWalls area={selected}/>}<ScatterAreaAction area={selected}/></div>{selected.roomSource&&<button onClick={()=>useEditorStore.setState({roomDialog:true,roomFloorId:selected.id})}>Regenerate room floor</button>}</>}
        {chosen.length>1&&<GroupControls/>}{chosen.length>1&&chosen.every(o=>o.kind==='area')&&<AreaBooleanActions/>}
        {selected&&<><AddLinkedLabel object={selected}/><button onClick={()=>state.changeObject(selected.id,{locked:true})}>Lock object</button><button onClick={()=>state.changeObject(selected.id,{visible:false})}>Hide object</button></>}
        <div className={inspector.actions}><button onClick={state.copy}>Copy</button><button onClick={state.duplicate}>Duplicate</button><button className="destructive" onClick={()=>state.deleteSelection()}>Delete</button></div>
        {chosen.some(o=>o.kind==='stamp')&&<AssetDefaultActions/>}
      </>,chosen.length>1)}
      {selected&&section('Advanced',<><PixelMetadata object={selected}/><label>Object name<input key={selected.id+(selected.name||'')} aria-label="Object name" defaultValue={selected.name||''} maxLength={120} onBlur={e=>{if(e.target.value.trim()&&e.target.value!==selected.name)state.changeObject(selected.id,{name:e.target.value})}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.currentTarget.value=selected.name||'';e.currentTarget.blur()}}}/></label><label>Object group<select aria-label="Object group" value={state.objectGroups.find(g=>g.objectIds.includes(selected.id))?.id||''} onChange={e=>state.groupMember(selected.id,e.target.value||null)}><option value="">No group</option>{state.objectGroups.filter(g=>g.layerId===row?.layerId&&g.visible&&!g.locked).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>{selected.kind==='stamp'&&<AssetDefaultSummary assetId={selected.assetId}/>}</>)}
    </fieldset>
  </section>
}

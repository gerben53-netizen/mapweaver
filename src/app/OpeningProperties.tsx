import { useWindowLightPreview } from '../store/windowLightPreview'
import { InspectorSection } from './InspectorSection'
import { useEditorStore } from '../store/editorStore'
import { useState } from 'react'
import type { OpeningObject, PathObject } from '../domain/models'
import { nextFreePosition, openingPlacement } from '../domain/openings'
import { pathGeometry } from '../domain/paths'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'
import { editableProjectIds } from '../domain/projectView'
import styles from './OpeningTools.module.css'

export function OpeningProperties({object}:{object:OpeningObject}){
  const preview=useWindowLightPreview(s=>s.enabled)
  const [draft,setDraft]=useState(object),[error,setError]=useState(''),objects=useProjectStore(s=>s.objects)
  const allowed=editableProjectIds(useProjectStore.getState()), walls=objects.filter((o):o is PathObject=>o.kind==='path'&&o.pathKind==='wall'&&allowed.has(o.id)),wall=walls.find(w=>w.id===draft.wallId)
  function commit(next=draft){try{history.run('Change opening',()=>useProjectStore.getState().updateOpening(next));setError('')}catch(e){setError((e as Error).message)}}
  return <form className={styles.form} onSubmit={e=>{e.preventDefault();commit()}}>
    <label>Width ({draft.unit})<input aria-label="Opening width value" type="number" step="any" min={4/draft.pixelsPerUnit} max={4096/draft.pixelsPerUnit} value={draft.openingWidth/draft.pixelsPerUnit} onChange={e=>setDraft({...draft,openingWidth:Number(e.target.value)*draft.pixelsPerUnit})}/></label>
    <label>Position (%)<input aria-label="Opening position" type="number" step="any" min="0" max="100" value={Number((draft.position*100).toFixed(2))} onChange={e=>setDraft({...draft,position:Number(e.target.value)/100})}/></label>
    {draft.kind==='door'?<><label>Door type<select aria-label="Door type" value={draft.doorType} onChange={e=>setDraft({...draft,doorType:e.target.value as typeof draft.doorType})}><option value="single">Single</option><option value="double">Double</option><option value="passage">Open passage</option></select></label><label>Status<select aria-label="Door status" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as typeof draft.status})}><option value="closed">Closed</option><option value="open-left">Open left</option><option value="open-right">Open right</option></select></label></>:<label>Window type<select value={draft.windowType} onChange={e=>setDraft({...draft,windowType:e.target.value as typeof draft.windowType})}><option value="simple">Simple</option><option value="wide">Wide</option></select></label>}
    {draft.kind==='window'&&<fieldset><legend>Window Light — Campfire</legend>
      <label><input aria-label="Transmit exterior light" type="checkbox" checked={draft.exteriorLight?.transmitsExteriorLight===true} onChange={e=>setDraft({...draft,exteriorLight:{...draft.exteriorLight,transmitsExteriorLight:e.target.checked}})}/> Transmit exterior light</label>
      <label>Transmission (0–1)<input aria-label="Exterior light transmission" type="number" min={0} max={1} step={.05} placeholder="1 (contract default)" value={draft.exteriorLight?.exteriorLightTransmission??''} onChange={e=>{const light={...draft.exteriorLight,transmitsExteriorLight:draft.exteriorLight?.transmitsExteriorLight??false};if(e.target.value==='')delete light.exteriorLightTransmission;else light.exteriorLightTransmission=Number(e.target.value);setDraft({...draft,exteriorLight:light})}}/></label>
      <label><input aria-label="Window light preview" type="checkbox" checked={preview} onChange={e=>useWindowLightPreview.setState({enabled:e.target.checked})}/> Show aperture preview</label>
      <p>Apply to save. Campfire chooses exterior side, environment, color and reach. The two-sided guide is schematic; its size is not a light range.</p>
    </fieldset>}
    <label><input type="checkbox" checked={draft.flip} onChange={e=>setDraft({...draft,flip:e.target.checked})}/> Flip symbol</label>
    <button type="submit">Apply opening properties</button>
    <InspectorSection type="opening" title="Opening actions"><button type="button" onClick={()=>commit({...draft,side:draft.side===1?-1:1})}>Reverse opening side</button>
    <button type="button" onClick={()=>{try{if(!wall)throw new Error('Choose an available wall.');const g=pathGeometry(wall),s=g.segments[openingPlacement(draft,wall).segmentIndex];commit({...draft,position:(s.start+s.length/2)/g.length})}catch(e){setError((e as Error).message)}}}>Center on segment</button>
    <button type="button" onClick={()=>{try{if(!wall)throw new Error('Choose an available wall.');commit({...draft,position:nextFreePosition(draft,wall,objects)})}catch(e){setError((e as Error).message)}}}>Next free position</button>
    <button type="button" onClick={()=>useEditorStore.setState({picker:{kind:'stamp',purpose:'openingSymbol',replacementId:object.id}})}>Choose symbol asset</button>
    {object.assetId&&<button type="button" onClick={()=>{const next={...draft};delete next.assetId;commit(next)}}>Use built-in symbol</button>}
    </InspectorSection><InspectorSection type="opening" title="Attachment and units">    <label>Name<input aria-label="Opening name" value={draft.name||''} maxLength={120} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
    <label>Wall<select aria-label="Linked wall" value={draft.wallId} onChange={e=>setDraft({...draft,wallId:e.target.value})}>{walls.map(w=><option key={w.id} value={w.id}>{w.name} ({w.id.slice(0,6)})</option>)}</select></label>
    <label>Units<select value={draft.unit} onChange={e=>{const unit=e.target.value as OpeningObject['unit'],pixelsPerUnit=unit==='px'?1:unit==='cells'?useProjectStore.getState().map.grid.cellSize:70;setDraft({...draft,unit,pixelsPerUnit})}}><option>px</option><option>cells</option><option>ft</option><option>m</option></select></label>
    <label>Pixels per unit<input type="number" step="any" min="0.001" max="1000000" disabled={draft.unit==='px'} value={draft.pixelsPerUnit} onChange={e=>setDraft({...draft,pixelsPerUnit:Number(e.target.value)})}/></label>
<p>Drag along the wall. Depth follows its thickness. Copy and duplicate include the complete wall assembly.</p></InspectorSection>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </form>
}

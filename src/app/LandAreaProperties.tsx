import { TerrainAppearanceProperties } from './TerrainAppearanceProperties'
import { canCreateWithTool } from '../domain/mapCapabilities'
import { BorderFromArea } from './BorderFromArea'
import styles from './Geography.module.css'
import { useEffect,useState } from 'react'
import type { AreaObject } from '../domain/models'
import { defaultLandArea,editContour,validateLandArea,coastlineGeometry } from '../domain/landAreas'
import type { AreaRole,TerrainType } from '../domain/landAreas'
import { allRings,withGeometry } from '../domain/areas'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { combineInWorker } from '../canvas/areaBooleanClient'
import { Modal } from './Modal'
import { LandPrecision } from './LandPrecision'
export function LandAreaProperties({object}:{object:AreaObject}) {
  const [land,setLand]=useState(object.land??defaultLandArea()),[amount,setAmount]=useState(2),[preview,setPreview]=useState<AreaObject|null>(null),[error,setError]=useState(''),[clip,setClip]=useState(''),[busy,setBusy]=useState(false)
  const objects=useProjectStore(s=>s.objects),landmasses=objects.filter((o):o is AreaObject=>o.kind==='area'&&o.land?.role==='landmass'&&o.id!==object.id)
  useEffect(()=>()=>{useEditorStore.setState({areaPreview:null})},[])
  function show(next:AreaObject){setPreview(next);useEditorStore.setState({areaPreview:next});setError('')}
  function close(){setPreview(null);useEditorStore.setState({areaPreview:null})}
  async function clipping(){const state=useProjectStore.getState();setBusy(true);try{const mask=landmasses.find(o=>o.id===clip);if(!mask)throw Error('Choose a landmass.');const g=await combineInWorker('intersect',[object.geometry,mask.geometry]);if(useProjectStore.getState().objects!==state.objects)throw Error('The project changed. Preview again.');if(!g)throw Error('No overlap. The terrain was retained.');show(withGeometry(object,g))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const outline=(o:AreaObject,coast=false)=>allRings(coast?coastlineGeometry(o):o.geometry).map(r=>'M'+r.map(p=>`${p.x},${p.y}`).join('L')+'Z').join(' ')
  return <>
    <TerrainAppearanceProperties key={JSON.stringify(object)} object={object}/>{canCreateWithTool(useProjectStore.getState().map.mapType,'route')&&<BorderFromArea object={object}/>}<details className={styles.controls}><summary>Geographic role & contour</summary><p>Conversion preserves geometry, artwork, layer and order. Coastline is a visual stroke effect; clipping uses the original geometry.</p>
    <label>Area role<select aria-label="Area role" value={land.role} onChange={e=>setLand({...land,role:e.target.value as AreaRole})}><option value="area">Area</option><option value="landmass">Landmass</option><option value="terrain-region">Terrain region</option></select></label>
    <label>Automatic label category<select aria-label="Automatic label category" value={land.labelKind||''} onChange={e=>setLand({...land,labelKind:e.target.value?e.target.value as NonNullable<typeof land.labelKind>:undefined})}><option value="">From geographic role</option><option value="region">Region</option><option value="waterMajor">Sea / ocean</option><option value="waterMinor">Lake / bay</option><option value="mountainRange">Mountain range</option></select></label>
    {land.role==='terrain-region'&&<label>Conversion terrain type<select aria-label="Conversion terrain type" value={land.terrain} onChange={e=>setLand({...land,terrain:e.target.value as TerrainType})}>{['forest','mountains','desert','swamp','snow','custom'].map(v=><option key={v}>{v}</option>)}</select></label>}
    {land.role==='landmass'&&<>{(['roughness','step','seed'] as const).map(key=><label key={key}>Coastline {key}<input type="number" step={key==='seed'?1:'any'} value={land.coastline[key]} onChange={e=>setLand({...land,coastline:{...land.coastline,[key]:Number(e.target.value)}})}/></label>)}<p>Color and width use the Area stroke below. Roughness: 0–40 map px.</p></>}
    <button onClick={()=>{try{show({...object,land:validateLandArea(land)})}catch(e){setError((e as Error).message)}}}>Preview role and coastline</button>
    <label>Contour amount<input type="number" min="0.01" max="50" step="any" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label>
    {object.land?.role==='landmass'&&<LandPrecision key={object.id+JSON.stringify(object.geometry)} object={object}/>}
    {(['simplify','smooth'] as const).map(mode=><button key={mode} onClick={()=>{try{show(withGeometry(object,editContour(object.geometry,mode,amount)))}catch(e){setError((e as Error).message)}}}>Preview {mode}</button>)}
    {object.land?.role==='terrain-region'&&<><label>Clip to landmass<select aria-label="Clip to landmass" value={clip} onChange={e=>setClip(e.target.value)}><option value="">Choose landmass</option>{landmasses.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><button disabled={!clip||busy} onClick={()=>void clipping()}>Preview clipping</button><p>Copies the intersection, including holes. Later landmass edits do not change this region. Use Fill selected area with scatter for optional independent decoration.</p></>}
    {error&&<p role="alert">{error}</p>}{preview&&<Modal title="Area change preview" onClose={close}><svg viewBox={`${Math.min(object.x,preview.x)-45} ${Math.min(object.y,preview.y)-45} ${Math.max(object.width,preview.width)+90} ${Math.max(object.height,preview.height)+90}`} style={{width:'100%',height:220,background:'#293840'}} aria-label="Geographic area preview"><path d={outline(object)} fill="none" stroke="#e5bb75" strokeWidth="2" strokeDasharray="6 4"/><path d={outline(preview)} fill={preview.fill.kind==='solid'?preview.fill.color:'#839d80'} fillRule="evenodd" opacity="0.7"/><path d={outline(preview,true)} fill="none" stroke={preview.strokeColor} strokeWidth={Math.max(1,preview.strokeWidth)}/></svg><p>Dashed amber: original. Solid: proposed result. The canvas previews the result without saving. {allRings(object.geometry).reduce((n,r)=>n+r.length,0)} → {allRings(preview.geometry).reduce((n,r)=>n+r.length,0)} nodes. Role: {preview.land?.role??'area'}. Apply is one undo step.</p><button onClick={()=>{try{if(useProjectStore.getState().objects.find(o=>o.id===object.id)!==object)throw Error('Object changed. Preview again.');history.run('Change geographic area',()=>useProjectStore.getState().updateArea(preview));close()}catch(e){setError((e as Error).message);close()}}}>Apply area change</button><button onClick={close}>Cancel</button></Modal>}
  </details></>
}

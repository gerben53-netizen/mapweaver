import type { NewMapDraft } from '../projects/newMap'
import type { MapType } from '../domain/geography'
import { defaultGeography } from '../domain/geography'
import { DEFAULT_GRID } from '../domain/mapSettings'
import { defaultMapTheme, themesForMap } from '../domain/worldThemes'
import { ThemeCards } from './ThemeCards'
import { Modal } from './Modal'
import styles from './NewMapWizard.module.css'

export function NewMapWizard({draft,setDraft,busy,error,onClose,onCreate}:{draft:NewMapDraft;setDraft:(draft:NewMapDraft)=>void;busy:boolean;error:string;onClose:()=>void;onCreate:()=>void}) {
 const land=draft.mapType!=='battlemap',themes=themesForMap(draft.mapType)
 return <Modal title="New map" wide busy={busy} onClose={onClose}><form className={styles.form} onSubmit={e=>{e.preventDefault();if(draft.name.trim())onCreate()}}>
  <fieldset disabled={busy}><legend>1 · Basics</legend><div className={styles.fields}>
   <label>Name<input data-autofocus required maxLength={120} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
   <label>Map type<select aria-label="Map type" value={draft.mapType} onChange={e=>{const mapType=e.target.value as MapType;setDraft({...draft,mapType,widthKm:String(defaultGeography(mapType).widthKm),themeId:defaultMapTheme(mapType),startingPoint:'blank'})}}><option value="battlemap">Battlemap</option><option value="regional-map">Regional map</option><option value="world-map">World map</option></select></label>
  </div></fieldset>
  <fieldset disabled={busy}><legend>2 · Size</legend><div className={styles.fields}>
   {land&&<label>Geographic width (km)<input required type="number" min={draft.startingPoint==='generate'?1:.000001} max={draft.startingPoint==='generate'?1000000:1000000000} step="any" value={draft.widthKm} onChange={e=>setDraft({...draft,widthKm:e.target.value})}/></label>}
   {(['width','height'] as const).map(edge=><label key={edge}>{land?(edge==='width'?'Width (px)':'Height (px)'):(edge==='width'?'Columns (squares)':'Rows (squares)')}<input required type="number" min={draft.startingPoint==='generate'?512:land?1:1/DEFAULT_GRID.cellSize} max={draft.startingPoint==='generate'?4096:land?8192:8192/DEFAULT_GRID.cellSize} step={land?1:'any'} value={draft[edge]===''?'':Number(draft[edge])/(land?1:DEFAULT_GRID.cellSize)} onChange={e=>setDraft({...draft,[edge]:e.target.value===''?'':String(Number(e.target.value)*(land?1:DEFAULT_GRID.cellSize))})}/></label>)}
  </div><p className="muted">{draft.width} × {draft.height} px{land?' · Flat creative canvas':` · ${DEFAULT_GRID.cellSize} px/square`}</p></fieldset>
  <fieldset disabled={busy}><legend>3 · Visual theme</legend>{themes.length?<ThemeCards themes={themes} selected={draft.themeId} onSelect={themeId=>setDraft({...draft,themeId})} disabled={busy}/>:<><p>Neutral canvas · World and Regional themes are not available for battlemaps.</p><label>Background color<input type="color" value={draft.color} onChange={e=>setDraft({...draft,color:e.target.value})}/></label></>}</fieldset>
  <fieldset disabled={busy} className={styles.start}><legend>4 · Starting point</legend><label><input type="radio" name="starting-point" checked={draft.startingPoint==='blank'} onChange={()=>setDraft({...draft,startingPoint:'blank'})}/>Blank map</label>{draft.mapType==='world-map'&&<label><input type="radio" name="starting-point" checked={draft.startingPoint==='generate'} onChange={()=>setDraft({...draft,startingPoint:'generate'})}/>Generate world</label>}<p className="muted">{draft.startingPoint==='generate'?'Next, preview editable geography with this theme before creating your map.':'Start empty with your selected background and visual defaults.'}</p></fieldset>
  {error&&<p role="alert">{error}</p>}<div className={styles.actions}><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!draft.name.trim()||!!themes.length&&!themes.some(t=>t.id===draft.themeId)} type="submit">{draft.startingPoint==='generate'?'Continue to world preview':'Create map'}</button></div>
 </form></Modal>
}

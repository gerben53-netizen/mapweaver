import { RoomGeneratorAction } from './RoomGeneratorWizard'
import { isHexGrid, hexGridRange, MAX_HEX_CELLS, type GridType } from '../domain/hexGrid'
import { pixelsToDistance, mapWorkspace } from '../domain/geography'
import { GeographyFinishSettings } from './GeographyFinishSettings'
import { WorldThemePicker } from './WorldThemePicker'
import { MapEffectSettings } from './EffectSettings'
import { WaterAppearanceSettings } from './WaterAppearanceSettings'
import { GeographicSettings } from './GeographicSettings'
import { isLandMap } from '../domain/geography'
import { useState } from 'react'
import type { MapDocument, GridSettings } from '../domain/models'
import { MAX_MAP_EDGE, MAX_MAP_PIXELS, MIN_CELL_SIZE, MAX_CELL_SIZE, normalizeColor } from '../domain/mapSettings'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { canvasFromSquares, squareDimensions, mapSizeText, gameScaleText } from './editorUx'
import styles from './MapSettingsPanel.module.css'
function SettingsForm({map}:{map:MapDocument}) {
 const land=isLandMap(map),hex=isHexGrid(map.grid),pixels=land||hex,cells=squareDimensions(map.width,map.height,map.grid.cellSize)
 const [width,setWidth]=useState(String(pixels?map.width:cells.columns)),[height,setHeight]=useState(String(pixels?map.height:cells.rows)),[error,setError]=useState('')
 const apply=(change:(m:MapDocument)=>MapDocument,resize=false)=>{setError('');finishObjectGesture();try{useProjectStore.getState().applyMapSettings(change(useProjectStore.getState().map),impact=>!resize||window.confirm(`The new bounds clip ${impact.objectCount} object(s)${impact.background?' and the background':''}. Nothing is deleted or scaled. Resize canvas?`))}catch(e){setError((e as Error).message)}}
 const grid=(patch:Partial<GridSettings>)=>apply(m=>({...m,grid:{...m.grid,...patch}}))
 const number=(label:string,value:number,change:(n:number)=>void,min?:number,max?:number)=><label>{label}<input key={value} type="number" step="any" min={min} max={max} defaultValue={value} onBlur={e=>{if(e.target.value!==String(value))change(e.target.value.trim()?Number(e.target.value):NaN)}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}}}/></label>
 const color=(label:string,value:string,change:(s:string)=>void)=><label>{label}<div className={styles.color}><input type="color" aria-label={label+' picker'} value={value} onChange={e=>change(e.target.value)}/><input aria-label={label+' hex'} key={value} defaultValue={value} onBlur={e=>{try{const v=normalizeColor(e.target.value);if(v!==value)change(v)}catch(err){setError((err as Error).message)}}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></div></label>
 return <div className={styles.form}>
  <form onSubmit={e=>{e.preventDefault();apply(m=>({...m,...(pixels?{width:Number(width),height:Number(height)}:canvasFromSquares(Number(width),Number(height),m.grid.cellSize))}),true)}}>
   <h2>Map size</h2><div className={styles.pair}><label>{pixels?'Width (px)':'Columns (squares)'}<input type="number" step="any" required min="0.000001" value={width} onChange={e=>setWidth(e.target.value)}/></label><label>{pixels?'Height (px)':'Rows (squares)'}<input type="number" step="any" required min="0.000001" value={height} onChange={e=>setHeight(e.target.value)}/></label></div>
   <p>{pixels?'Canvas': 'Result'}: {Number(width)*(pixels?1:map.grid.cellSize)} × {Number(height)*(pixels?1:map.grid.cellSize)} px</p><button title={`Maximum ${MAX_MAP_EDGE} px per side / ${MAX_MAP_PIXELS.toLocaleString()} pixels`}>Resize canvas</button><p className="muted">Objects keep their size and position.</p>
  </form>
  {land&&<GeographyFinishSettings key={JSON.stringify(map.geographyFinish)} map={map}/>}
  {land&&<WaterAppearanceSettings key={JSON.stringify(map.water)} map={map}/>}
  {color('Map color',map.backgroundColor,v=>apply(m=>({...m,backgroundColor:v})))}
  <label>Grid type<select aria-label="Grid type" value={map.grid.type??'square'} onChange={e=>grid({type:e.target.value as GridType})}><option value="square">Square</option><option value="hex-flat">Hex — Flat top</option><option value="hex-pointy">Hex — Pointy top</option></select></label>
  {(!land||hex)&&<><fieldset><legend>Grid</legend>
   <label className={styles.check}><input type="checkbox" checked={map.grid.visible} onChange={e=>grid({visible:e.target.checked})}/>Show grid</label>
   <label className={styles.check}><input type="checkbox" checked={map.grid.snapEnabled} onChange={e=>grid({snapEnabled:e.target.checked})}/>Snap to grid</label>
   {number(hex?'Hex diameter (px)':'Resolution (px/square)',map.grid.cellSize,v=>grid({cellSize:v}),MIN_CELL_SIZE,MAX_CELL_SIZE)}<p className="muted">Grid spacing only; artwork stays unchanged. Enter or leave the field to confirm.</p>
  {hex&&<p>Diameter is corner to corner. Origin offsets locate cell (0, 0). {land&&`${pixelsToDistance(map.grid.cellSize,map).toFixed(3)} ${mapWorkspace(map).geography.unit} per diameter.`}</p>}{hex&&hexGridRange(map,map.grid).count>MAX_HEX_CELLS&&<p role="status">Grid too dense to draw. Increase diameter or export without grid.</p>}
  </fieldset>{!hex&&<GameScale key={JSON.stringify(map.grid.physicalScale)} map={map} change={physicalScale=>grid({physicalScale})}/>}
  <details><summary>Advanced grid settings</summary>
   {number('Offset X (px)',map.grid.offsetX,v=>grid({offsetX:v}))}{number('Offset Y (px)',map.grid.offsetY,v=>grid({offsetY:v}))}
   {color('Grid color',map.grid.color,v=>grid({color:v}))}
   <label>Line opacity (%)<input type="range" min="0" max="100" value={map.grid.opacity*100} onChange={e=>grid({opacity:Number(e.target.value)/100})}/><output>{Math.round(map.grid.opacity*100)}%</output></label>
   <label className={styles.check}><input type="checkbox" checked={map.grid.renderAboveObjects} onChange={e=>grid({renderAboveObjects:e.target.checked})}/>Grid above objects</label>
  </details></>}
  {error&&<p role="alert">{error}</p>}
 </div>
}
function GameScale({map,change}:{map:MapDocument;change:(value:GridSettings['physicalScale'])=>void}) {
 const [distance,setDistance]=useState(String(map.grid.physicalScale?.distancePerCell||'')),[unit,setUnit]=useState<'ft'|'m'>(map.grid.physicalScale?.unit||'ft')
 return <fieldset><legend>Game scale</legend><p>{gameScaleText(map)}</p><label>1 square equals<input type="number" min="0.000001" step="any" value={distance} onChange={e=>setDistance(e.target.value)}/></label><label>Game distance unit<select value={unit} onChange={e=>setUnit(e.target.value as 'ft'|'m')}><option value="ft">Feet</option><option value="m">Metres</option></select></label><button onClick={()=>change(distance?{distancePerCell:Number(distance),unit}:undefined)}>Set game scale</button><p className="muted">Optional. Clear the distance to remove it. Existing artwork never resizes.</p></fieldset>
}
export function MapSettingsPanel() {
 const map=useProjectStore(s=>s.map)
 return <section className={styles.panel} aria-label="Map settings"><RoomGeneratorAction/><GeographicSettings key={map.mapType+JSON.stringify(map.geography)} map={map}/><WorldThemePicker/><SettingsForm key={`${map.mapType||'battlemap'}:${map.width}:${map.height}:${map.grid.cellSize}:${map.grid.type}`} map={map}/><MapEffectSettings map={map}/><p className={styles.summary}>{mapSizeText(map)}{!isLandMap(map)&&!isHexGrid(map.grid)&&<> · {map.width} × {map.height} px<br/>{gameScaleText(map)}</>}</p></section>
}


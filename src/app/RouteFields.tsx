import { endPathEdit } from '../store/pathEditing'
import type { PathObject } from '../domain/models'
import { routePreset, routeStyle, routeUnit } from '../domain/routes'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { pixelsToDistance, mapWorkspace, isLandMap } from '../domain/geography'
import styles from './ObjectProperties.module.css'
export function RouteFields({value:p,onChange}:{value:PathObject;onChange:(p:PathObject)=>void}){
  const map=useProjectStore(s=>s.map),r=p.route!
  const patch=(next:Partial<PathObject>)=>onChange({...p,...next})
  const number=(label:string,value:number,set:(n:number)=>void)=><label className={styles.field}>{label}<input aria-label={label} type="number" step="any" value={value} onChange={e=>set(Number(e.target.value))}/></label>
  const color=(label:string,value:string,set:(n:string)=>void)=><label className={styles.field}>{label}<input aria-label={label} type="color" value={value} onChange={e=>set(e.target.value)}/></label>
  return <>
    <p>Concrete preset: {r.preset}. Changing values affects this object only.</p>
    {r.kind==='road'&&<label className={styles.field}>Road class<select aria-label="Road class" value={r.roadClass} onChange={e=>patch(routePreset('road',e.target.value))}>{['trail','road','major'].map(v=><option key={v}>{v}</option>)}</select></label>}
    <label className={styles.field}>Width units<select aria-label="Route width units" value={r.unit} onChange={e=>patch(routeUnit(routeStyle(p),e.target.value as typeof r.unit,map))}><option value="px">Map pixels</option>{isLandMap(map)&&<><option value="km">Kilometres</option><option value="mi">Miles</option></>}</select></label>
    <p>{(r.kind==='river'?r.startWidth*r.startFactor:p.strokeWidth).toFixed(2)}{r.kind==='river'?` → ${(r.endWidth*r.endFactor).toFixed(2)}`:''} map px · {pixelsToDistance(r.kind==='river'?r.startWidth*r.startFactor:p.strokeWidth,map).toFixed(3)}{r.kind==='river'?` → ${pixelsToDistance(r.endWidth*r.endFactor,map).toFixed(3)}`:''} {mapWorkspace(map).geography.unit} at current map scale</p>
    {r.kind==='river'?<>
      <p>Direction: first node (source) → last node (mouth).</p>
      {number(`Source width (${r.unit})`,r.startWidth/r.pixelsPerUnit,n=>patch({route:{...r,startWidth:n*r.pixelsPerUnit}}))}
      {number(`Mouth width (${r.unit})`,r.endWidth/r.pixelsPerUnit,n=>patch({strokeWidth:n*r.pixelsPerUnit,route:{...r,endWidth:n*r.pixelsPerUnit}}))}
      {number('Source taper factor',r.startFactor,n=>patch({route:{...r,startFactor:n}}))}
      {number('Mouth widening factor',r.endFactor,n=>patch({route:{...r,endFactor:n}}))}
      {number('Bank width (px)',r.bank.width,n=>patch({route:{...r,bank:{...r.bank,width:n}}}))}
      {color('Bank color',r.bank.color,n=>patch({route:{...r,bank:{...r.bank,color:n}}}))}
    </>:number(`Route width (${r.unit})`,p.strokeWidth/r.pixelsPerUnit,n=>patch({strokeWidth:n*r.pixelsPerUnit}))}
    {number('Route opacity',p.opacity,n=>patch({opacity:n}))}
    {r.kind!=='border'&&<label className={styles.field}>Surface<select aria-label="Route surface" value={p.stroke.kind} onChange={e=>patch({stroke:e.target.value==='texture'?{kind:'texture',assetId:'choose-texture',scale:1,spacing:16,offset:0}:e.target.value==='dashed'?{kind:'dashed',color:'#beab82',dash:10,gap:6}:{kind:'solid',color:r.kind==='river'?'#599fb5':'#cbb78d'}})}><option value="solid">Solid</option>{r.kind==='road'&&<option value="dashed">Dashed</option>}<option value="texture">Texture</option></select></label>}
    {p.stroke.kind==='texture'?<>
      <button type="button" onClick={()=>{if(useEditorStore.getState().activeTool==='editPath')endPathEdit();useEditorStore.setState({picker:{kind:'fillPattern',purpose:'pathTexture',replacementId:p.id}})}}>Choose route texture</button>
      {number('Texture scale',p.stroke.scale,n=>{if(p.stroke.kind==='texture')patch({stroke:{...p.stroke,scale:n}})})}
      <p>Tileable fill pattern, clipped to the route. Missing image: pink fallback.</p>
    </>:color('Route color',p.stroke.color,n=>{if(p.stroke.kind!=='texture')patch({stroke:{...p.stroke,color:n}})})}
    {p.stroke.kind==='dashed'&&<>{number('Route dash',p.stroke.dash,n=>{if(p.stroke.kind==='dashed')patch({stroke:{...p.stroke,dash:n}})})}{number('Route gap',p.stroke.gap,n=>{if(p.stroke.kind==='dashed')patch({stroke:{...p.stroke,gap:n}})})}</>}
    {r.kind==='road'&&<>
      <label className={styles.field}>Cap<select aria-label="Road cap" value={p.cap} onChange={e=>patch({cap:e.target.value as PathObject['cap']})}>{['round','butt','square'].map(v=><option key={v}>{v}</option>)}</select></label><label className={styles.field}>Join<select aria-label="Road join" value={p.join} onChange={e=>patch({join:e.target.value as PathObject['join']})}>{['round','miter','bevel'].map(v=><option key={v}>{v}</option>)}</select></label>
      {number('Road outline width',r.outline.width,n=>patch({route:{...r,outline:{...r.outline,width:n}}}))}{color('Road outline color',r.outline.color,n=>patch({route:{...r,outline:{...r.outline,color:n}}}))}
      {number('Center marking width',r.marking.width,n=>patch({route:{...r,marking:{...r.marking,width:n}}}))}{color('Center marking color',r.marking.color,n=>patch({route:{...r,marking:{...r.marking,color:n}}}))}
      {number('Center dash',r.marking.dash,n=>patch({route:{...r,marking:{...r.marking,dash:n}}}))}{number('Center gap',r.marking.gap,n=>patch({route:{...r,marking:{...r.marking,gap:n}}}))}
    </>}
    {r.kind==='border'&&<>
      <label className={styles.field}>Border style<select aria-label="Border style" value={r.style} onChange={e=>patch({route:{...r,style:e.target.value as typeof r.style}})}>{['solid','dashed','dotted','double'].map(v=><option key={v}>{v}</option>)}</select></label>
      {number('Border dash',r.dash,n=>patch({route:{...r,dash:n}}))}{number('Border gap',r.gap,n=>patch({route:{...r,gap:n}}))}
      {number('Halo width',r.halo.width,n=>patch({route:{...r,halo:{...r.halo,width:n}}}))}{color('Halo color',r.halo.color,n=>patch({route:{...r,halo:{...r.halo,color:n}}}))}
    </>}
  </>
}

import { WallFields } from './WallFields'
import { generatedWallStyle } from '../domain/generatedWalls'
import { openMaterialBrowser } from '../store/materialApplication'
import { inspectorEdit } from './inspectorEdit'
import type { AreaObject, MapObject, PathObject } from '../domain/models'
import type { LabelObject } from '../domain/annotations'
import { restyleLabel } from '../domain/annotations'
import { WALL_PRESETS, wallPreset } from '../domain/wallPresets'
import { wallStyle } from '../domain/walls'
import { routePreset } from '../domain/routes'
import { withPathGeometry } from '../domain/paths'
import { worldDimension } from '../domain/mapScale'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { projectAssets } from '../projects/assets'
import { NumericProperty } from './ObjectProperties'
import { AreaPatternScale } from './AreaPatternScale'
import { FontPicker } from './FontPicker'
import { WallSetPicker } from './WallSetPicker'
import styles from './Inspector.module.css'

export function AreaQuick({object}:{object:AreaObject}){
  const edit=(patch:Partial<AreaObject>)=>inspectorEdit(()=>history.run('Change area properties',()=>useProjectStore.getState().updateArea({...object,...patch})))
  const material=object.fill.kind==='pattern'?projectAssets().find(a=>a.id===(object.fill.kind==='pattern'?object.fill.assetId:''))?.name||'Pattern':'Choose pattern…'
  return <><label>Material<select aria-label="Area material" value={object.fill.kind} onChange={e=>e.target.value==='pattern'?openMaterialBrowser([object.id]):edit({fill:e.target.value==='none'?{kind:'none'}:{kind:'solid',color:'#c7b897'}})}><option value="solid">Solid color</option><option value="pattern">Pattern</option><option value="none">No fill</option></select></label>
    <button title="Apply material to this Area" onClick={()=>openMaterialBrowser([object.id])}>Browse materials · {material}</button>
    {object.fill.kind==='pattern'?<AreaPatternScale object={object} compact/>:object.fill.kind==='solid'&&<label>Color<input aria-label="Area color" type="color" value={object.fill.color} onChange={e=>edit({fill:{kind:'solid',color:e.target.value}})}/></label>}
    <NumericProperty label="Opacity (%)" value={object.opacity*100} onCommit={n=>{if(n<0||n>100)throw Error('Use 0–100%.');history.run('Change area opacity',()=>useProjectStore.getState().updateArea({...object,opacity:n/100}))}}/>
  </>
}
export function WallQuick({object}:{object:PathObject}){
  const map=useProjectStore(s=>s.map),wall=object.wall!,current=WALL_PRESETS.find(p=>object.stroke.kind==='solid'&&p.color===object.stroke.color&&p.join===object.join)
  const edit=(style:ReturnType<typeof wallStyle>)=>inspectorEdit(()=>useProjectStore.getState().updateWallStyles([object.id],style))
  if(wall.generated)return <WallFields value={wallStyle(object)} onChange={edit}/>
  return <><label>Type<select aria-label="Wall preset" value={current?.id||''} onChange={e=>{const p=e.target.value==='generated-living-root'?generatedWallStyle(wallStyle(object),map):wallPreset(e.target.value,map);edit({...p,wall:{...p.wall,...(wall.alignment?{alignment:wall.alignment}:{})}})}}><option value="">Custom / material</option><option value="generated-living-root">Living Root</option>{WALL_PRESETS.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <NumericProperty label={`Thickness (${wall.unit})`} value={object.strokeWidth/wall.pixelsPerUnit} onCommit={n=>useProjectStore.getState().updateWallStyles([object.id],{...wallStyle(object),strokeWidth:n*wall.pixelsPerUnit})}/>
    <label>Material<WallSetPicker value={wallStyle(object)} onChange={edit}/></label>
  </>
}
export function TextQuick({object}:{object:LabelObject}){
  const style=(s:LabelObject['style'])=>inspectorEdit(()=>useProjectStore.getState().updateAnnotations([restyleLabel(object,s)]))
  return <><label>Text<textarea aria-label="Label text" key={object.id+object.text} defaultValue={object.text} maxLength={2048} onBlur={e=>{if(e.target.value!==object.text)inspectorEdit(()=>useProjectStore.getState().updateAnnotations([restyleLabel({...object,markerName:false},object.style,e.target.value)]))}}/></label><FontPicker value={object.style} onChange={style}/><div className={styles.pair}><NumericProperty label="Font size" value={object.style.size} onCommit={size=>useProjectStore.getState().updateAnnotations([restyleLabel(object,{...object.style,size})])}/><label>Color<input aria-label="Text color" type="color" value={object.style.color} onChange={e=>style({...object.style,color:e.target.value})}/></label></div><label>Alignment<select aria-label="Text alignment" value={object.style.align} onChange={e=>style({...object.style,align:e.target.value as LabelObject['style']['align']})}>{['left','center','right'].map(v=><option key={v}>{v}</option>)}</select></label></>
}
export function PathQuick({object}:{object:PathObject}){
  const map=useProjectStore(s=>s.map),scale=worldDimension(1,map),unit=scale?.unit||'px',ratio=scale?.value||1
  const edit=(p:PathObject)=>history.run('Change path properties',()=>useProjectStore.getState().updatePath(withPathGeometry(p)))
  return <><label>Stroke<select aria-label="Path stroke" value={object.stroke.kind} onChange={e=>{if(e.target.value==='texture')useEditorStore.setState({picker:{kind:'fillPattern',purpose:'pathTexture',replacementId:object.id}});else inspectorEdit(()=>edit({...object,stroke:e.target.value==='solid'?{kind:'solid',color:'#dfbe85'}:{kind:'dashed',color:'#dfbe85',dash:16,gap:8}}))}}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="texture">Texture</option></select></label><NumericProperty label={`Path width (${unit})`} value={object.strokeWidth*ratio} onCommit={n=>edit({...object,strokeWidth:n/ratio})}/>{object.stroke.kind!=='texture'&&<label>Color<input aria-label="Path color" type="color" value={object.stroke.color} onChange={e=>inspectorEdit(()=>edit({...object,stroke:{...object.stroke,kind:object.stroke.kind==='dashed'?'dashed':'solid',color:e.target.value} as PathObject['stroke']}))}/></label>}</>
}
export function PixelMetadata({object}:{object:MapObject}){return <div className={styles.technical}><h4>Canvas dimensions</h4><p>{object.width.toFixed(2)} × {object.height.toFixed(2)} px</p><p>X {object.x.toFixed(2)} · Y {object.y.toFixed(2)} px</p><h4>Identity</h4><p>{object.kind} · {object.id}</p></div>}


export function RouteQuick({object}:{object:PathObject}) {
  const r=object.route!
  const edit=(patch:Partial<PathObject>)=>inspectorEdit(()=>history.run('Change route properties',()=>useProjectStore.getState().updatePath(withPathGeometry({...object,...patch}))))
  return <>
    {r.kind==='road'&&<label>Road class<select aria-label="Road class" value={r.roadClass} onChange={e=>edit(routePreset('road',e.target.value))}>{['trail','road','major'].map(v=><option key={v}>{v}</option>)}</select></label>}
    {r.kind==='border'&&<label>Border style<select aria-label="Border style" value={r.style} onChange={e=>edit({route:{...r,style:e.target.value as typeof r.style}})}>{['solid','dashed','dotted','double'].map(v=><option key={v}>{v}</option>)}</select></label>}
    <NumericProperty label={`Route width (${r.unit})`} value={object.strokeWidth/r.pixelsPerUnit} onCommit={n=>history.run('Change route width',()=>useProjectStore.getState().updatePath(withPathGeometry({...object,strokeWidth:n*r.pixelsPerUnit})))}/>
    {object.stroke.kind!=='texture'&&<label>Color<input type="color" aria-label="Route color" value={object.stroke.color} onChange={e=>{if(object.stroke.kind!=='texture')edit({stroke:{...object.stroke,color:e.target.value}})}}/></label>}
    {r.kind==='road'&&<NumericProperty label="Outline width (px)" value={r.outline.width} onCommit={n=>history.run('Change road outline',()=>useProjectStore.getState().updatePath(withPathGeometry({...object,route:{...r,outline:{...r.outline,width:n}}})))}/>}
  </>
}

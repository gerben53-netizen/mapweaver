import { GeneratedWallFields } from './GeneratedWallFields'
import { generatedWallStyle,generatedDefinitions } from '../domain/generatedWalls'
import { ContinuousWallFields } from './ContinuousWallFields'
import { WALL_PRESETS, wallPreset } from '../domain/wallPresets'
import { WallSetPicker } from './WallSetPicker'
import type { WallSettings } from '../domain/models'
import type { WallStyle } from '../domain/walls'
import { SIMPLE_WALL, STONE_WALL } from '../domain/walls'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useImage } from '../images/useImage'
import styles from './WallFields.module.css'
export function WallFields({value,onChange,compact=false,replacementId,replacementIds}:{value:WallStyle;onChange:(s:WallStyle)=>void;compact?:boolean;replacementId?:string;replacementIds?:string[]}) {
  const map=useProjectStore(s=>s.map),grid=map.grid.cellSize
  const {image,error}=useImage(value.stroke.kind==='texture'?value.stroke.assetId:'','asset','fillPattern')
  const patch=(p:Partial<WallStyle>)=>onChange({...value,...p})
  const wall=(p:Partial<WallSettings>)=>patch({wall:{...value.wall,...p}})
  const texture=()=>useEditorStore.setState({picker:{kind:'fillPattern',purpose:'wallTexture',replacementId,replacementIds}})
  const number=(label:string,n:number,change:(n:number)=>void,min=0,max=1000000)=><label>{label} <input aria-label={label} type="number" step="any" min={min} max={max} value={Number(n.toFixed(4))} onChange={e=>change(Number(e.target.value))}/></label>
  const selector=<label>Material / Generator<select aria-label="Wall material or generator" value={value.wall.generated?value.wall.generated.id+'@'+value.wall.generated.revision:'existing'} onChange={e=>{const d=generatedDefinitions().find(d=>d.id+'@'+d.revision===e.target.value);onChange(d?generatedWallStyle(value,map,d.id,d.revision):{...value,wall:{...value.wall,renderingMode:undefined,generated:undefined}})}}><option value="existing">Existing wall materials</option>{generatedDefinitions().filter(d=>!import.meta.env.VITE_MAPWEAVER_INSTALLER || d.revision!=='dev-1' || value.wall.generated?.revision===d.revision).map(d=><option key={d.id+'@'+d.revision} value={d.id+'@'+d.revision}>{d.name}{d.revision==='dev-1'?' (development)':''}</option>)}</select></label>
  if(value.wall.generated)return <div className={compact?styles.compact:styles.fields}>{selector}<GeneratedWallFields value={value} onChange={onChange}/></div>
  return <div className={compact?styles.compact:styles.fields}>{selector}
    <WallSetPicker value={value} onChange={onChange}/><label>Preset<select aria-label="Wall preset" value="" onChange={e=>{const preset=wallPreset(e.target.value,map);onChange({...preset,wall:{...preset.wall,...(value.wall.alignment?{alignment:value.wall.alignment}:{})}})}}><option value="" disabled>Choose preset</option>{WALL_PRESETS.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label>Style <select aria-label="Wall style" value={JSON.stringify(value)===JSON.stringify(SIMPLE_WALL)?'simple':JSON.stringify(value)===JSON.stringify(STONE_WALL)?'stone':'custom'} onChange={e=>{const chosen=structuredClone(e.target.value==='simple'?SIMPLE_WALL:e.target.value==='stone'?STONE_WALL:useEditorStore.getState().customWallStyle);onChange({...chosen,wall:{...chosen.wall,...(value.wall.alignment?{alignment:value.wall.alignment}:{})}})}}><option value="simple">Simple wall</option><option value="stone">Thick stone</option><option value="custom">Custom</option></select></label>
    <span>Thickness ({value.wall.unit}){value.wall.alignment === 'outside' ? ' · outward from interior boundary' : ''}</span>{number('Thickness',value.strokeWidth/value.wall.pixelsPerUnit,n=>patch({strokeWidth:n*value.wall.pixelsPerUnit}),value.wall.alignment==='outside'?.5/value.wall.pixelsPerUnit:.001,(value.wall.alignment==='outside'?512:1024)/value.wall.pixelsPerUnit)}
    <label>Units <select aria-label="Wall units" value={value.wall.unit} onChange={e=>wall({unit:e.target.value as WallSettings['unit'],pixelsPerUnit:e.target.value==='px'?1:e.target.value==='cells'?grid:map.grid.physicalScale?grid/map.grid.physicalScale.distancePerCell*(e.target.value===map.grid.physicalScale.unit?1:e.target.value==='ft'?.3048:1/.3048):70})}><option value="px">px</option><option value="cells">grid cells</option><option value="ft">ft</option><option value="m">m</option></select></label>
    {['ft','m'].includes(value.wall.unit)&&number('Pixels per unit',value.wall.pixelsPerUnit,n=>wall({pixelsPerUnit:n}),.001)}
    {value.wall.material?.set.continuous?<><ContinuousWallFields value={value} onChange={onChange}/><button type="button" onClick={()=>onChange({...value,stroke:{kind:'solid',color:'#a9a394'},wall:{...value.wall,material:undefined}})}>Use simple fill</button></>:value.wall.material ? <><span>{value.wall.material.set.title} · {value.wall.material.set.version}</span>{value.wall.material.set.roughnessLimits.max>0&&number('Roughness',value.wall.material.roughness,n=>wall({material:{...value.wall.material!,roughness:n}}),0,value.wall.material.set.roughnessLimits.max)}<button type="button" onClick={()=>wall({material:{...value.wall.material!,seed:crypto.getRandomValues(new Uint32Array(1))[0]}})}>New variation</button><button type="button" onClick={()=>onChange({...value,stroke:{kind:'solid',color:'#a9a394'},wall:{...value.wall,material:undefined}})}>Use simple fill</button></> : <><label>Fill <select aria-label="Wall fill" value={value.stroke.kind} onChange={e=>{if(e.target.value==='solid')patch({stroke:{kind:'solid',color:'#a9a394'}});else texture()}}><option value="solid">Solid</option><option value="texture">Texture</option></select></label>
    {value.stroke.kind==='solid'?<label>Color <input aria-label="Wall color" type="color" value={value.stroke.color} onChange={e=>patch({stroke:{kind:'solid',color:e.target.value}})}/></label>:<button type="button" onClick={texture}>{image&&<img src={image.src} width={28} height={24} alt=""/>}Choose wall texture</button>}
    {error&&value.stroke.kind==='texture'&&<span role="status">Texture unavailable — choose a replacement.</span>}
    </>}
    {error&&value.wall.material&&<span role="alert">Wall material unavailable — restore its atlas or choose another set before saving/exporting.</span>}
    {!compact&&<>
      {number('Wall opacity',value.opacity,n=>patch({opacity:n}),0,1)}
      {value.stroke.kind==='texture'&&!value.wall.material&&<>
        {number('Texture scale',value.stroke.scale,n=>value.stroke.kind==='texture'&&patch({stroke:{...value.stroke,scale:n}}),.01,100)}
        {number('Texture offset',value.stroke.offset,n=>value.stroke.kind==='texture'&&patch({stroke:{...value.stroke,offset:n}}),-1000000)}
        <label><input type="checkbox" checked={value.wall.flip} onChange={e=>wall({flip:e.target.checked})}/>Flip texture</label>
      </>}
      <label>Join <select aria-label="Wall join" value={value.join} onChange={e=>patch({join:e.target.value as WallStyle['join']})}>{['miter','round','bevel'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Cap <select aria-label="Wall cap" value={value.cap} onChange={e=>patch({cap:e.target.value as WallStyle['cap']})}>{['butt','round','square'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label><input type="checkbox" checked={value.wall.outline.enabled} onChange={e=>wall({outline:{...value.wall.outline,enabled:e.target.checked}})}/>Outline</label>
      {value.wall.outline.enabled&&<>
        <label>Outline color <input aria-label="Outline color" type="color" value={value.wall.outline.color} onChange={e=>wall({outline:{...value.wall.outline,color:e.target.value}})}/></label>
        {number('Outline width',value.wall.outline.width,n=>wall({outline:{...value.wall.outline,width:n}}),0,128)}
        {number('Outline opacity',value.wall.outline.opacity,n=>wall({outline:{...value.wall.outline,opacity:n}}),0,1)}
      </>}
    </>}
  </div>
}




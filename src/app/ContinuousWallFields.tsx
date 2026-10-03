import { MATERIAL_PARAMETERS, materialPixelsPerUnit, materialValues } from '../domain/continuousWallMaterial'
import type { WallStyle } from '../domain/walls'
export function ContinuousWallFields({value,onChange}:{value:WallStyle;onChange:(style:WallStyle)=>void}) {
  const material=value.wall.material!,definition=material.set.continuous!
  const values=materialValues(value),pixels=materialPixelsPerUnit(value,definition.scale.unit)
  const patch=(changes:Partial<typeof material>)=>onChange({...value,wall:{...value.wall,material:{...material,...changes}}})
  return <>
    <span>{definition.category} · {material.set.title}</span>
    <label>Width preset<select aria-label="Wall width preset" value="" onChange={e=>onChange({...value,strokeWidth:definition.widths[e.target.value as keyof typeof definition.widths]*pixels})}>
      <option value="" disabled>Custom / choose width</option>{Object.entries(definition.widths).map(([name,width])=><option key={name} value={name} disabled={width*pixels>(value.wall.alignment==='outside'?512:1024)}>{name[0].toUpperCase()+name.slice(1)} · {width} {definition.scale.unit}</option>)}
    </select></label>
    {definition.presets.length>0&&<label>Material preset<select aria-label="Material preset" value="" onChange={e=>patch(definition.presets[Number(e.target.value)].values)}><option value="" disabled>Custom / choose preset</option>{definition.presets.map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select></label>}
    {MATERIAL_PARAMETERS.filter(key=>definition.supported.includes(key)).map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} <output>{Math.round(values[key]*100)}%</output><input aria-label={`Wall ${key}`} type="range" min={0} max={100} step={1} value={Math.round(values[key]*100)} onChange={e=>patch({[key]:Number(e.target.value)/100})}/></label>)}
    {definition.options.map(option=><label key={option.id}>{option.label}<input aria-label={option.label} type="number" min={option.min} max={option.max} step={.05} value={material.options?.[option.id]??option.default} onChange={e=>patch({options:{...material.options,[option.id]:Number(e.target.value)}})}/></label>)}
    <button type="button" onClick={()=>patch({seed:crypto.getRandomValues(new Uint32Array(1))[0]})}>Randomize variation</button>
  </>
}

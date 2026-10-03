import { generatedDefinition,generatedPixelsPerFoot,ROOT_WIDTHS,ROOT_PRESETS } from '../domain/generatedWalls'
import type { WallStyle } from '../domain/walls'
export function GeneratedWallFields({value,onChange}:{value:WallStyle;onChange:(s:WallStyle)=>void}){
 const g=value.wall.generated!,masonry=['masonry','linear'].includes(generatedDefinition(g).generatorType),rock=generatedDefinition(g).generatorType==='rock',pixels=generatedPixelsPerFoot(value)
 const patch=(p:Partial<typeof g>)=>onChange({...value,wall:{...value.wall,generated:{...g,...p}}})
 return <>
 <label>Width<select aria-label="Wall width preset" value="" onChange={e=>onChange({...value,strokeWidth:ROOT_WIDTHS[e.target.value as keyof typeof ROOT_WIDTHS]*pixels})}><option value="" disabled>Custom / choose width</option>{Object.entries(ROOT_WIDTHS).map(([name,n])=><option key={name} value={name} disabled={n*pixels>(value.wall.alignment==='outside'?512:1024)}>{name}</option>)}</select></label>
 <label>Custom width (ft)<input aria-label="Generated wall width" type="number" min={.5/pixels} max={(value.wall.alignment==='outside'?512:1024)/pixels} step={.1} value={Number((value.strokeWidth/pixels).toFixed(3))} onChange={e=>{const n=Number(e.target.value);if(n>0&&n*pixels<=(value.wall.alignment==='outside'?512:1024))onChange({...value,strokeWidth:n*pixels})}}/></label>
 {!masonry&&!rock&&<label>Preset<select aria-label="Living Root preset" value="" onChange={e=>patch(ROOT_PRESETS[e.target.value as keyof typeof ROOT_PRESETS])}><option value="" disabled>Custom / choose preset</option>{Object.keys(ROOT_PRESETS).map(n=><option key={n}>{n}</option>)}</select></label>}
 {(rock?['roughness','variation'] as const:masonry?['regularity','variation'] as const:['organic','growth','overgrowth'] as const).map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} <output>{Math.round((g[key]??0)*100)}%</output><input aria-label={`Wall ${key}`} type="range" min={0} max={100} value={Math.round((g[key]??0)*100)} onChange={e=>patch({[key]:Number(e.target.value)/100})}/></label>)}
 <button type="button" onClick={()=>patch({seed:crypto.getRandomValues(new Uint32Array(1))[0]})}>Randomize variation</button>
 </>
}

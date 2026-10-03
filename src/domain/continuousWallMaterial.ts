import type { WallStyle } from './walls'
import type { MapDocument } from './models'

export const MATERIAL_PARAMETERS = ['variation', 'organic', 'growth', 'overgrowth'] as const
export type MaterialParameter = typeof MATERIAL_PARAMETERS[number]
export type MaterialValues = Record<MaterialParameter, number>
export const MATERIAL_CHANNELS = ['fill', 'mask', 'innerEdge', 'outerEdge', 'variation', 'growth', 'overgrowth', 'endcap', 'insideCorner', 'outsideCorner', 'tee', 'crossing', 'opening'] as const
export type MaterialChannel = typeof MATERIAL_CHANNELS[number]
/** Source indices refer to bodyVariants in the same immutable atlas. */
export interface ContinuousWallDefinition {
  version: 1
  category: string
  sources: Partial<Record<MaterialChannel, number[]>> & { fill: number[] }
  scale: { unit: 'ft' | 'm'; textureLength: number; textureWidth: number; organicWavelength: number; edgeWidth: number }
  widths: { thin: number; standard: number; heavy: number; massive: number }
  supported: MaterialParameter[]
  defaults: MaterialValues
  presets: { name: string; values: MaterialValues }[]
  options: { id: string; label: string; target: 'textureScale' | 'edgeStrength' | 'detailScale'; min: number; max: number; default: number }[]
}
function object(v: unknown, keys: readonly string[]): asserts v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k=>!keys.includes(k))) throw Error('Invalid continuous wall material fields.')
}
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max
const text=(v:unknown,max=80):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max&&![...v].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)
export function validateMaterialValues(v: unknown): asserts v is MaterialValues {
  object(v,MATERIAL_PARAMETERS)
  if(MATERIAL_PARAMETERS.some(k=>!finite(v[k],0,1)))throw Error('Material parameters must be between 0 and 1.')
}
export function validateContinuousDefinition(v: unknown, count: number): asserts v is ContinuousWallDefinition {
  object(v,['version','category','sources','scale','widths','supported','defaults','presets','options'])
  if(v.version!==1||!text(v.category))throw Error('Unsupported continuous material version/category.')
  object(v.sources,MATERIAL_CHANNELS)
  if(!Array.isArray(v.sources.fill)||!v.sources.fill.length)throw Error('Material needs a fill source.')
  for(const indices of Object.values(v.sources))if(!Array.isArray(indices)||!indices.length||indices.length>16||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid material source index.')
  object(v.scale,['unit','textureLength','textureWidth','organicWavelength','edgeWidth'])
  if(!['ft','m'].includes(String(v.scale.unit))||['textureLength','textureWidth','organicWavelength'].some(k=>!finite((v.scale as Record<string,unknown>)[k],.05,1000))||!finite(v.scale.edgeWidth,.01,20))throw Error('Invalid world-space material scale.')
  object(v.widths,['thin','standard','heavy','massive'])
  if(['thin','standard','heavy','massive'].some(k=>!finite((v.widths as Record<string,unknown>)[k],.05,100)))throw Error('Invalid material width presets.')
  if(!Array.isArray(v.supported)||new Set(v.supported).size!==v.supported.length||v.supported.some(k=>!MATERIAL_PARAMETERS.includes(k)))throw Error('Invalid supported material controls.')
  validateMaterialValues(v.defaults)
  const supported=v.supported as MaterialParameter[],defaults=v.defaults
  if(MATERIAL_PARAMETERS.some(k=>!supported.includes(k)&&defaults[k]!==0))throw Error('Unsupported parameters must default to zero.')
  for(const key of ['growth','overgrowth'])if(supported.includes(key as MaterialParameter)&&!v.sources[key])throw Error(`The ${key} control requires a source channel.`)
  if(!Array.isArray(v.presets)||v.presets.length>16)throw Error('Invalid material presets.')
  for(const p of v.presets){object(p,['name','values']);if(!text(p.name))throw Error('Invalid material preset name.');validateMaterialValues(p.values);const values=p.values;if(MATERIAL_PARAMETERS.some(k=>!supported.includes(k)&&values[k]!==0))throw Error('Presets cannot enable unsupported controls.')}
  if(!Array.isArray(v.options)||v.options.length>8)throw Error('Invalid material options.')
  const ids=new Set<string>()
  for(const o of v.options){object(o,['id','label','target','min','max','default']);if(!text(o.id)||!/^[a-z][a-zA-Z0-9_-]*$/.test(o.id)||ids.has(o.id)||!text(o.label)||!['textureScale','edgeStrength','detailScale'].includes(String(o.target))||!finite(o.min,.05,10)||!finite(o.max,o.min,10)||!finite(o.default,o.min,o.max))throw Error('Invalid material option.');ids.add(o.id)}
}
/** Canonical fallback is 50 px / 5 ft; explicit wall/map references take priority. */
export function materialPixelsPerUnit(style:WallStyle, unit:'ft'|'m') {
  const w=style.wall
  return w.unit==='ft'||w.unit==='m'?w.pixelsPerUnit*(w.unit===unit?1:unit==='ft'?.3048:1/.3048):unit==='ft'?10:10/.3048
}
export function materialMapReference(map:MapDocument) {
  const physical=map.grid.physicalScale
  return physical?{unit:physical.unit,pixelsPerUnit:map.grid.cellSize/physical.distancePerCell}:{unit:'ft' as const,pixelsPerUnit:10}
}
export function materialValues(style:WallStyle):MaterialValues {
  const material=style.wall.material!,defaults=material.set.continuous?.defaults||{variation:0,organic:0,growth:0,overgrowth:0}
  return Object.fromEntries(MATERIAL_PARAMETERS.map(k=>[k,material[k]??defaults[k]])) as MaterialValues
}
export function materialOption(style:WallStyle,target:ContinuousWallDefinition['options'][number]['target']) {
  const spec=style.wall.material?.set.continuous?.options.find(o=>o.target===target)
  return spec?style.wall.material!.options?.[spec.id]??spec.default:1
}

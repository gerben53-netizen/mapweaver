import { validateContinuousDefinition, materialValues, MATERIAL_PARAMETERS } from './continuousWallMaterial'
import type { ContinuousWallDefinition, MaterialValues } from './continuousWallMaterial'
import type { PathObject } from './models'

export interface WallArt {
  file: string; width: number; height: number; anchor: { x: number; y: number }
  weight: number; rotation: number; scaleVariation: number
}
export interface WallSetManifest {
  schemaVersion: 1; id: string; version: string; title: string; description: string
  continuous?: ContinuousWallDefinition
  renderingMode: 'strip' | 'segments' | 'continuous'; nominalWidthPx: number; defaultThickness: number
  repeatLengthPx: number; overlapPx: number; coreColor: string
  roughnessLimits: { max: number; default: number; maxProtrusionPx: number }
  bodyVariants: WallArt[]; cap?: WallArt; join?: WallArt
  author: string; source: string; license: string
}
export interface PackedArt extends WallArt { rect: { x: number; y: number }; hull: { x: number; y: number }[] }
export interface WallSetDefinition extends Omit<WallSetManifest, 'bodyVariants' | 'cap' | 'join'> {
  atlasWidth: number; atlasHeight: number; revision: string
  bodyVariants: PackedArt[]; cap?: PackedArt; join?: PackedArt
}
export type WallMaterialDefinition = WallSetDefinition
export interface WallMaterial extends Partial<MaterialValues> { set: WallMaterialDefinition; materialId?: string; seed: number; roughness: number; options?: Record<string, number> }
export interface RegisteredWallSet { definition: WallSetDefinition; assetId: string }
export const WALL_SET_LIMITS = { parts: 16, edge: 2048, atlasEdge: 8192, pixels: 16_777_216, pieces: 4096 } as const
function record(v: unknown, allowed: string[], field: string): asserts v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !allowed.includes(k))) throw new Error(`Invalid wall set ${field}.`)
}
function number(v: unknown, min: number, max: number, field: string): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`Wall set ${field} must be ${min}–${max}.`)
}
function text(v: unknown, max: number, field: string): asserts v is string {
  if (typeof v !== 'string' || !v.trim() || v.length > max || [...v].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)) throw new Error(`Invalid wall set ${field}.`)
}
export function validateWallSet(value: unknown, packed = false): WallSetManifest | WallSetDefinition {
  record(value, ['schemaVersion','id','version','title','description','renderingMode','nominalWidthPx','defaultThickness','repeatLengthPx','overlapPx','coreColor','roughnessLimits','bodyVariants','cap','join','author','source','license','continuous', ...(packed ? ['atlasWidth','atlasHeight','revision'] : [])], 'fields')
  if (value.schemaVersion !== 1) throw new Error('Unsupported wall set schemaVersion. This application supports version 1.')
  for (const k of ['id','version','title','description','author','source','license']) text(value[k], k === 'description' ? 500 : 120, k)
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value.id as string) || !/^[a-zA-Z0-9_.-]{1,40}$/.test(value.version as string)) throw new Error('Invalid wall set identity/version.')
  if (!['strip','segments','continuous'].includes(String(value.renderingMode))) throw new Error('Choose strip, segments or continuous rendering.')
  number(value.nominalWidthPx, 8, 1024, 'nominalWidthPx'); number(value.defaultThickness, 1, 1024, 'defaultThickness')
  number(value.repeatLengthPx, 8, 2048, 'repeatLengthPx'); number(value.overlapPx, 0, value.repeatLengthPx * .75, 'overlapPx')
  if (!/^#[\da-f]{6}$/i.test(String(value.coreColor))) throw new Error('Invalid wall set coreColor.')
  const rough = value.roughnessLimits
  record(rough, ['max','default','maxProtrusionPx'], 'roughnessLimits')
  number(rough.max, 0, 1, 'roughness max'); number(rough.default, 0, rough.max, 'roughness default')
  number(rough.maxProtrusionPx, 0, value.nominalWidthPx, 'maxProtrusionPx')
  if (!Array.isArray(value.bodyVariants) || !value.bodyVariants.length || value.bodyVariants.length > WALL_SET_LIMITS.parts) throw new Error('Wall set needs 1–16 body variants.')
  if(value.renderingMode==='continuous')validateContinuousDefinition(value.continuous,value.bodyVariants.length)
  else if(value.continuous!==undefined)throw Error('Continuous metadata requires continuous rendering.')
  for (const art of [...value.bodyVariants, ...[value.cap,value.join].filter(a => a !== undefined)]) {
    record(art, ['file','width','height','anchor','weight','rotation','scaleVariation', ...(packed ? ['rect','hull'] : [])], 'art')
    if (typeof art.file !== 'string' || !/^assets\/[a-zA-Z0-9_-]{1,80}\.(png|webp)$/.test(art.file)) throw new Error('Wall art must use safe assets/name.png or .webp paths.')
    number(art.width, 8, WALL_SET_LIMITS.edge, 'image width'); number(art.height, 8, WALL_SET_LIMITS.edge, 'image height')
    if (!Number.isInteger(art.width) || !Number.isInteger(art.height)) throw new Error('Wall art dimensions must be integer pixels.')
    record(art.anchor, ['x','y'], 'anchor'); number(art.anchor.x, 0, art.width, 'anchor x'); number(art.anchor.y, 0, art.height, 'anchor y')
    number(art.weight, .01, 100, 'weight'); number(art.rotation, 0, 15, 'rotation'); number(art.scaleVariation, 0, .15, 'scale variation')
    if (packed) {
      record(art.rect, ['x','y'], 'atlas rect'); number(art.rect.x, 0, WALL_SET_LIMITS.atlasEdge, 'rect x'); number(art.rect.y, 0, WALL_SET_LIMITS.atlasEdge, 'rect y')
      if (art.rect.x + art.width > Number(value.atlasWidth) || art.rect.y + art.height > Number(value.atlasHeight)) throw new Error('Wall art exceeds atlas bounds.')
      if (!Array.isArray(art.hull) || art.hull.length < 3 || art.hull.length > 32) throw new Error('Invalid alpha silhouette.')
      for (const p of art.hull) { record(p,['x','y'],'silhouette'); number(p.x,0,art.width,'silhouette x'); number(p.y,0,art.height,'silhouette y') }
    }
  }
  if(value.renderingMode==='strip')for(const art of value.bodyVariants as WallArt[]){
    if(art.width<Number(value.repeatLengthPx)||art.rotation!==0||art.scaleVariation!==0)throw new Error('Strip art must cover repeatLengthPx and use zero rotation/scale variation; bend follows the path.')
  }
  if (packed) {
    number(value.atlasWidth, 8, WALL_SET_LIMITS.atlasEdge, 'atlas width'); number(value.atlasHeight, 8, WALL_SET_LIMITS.atlasEdge, 'atlas height')
    if (value.atlasWidth * value.atlasHeight > WALL_SET_LIMITS.pixels || !/^[a-f0-9]{64}$/.test(String(value.revision))) throw new Error('Invalid wall atlas/revision.')
  }
  return value as unknown as WallSetManifest | WallSetDefinition
}
export function validateMaterial(path: PathObject) {
  const material = path.wall?.material
  if (!material) return
  record(material, ['set','seed','roughness','materialId','variation','organic','growth','overgrowth','options'], 'material')
  const set = validateWallSet(material.set, true) as WallSetDefinition
  number(material.seed, 0, 0xffffffff, 'seed')
  if (!Number.isInteger(material.seed)) throw new Error('Wall seed must be an unsigned integer.')
  number(material.roughness, 0, set.roughnessLimits.max, 'roughness')
  if(set.continuous){
    if(material.materialId!==undefined&&material.materialId!==set.id)throw Error('Wall material ID does not match its definition.')
    for(const k of MATERIAL_PARAMETERS)if(material[k]!==undefined)number(material[k],0,1,k)
    if(material.options!==undefined){record(material.options,set.continuous.options.map(o=>o.id),'options');for(const o of set.continuous.options)if(material.options[o.id]!==undefined)number(material.options[o.id],o.min,o.max,o.id)}
  }else if(MATERIAL_PARAMETERS.some(k=>material[k]!==undefined)||material.options!==undefined||material.materialId!==undefined)throw Error('Continuous parameters require a continuous material.')
  if (path.stroke.kind !== 'texture') throw new Error('Wall material needs its atlas asset reference.')
}
/** Conservative radius covers rotated art, caps and roughness, independent of viewport. */
export function wallMaterialRadius(width: number, material?: WallMaterial) {
  if (!material) return 0
  if(material.set.continuous)return width*1.3
  const set = material.set, scale = width / set.nominalWidthPx
  return scale * Math.max(...[...set.bodyVariants, ...[set.cap,set.join].filter((a): a is PackedArt => !!a)].map(a =>
    Math.hypot(Math.max(a.anchor.x,a.width-a.anchor.x),Math.max(a.anchor.y,a.height-a.anchor.y)) * (1+a.scaleVariation)
  )) + scale * set.roughnessLimits.maxProtrusionPx * material.roughness
}
export function materialStyle(set: RegisteredWallSet, previous: import('./walls').WallStyle): import('./walls').WallStyle {
  return { ...previous, stroke: { kind:'texture',assetId:set.assetId,scale:1,spacing:16,offset:0 },
    wall: { ...previous.wall, outline:{...previous.wall.outline,enabled:false}, material:{set:set.definition,seed:previous.wall.material?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0],roughness:set.definition.roughnessLimits.default,...(set.definition.continuous?{materialId:set.definition.id,...materialValues({...previous,wall:{...previous.wall,material:{set:set.definition,seed:0,roughness:0}}}),options:Object.fromEntries(set.definition.continuous.options.map(o=>[o.id,o.default]))}:{})} } }
}

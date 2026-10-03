import pack from './livingRootPack.json'
import productionPack from './livingRootProductionPack.json'
import type { WallStyle } from './walls'
import type { MapDocument } from './models'
import { materialMapReference } from './continuousWallMaterial'
export interface RootComponent { id:string; role:'root-long'|'root-medium'|'root-small'|'knot'|'root-end'|'moss'|'leaves'; image:string; nominalLengthFt:number; nominalWidthFt:number; weight:number }
export interface GeneratedDefinition {id:string;revision:string;name:string;renderingMode:'generated';generatorType:'living-root';components:RootComponent[];defaults:{width:number;organic:number;growth:number;overgrowth:number}}
export interface GeneratedWall {id:string;revision:string;seed:number;organic:number;growth:number;overgrowth:number}
const records=new Map<string,GeneratedDefinition>()
const keys=(v:object,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k))
export function validateGeneratedDefinition(value:unknown):GeneratedDefinition {
 const d=value as GeneratedDefinition
 if(!d||!keys(d,['id','revision','name','renderingMode','generatorType','components','defaults'])||!/^[-a-z0-9]{1,64}$/.test(d.id)||!/^[-a-z0-9]{1,64}$/.test(d.revision)||typeof d.name!=='string'||!d.name.trim()||d.name.length>80||d.renderingMode!=='generated'||d.generatorType!=='living-root'||!Array.isArray(d.components)||d.components.length>64||!d.defaults||!keys(d.defaults,['width','organic','growth','overgrowth']))throw Error('Invalid generated wall definition.')
 const defaults=d.defaults;if(!Number.isFinite(defaults.width)||defaults.width<.1||defaults.width>20||![defaults.organic,defaults.growth,defaults.overgrowth].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid generated wall defaults.')
 const ids=new Set<string>()
 for(const c of d.components){if(!c||!keys(c,['id','role','image','nominalLengthFt','nominalWidthFt','weight'])||!/^[-a-z0-9]{1,64}$/.test(c.id)||ids.has(c.id)||!['root-long','root-medium','root-small','knot','root-end','moss','leaves'].includes(c.role)||typeof c.image!=='string'||!/^\/generated-walls\/[-a-z0-9]+\/[-a-z0-9]+\.png$/.test(c.image)||![c.nominalLengthFt,c.nominalWidthFt,c.weight].every(n=>Number.isFinite(n)&&n>0&&n<=100)||c.nominalLengthFt/c.nominalWidthFt>12)throw Error('Invalid generated wall component.');ids.add(c.id)}
 for(const role of ['root-long','root-medium','root-small','knot'])if(!d.components.some(c=>c.role===role))throw Error('Missing required root component role.')
 return d
}
/** Add immutable bundled packs as data, never executable generator plugins. */
export function registerGeneratedDefinition(value:unknown){const d=structuredClone(validateGeneratedDefinition(value)),key=d.id+'@'+d.revision,old=records.get(key);if(old&&JSON.stringify(old)!==JSON.stringify(d))throw Error('Generated wall revision is immutable.');if(!old&&records.size>=16)throw Error('Generated wall pack limit exceeded.');d.components.forEach(Object.freeze);Object.freeze(d.components);Object.freeze(d.defaults);Object.freeze(d);records.set(key,d);return d}
registerGeneratedDefinition(productionPack)
registerGeneratedDefinition(pack)
export const generatedDefinitions=()=>[...records.values()]
export function generatedDefinition(g:Pick<GeneratedWall,'id'|'revision'>){const d=records.get(g.id+'@'+g.revision);if(!d)throw Error('Generated wall pack revision is unavailable.');return d}
export function validateGeneratedWall(g:GeneratedWall){if(!g||!keys(g,['id','revision','seed','organic','growth','overgrowth'])||!Number.isInteger(g.seed)||g.seed<0||g.seed>0xffffffff||![g.organic,g.growth,g.overgrowth].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid generated wall settings.');generatedDefinition(g)}
export const ROOT_PRESETS={Clean:{organic:.35,growth:.2,overgrowth:0},Natural:{organic:.55,growth:.45,overgrowth:.15},Ancient:{organic:.7,growth:.7,overgrowth:.2},Overgrown:{organic:.65,growth:.65,overgrowth:.7}}
export const ROOT_WIDTHS={Thin:.5,Standard:1,Heavy:2,Massive:3}
export const generatedPixelsPerFoot=(s:WallStyle)=>s.wall.pixelsPerUnit*(s.wall.unit==='m'?.3048:s.wall.unit==='ft'?1:s.wall.unit==='cells'?.2:10)
export function generatedWallStyle(base:WallStyle,map:MapDocument,id='living-root',revision='production-1'):WallStyle{const d=generatedDefinition({id,revision}),reference=materialMapReference(map),style={...base,stroke:{kind:'solid' as const,color:'#775238'},wall:{...base.wall,...reference,material:undefined,renderingMode:'generated' as const,generated:{id,revision,seed:1,organic:d.defaults.organic,growth:d.defaults.growth,overgrowth:d.defaults.overgrowth},outline:{...base.wall.outline,enabled:false}}};return {...style,strokeWidth:d.defaults.width*generatedPixelsPerFoot(style)}}

import palePalaceStone from './palePalaceStonePack.json'
import masonryRough from './masonryRoughPack.json'
import masonryDressed from './masonryDressedPack.json'
import pack from './livingRootPack.json'
import productionPack from './livingRootProductionPack.json'
import type { WallStyle } from './walls'
import type { MapDocument } from './models'
import { materialMapReference } from './continuousWallMaterial'
export interface GeneratedComponent { id:string; role:'root-long'|'root-medium'|'root-small'|'knot'|'root-end'|'moss'|'leaves'|'block-large'|'block-medium'|'block-small'; image:string; nominalLengthFt:number; nominalWidthFt:number; weight:number }
export interface GeneratedDefinition {id:string;revision:string;name:string;renderingMode:'generated';generatorType:'living-root'|'masonry';components:GeneratedComponent[];defaults:{width:number;organic:number;growth:number;overgrowth:number;regularity?:number;variation?:number}}
export interface GeneratedWall {id:string;revision:string;seed:number;organic:number;growth:number;overgrowth:number;regularity?:number;variation?:number}
const records=new Map<string,GeneratedDefinition>()
const keys=(v:object,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k))
export function validateGeneratedDefinition(value:unknown):GeneratedDefinition {
 const d=value as GeneratedDefinition
 if(!d||!keys(d,['id','revision','name','renderingMode','generatorType','components','defaults'])||!/^[-a-z0-9]{1,64}$/.test(d.id)||!/^[-a-z0-9]{1,64}$/.test(d.revision)||typeof d.name!=='string'||!d.name.trim()||d.name.length>80||d.renderingMode!=='generated'||!['living-root','masonry'].includes(d.generatorType)||!Array.isArray(d.components)||d.components.length>64||!d.defaults||!keys(d.defaults,['width','organic','growth','overgrowth','regularity','variation']))throw Error('Invalid generated wall definition.')
 const defaults=d.defaults;if(!Number.isFinite(defaults.width)||defaults.width<.1||defaults.width>20||![defaults.organic,defaults.growth,defaults.overgrowth].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid generated wall defaults.')
 if(d.generatorType==='living-root'&&(defaults.regularity!==undefined||defaults.variation!==undefined))throw Error('Masonry defaults require a masonry strategy.')
 if(d.generatorType==='masonry'&&[defaults.organic,defaults.growth,defaults.overgrowth].some(n=>n!==0))throw Error('Masonry does not use root growth settings.')
 const ids=new Set<string>()
 for(const c of d.components){if(c&&(d.generatorType==='masonry')!==c.role?.startsWith('block-'))throw Error('Component role does not match generator strategy.');if(!c||!keys(c,['id','role','image','nominalLengthFt','nominalWidthFt','weight'])||!/^[-a-z0-9]{1,64}$/.test(c.id)||ids.has(c.id)||!['root-long','root-medium','root-small','knot','root-end','moss','leaves','block-large','block-medium','block-small'].includes(c.role)||typeof c.image!=='string'||!/^\/generated-walls\/[-a-z0-9]+\/[-a-z0-9]+\.png$/.test(c.image)||![c.nominalLengthFt,c.nominalWidthFt,c.weight].every(n=>Number.isFinite(n)&&n>0&&n<=100)||c.nominalLengthFt/c.nominalWidthFt>12)throw Error('Invalid generated wall component.');ids.add(c.id)}
 if(d.generatorType==='masonry'&&d.components.some(c=>c.nominalWidthFt!==.5||c.nominalLengthFt!==({'block-large':1.5,'block-medium':1,'block-small':.5} as Record<string,number>)[c.role]))throw Error('Invalid masonry component footprint.')
 if(d.generatorType==='masonry'&&![defaults.regularity,defaults.variation].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid masonry defaults.')
 for(const role of (d.generatorType==='masonry'?['block-large','block-medium','block-small']:['root-long','root-medium','root-small','knot']))if(!d.components.some(c=>c.role===role))throw Error('Missing required generated component role.')
 return d
}
/** Add immutable bundled packs as data, never executable generator plugins. */
export function registerGeneratedDefinition(value:unknown){const d=structuredClone(validateGeneratedDefinition(value)),key=d.id+'@'+d.revision,old=records.get(key);if(old&&JSON.stringify(old)!==JSON.stringify(d))throw Error('Generated wall revision is immutable.');if(!old&&records.size>=16)throw Error('Generated wall pack limit exceeded.');d.components.forEach(Object.freeze);Object.freeze(d.components);Object.freeze(d.defaults);Object.freeze(d);records.set(key,d);return d}
registerGeneratedDefinition(palePalaceStone)
registerGeneratedDefinition(productionPack)
registerGeneratedDefinition(pack)
registerGeneratedDefinition(masonryRough)
registerGeneratedDefinition(masonryDressed)
export const generatedDefinitions=()=>[...records.values()]
export function generatedDefinition(g:Pick<GeneratedWall,'id'|'revision'>){const d=records.get(g.id+'@'+g.revision);if(!d)throw Error('Generated wall pack revision is unavailable.');return d}
export function validateGeneratedWall(g:GeneratedWall){if(!g||!keys(g,['id','revision','seed','organic','growth','overgrowth','regularity','variation'])||!Number.isInteger(g.seed)||g.seed<0||g.seed>0xffffffff||![g.organic,g.growth,g.overgrowth].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid generated wall settings.');const d=generatedDefinition(g);if(d.generatorType==='masonry'&&[g.organic,g.growth,g.overgrowth].some(n=>n!==0))throw Error('Masonry does not use root growth settings.');if(d.generatorType==='masonry'&&![g.regularity,g.variation].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw Error('Invalid masonry settings.');if(d.generatorType==='living-root'&&(g.regularity!==undefined||g.variation!==undefined))throw Error('Masonry parameters require a masonry generator.')}
export const ROOT_PRESETS={Clean:{organic:.35,growth:.2,overgrowth:0},Natural:{organic:.55,growth:.45,overgrowth:.15},Ancient:{organic:.7,growth:.7,overgrowth:.2},Overgrown:{organic:.65,growth:.65,overgrowth:.7}}
export const ROOT_WIDTHS={Thin:.5,Standard:1,Heavy:2,Massive:3}
export const generatedPixelsPerFoot=(s:WallStyle)=>s.wall.pixelsPerUnit*(s.wall.unit==='m'?.3048:s.wall.unit==='ft'?1:s.wall.unit==='cells'?.2:10)
export function generatedWallStyle(base:WallStyle,map:MapDocument,id='living-root',revision='production-1'):WallStyle{const d=generatedDefinition({id,revision}),reference=materialMapReference(map),style={...base,stroke:{kind:'solid' as const,color:'#775238'},wall:{...base.wall,...reference,material:undefined,renderingMode:'generated' as const,generated:{id,revision,seed:1,organic:d.defaults.organic,growth:d.defaults.growth,overgrowth:d.defaults.overgrowth,...(d.generatorType==='masonry'?{regularity:d.defaults.regularity,variation:d.defaults.variation}:{})},outline:{...base.wall.outline,enabled:false}}};return {...style,strokeWidth:d.defaults.width*generatedPixelsPerFoot(style)}}

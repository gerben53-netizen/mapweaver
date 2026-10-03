import type { MapType } from './geography'
import { CARTOGRAPHIC_ELEMENT_PRESETS, defaultElementPreset } from './cartographicPresets'
export const MARKER_TYPES = [
 ['capital','Capital'],['city','City'],['town','Town'],['village','Village'],['fort','Fortress / Castle'],['ruin','Ruin'],['temple','Temple / Shrine'],['harbor','Harbor / Port'],['cave','Cave'],['dungeon','Dungeon'],['tower','Tower'],['camp','Camp'],['landmark','Landmark'],['gate','Gate / Pass'],['mine','Mine'],['bridge','Bridge'],['poi','Point of interest'],['objective','Objective'],['entrance','Entrance'],['exit','Exit'],['warning','Trap / Warning'],['custom','Custom'],
] as const
export type MarkerType=typeof MARKER_TYPES[number][0]
export type MarkerStyle='minimal'|'classic'|'ornate'|'parchment'|'technical'
export type Prominence='minor'|'normal'|'major'|'primary'
export const PROMINENCE:Record<Prominence,{name:string;scale:number;importance:number}>={minor:{name:'Minor',scale:.75,importance:0},normal:{name:'Normal',scale:1,importance:1},major:{name:'Major',scale:1.3,importance:3},primary:{name:'Primary',scale:1.65,importance:5}}
export const MARKER_STYLES=CARTOGRAPHIC_ELEMENT_PRESETS.place
const all:readonly MapType[]=['battlemap','regional-map','world-map']
export interface MarkerIcon {id:string;name:string;types:readonly MarkerType[];paths:readonly string[];mapTypes:readonly MapType[];styles:readonly MarkerStyle[]}
const icon=(id:string,name:string,types:readonly MarkerType[],...paths:string[]):MarkerIcon=>({id,name,types,paths,mapTypes:all,styles:['minimal','classic','ornate','parchment','technical']})
// Internal map artwork, in a shared 64-unit view box. No asset-library records or external SVGs.
export const MARKER_ICONS:readonly MarkerIcon[]=[
 icon('city','Walled city',['capital','city','town','fort'],'M12 47V29H20V23H27V15L33 8L39 15V30H47V24H54V47Z','M17 47V35H24V47M29 27V21H36V27M30 47V35Q34 30 38 35V47M43 35H49'),
 icon('settlement','Clustered roofs',['city','town','village','capital'],'M9 34L21 23L33 34V49H9ZM29 23L41 12L54 23V42H34','M17 49V38H24V49M38 42V29H46V42'),
 icon('keep','Twin-tower keep',['capital','city','fort','gate','dungeon'],'M10 49V16H16V22H22V16H28V29H38V16H44V22H50V16H56V49Z','M27 49V39Q33 29 39 39V49M16 30H22M44 30H50'),
 icon('tower','Watchtower',['tower','fort','city','harbor','landmark'],'M20 51L23 25L17 21V12H24V18H30V12H37V18H43V12H49V21L43 25L46 51Z','M29 51V39Q33 32 37 39V51M29 27H37'),
 icon('ruin','Broken tower',['ruin','dungeon','tower'],'M14 51V19L25 12L28 26L34 19L38 31L49 25V51Z','M29 51V40Q33 34 38 40V51M16 31L24 34L20 40'),
 icon('arch','Ruined arch',['ruin','gate','dungeon','temple'],'M10 51V30Q10 10 32 10Q54 10 54 30V51H43V30Q43 21 32 21Q21 21 21 30V51Z','M29 10L34 16L29 22M10 40H21M43 39H54'),
 icon('temple','Columned shrine',['temple','landmark','ruin'],'M7 24L32 10L57 24ZM11 49H53V54H11ZM16 29H23V49H16ZM29 29H36V49H29ZM42 29H49V49H42Z'),
 icon('anchor','Anchor',['harbor','landmark'],'M32 18V51M19 27H45M10 36Q12 49 32 54Q52 49 54 36M10 36L9 46M54 36L55 46','M26 12A6 6 0 1 0 38 12A6 6 0 1 0 26 12Z'),
 icon('ship','Sailing harbor',['harbor','city'],'M8 43H57L48 54H18ZM32 8V43M29 13L12 37H29ZM36 15L51 36H36Z'),
 icon('cave','Cave mouth',['cave','dungeon','entrance','exit'],'M7 51L13 29L26 14L39 10L54 31L59 51ZM22 51L25 35L33 26L41 37L44 51Z'),
 icon('camp','Encampment',['camp','village','poi'],'M8 50L31 13L56 50ZM31 13V50M22 50L31 34L40 50M7 54H57'),
 icon('peak','Mountain landmark',['landmark','gate','mine'],'M5 51L24 17L33 33L41 22L60 51ZM17 30L24 35L29 28'),
 icon('mine','Crossed picks',['mine','dungeon'],'M17 13L48 52M47 13L17 52M8 21Q17 7 32 12M32 12Q48 7 57 21'),
 icon('bridge','Stone bridge',['bridge','gate','landmark'],'M7 24H57V47H46V40Q46 33 39 33Q32 33 32 40V47H24V40Q24 33 17 33Q10 33 10 40V47H7ZM9 17V24M20 17V24M32 17V24M44 17V24M55 17V24'),
 icon('star','Radiant star',['capital','objective','landmark','custom'],'M32 8L38 25L56 25L42 36L47 54L32 43L17 54L22 36L8 25L26 25Z'),
 icon('diamond','Survey diamond',['poi','objective','entrance','exit','custom','landmark'],'M32 9L53 32L32 55L11 32ZM32 23L40 32L32 41L24 32Z'),
 icon('warning','Warning cairn',['warning','objective','poi','custom'],'M32 8L59 54H5ZM32 24V38M31 45H33V47H31Z'),
 icon('arrow','Passage arrow',['entrance','exit','gate','custom'],'M10 27H35V15L55 32L35 49V37H10Z'),
 icon('circle','Settlement glyph',['capital','city','town','village','poi','custom'],'M12 32A20 20 0 1 0 52 32A20 20 0 1 0 12 32ZM25 32A7 7 0 1 0 39 32A7 7 0 1 0 25 32Z'),
]
export const markerIcons=(type:string)=>MARKER_ICONS.filter(i=>i.types.includes(type as MarkerType)||type==='custom')
export const markerTypeName=(type:string)=>MARKER_TYPES.find(t=>t[0]===type)?.[1]??type
export function prioritizedMarkerTypes(mapType:MapType='battlemap'){
 const priority=mapType==='battlemap'?['poi','objective','entrance','exit','warning','landmark','custom']:mapType==='world-map'?['capital','city','fort','harbor','landmark']:['city','town','village','ruin','temple','cave','camp','bridge','mine','landmark']
 return [...MARKER_TYPES].sort((a,b)=>(priority.includes(a[0])?priority.indexOf(a[0]):99)-(priority.includes(b[0])?priority.indexOf(b[0]):99))
}
export interface MarkerConfig {labelEnabled?:boolean;version:1;iconId:string;style:MarkerStyle;prominence:Prominence;ink:string;outline:string}
export interface MarkerChoice { illustration?:import('./illustratedMarkers').MarkerIllustration;name:string;type:MarkerType;marker:MarkerConfig;label:boolean;position:'above'|'below'|'left'|'right'}
export function markerDefaults(mapType:MapType='battlemap',type:MarkerType=mapType==='battlemap'?'poi':mapType==='world-map'?'capital':'city'):MarkerChoice{
 const style=defaultElementPreset('place',mapType) as MarkerStyle,preset=MARKER_STYLES.find(p=>p.id===style)!
 return {name:markerTypeName(type),type,marker:{version:1,iconId:markerIcons(type)[0].id,style,prominence:type==='capital'?'primary':type==='city'?'major':'normal',ink:preset.ink,outline:preset.paper},label:mapType!=='battlemap'&&['capital','city','town','fort','harbor'].includes(type),position:'below'}
}
export const markerWidth=(mapType:MapType|undefined,prominence:Prominence)=>(mapType==='world-map'?44:mapType==='regional-map'?36:24)*PROMINENCE[prominence].scale
export function validateMarker(m:MarkerConfig,type:string){
 if(!m||(m.labelEnabled!==undefined&&typeof m.labelEnabled!=='boolean')||Object.keys(m).some(k=>!['labelEnabled','version','iconId','style','prominence','ink','outline'].includes(k))||m.version!==1||!MARKER_STYLES.some(p=>p.id===m.style)||!Object.hasOwn(PROMINENCE,m.prominence)||!markerIcons(type).some(i=>i.id===m.iconId)||![m.ink,m.outline].every(c=>typeof c==='string'&&/^#[a-f0-9]{6}$/i.test(c)))throw Error('Invalid marker icon, style or prominence.')
}

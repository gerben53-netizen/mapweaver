import type { TerrainStyleId, CoastStyleId, WaterStyleId } from './terrainStyles'
import type { RiverPresetId } from './riverPresets'
import type { ElementKind, ElementPreset } from './cartographicPresets'
import type { GeneratorMetadata } from './generatorAssets'
import type { MapType } from './geography'

export type ThemeTerrain = 'land' | 'grassland' | 'forest' | 'desert' | 'tundra' | 'snow' | 'swamp' | 'rocky' | 'volcanic' | 'coast' | 'ocean'
export type ThemeLabelRole = 'region' | 'city' | 'water' | 'marker' | 'title' | 'legend'
export interface WorldTheme {
  id: string; name: string; description: string; mapTypes: readonly MapType[]
  terrain: Record<ThemeTerrain, { style: TerrainStyleId; color: string }>
  texture: number; feather: number; water: WaterStyleId; coast: CoastStyleId; river: RiverPresetId
  assetTheme: GeneratorMetadata['themes'][number]; sparse: boolean
  font: string; titleFont: string; ink: string; paper: string; waterInk: string
  elements: Record<ElementKind, ElementPreset>
  frame: 'border.fantasyOrnate' | 'border.parchment' | 'border.darkOrnamental' | 'border.minimal' | 'border.elven'
  vignette: 'vignette.subtleDark' | 'vignette.parchmentEdge' | 'vignette.dramaticDark' | null
  fog: 'fog.coldMist' | null; shadow: boolean; glow: boolean
}
const roles: ThemeTerrain[] = ['land','grassland','forest','desert','tundra','snow','swamp','rocky','volcanic','coast','ocean']
const styles: TerrainStyleId[] = ['land','grassland','forest','desert','tundra','snow','swamp','rocky','volcanic','shallow','ocean']
const terrain = (colors: string[]) => Object.fromEntries(roles.map((role,i) => [role,{style:styles[i],color:colors[i]}])) as WorldTheme['terrain']
const elements = (base: 'classic'|'parchment'|'ornate'|'minimal', title: ElementPreset): WorldTheme['elements'] => ({place:base,compass:base,scaleBar:base,title,legend:base,infoPanel:base})
const mapTypes = ['world-map','regional-map'] as const
export const WORLD_MAP_THEMES: Readonly<Record<string,WorldTheme>> = {
  'world.painterlyFantasy': { id:'world.painterlyFantasy',name:'Painterly Fantasy',description:'Rich green terrain, soft coasts and a traditional fantasy atlas frame.',mapTypes,
    terrain:terrain(['#b5bb89','#a9b57a','#648160','#d9be85','#b3bbaa','#e2e5dd','#819783','#999484','#69615b','#90b7b8','#638b9c']),texture:.25,feather:3,water:'calm',coast:'fantasy',river:'fantasyRiver',assetTheme:'painterlyFantasy',sparse:false,font:'ebgaramond',titleFont:'cinzel',ink:'#343b2d',paper:'#f1e5c4',waterInk:'#315f76',elements:elements('ornate','fantasy'),frame:'border.fantasyOrnate',vignette:'vignette.subtleDark',fog:null,shadow:true,glow:false },
  'world.classicParchment': { id:'world.classicParchment',name:'Classic Parchment',description:'Warm paper, restrained biome inks and drawn cartographic detail.',mapTypes,
    terrain:terrain(['#decda7','#d5c59e','#acb08a','#e7c68f','#c7c5b3','#eee5cf','#aeb59a','#b3a48b','#897565','#d9ccac','#b4a17c']),texture:.12,feather:1,water:'parchment',coast:'parchment',river:'parchmentRiver',assetTheme:'parchment',sparse:false,font:'imfellenglish',titleFont:'imfellenglish',ink:'#58432d',paper:'#efe0bc',waterInk:'#5a6c6b',elements:elements('parchment','scroll'),frame:'border.parchment',vignette:'vignette.parchmentEdge',fog:null,shadow:false,glow:false },
  'world.darkFantasy': { id:'world.darkFantasy',name:'Dark Fantasy',description:'Muted terrain, deep seas, cold haze and readable pale lettering.',mapTypes,
    terrain:terrain(['#68766a','#657665','#3c564d','#958266','#939e94','#c4cec8','#506e67','#727977','#594a4a','#597d86','#263d4b']),texture:.17,feather:3,water:'dark',coast:'contrast',river:'darkWater',assetTheme:'darkFantasy',sparse:false,font:'spectral',titleFont:'cinzel',ink:'#eee6d2',paper:'#283c3d',waterInk:'#d1e6e6',elements:elements('ornate','plaque'),frame:'border.darkOrnamental',vignette:'vignette.dramaticDark',fog:'fog.coldMist',shadow:true,glow:false },
  'world.minimalPolitical': { id:'world.minimalPolitical',name:'Minimal Political',description:'Flat, clear regions, thin rivers and restrained decorative detail.',mapTypes,
    terrain:terrain(['#e6e4ce','#d9e2be','#b5cbb3','#eadcb8','#d9ded7','#f3f2e9','#c2d7cc','#c9c6b9','#b4a29b','#bed6dc','#729fb0']),texture:0,feather:0,water:'minimal',coast:'minimal',river:'minimalRiver',assetTheme:'genericFantasy',sparse:true,font:'sourcesans3',titleFont:'sourcesans3',ink:'#344749',paper:'#f5f3e8',waterInk:'#315f76',elements:elements('minimal','simple'),frame:'border.minimal',vignette:null,fog:null,shadow:false,glow:false },
  'world.elvenElegant': { id:'world.elvenElegant',name:'Elven / Elegant Fantasy',description:'Cream and jade terrain, refined serif lettering and leaf-like framing.',mapTypes,
    terrain:terrain(['#d5dbc0','#bdd0aa','#739b82','#dfd3a4','#c4d5c9','#edf0de','#91b3a4','#a8b9a4','#80756b','#b0d2ca','#638b9c']),texture:.1,feather:2,water:'calm',coast:'fantasy',river:'brightWater',assetTheme:'genericFantasy',sparse:false,font:'cormorantgaramond',titleFont:'cinzel',ink:'#355b49',paper:'#f3efd7',waterInk:'#426e70',elements:elements('ornate','cartouche'),frame:'border.elven',vignette:'vignette.parchmentEdge',fog:null,shadow:false,glow:true },
}
export function worldTheme(id: unknown): WorldTheme | undefined { return typeof id === 'string' && Object.hasOwn(WORLD_MAP_THEMES,id) ? WORLD_MAP_THEMES[id] : undefined }
export function themesForMap(type: MapType) { return Object.values(WORLD_MAP_THEMES).filter(t => t.mapTypes.includes(type)) }
export function defaultMapTheme(type: MapType) { return themesForMap(type).find(t => t.id === 'world.painterlyFantasy')?.id ?? '' }
export function themeElementPreset(kind:ElementKind,mapType:MapType|undefined,themeId:unknown):ElementPreset|undefined { const t=worldTheme(themeId);return t&&t.mapTypes.includes(mapType??'battlemap')?t.elements[kind]:undefined }
export function themeText(theme:WorldTheme,role:ThemeLabelRole) {
  return {font:role==='title'?theme.titleFont:theme.font,color:role==='water'?theme.waterInk:theme.ink,strokeColor:theme.paper,strokeWidth:theme.sparse?0:1.5,backgroundOpacity:0,bold:role==='region'||role==='city'||role==='title',italic:role==='water'}
}
// Direct values remain render authority. Fingerprints track ownership, never theme resources.
export interface WorldThemeState {version:1;id:string;map:Record<string,string>;managed:Record<string,Record<string,string>>}
export function styleFingerprint(value:unknown) {
  const s=JSON.stringify(value)??'undefined';let a=2166136261,b=3339675911
  for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b^s.charCodeAt(i),2246822519)}
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0')
}
export function validateWorldThemeState(value:unknown):WorldThemeState {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid theme state.')
  const v=value as WorldThemeState
  if(Object.keys(v).some(k=>!['version','id','map','managed'].includes(k))||v.version!==1||typeof v.id!=='string'||!/^[a-zA-Z0-9._-]{1,80}$/.test(v.id)||!v.managed||typeof v.managed!=='object'||Array.isArray(v.managed)||Object.keys(v.managed).length>20000)throw Error('Invalid theme ownership.')
  for(const [id,fields] of [...Object.entries(v.managed),['map',v.map] as const]){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||['__proto__','constructor','prototype'].includes(id)||!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).length>100)throw Error('Invalid theme object ownership.')
    for(const [key,hash] of Object.entries(fields))if(!/^[a-zA-Z][a-zA-Z0-9.]{0,99}$/.test(key)||key.split('.').some(k=>['__proto__','constructor','prototype'].includes(k))||typeof hash!=='string'||!/^[0-9a-f]{16}$/.test(hash))throw Error('Invalid theme style fingerprint.')
  }
  return structuredClone(v)
}

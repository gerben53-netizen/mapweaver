import { contourPreset } from './coastalContours'
import { waterDepthPreset } from './waterDepth'
import { finishPreset } from './geographyFinish'
import { automaticThemeStyle } from './automaticLabelStyle'
import { worldTheme, themeText, styleFingerprint } from './worldThemes'
import type { ThemeTerrain, WorldTheme, WorldThemeState } from './worldThemes'
import type { MapDocument, MapObject, AreaObject } from './models'
import type { ProjectSnapshot } from '../store/history'
import type { WorldScatterAsset } from '../world/scatterModel'
import { terrainAppearance, waterAppearance } from './terrainStyles'
import { defaultMapEffects, defaultStampEffects, FOG_PRESETS, VIGNETTE_PRESETS, framePreset } from './mapEffects'
import { applyRiverPreset } from './riverPresets'
import { validatePath, withPathGeometry } from './paths'
import { restyleLabel, isAnnotation, validateAnnotation } from './annotations'
import { editableProjectIds } from './projectView'
import { createGeneratorSelector } from './generatorAssets'

export interface ThemeOptions { reset: boolean; elements: boolean; assets: boolean }
export const DEFAULT_THEME_OPTIONS: ThemeOptions = { reset: false, elements: false, assets: true }
type Fields = Record<string, unknown>
export function readStyle(value: unknown, path: string): unknown { return path.split('.').reduce<unknown>((v,k) => v && typeof v === 'object' ? (v as Fields)[k] : undefined,value) }
function writeStyle(value: unknown, path: string, next: unknown) {
  const keys=path.split('.');let at=value as Fields
  for(const key of keys.slice(0,-1)){if(!at[key]||typeof at[key]!=='object')at[key]={};at=at[key] as Fields}
  if(next===undefined)delete at[keys.at(-1)!];else at[keys.at(-1)!]=structuredClone(next)
}
function leaves(value:unknown,prefix=''):Fields {
  if(value&&typeof value==='object'&&!Array.isArray(value))return Object.assign({},...Object.entries(value).map(([key,v])=>leaves(v,prefix?prefix+'.'+key:key)))
  return {[prefix]:value}
}
export function semanticTerrain(o:AreaObject):ThemeTerrain {
  if(o.land?.role==='landmass')return 'land'
  const type=o.land?.terrain
  if(type&&type!=='custom')return type==='mountains'?'rocky':type
  // Existing appearance is an explicit semantic hint, never infer from editable names.
  const style=o.land?.appearance?.style
  return style==='shallow'?'coast':style??'land'
}
export function themeMapValues(t:WorldTheme,size=1600) {
  const effects=defaultMapEffects();effects.frame=framePreset(t.frame)
  if(t.vignette)effects.vignette={...VIGNETTE_PRESETS[t.vignette].style,amount:t.id==='world.darkFantasy'?.3:t.id==='world.elvenElegant'?.16:VIGNETTE_PRESETS[t.vignette].style.amount}
  if(t.fog)effects.fog={...FOG_PRESETS[t.fog].style,areaId:null,opacity:.1}
  return {coastalContours:contourPreset(t.id,size),waterDepth:waterDepthPreset(t.water),geographyFinish:finishPreset(t.id),water:waterAppearance(t.water),effects,backgroundColor:t.terrain.land.color}
}
function annotationValues(o:MapObject,t:WorldTheme,objects:MapObject[]):Fields {
  if(o.kind==='label'){
    const owner=objects.find(v=>v.id===o.ownerId),role=o.markerName?'marker':owner?.kind==='path'&&owner.pathKind==='river'?'water':owner?.kind==='place'?'city':'region'
    return leaves({style:o.automatic?automaticThemeStyle(t,o.automatic.labelClass):themeText(t,role)})
  }
  if(o.kind==='title'||o.kind==='infoPanel')return leaves({elementPreset:t.elements[o.kind],color:t.ink,background:t.paper,frame:t.elements[o.kind]!=='simple'&&t.elements[o.kind]!=='minimal',style:themeText(t,o.kind==='title'?'title':'legend')})
  if(o.kind==='legend')return leaves({elementPreset:t.elements.legend,font:t.font,outline:t.ink,background:t.paper})
  if(o.kind==='compass')return leaves({elementPreset:t.elements.compass,color:t.ink})
  if(o.kind==='scaleBar')return leaves({elementPreset:t.elements.scaleBar,font:t.font,color:t.ink,background:t.paper})
  return {} // Marker symbol identity/style is explicit user content.
}
export function themeObjectValues(o:MapObject,map:MapDocument,t:WorldTheme,objects:MapObject[],semanticStamp=false):Fields {
  if(o.kind==='area'&&o.land&&o.land.role!=='area'&&o.fill.kind!=='pattern'){
    const style=t.terrain[semanticTerrain(o)],a=terrainAppearance(style.style,map.width)
    return leaves({land:{appearance:{...a,color:style.color,textureOpacity:t.texture,feather:o.land.role==='landmass'?0:t.feather,coast:o.land.role==='landmass'?t.coast:'none'}}})
  }
  if(o.kind==='path'&&o.pathKind==='river'&&o.route?.kind==='river'&&o.stroke.kind!=='texture'){
    const p=applyRiverPreset(o,t.river)
    // Keep authored widths, direction, taper and smoothing; only substitute paint.
    return leaves({stroke:p.stroke,opacity:p.opacity,route:{preset:t.river,bank:p.route?.kind==='river'?p.route.bank:o.route.bank,appearance:{...(o.route.appearance??{}),version:1,widthMode:o.route.appearance?.widthMode??'manual',smoothing:o.route.appearance?.smoothing??'off',outlineEnabled:p.route?.kind==='river'&&p.route.appearance?.outlineEnabled,halo:p.route?.kind==='river'?p.route.appearance?.halo:undefined}}})
  }
  if(o.kind==='stamp'&&semanticStamp){const effects=defaultStampEffects();effects.shadow.enabled=t.shadow;effects.glow.enabled=t.glow;effects.glow.opacity=.12;effects.glow.radius=4;return leaves({effects,opacity:t.sparse?.18:1})}
  return annotationValues(o,t,objects)
}
export function compatibleThemeAsset(source:WorldScatterAsset,candidates:WorldScatterAsset[],theme:WorldTheme,mapType:MapDocument['mapType'],objectId:string) {
  const matches=candidates.filter(a=>a.generator.semanticType===source.generator.semanticType&&a.generator.roles.some(r=>source.generator.roles.includes(r))&&a.generator.themes.includes(theme.assetTheme)&&(!a.applicableMapTypes.length||a.applicableMapTypes.includes(mapType??'world-map'))&&a.generator.biomes.some(b=>b==='generic'||source.generator.biomes.includes(b)))
  // Stable ID-based pick preserves transforms; nothing re-generates placement.
  return createGeneratorSelector(matches)(parseInt(styleFingerprint(objectId).slice(0,8),16),0)
}
export function applyWorldTheme(snapshot:ProjectSnapshot,id:string,options:ThemeOptions=DEFAULT_THEME_OPTIONS,candidates:WorldScatterAsset[]=[]) {
  const t=worldTheme(id);if(!t||!t.mapTypes.includes(snapshot.map.mapType??'battlemap'))throw Error('Choose an available theme for a world or regional map.')
  const previous=snapshot.map.theme,managed:WorldThemeState['managed']={},warnings=new Set<string>(),allowed=editableProjectIds(snapshot),byAsset=new Map(candidates.map(a=>[a.id,a]))
  let overridden=0,changed=0,remapped=0
  const update=<T,>(source:T,key:string,target:Fields,adopt=false):T=>{
    let result=source; const prior=(key==='$map'?previous?.map:previous?.managed[key])??{},next={...prior}
    for(const [path,value] of Object.entries(target)){
      const current=readStyle(source,path),owned=Object.hasOwn(prior,path)
      const canApply=options.reset||!previous||adopt&&!owned||owned&&styleFingerprint(current)===prior[path]
      if(canApply){next[path]=styleFingerprint(value);if(styleFingerprint(current)!==next[path]){if(result===source)result=structuredClone(source);writeStyle(result,path,value);changed++}}else overridden++
    }
    if(Object.keys(next).length)managed[key]=next
    return result
  }
  const mapValues=themeMapValues(t,Math.max(snapshot.map.width,snapshot.map.height));mapValues.effects.fog.areaId=snapshot.map.effects?.fog.areaId??null
  let map=update(snapshot.map,'$map',leaves(mapValues))
  const objects=snapshot.objects.map(original=>{
    const prior=previous?.managed[original.id]
    if(prior)managed[original.id]={...prior}
    if(!allowed.has(original.id)){if(prior)warnings.add('Hidden or locked objects retain their appearance.');return original}
    if(isAnnotation(original)&&!options.elements&&!prior)return original
    const source=original.kind==='stamp'?byAsset.get(original.assetId):undefined
    const semanticStamp=!!source||!!prior&&Object.hasOwn(prior,'effects.version')||!!snapshot.map.generation?.scatter?.placements.some(p=>p.id===original.id)
    const target=themeObjectValues(original,snapshot.map,t,snapshot.objects,semanticStamp)
    if(original.kind==='stamp'&&options.assets&&source&&!t.sparse){
      const replacement=compatibleThemeAsset(source,candidates,t,snapshot.map.mapType,original.id)
      if(replacement)target.assetId=replacement.id
      else warnings.add(`No ${t.assetTheme} asset for ${source.generator.semanticType}; existing artwork retained.`)
    }else if(original.kind==='stamp'&&options.assets&&semanticStamp&&!source)warnings.add('Some semantic asset metadata is unavailable; those images are retained.')
    if(original.kind==='area'&&original.fill.kind==='pattern'&&original.land)warnings.add('Imported terrain Fill Patterns are preserved.')
    if(original.kind==='path'&&original.pathKind==='river'&&original.stroke.kind==='texture')warnings.add('Textured rivers are preserved.')
    let result=update(original,original.id,target,options.elements&&isAnnotation(original))
    if(result!==original&&result.kind==='label')result={...restyleLabel({...result,style:original.kind==='label'?original.style:result.style},result.style),name:original.name??result.name}
    if(result!==original&&result.kind==='path')result=validatePath(withPathGeometry(result))
    if(isAnnotation(result))result=validateAnnotation(result)
    if(result.kind==='stamp'&&original.kind==='stamp'&&result.assetId!==original.assetId)remapped++
    return result
  })
  // Keep linked text anchors fixed even when its owner paint bounds change.
  const byId=new Map(objects.map(o=>[o.id,o]))
  const final=objects.map(o=>{if(o.kind!=='label'||!o.ownerId)return o;const owner=byId.get(o.ownerId);return owner?{...o,offset:{x:o.x+o.width*o.anchor.x-owner.x-owner.width/2,y:o.y+o.height*o.anchor.y-owner.y-owner.height/2}}:o})
  const mapManaged=managed['$map']??{};delete managed['$map'];map={...map,theme:{version:1,id,map:mapManaged,managed}}
  return {snapshot:{...snapshot,map,objects:final},changed,overridden,remapped,warnings:[...warnings]}
}
/** Register newly inserted annotations as managed only where they match current defaults. */
export function adoptNewThemeObjects(map:MapDocument,objects:MapObject[],added:MapObject[]):MapDocument {
  const t=worldTheme(map.theme?.id);if(!map.theme||!t||!t.mapTypes.includes(map.mapType??'battlemap'))return map
  const managed={...map.theme.managed}
  for(const o of added){const target=themeObjectValues(o,map,t,objects),fields:Record<string,string>={};for(const [key,value] of Object.entries(target))if(styleFingerprint(readStyle(o,key))===styleFingerprint(value))fields[key]=styleFingerprint(value);if(Object.keys(fields).length)managed[o.id]=fields}
  return {...map,theme:{...map.theme,managed}}
}

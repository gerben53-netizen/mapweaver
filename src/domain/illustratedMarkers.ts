import { MARKER_TYPES, PROMINENCE, markerWidth } from './markerRegistry'
import type { Prominence } from './markerRegistry'
import { pixelsPerKm } from './geography'
import type { MapType } from './geography'
import type { MapDocument } from './models'
import type { PlaceObject } from './annotations'

/** Namespaced, explicit tags reuse the portable asset-package metadata contract. */
export function markerAssetMetadata(tags: readonly string[]) {
  return {
    types: tags.filter(t => t.startsWith('marker:')).map(t => t.slice(7)),
    themes: tags.filter(t => t.startsWith('theme:')).map(t => t.slice(6)),
    families: tags.filter(t => t.startsWith('style:')).map(t => t.slice(6)),
  }
}
export function validateMarkerAssetTags(tags: readonly string[]) {
  const m = markerAssetMetadata(tags)
  if (!m.types.length) return
  if (m.types.some(t => !MARKER_TYPES.some(([id]) => id === t))) throw Error('Unknown marker: asset tag.')
  if ([...m.themes, ...m.families].some(t => !/^[a-z][a-z0-9-]{0,59}$/.test(t))) throw Error('Invalid marker theme/style tag.')
}
export interface IllustratedCandidate { id:string; name:string; tags:string[]; applicableMapTypes:MapType[]; width:number; height:number; source:'bundled'|'library'|'project'; defaultSize?:import('./library').DefaultSize; file?:string; sha256?:string }
export function markerCandidates<T extends IllustratedCandidate>(assets: readonly T[], type:string, mapType:MapType, options: {override?:boolean; theme?:string; family?:string} = {}):T[] {
  return assets.filter(a => {
    const m = markerAssetMetadata(a.tags)
    return (options.override || m.types.includes(type)) && (!a.applicableMapTypes.length || a.applicableMapTypes.includes(mapType)) && (!options.theme || m.themes.includes(options.theme)) && (!options.family || m.families.includes(options.family))
  }).sort((a,b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
/** Deliberately exaggerated atlas symbols, expressed in physical map units at creation. */
export function illustratedWidthKm(map:MapDocument,type:string,prominence:Prominence) {
  const hierarchy = type==='capital'?1.15:type==='village'?.7:type==='town'?.85:1
  return (map.geography?.widthKm ?? map.width/pixelsPerKm(map)) * .025 * hierarchy * PROMINENCE[prominence].scale
}
export interface MarkerIllustration { assetId:string; widthKm:number; aspect:number }
export function illustrateMarker(place:PlaceObject, illustration:MarkerIllustration, map:MapDocument):PlaceObject {
  if (!Number.isFinite(illustration.widthKm) || illustration.widthKm<=0 || !Number.isFinite(illustration.aspect) || illustration.aspect<=0) throw Error('Enter a positive illustrated width and valid image aspect ratio.')
  const scale=pixelsPerKm(map),width=illustration.widthKm*scale,height=width/illustration.aspect
  return {...place,visualMode:'illustrated',assetId:illustration.assetId,sizeMode:'world',pixelsPerKm:scale,width,height,x:place.x+(place.width-width)*place.anchor.x,y:place.y+(place.height-height)*place.anchor.y}
}
export function symbolizeMarker(place:PlaceObject,map:MapDocument):PlaceObject {
  const width=markerWidth(map.mapType,place.marker?.prominence??'normal')
  return {...place,visualMode:'symbol',assetId:undefined,sizeMode:'cartographic',width,height:width,x:place.x+(place.width-width)*place.anchor.x,y:place.y+(place.height-width)*place.anchor.y}
}

import type { MapDocument, MapLayer } from './models'
import type { Point } from '../canvas/viewport'
export type MapType = 'battlemap' | 'regional-map' | 'world-map'
export type DistanceUnit = 'km' | 'mi'
export interface Geography {
  widthKm: number; unit: DistanceUnit; northDegrees: number; projection: 'none' | 'abstract'
  origin: { xKm: number; yKm: number } | null
  ruler: boolean; scaleBar: boolean; exportScaleBar: boolean; graticule: boolean
}
export const mapTypeName = (type?: MapType) => type === 'world-map' ? 'World map' : type === 'regional-map' ? 'Regional map' : 'Battlemap'
export const isLandMap = (map: Pick<MapDocument,'mapType'>) => map.mapType === 'regional-map' || map.mapType === 'world-map'
export const defaultGeography = (type: MapType = 'regional-map'): Geography => ({widthKm:type==='world-map'?40000:1000,unit:'km',northDegrees:0,projection:'none',origin:null,ruler:true,scaleBar:true,exportScaleBar:false,graticule:false})
export function validateGeography(value: Geography): Geography {
  if(!value || typeof value!=='object' || Object.keys(value).some(k=>!['widthKm','unit','northDegrees','projection','origin','ruler','scaleBar','exportScaleBar','graticule'].includes(k)))throw Error('Invalid geographic settings.')
  if(!Number.isFinite(value.widthKm)||value.widthKm<.000001||value.widthKm>1e9||!Number.isFinite(value.northDegrees)||value.northDegrees<0||value.northDegrees>=360||!['km','mi'].includes(value.unit)||!['none','abstract'].includes(value.projection)||![value.ruler,value.scaleBar,value.exportScaleBar,value.graticule].every(v=>typeof v==='boolean'))throw Error('Use a positive map width (0.000001–1 billion km), valid units and orientation (0–359.999°).')
  if(value.origin!==null && (!value.origin||Object.keys(value.origin).some(k=>!['xKm','yKm'].includes(k))||![value.origin.xKm,value.origin.yKm].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e9)))throw Error('Invalid local fictional origin.')
  return structuredClone(value)
}
export function mapWorkspace(map: Pick<MapDocument,'mapType'|'geography'>) {
  const mapType=map.mapType??'battlemap'
  if(!['battlemap','regional-map','world-map'].includes(mapType))throw Error('Unknown map type.')
  return {mapType,geography:map.geography?validateGeography(map.geography):defaultGeography(mapType)}
}
export const unitKm = (unit: DistanceUnit) => unit==='mi'?1.609344:1
export const pixelsPerKm = (map: MapDocument) => map.width/mapWorkspace(map).geography.widthKm
export const pixelsToDistance = (pixels: number,map: MapDocument) => pixels/pixelsPerKm(map)/unitKm(mapWorkspace(map).geography.unit)
export const distanceToPixels = (value: number,unit: DistanceUnit,map: MapDocument) => value*unitKm(unit)*pixelsPerKm(map)
export function measurePoints(points: Point[],map: MapDocument) {
  const segments=points.slice(1).map((p,i)=>pixelsToDistance(Math.hypot(p.x-points[i].x,p.y-points[i].y),map))
  return {segments,total:segments.reduce((s,n)=>s+n,0)}
}
export const formatDistance = (n:number,unit:DistanceUnit) => `${Number(n.toPrecision(5))} ${unit}`
export function scaleBar(map: MapDocument,zoom:number,maxPixels=160) {
  const max=pixelsToDistance(maxPixels/zoom,map),base=10**Math.floor(Math.log10(max)),value=([5,2,1].find(n=>n*base<=max)??1)*base
  return {pixels:distanceToPixels(value,mapWorkspace(map).geography.unit,map)*zoom,label:formatDistance(value,mapWorkspace(map).geography.unit)}
}
export function localExtent(map:MapDocument) {
  const g=mapWorkspace(map).geography,o=g.origin??{xKm:0,yKm:0}
  return {minXKm:o.xKm,minYKm:o.yKm,maxXKm:o.xKm+g.widthKm,maxYKm:o.yKm+g.widthKm*map.height/map.width}
}
export function landLayers(): MapLayer[] {
  return ['Labels','Places','Borders','Routes','Terrain','Landmasses','Background'].map(name=>({id:crypto.randomUUID(),name,visible:true,locked:false,objectIds:[]}))
}

import { TERRAIN_STYLES, type TerrainStyleId } from './terrainStyles'
import type { MapObject } from './models'
import { isAnnotation } from './annotations'
import { premiumTerrain } from './premiumTerrain'

export const PAINT_SAMPLES = 64
export const PAINT_STEP = 2
export const PAINT_TILE = PAINT_SAMPLES * PAINT_STEP
export const PAINT_LIMITS = { materials: 32, tiles: 4096, bytes: 2 * 1024 * 1024, masks: 8192 } as const
export type PaintTile = Record<string, string>
export interface PaintMaterial { style?: TerrainStyleId; scale: number; textureId?: string; assetId?: string }
export interface TerrainPaint { baseTiles?: Record<string, PaintTile>; version: 1 | 2 | 3; visible: boolean; locked: boolean; opacity: number; materials: Record<string, PaintMaterial>; tiles: Record<string, PaintTile> }
export const emptyTerrainPaint = (): TerrainPaint => ({ version: 1, visible: true, locked: false, opacity: 1, materials: {}, tiles: {} })
export const materialKey = (style: TerrainStyleId, scale: number, textureId?: string) => `${style}_${scale}${textureId ? '@' + textureId : ''}`
export const emptyTexturePaint = (): TerrainPaint => ({...emptyTerrainPaint(),version:3})
export const paintStep = (paint:TerrainPaint) => paint.version===3?1:PAINT_STEP
export const textureMaterialKey = (assetId:string,scale:number) => `asset:${assetId}@${scale}`
export const texturePaintAssetIds = (paint?:TerrainPaint) => [...new Set(Object.values(paint?.materials||{}).flatMap(m=>m.assetId?[m.assetId]:[]))]
const N = PAINT_SAMPLES ** 2
export function encodeMask(mask: Uint8Array): string {
  if (mask.length !== N) throw Error('Invalid paint mask size.')
  const runs: number[] = []
  for (let i = 0; i < N;) { let end = i + 1; while (end < N && mask[end] === mask[i]) end++; runs.push((end - i) >> 8, (end - i) & 255, mask[i]); i = end }
  const compressed = runs.length < N, bytes = compressed ? runs : mask
  return (compressed ? 'r:' : 'b:') + btoa(String.fromCharCode(...bytes))
}
export function decodeMask(value: string): Uint8Array {
  if (typeof value !== 'string' || value.length > 5466 || !/^[br]:[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Invalid terrain paint encoding.')
  let bytes: string
  try { bytes = atob(value.slice(2)) } catch { throw Error('Invalid terrain paint base64.') }
  const result = new Uint8Array(N)
  if (value[0] === 'b') { if (bytes.length !== N) throw Error('Invalid paint mask length.'); for (let i = 0; i < N; i++) result[i] = bytes.charCodeAt(i) }
  else {
    if (bytes.length % 3) throw Error('Invalid paint mask run.')
    let offset = 0
    for (let i = 0; i < bytes.length; i += 3) { const count = bytes.charCodeAt(i) * 256 + bytes.charCodeAt(i + 1); if (!count || offset + count > N) throw Error('Invalid paint mask run.'); result.fill(bytes.charCodeAt(i + 2), offset, offset + count); offset += count }
    if (offset !== N) throw Error('Incomplete paint mask.')
  }
  return result
}
function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid terrain paint record.'); return v as Record<string, unknown> }
export function validateTerrainPaint(value: unknown, texture=false): TerrainPaint {
  const p = record(value), materials = record(p.materials), tiles = record(p.tiles), baseTiles=texture&&p.baseTiles!==undefined?record(p.baseTiles):{}
  if (Object.keys(p).some(k => !['version','visible','locked','opacity','materials','tiles',...(texture?['baseTiles']:[])].includes(k)) || !(texture?[3]:[1,2]).includes(p.version as number) || typeof p.visible !== 'boolean' || typeof p.locked !== 'boolean' || typeof p.opacity !== 'number' || !Number.isFinite(p.opacity) || p.opacity < 0 || p.opacity > 1 || Object.keys(materials).length > PAINT_LIMITS.materials || Object.keys(tiles).length + Object.keys(baseTiles).length > PAINT_LIMITS.tiles) throw Error('Invalid terrain paint layer or limits.')
  for (const [key, v] of Object.entries(materials)) {
    const m = record(v)
    if(texture){
      if(Object.keys(m).some(k=>!['assetId','scale'].includes(k))||typeof m.assetId!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(m.assetId)||typeof m.scale!=='number'||!Number.isFinite(m.scale)||m.scale<.01||m.scale>100||key!==textureMaterialKey(m.assetId,m.scale))throw Error('Invalid texture paint material.')
      continue
    }
    if (Object.keys(m).some(k => !['style','scale',...(p.version===2?['textureId']:[])].includes(k)) || typeof m.style !== 'string' || !Object.hasOwn(TERRAIN_STYLES, m.style) || typeof m.scale !== 'number' || !Number.isFinite(m.scale) || m.scale < .01 || m.scale > 100 || (m.textureId !== undefined && premiumTerrain(m.textureId)?.style !== m.style) || key !== materialKey(m.style as TerrainStyleId, m.scale, m.textureId as string | undefined)) throw Error('Invalid paint material.')
  }
  let bytes = 0, masks = 0
  for (const [key, v] of [...Object.entries(tiles),...Object.entries(baseTiles)]) {
    if (!/^(0|[1-9]\d{0,2}),(0|[1-9]\d{0,2})$/.test(key) || key.split(',').some(n => +n >= (texture?256:128))) throw Error('Invalid paint tile position.')
    const tile = record(v), total = new Uint16Array(N)
    if (!Object.keys(tile).length || Object.keys(tile).length > PAINT_LIMITS.materials) throw Error('Invalid paint tile.')
    for (const [id, mask] of Object.entries(tile)) {
      if (!Object.hasOwn(materials, id) || typeof mask !== 'string') throw Error('Unknown paint material.')
      bytes += mask.length + id.length + key.length; masks++
      if (bytes > PAINT_LIMITS.bytes || masks > PAINT_LIMITS.masks) throw Error('Terrain paint exceeds its storage budget.')
      const decoded = decodeMask(mask)
      for (let i = 0; i < N; i++) { total[i] += decoded[i]; if (total[i] > 255) throw Error('Paint weights exceed full opacity.') }
    }
  }
  return value as TerrainPaint
}
export const semanticTerrain = (o: MapObject) => o.kind === 'area' && (o.land?.role === 'landmass' || o.land?.role === 'terrain-region')
/** Paint opts into a semantic base pass. Unpainted maps keep their exact order. */
export function terrainPaintOrder(objects: MapObject[], enabled: boolean) {
  if (!enabled) return objects
  const rank = (o: MapObject) => semanticTerrain(o) ? 0 : isAnnotation(o) ? 3 : o.kind === 'path' ? 2 : 1
  return [...objects].sort((a, b) => rank(a) - rank(b))
}
export const terrainPaintBoundary = (objects: MapObject[]) => { const index = objects.findIndex(o => !semanticTerrain(o)); return index < 0 ? objects.length : index }

export const validateTexturePaint = (value:unknown) => validateTerrainPaint(value,true)
/** Opt-in only: every Area is a surface, all other artwork stays above paint. */
export function texturePaintOrder(objects:MapObject[],enabled:boolean){
  return enabled?[...objects.filter(o=>o.kind==='area'),...objects.filter(o=>o.kind!=='area')]:objects
}
export const texturePaintBoundary = (objects:MapObject[]) => {const i=objects.findIndex(o=>o.kind!=='area');return i<0?objects.length:i}

/** ZIP import may deduplicate source images and assigns service-owned asset IDs. */
export function remapTexturePaint(paint:TerrainPaint,mapping:ReadonlyMap<string,string>):TerrainPaint {
 const keys=new Map<string,string>(),materials:TerrainPaint['materials']={}
 for(const [key,m] of Object.entries(paint.materials)){const assetId=mapping.get(m.assetId!);if(!assetId)throw Error('Missing texture material during import.');const next=textureMaterialKey(assetId,m.scale);keys.set(key,next);materials[next]={assetId,scale:m.scale}}
 const remapTiles=(input:Record<string,PaintTile>)=>Object.fromEntries(Object.entries(input).map(([position,tile])=>{const masks:Record<string,Uint8Array>={};for(const [key,encoded] of Object.entries(tile)){const next=keys.get(key)!,mask=decodeMask(encoded);if(masks[next])mask.forEach((v,i)=>masks[next][i]+=v);else masks[next]=mask}return [position,Object.fromEntries(Object.entries(masks).map(([id,mask])=>[id,encodeMask(mask)]))]}))
 return {...paint,materials,tiles:remapTiles(paint.tiles),...(paint.baseTiles===undefined?{}:{baseTiles:remapTiles(paint.baseTiles)})}
}

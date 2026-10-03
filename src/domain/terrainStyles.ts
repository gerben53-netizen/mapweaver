/** Versioned built-in appearance. Geometry and user-supplied Fill Patterns remain independent. */
export const TERRAIN_STYLES = {
  land: { name: 'Generic land', color: '#b5bb89', texture: 'grain' },
  grassland: { name: 'Grassland', color: '#a9b57a', texture: 'grain' },
  forest: { name: 'Forest floor', color: '#648160', texture: 'grain' },
  desert: { name: 'Desert', color: '#d9be85', texture: 'sand' },
  tundra: { name: 'Tundra', color: '#b3bbaa', texture: 'grain' },
  snow: { name: 'Snow', color: '#e2e5dd', texture: 'grain' },
  swamp: { name: 'Swamp', color: '#819783', texture: 'waves' },
  rocky: { name: 'Rocky upland', color: '#999484', texture: 'sand' },
  volcanic: { name: 'Volcanic', color: '#69615b', texture: 'sand' },
  ocean: { name: 'Ocean', color: '#638b9c', texture: 'waves' },
  shallow: { name: 'Shallow water', color: '#90b7b8', texture: 'waves' },
} as const
export type TerrainStyleId = keyof typeof TERRAIN_STYLES
export const COAST_STYLES = {
  none: { name: 'None', halo: '#000000', shore: '#000000', line: '#000000', width: 0, opacity: 0 },
  minimal: { name: 'Minimal', halo: '#8eb9bf', shore: '#ddd7ad', line: '#496769', width: 0, opacity: .8 },
  fantasy: { name: 'Fantasy Soft Coast', halo: '#a8d0cd', shore: '#dfd6a8', line: '#526e65', width: 12, opacity: .65 },
  parchment: { name: 'Parchment Coast', halo: '#bdab83', shore: '#e9d9b4', line: '#75654b', width: 8, opacity: .6 },
  contrast: { name: 'High Contrast', halo: '#beddda', shore: '#f2e7c7', line: '#283e46', width: 6, opacity: .9 },
} as const
export type CoastStyleId = keyof typeof COAST_STYLES
export interface TerrainAppearance {
  color?: string; version: 1; style: TerrainStyleId; patternScale: number; textureOpacity: number
  feather: number; blend: number; coast: CoastStyleId; coastScale: number
}
export const terrainAppearance = (style: TerrainStyleId, mapWidth = 2400): TerrainAppearance => ({
  version: 1, style, patternScale: Math.max(.1, Math.min(10, mapWidth / 2400)), textureOpacity: .22,
  feather: Math.min(100, mapWidth / 800), blend: 1, coast: 'none', coastScale: Math.max(.1, Math.min(10, mapWidth / 2400)),
})
const bounded = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max
export function validateTerrainAppearance(v: TerrainAppearance): TerrainAppearance {
  if (!v || v.version !== 1 || !Object.hasOwn(TERRAIN_STYLES, v.style) || !Object.hasOwn(COAST_STYLES, v.coast) ||
    Object.keys(v).some(k => !['version','style','color','patternScale','textureOpacity','feather','blend','coast','coastScale'].includes(k)) ||
    (v.color!==undefined&&(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))) || !bounded(v.patternScale,.01,100) || !bounded(v.textureOpacity,0,1) || !bounded(v.feather,0,100) || !bounded(v.blend,0,1) || !bounded(v.coastScale,.1,10)) throw Error('Invalid terrain appearance.')
  return { ...v }
}
export const WATER_STYLES = {
  calm: { name: 'Calm Fantasy Ocean', deep: '#638b9c', shallow: '#90b7b8', waves: .13 },
  deep: { name: 'Deep Ocean', deep: '#34576f', shallow: '#82b5bc', waves: .1 },
  parchment: { name: 'Parchment Sea', deep: '#b4a17c', shallow: '#d9ccac', waves: .08 },
  minimal: { name: 'Minimal Blue', deep: '#729fb0', shallow: '#729fb0', waves: 0 },
  dark: { name: 'Dark Sea', deep: '#263d4b', shallow: '#597d86', waves: .1 },
} as const
export type WaterStyleId = keyof typeof WATER_STYLES
export interface WaterAppearance { version: 1; style: WaterStyleId; patternScale: number; textureOpacity: number; vignette: number }
export const waterAppearance = (style: WaterStyleId): WaterAppearance => ({ version: 1, style, patternScale: 1, textureOpacity: 1, vignette: style === 'minimal' ? 0 : .18 })
export function validateWaterAppearance(v: WaterAppearance): WaterAppearance {
  if (!v || v.version !== 1 || !Object.hasOwn(WATER_STYLES,v.style) || Object.keys(v).some(k=>!['version','style','patternScale','textureOpacity','vignette'].includes(k)) || !bounded(v.patternScale,.01,100) || !bounded(v.textureOpacity,0,1) || !bounded(v.vignette,0,.7)) throw Error('Invalid water appearance.')
  return { ...v }
}

import { defaultLandArea, type TerrainType } from './landAreas'
import { terrainAppearance, type TerrainStyleId } from './terrainStyles'

/** Existing semantic vocabulary; visual presets do not expand the saved biome taxonomy. */
export const TERRAIN_TYPES: Record<TerrainType, { name: string; style: TerrainStyleId }> = {
  forest: { name: 'Forest', style: 'forest' },
  mountains: { name: 'Mountains', style: 'rocky' },
  desert: { name: 'Desert', style: 'desert' },
  swamp: { name: 'Swamp', style: 'swamp' },
  snow: { name: 'Snow', style: 'snow' },
  custom: { name: 'Custom terrain', style: 'land' },
}
export function semanticTerrain(type: TerrainType, mapWidth: number) {
  return { ...defaultLandArea('terrain-region'), terrain: type, appearance: terrainAppearance(TERRAIN_TYPES[type].style, mapWidth) }
}

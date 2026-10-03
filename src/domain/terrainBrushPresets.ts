import type { TerrainBrush } from './terrainBrush'

/** Behavior only: never changes material, mode or semantic terrain. */
export const BRUSH_PRESETS: Record<string, Pick<TerrainBrush, 'size' | 'softness' | 'strength' | 'textureScale'>> = {
  'Soft wash': { size: 240, softness: .9, strength: .3, textureScale: .6 },
  'Fine detail': { size: 40, softness: .65, strength: .5, textureScale: .35 },
  'Broad coverage': { size: 400, softness: .8, strength: .65, textureScale: 1 },
}

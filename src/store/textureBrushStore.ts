import { create } from 'zustand'
import { defaultTerrainBrush, type TerrainBrush } from '../domain/terrainBrush'
import type { TerrainPaint } from '../domain/terrainPaint'
import type { Point } from '../canvas/viewport'
export const useTextureBrushStore=create(()=>({settings:{...defaultTerrainBrush,size:100,softness:.4,strength:.6,textureScale:1} as TerrainBrush,materialName:'Choose material',preview:null as TerrainPaint|null,cursor:null as Point|null,images:new Map<string,HTMLImageElement>(),imageGeneration:-1}))

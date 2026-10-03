import { create } from 'zustand'
import { defaultTerrainBrush, type TerrainBrush } from '../domain/terrainBrush'
import type { TerrainPaint } from '../domain/terrainPaint'
import type { Point } from '../canvas/viewport'

/** Transient controls/preview only. No project subscriptions or history per pointer event. */
export const useTerrainBrushStore=create(()=>({settings:{...defaultTerrainBrush} as TerrainBrush,preview:null as TerrainPaint|null,cursor:null as Point|null}))

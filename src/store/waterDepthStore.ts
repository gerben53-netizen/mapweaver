import { create } from 'zustand'
import { defaultWaterDepthBrush, validateWaterDepth, type WaterDepth } from '../domain/waterDepth'
import type { TerrainPaint } from '../domain/terrainPaint'
import type { Point } from '../canvas/viewport'
import { useProjectStore } from './projectStore'
import { history } from './history'
export const useWaterDepthStore=create(()=>({settings:{...defaultWaterDepthBrush},preview:null as TerrainPaint|null,cursor:null as Point|null}))
export function commitWaterDepth(value:WaterDepth,expected:WaterDepth|undefined,label='Change water depth'){
  if(useProjectStore.getState().map.waterDepth!==expected)throw Error('Water depth changed during editing. Try again.')
  validateWaterDepth(value)
  if(JSON.stringify(value)===JSON.stringify(expected))return
  history.run(label,()=>useProjectStore.setState(s=>({map:{...s.map,waterDepth:value}})))
}

import { create } from 'zustand'
import { defaultDetailBrush, validateEnvironmentalDetail, type DetailBrush, type EnvironmentalDetail } from '../domain/environmentalDetail'
import type { Point } from '../canvas/viewport'
import { history } from './history'
import { useProjectStore } from './projectStore'
export const useEnvironmentalDetailStore=create(()=>({settings:{...defaultDetailBrush,presetId:'premium.environmental.surface.dirt',opacity:.25},cursor:null as Point|null,preview:null as EnvironmentalDetail|null}))
export function commitEnvironmentalDetail(data:EnvironmentalDetail,expected:EnvironmentalDetail|undefined,label='Paint environmental detail'){
  const state=useProjectStore.getState();if(state.map.environmentalDetail!==expected)throw Error('Environmental detail changed during painting. Retry the stroke.')
  validateEnvironmentalDetail(data)
  history.run(label,()=>useProjectStore.setState({map:{...state.map,environmentalDetail:data}}))
}
export function updateDetailBrush(patch:Partial<DetailBrush>){useEnvironmentalDetailStore.setState(s=>({settings:{...s.settings,...patch}}))}

import type { MapDocument, StampObject } from './models'
import { isLandMap } from './geography'
import { defaultMapEffects, DEFAULT_SOFT_SHADOW, softShadowStyle } from './mapEffects'
export type ArlMode = 'OFF' | 'B' | 'C'
export interface RenderingSettings { arl?: ArlMode }
export function validateRendering(value: unknown): RenderingSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => k !== 'arl')) throw Error('Invalid rendering settings.')
  const arl = (value as RenderingSettings).arl
  if (arl !== undefined && !['OFF', 'B', 'C'].includes(arl)) throw Error('Invalid ARL profile.')
  return arl === undefined ? {} : { arl }
}
/** Defaults are resolved at use time, never written into existing maps/stamps. */
export function effectiveRendering(map: Pick<MapDocument, 'mapType' | 'rendering' | 'effects'>) {
  const battlemap = !isLandMap(map)
  return {
    arl: map.rendering?.arl ?? (battlemap ? 'C' : 'OFF') as ArlMode,
    effects: { ...(map.effects ?? defaultMapEffects()), stampSoftShadow: map.effects?.stampSoftShadow ?? { ...DEFAULT_SOFT_SHADOW, enabled: battlemap } },
  }
}
export const effectiveStampShadow = (object: StampObject, map: MapDocument) => softShadowStyle(object, effectiveRendering(map).effects)

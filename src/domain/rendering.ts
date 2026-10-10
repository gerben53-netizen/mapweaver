import type { MapDocument, StampObject } from './models'
import { isLandMap } from './geography'
import { defaultMapEffects, DEFAULT_SOFT_SHADOW, softShadowStyle } from './mapEffects'
export type ArlMode = 'OFF' | 'B' | 'C'
export interface ArchitecturalShadowSettings { enabled: boolean; core: number; falloff: number; opacity: number }
export const DEFAULT_ARCHITECTURAL_SHADOW: ArchitecturalShadowSettings = { enabled: true, core: 3, falloff: 7, opacity: .55 }
export interface RenderingSettings { arl?: ArlMode; contactShadow?: ArchitecturalShadowSettings }
export function effectiveContactShadow(map: Pick<MapDocument, 'rendering'>) { return { ...DEFAULT_ARCHITECTURAL_SHADOW, ...map.rendering?.contactShadow } }
export function validateContactShadow(value: unknown): ArchitecturalShadowSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid architectural shadow.')
  const v = value as ArchitecturalShadowSettings
  if (Object.keys(v).some(k => !['enabled', 'core', 'falloff', 'opacity'].includes(k)) || typeof v.enabled !== 'boolean' || !Number.isFinite(v.core) || v.core < 0 || v.core > 8 || !Number.isFinite(v.falloff) || v.falloff < 0 || v.falloff > 20 || !Number.isFinite(v.opacity) || v.opacity < 0 || v.opacity > .8) throw Error('Invalid architectural shadow.')
  return { enabled: v.enabled, core: v.core, falloff: v.falloff, opacity: v.opacity }
}
export function validateRendering(value: unknown): RenderingSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => k !== 'arl' && k !== 'contactShadow')) throw Error('Invalid rendering settings.')
  const arl = (value as RenderingSettings).arl
  if (arl !== undefined && !['OFF', 'B', 'C'].includes(arl)) throw Error('Invalid ARL profile.')
  const shadow = (value as RenderingSettings).contactShadow
  return { ...(arl === undefined ? {} : { arl }), ...(shadow === undefined ? {} : { contactShadow: validateContactShadow(shadow) }) }
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

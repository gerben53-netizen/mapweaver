import type { MapObject } from './models'
import { isAnnotation } from './annotations'

export interface FogStyle { preset: string; enabled: boolean; opacity: number; softness: number; scale: number; density: number; color: string; areaId: string | null }
export interface VignetteStyle { preset: string; enabled: boolean; amount: number; radius: number; softness: number; color: string }
export interface FrameStyle { preset: string; enabled: boolean; inset: number; thickness: number; opacity: number; color: string }
export interface SoftShadowSettings { enabled:boolean; intensity:number }
export interface MapEffects { stampSoftShadow?:SoftShadowSettings; version: 1; fog: FogStyle; vignette: VignetteStyle; frame: FrameStyle }
export interface ShadowStyle { preset: string; enabled: boolean; x: number; y: number; blur: number; opacity: number; color: string }
export interface GlowStyle { preset: string; enabled: boolean; radius: number; opacity: number; softness: number; color: string }
export interface StampEffects { softShadow?:'default'|'on'|'off'; version: 1; shadow: ShadowStyle; glow: GlowStyle }

export const FOG_PRESETS: Record<string, { name: string; style: Omit<FogStyle, 'areaId'> }> = {
  'fog.softMist': { name: 'Soft Mist', style: { preset: 'fog.softMist', enabled: true, opacity: .24, softness: .85, scale: .32, density: .5, color: '#e9eeeb' } },
  'fog.denseFog': { name: 'Dense Fog', style: { preset: 'fog.denseFog', enabled: true, opacity: .48, softness: .9, scale: .45, density: .85, color: '#dce4df' } },
  'fog.coldMist': { name: 'Cold Mist', style: { preset: 'fog.coldMist', enabled: true, opacity: .28, softness: .9, scale: .3, density: .6, color: '#cce3ed' } },
  'fog.arcaneHaze': { name: 'Arcane Haze', style: { preset: 'fog.arcaneHaze', enabled: true, opacity: .2, softness: .85, scale: .25, density: .5, color: '#d6c8ed' } },
}
export const VIGNETTE_PRESETS: Record<string, { name: string; style: VignetteStyle }> = {
  'vignette.subtleDark': { name: 'Subtle Dark', style: { preset: 'vignette.subtleDark', enabled: true, amount: .22, radius: .55, softness: .85, color: '#18231f' } },
  'vignette.parchmentEdge': { name: 'Parchment Edge', style: { preset: 'vignette.parchmentEdge', enabled: true, amount: .32, radius: .55, softness: .85, color: '#c5ab76' } },
  'vignette.dramaticDark': { name: 'Dramatic Dark', style: { preset: 'vignette.dramaticDark', enabled: true, amount: .55, radius: .35, softness: .95, color: '#111923' } },
}
export const FRAME_PRESETS = {
  'border.minimal': { name: 'Minimal', color: '#415654', thickness: 1.5, motif: 'minimal' },
  'border.classic': { name: 'Classic', color: '#594831', thickness: 2, motif: 'classic' },
  'border.parchment': { name: 'Parchment', color: '#907249', thickness: 2, motif: 'parchment' },
  'border.fantasyOrnate': { name: 'Fantasy Ornate', color: '#816733', thickness: 2, motif: 'ornate' },
  'border.elven': { name: 'Elven', color: '#4d705d', thickness: 1.5, motif: 'elven' },
  'border.darkOrnamental': { name: 'Dark Ornamental', color: '#342d3f', thickness: 2.5, motif: 'dark' },
} as const
export const STAMP_EFFECT_PRESETS = {
  shadow: { name: 'Soft terrain shadow', style: { preset: 'shadow.softTerrain', enabled: true, x: 3, y: 5, blur: 6, opacity: .3, color: '#18211d' } satisfies ShadowStyle },
  glow: { name: 'Arcane glow', style: { preset: 'glow.arcane', enabled: true, radius: 12, opacity: .35, softness: .8, color: '#a4d8e5' } satisfies GlowStyle },
}
export const framePreset = (preset: keyof typeof FRAME_PRESETS): FrameStyle => ({ preset, enabled: true, inset: 18, thickness: FRAME_PRESETS[preset].thickness, opacity: .9, color: FRAME_PRESETS[preset].color })
export const defaultMapEffects = (): MapEffects => ({ version: 1, fog: { ...FOG_PRESETS['fog.softMist'].style, enabled: false, areaId: null }, vignette: { ...VIGNETTE_PRESETS['vignette.subtleDark'].style, enabled: false }, frame: { ...framePreset('border.classic'), enabled: false } })
export const defaultStampEffects = (): StampEffects => ({ version: 1, shadow: { ...STAMP_EFFECT_PRESETS.shadow.style, enabled: false }, glow: { ...STAMP_EFFECT_PRESETS.glow.style, enabled: false } })
function record(v: unknown, keys: string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) throw Error('Invalid effects fields.')
  return v as Record<string, unknown>
}
function range(v: unknown, min: number, max: number) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw Error(`Effect value must be ${min}–${max}.`) }
function common(v: Record<string, unknown>, presets: string[]) {
  if (typeof v.enabled !== 'boolean' || typeof v.color !== 'string' || !/^#[a-f\d]{6}$/i.test(v.color) || typeof v.preset !== 'string' || !presets.includes(v.preset)) throw Error('Invalid effect style.')
}
export function validateMapEffects(value: unknown): MapEffects {
  const e = record(value, ['version', 'fog', 'vignette', 'frame', 'stampSoftShadow']); if (e.version !== 1) throw Error('Unsupported map effects version.')
  if(e.stampSoftShadow!==undefined){const s=record(e.stampSoftShadow,['enabled','intensity']);if(typeof s.enabled!=='boolean')throw Error('Invalid soft shadow switch.');range(s.intensity,0,1)}
  const f = record(e.fog, ['preset', 'enabled', 'opacity', 'softness', 'scale', 'density', 'color', 'areaId'])
  common(f, Object.keys(FOG_PRESETS)); for (const k of ['opacity', 'softness', 'density']) range(f[k], 0, 1); range(f.scale, .05, 1)
  if (f.areaId !== null && (typeof f.areaId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(f.areaId))) throw Error('Invalid fog Area reference.')
  const v = record(e.vignette, ['preset', 'enabled', 'amount', 'radius', 'softness', 'color']); common(v, Object.keys(VIGNETTE_PRESETS)); for (const k of ['amount', 'radius', 'softness']) range(v[k], 0, 1)
  const b = record(e.frame, ['preset', 'enabled', 'inset', 'thickness', 'opacity', 'color']); common(b, Object.keys(FRAME_PRESETS)); range(b.inset, 0, 256); range(b.thickness, .5, 12); range(b.opacity, 0, 1)
  return structuredClone(value) as MapEffects
}
export function validateStampEffects(value: unknown): StampEffects {
  const e = record(value, ['version', 'shadow', 'glow', 'softShadow']); if (e.version !== 1) throw Error('Unsupported stamp effects version.')
  if(e.softShadow!==undefined&&!['default','on','off'].includes(e.softShadow as string))throw Error('Invalid soft shadow override.')
  const s = record(e.shadow, ['preset', 'enabled', 'x', 'y', 'blur', 'opacity', 'color']); common(s, ['shadow.softTerrain']); range(s.x, -128, 128); range(s.y, -128, 128); range(s.blur, 0, 64); range(s.opacity, 0, 1)
  const g = record(e.glow, ['preset', 'enabled', 'radius', 'opacity', 'softness', 'color']); common(g, ['glow.arcane']); range(g.radius, 0, 64); range(g.opacity, 0, 1); range(g.softness, 0, 1)
  return structuredClone(value) as StampEffects
}
// Only an enabled fog boundary elevates annotation objects. Legacy order is exact otherwise.
export function effectOrder(objects: MapObject[], effects?: MapEffects): MapObject[] {
  return effects?.fog.enabled ? [...objects.filter(o => !isAnnotation(o)), ...objects.filter(isAnnotation)] : objects
}
export const fogBoundary = (objects: MapObject[], effects?: MapEffects) => effects?.fog.enabled ? objects.findIndex(isAnnotation) : -1
export function frameBounds(width: number, height: number, frame: FrameStyle) {
  const scale = Math.min(1, Math.min(width, height) / 160), stroke = frame.thickness * scale
  const inset = Math.min(frame.inset * scale + stroke / 2, Math.min(width, height) / 3)
  return { x: inset, y: inset, width: width - 2 * inset, height: height - 2 * inset, stroke, ornament: Math.min(24 * scale, (width - 2 * inset) / 8, (height - 2 * inset) / 8) }
}

export const DEFAULT_SOFT_SHADOW:SoftShadowSettings={enabled:false,intensity:.25}
export function softShadowStyle(o:import('./models').StampObject,map?:MapEffects){
 const setting=map?.stampSoftShadow??DEFAULT_SOFT_SHADOW,override=o.effects?.softShadow??'default'
 const enabled=override==='on'||(override==='default'&&setting.enabled)
 // Map-pixel size, independent of camera/export resolution. Tiny props stay subtle.
 const size=Math.max(.25,Math.min(4,Math.sqrt(Math.min(o.width,o.height)/100)))
 return {enabled:enabled&&setting.intensity>0,opacity:setting.intensity,blur:6*size,spread:2*size}
}

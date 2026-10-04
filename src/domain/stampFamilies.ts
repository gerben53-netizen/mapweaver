import { validateDefaultSize, normalizeTags, mapTypes } from './library'
import { validateAssetQuality } from './assetQuality'
import type { StampObject } from './models'

export interface FamilyVariant { id: string; assetId: string; label?: string; weight: number; deprecated?: boolean }
export interface StampFamily { metadata?: { defaultSize: import('./library').DefaultSize; semanticClass: string; softShadowDefault: boolean; tags: string[]; applicableMapTypes: import('./geography').MapType[] }; id: string; revision: number; displayName: string; coverVariantId: string; anchor: 'center'; variants: FamilyVariant[] }
export interface FamilySelection { family: StampFamily; variantId: string }
export function validateFamily(value: unknown): StampFamily {
  const f = value as StampFamily
  const validId = (id: unknown) => typeof id === 'string' && /^[\w-]{1,80}$/.test(id)
  if (!f || !validId(f.id) || !Number.isSafeInteger(f.revision) || f.revision < 1 || typeof f.displayName !== 'string' || !f.displayName.trim() || f.displayName.length > 120 || f.anchor !== 'center' || !Array.isArray(f.variants) || !f.variants.length || f.variants.length > 64) throw Error('Invalid stamp family.')
  if (new Set(f.variants.map(v => v.assetId)).size !== f.variants.length || new Set(f.variants.map(v => v.id)).size !== f.variants.length || f.variants.some(v => !validId(v.id) || !validId(v.assetId) || !Number.isFinite(v.weight) || v.weight <= 0 || v.weight > 10000 || (v.deprecated !== undefined && typeof v.deprecated !== 'boolean') || (v.label !== undefined && (typeof v.label !== 'string' || v.label.length > 120)))) throw Error('Invalid family variant.')
  if (!f.variants.some(v => v.id === f.coverVariantId && !v.deprecated)) throw Error('Invalid family cover variant.')
  const metadata = f.metadata ? {defaultSize:validateDefaultSize(f.metadata.defaultSize),tags:normalizeTags(f.metadata.tags),applicableMapTypes:mapTypes(f.metadata.applicableMapTypes),semanticClass:validateAssetQuality({classification:'KEEP',reason:'Family author metadata',semanticClass:f.metadata.semanticClass,softShadowDefault:f.metadata.softShadowDefault}).semanticClass!,softShadowDefault:f.metadata.softShadowDefault} : undefined
  if(metadata && (typeof metadata.softShadowDefault !== 'boolean' || typeof metadata.semanticClass !== 'string' || metadata.defaultSize.mode !== 'world' || !metadata.defaultSize.width || !metadata.defaultSize.height || !['ft','m'].includes(metadata.defaultSize.unit || '')))throw Error('Invalid family shadow default.')
  return { ...(metadata?{metadata}:{}), id: f.id, revision: f.revision, displayName: f.displayName, coverVariantId: f.coverVariantId, anchor: f.anchor, variants: f.variants.map(v => ({ id: v.id, assetId: v.assetId, weight: v.weight, ...(v.label === undefined ? {} : { label: v.label }), ...(v.deprecated === undefined ? {} : { deprecated: v.deprecated }) })) }
}
export function chooseVariant(family: StampFamily, exclude?: string, random = Math.random): FamilyVariant {
  let pool = family.variants.filter(v => !v.deprecated && v.id !== exclude)
  if (!pool.length) pool = family.variants.filter(v => !v.deprecated)
  if (!pool.length) throw Error('Family has no active variants.')
  const sample = random()
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw Error('Invalid random sample.')
  let threshold = sample * pool.reduce((sum, v) => sum + v.weight, 0)
  return pool.find(v => { threshold -= v.weight; return threshold < 0 }) || pool.at(-1)!
}
export function validateFamilySelection(value: unknown, assetId: string): FamilySelection {
  const selection = value as FamilySelection, family = validateFamily(selection?.family)
  if (!family.variants.some(v => v.id === selection.variantId && v.assetId === assetId)) throw Error('Family selection does not match stamp image.')
  return { family, variantId: selection.variantId }
}
export function switchVariant(object: StampObject, variantId?: string): StampObject {
  if (!object.family) throw Error('This stamp has no family.')
  const family = object.family.family
  const variant = variantId ? family.variants.find(v => v.id === variantId && !v.deprecated) : chooseVariant(family, object.family.variantId)
  if (!variant) throw Error('Variant unavailable.')
  return { ...object, assetId: variant.assetId, family: { family, variantId: variant.id } }
}

export function remapFamilyObject(object: StampObject, mapping: Map<string,string>): StampObject {
  return { ...object, assetId: mapping.get(object.assetId) || object.assetId, ...(object.family ? { family: { ...object.family, family: { ...object.family.family, variants: object.family.family.variants.map(v => ({ ...v, assetId: mapping.get(v.assetId) || v.assetId })) } } } : {}) }
}

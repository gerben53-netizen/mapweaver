export const QUALITY_CLASSES = ['KEEP', 'FIX', 'REPLACE', 'REJECT', 'DUPLICATE'] as const
export interface AssetQuality {
  classification: typeof QUALITY_CLASSES[number]
  reason: string
  semanticClass: string | null
  softShadowDefault: boolean | null
}
export function validateAssetQuality(value: unknown): AssetQuality {
  if (!value || typeof value !== 'object') throw Error('Invalid asset quality metadata.')
  const q = value as AssetQuality
  if (!QUALITY_CLASSES.includes(q.classification) || typeof q.reason !== 'string' || !q.reason.trim() || q.reason.length > 4000 || q.semanticClass !== null && (typeof q.semanticClass !== 'string' || !/^[a-z_]{1,80}$/.test(q.semanticClass)) || q.softShadowDefault !== null && typeof q.softShadowDefault !== 'boolean') throw Error('Invalid asset quality metadata.')
  return { classification:q.classification, reason:q.reason.trim(), semanticClass:q.semanticClass, softShadowDefault:q.softShadowDefault }
}
export function assetAvailableForPlacement(quality?: AssetQuality | null) {
  return !quality || quality.classification === 'KEEP' || quality.classification === 'FIX'
}
// Only lists for NEW placement use this predicate; ID/image/project resolution never does.
export const ACTIVE_ASSET_SQL = "(quality IS NULL OR json_extract(quality,'$.classification') IN ('KEEP','FIX'))"

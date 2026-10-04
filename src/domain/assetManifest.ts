import { validateAssetQuality, type AssetQuality } from './assetQuality'
import { validateMarkerAssetTags } from './illustratedMarkers'
import { validateGeneratorMetadata, type GeneratorMetadata } from './generatorAssets'
import { validatePrefab } from './prefabs'
import type { Prefab } from './prefabs'
import { deriveTitle, libraryText, mapTypes, normalizeTags, validateDefaultSize } from './library'
import type { DefaultSize } from './library'
import type { MapType } from './geography'
export interface AssetEntry { id?:string; categoryId?:string; quality?: AssetQuality; patternScale?:number; file: string; generator?: GeneratorMetadata | null; prefab?: Prefab; type: 'stamp' | 'fillPattern' | 'prefab'; originalName?: string; title?: string; description?: string; categoryPath?: string[]; tags?: string[]; defaultSize?: DefaultSize; applicableMapTypes?: MapType[]; sha256?: string; author?: string; source?: string; license?: string; favorite?: boolean }
export interface AssetManifest { schemaVersion: 1 | 2 | 3; pack?:{id:string;revision:number}; collection?: { title: string; description?: string }; assets: AssetEntry[]; categories?: { path: string[]; sortOrder: number }[]; collections?: { title: string; description: string; members: { file: string; type: 'stamp' | 'fillPattern' | 'prefab' }[] }[] }
export function safeAssetPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 240 || value.includes('\\') || value.split('/').some(s => !s || s === '.' || s === '..' || /[<>:"|?*]/.test(s) || [...s].some(c => c.charCodeAt(0) < 32) || /[. ]$/.test(s) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s))) throw Error('Unsafe relative asset path.')
  return value
}
const categoryNames = (v: unknown) => { if (!Array.isArray(v) || v.length > 8) throw Error('Category path supports at most eight names.'); return v.map(n => libraryText(n, 80, true)) }
export function parseAssetManifest(value: unknown): { manifest: AssetManifest; warnings: string[] } {
  if (!value || typeof value !== 'object' || ![1,2,3].includes((value as AssetManifest).schemaVersion)) throw Error('Unsupported asset manifest schemaVersion; expected 1, 2 or 3.')
  const v = value as Record<string, unknown>, warnings: string[] = []
  const unknown = (r: object, allowed: string[], where: string) => Object.keys(r).forEach(k => { if (!allowed.includes(k)) warnings.push(`${where}: unknown field ${k} ignored.`) })
  unknown(v, ['schemaVersion', 'pack', 'collection', 'assets', 'categories', 'collections'], 'manifest')
  if (!Array.isArray(v.assets) || v.assets.length > 1000) throw Error('A batch supports at most 1,000 assets.')
  const seen = new Set<string>()
  const assets = v.assets.map((raw: unknown): AssetEntry => {
    if (!raw || typeof raw !== 'object') throw Error('Invalid asset entry.')
    const a = raw as Record<string, unknown>
    unknown(a, ['id','categoryId','semanticClass','softShadowDefault','quality','patternScale','file', 'type', 'generator', 'prefab', 'originalName', 'title', 'description', 'categoryPath', 'tags', 'defaultSize', 'applicableMapTypes', 'sha256', 'author', 'source', 'license', 'favorite'], 'asset')
    const file = safeAssetPath(a.file)
    if (a.type !== 'stamp' && a.type !== 'fillPattern' && a.type !== 'prefab') throw Error(`${file}: unsupported type ${String(a.type)}.`)
    const key = `${file}/${a.type}`; if (seen.has(key)) throw Error(`${file}: duplicate entry for the same role.`); seen.add(key)
    if(a.type!=='stamp'&&a.id!==undefined)throw Error('External asset IDs are supported for stamps only.');
    const result: AssetEntry = { file, type: a.type }; for(const k of ['id','categoryId'] as const)if(a[k]!==undefined){if(typeof a[k]!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(a[k]))throw Error('Invalid '+k);result[k]=a[k] as string} if(a.semanticClass!==undefined||a.softShadowDefault!==undefined){result.quality=validateAssetQuality({classification:'KEEP',reason:'Pack author metadata',semanticClass:a.semanticClass??null,softShadowDefault:a.softShadowDefault??null})} if(a.type==='prefab'){if(v.schemaVersion===1)throw Error('Prefabs require manifest schema 2.');result.prefab=validatePrefab(a.prefab)} else if(a.prefab!==undefined)throw Error('Only a prefab entry may contain a prefab payload.')
    for (const key of ['title', 'description', 'author', 'source', 'license'] as const) if (a[key] !== undefined && a[key] !== null) result[key] = libraryText(a[key], key === 'title' ? 120 : key === 'description' ? 4000 : key === 'author' ? 240 : 1000, key === 'title')
    if (a.originalName !== undefined) { result.originalName = libraryText(a.originalName,255,true); if(/[\\/]/.test(result.originalName))throw Error('Original filename must not contain a path.') }
    if (a.categoryPath !== undefined && a.categoryPath !== null) result.categoryPath = categoryNames(a.categoryPath)
    if (a.tags !== undefined && a.tags !== null) result.tags = normalizeTags(a.tags)
    if(a.patternScale!==undefined){if(a.type!=='fillPattern'||typeof a.patternScale!=='number'||!Number.isFinite(a.patternScale)||a.patternScale<.01||a.patternScale>100)throw Error('Invalid recommended pattern scale.');result.patternScale=a.patternScale}
    if (a.defaultSize !== undefined && a.defaultSize !== null) { unknown(a.defaultSize as object,['mode','width','height','unit','lockAspectRatio'],'defaultSize');result.defaultSize = validateDefaultSize(a.defaultSize); if (a.type !== 'stamp' && a.type !== 'prefab' && result.defaultSize.mode !== 'native') throw Error('Only stamps support placement default sizes.') }
    if (a.applicableMapTypes !== undefined && a.applicableMapTypes !== null) result.applicableMapTypes = mapTypes(a.applicableMapTypes)
    if (a.sha256 !== undefined) { if (typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(a.sha256)) throw Error('Invalid SHA-256.'); result.sha256 = a.sha256 }
    if (a.favorite !== undefined) { if (typeof a.favorite !== 'boolean') throw Error('Invalid favorite.'); result.favorite = a.favorite }
    if(a.generator!==undefined){if(v.schemaVersion!==3||a.type!=='stamp')throw Error('Generator metadata requires a stamp in manifest schema 3.');result.generator=a.generator===null?null:validateGeneratorMetadata(a.generator)}
    if(a.quality!==undefined){const quality=validateAssetQuality(a.quality);if(result.quality&&(a.semanticClass!==undefined&&result.quality.semanticClass!==quality.semanticClass||a.softShadowDefault!==undefined&&result.quality.softShadowDefault!==quality.softShadowDefault))throw Error('Conflicting quality/author metadata.');result.quality=quality}
    if(result.tags)validateMarkerAssetTags(result.tags)
    return result
  })
  const manifest: AssetManifest = { schemaVersion: v.schemaVersion as 1|2|3, assets }; if(v.pack!==undefined){const p=v.pack as {id:string;revision:number};if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||!Number.isSafeInteger(p.revision)||p.revision<1)throw Error('Invalid pack identity/revision.');manifest.pack={id:p.id,revision:p.revision}} const ids=assets.filter(a=>a.id).map(a=>a.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate asset ID.');if(ids.length&&!manifest.pack)throw Error('Asset IDs require pack identity/revision.')
  if (v.collection !== undefined) { const c = v.collection as Record<string, unknown>;unknown(c,['title','description'],'collection'); manifest.collection = { title: libraryText(c.title, 120, true), description: libraryText(c.description || '', 4000) } }
  if (v.categories !== undefined) {
    if (!Array.isArray(v.categories) || v.categories.length > 2000) throw Error('At most 2,000 categories per manifest.')
    manifest.categories = v.categories.map(c => { if (!c || !Number.isSafeInteger(c.sortOrder) || c.sortOrder < 0) throw Error('Invalid category ordering.'); unknown(c,['path','sortOrder'],'category');return { path: categoryNames(c.path), sortOrder: c.sortOrder } })
  }
  if (v.collections !== undefined) {
    if (!Array.isArray(v.collections) || v.collections.length > 200) throw Error('At most 200 collections.')
    manifest.collections = v.collections.map(c => { unknown(c,['title','description','members'],'collection');if(!Array.isArray(c.members)||c.members.length>1000)throw Error('Collection supports at most 1,000 members.');return ({ title: libraryText(c.title, 120, true), description: libraryText(c.description || '', 4000), members: (c.members as { file: string; type: 'stamp' | 'fillPattern' | 'prefab' }[]).map(m => { unknown(m,['file','type'],'collection member');if (!seen.has(`${m.file}/${m.type}`)) throw Error('Collection references a missing asset entry.'); return { file: m.file, type: m.type } }) }) })
  }
  return { manifest, warnings }
}
export const entryTitle = (a: AssetEntry) => a.title || deriveTitle(a.file)

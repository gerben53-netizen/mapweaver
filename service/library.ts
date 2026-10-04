import { validateFamily } from '../src/domain/stampFamilies'
import { normalizeStampSearch,resolveStampCategory,STAMP_CATEGORIES } from '../src/domain/stampTaxonomy'
import { ACTIVE_ASSET_SQL, validateAssetQuality } from '../src/domain/assetQuality'
import { validateMarkerAssetTags } from '../src/domain/illustratedMarkers'
import { validateGeneratorMetadata } from '../src/domain/generatorAssets'
import { resetRemovedAssetMetadata,removeRecentAssetChoices } from './removedAssets'
import { assetAppliesToMap } from '../src/domain/mapCapabilities'
import type { MapType } from '../src/domain/geography'
import { validatePrefab } from '../src/domain/prefabs'
import { randomUUID } from 'node:crypto'
import { Storage, StorageError, assetFromRow } from './storage'
import type { AssetRow } from './storage'
import { categoryPath,libraryText, mapTypes, normalizeLibraryText, normalizeTags, validateCategoryTree, validateDefaultSize } from '../src/domain/library'
import type { LibraryCategory, LibraryCollection, DefaultSize } from '../src/domain/library'

export interface LibraryAsset extends AssetRow { prefabMode?: 'editable'|'flattened'; prefabBoundsSummary?: string; description: string; favorite: number; author: string; source: string; license: string; applicableMapTypes: string; deletedAt: string | null }
export interface LibraryQuery { mapType?: string; type?: string; search?: string; category?: string; favorite?: string; collection?: string; sort?: string; offset?: string; limit?: string }
export const libraryRevision = (s: Storage) => Number((s.db.prepare("SELECT value FROM settings WHERE key='libraryRevision'").get() as { value: string }).value)
export function checkRevision(s: Storage, revision: unknown) { if (revision !== libraryRevision(s)) throw new StorageError('LIBRARY_CONFLICT', 'Library changed in another tab. Refresh and review your draft before retrying.', 409) }
export function categories(s: Storage) { return s.db.prepare('SELECT * FROM categories ORDER BY sortOrder,normalizedName,id').all() as LibraryCategory[] }
export function publicAsset(a: LibraryAsset) { return { ...assetFromRow(a), family:a.family?validateFamily(JSON.parse(a.family)):undefined, quality:a.quality?validateAssetQuality(JSON.parse(a.quality)):null, generator:a.generator?validateGeneratorMetadata(JSON.parse(a.generator)):null, prefab: undefined, prefabBounds: a.prefab ? JSON.parse(a.prefab).bounds as import('../src/domain/prefabs').Bounds : a.prefabBoundsSummary ? JSON.parse(a.prefabBoundsSummary) as import('../src/domain/prefabs').Bounds : undefined, prefabMode: a.prefab ? JSON.parse(a.prefab).mode as 'editable'|'flattened' : a.prefabMode, favorite: !!a.favorite, tags: JSON.parse(a.tags), applicableMapTypes: JSON.parse(a.applicableMapTypes), defaultSize: { mode: a.sizingMode, lockAspectRatio: a.aspectRatioLocked === true || Number(a.aspectRatioLocked) === 1, ...(a.defaultWidth ? { width: a.defaultWidth } : {}), ...(a.defaultHeight ? { height: a.defaultHeight } : {}), ...(a.sizingUnit ? { unit: a.sizingUnit } : {}) } as DefaultSize } }
export type PublicLibraryAsset = ReturnType<typeof publicAsset>
const metadataColumns=(s:Storage)=>(s.db.prepare('PRAGMA table_info(assets)').all() as {name:string}[]).filter(c=>c.name!=='prefab').map(c=>c.name).join(',')
export function libraryQuery(s: Storage, q: LibraryQuery, all = false) {
  if(q.mapType&&!['battlemap','regional-map','world-map'].includes(q.mapType))throw Error('Invalid map type filter.')
  const offset = Number(q.offset || 0), limit = Number(q.limit || 60)
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw Error('Invalid library page.')
  const rawTree = categories(s),tree=rawTree.map(c=>({...c,name:STAMP_CATEGORIES.find(n=>n.id===resolveStampCategory(c.name).categoryId)?.name||c.name}))
  const aliasRow=s.db.prepare("SELECT value FROM settings WHERE key='assetTaxonomyAliases'").get() as {value:string}|undefined
  const aliases=aliasRow?JSON.parse(aliasRow.value) as {categories:Record<string,string[]>;tags:Record<string,string>}:{categories:{},tags:{}}
  const rawSearch=normalizeLibraryText(q.search || ''),search=normalizeLibraryText(aliases.tags[rawSearch]||normalizeStampSearch(rawSearch))
  const byId = new Map(tree.map(c=>[c.id,c])), ancestors = new Map<string,string[]>()
  for(const c of tree){const ids:string[]=[];let cursor:LibraryCategory|undefined=c;while(cursor){ids.push(cursor.id);cursor=cursor.parentId?byId.get(cursor.parentId):undefined}ancestors.set(c.id,ids)}
  const canonicalTargets=rawTree.filter(c=>c.id!=='uncategorized'&&resolveStampCategory(categoryPath(rawTree,c.id).map(n=>n.name)).categoryId===q.category).map(c=>c.id)
  const targets=q.category?(byId.has(q.category)?[q.category]:aliases.categories[q.category]|| (canonicalTargets.length?canonicalTargets:[q.category])):[]
  const scope = q.category ? new Set(tree.filter(c=>targets.some(id=>ancestors.get(c.id)!.includes(id))).map(c=>c.id)) : null
  const members = q.collection ? new Set((s.db.prepare('SELECT assetId FROM library_members WHERE collectionId=?').all(q.collection) as { assetId: string }[]).map(r => r.assetId)) : null
  const filtered = (s.db.prepare(`SELECT ${metadataColumns(s)},json_extract(prefab,'$.mode') AS prefabMode,json_extract(prefab,'$.bounds') AS prefabBoundsSummary FROM assets WHERE deletedAt IS NULL AND familyMember IS NULL AND ${ACTIVE_ASSET_SQL} AND type=?`).all(q.type === 'prefab' ? 'prefab' : q.type === 'fill-pattern' ? 'fill-pattern' : 'stamp') as LibraryAsset[]).filter(a => (!q.mapType||assetAppliesToMap(JSON.parse(a.applicableMapTypes),q.mapType as MapType)) && (!q.favorite || !!a.favorite) && (!members || members.has(a.id)) && (!search || [rawSearch,search].some(term=>normalizeLibraryText([a.name, a.originalName, a.description, a.quality ? JSON.parse(a.quality).semanticClass || '' : '', ...JSON.parse(a.tags)].join(' ')).includes(term))))
  const counts = new Map<string, number>(); filtered.forEach(a => counts.set(a.categoryId, (counts.get(a.categoryId) || 0) + 1))
  const totals = new Map<string,number>()
  for(const [id,count] of counts)for(const parent of ancestors.get(id)||[])totals.set(parent,(totals.get(parent)||0)+count)
  // True emptiness is independent of active role/search/favorites/collection filters.
  const libraryTotals = new Map<string, number>()
  const allCounts = s.db.prepare(`SELECT categoryId,COUNT(*) AS count FROM assets WHERE deletedAt IS NULL AND familyMember IS NULL AND ${ACTIVE_ASSET_SQL} GROUP BY categoryId`).all() as {categoryId:string;count:number}[]
  for (const {categoryId,count} of allCounts) for (const id of ancestors.get(categoryId) || []) libraryTotals.set(id,(libraryTotals.get(id)||0)+count)
  const treeCounts = tree.map(c=>({...c,direct:counts.get(c.id)||0,total:totals.get(c.id)||0,libraryTotal:libraryTotals.get(c.id)||0}))
  const rows = filtered.filter(a => !scope || scope.has(a.categoryId)).sort((a, b) => {
    const av = q.sort === 'recent' ? b.createdAt : normalizeLibraryText(a.name), bv = q.sort === 'recent' ? a.createdAt : normalizeLibraryText(b.name)
    return (av < bv ? -1 : av > bv ? 1 : 0) || a.id.localeCompare(b.id)
  })
  return { revision: libraryRevision(s), total: rows.length, ids: all ? rows.map(a => a.id) : undefined, assets: all ? [] : rows.slice(offset, offset + limit).map(publicAsset), categories: treeCounts, collections: s.db.prepare('SELECT * FROM library_collections ORDER BY name,id').all() as LibraryCollection[] }
}
export function patchAsset(s: Storage, id: string, patch: Record<string, unknown>, familyImport = false) {
  const a = s.asset(id) as LibraryAsset
  if (!familyImport && a.family && Object.keys(patch).some(k=>!['favorite'].includes(k))) throw Error('Shared family metadata is immutable. Import a new family revision instead.')
  const quality = patch.quality === undefined ? undefined : patch.quality === null ? null : JSON.stringify(validateAssetQuality(patch.quality))
  const title = patch.title === undefined ? a.name : libraryText(patch.title, 120, true)
  const categoryId = patch.categoryId === undefined ? a.categoryId : String(patch.categoryId)
  if (!s.db.prepare('SELECT 1 FROM categories WHERE id=?').get(categoryId)) throw Error('Unknown category.')
  const tags = patch.tags === undefined ? JSON.parse(a.tags) : normalizeTags(patch.tags)
  validateMarkerAssetTags(tags)
  const size = patch.defaultSize === undefined ? publicAsset(a).defaultSize : validateDefaultSize(patch.defaultSize, a.prefab ? (()=>{const p=validatePrefab(JSON.parse(a.prefab));return p.bounds.width/p.bounds.height})() : a.width / a.height)
  if (patch.defaultSize !== undefined && a.type !== 'stamp' && a.type !== 'prefab') throw Error('Stamp default sizes do not control patterns or wall sets.')
  const patternScale=patch.patternScale===undefined?a.patternScale??null:patch.patternScale
  if(patternScale!==null&&(a.type!=='fill-pattern'||typeof patternScale!=='number'||!Number.isFinite(patternScale)||patternScale<.01||patternScale>100))throw Error('Pattern scale must be 0.01–100 on a fill pattern.')
  const generator = patch.generator===undefined?a.generator??null:patch.generator===null?null:JSON.stringify(validateGeneratorMetadata(patch.generator))
  if(generator&&a.type!=='stamp')throw Error('Generator metadata is only for stamps.')
  const types = patch.applicableMapTypes === undefined ? JSON.parse(a.applicableMapTypes) : mapTypes(patch.applicableMapTypes)
  if (patch.favorite !== undefined && typeof patch.favorite !== 'boolean') throw Error('Invalid favorite flag.')
  const text = (key: 'description' | 'author' | 'source' | 'license', max: number) => patch[key] === undefined ? a[key] : libraryText(patch[key], max)
  if(quality!==undefined)s.db.prepare('UPDATE assets SET quality=? WHERE id=?').run(quality,id)
  s.db.prepare(`UPDATE assets SET name=?,categoryId=?,tags=?,description=?,favorite=?,author=?,source=?,license=?,sizingMode=?,defaultWidth=?,defaultHeight=?,sizingUnit=?,aspectRatioLocked=?,sizingScope=?,applicableMapTypes=?,generator=?,patternScale=?,modifiedAt=? WHERE id=?`).run(title, categoryId, JSON.stringify(tags), text('description', 4000), patch.favorite === undefined ? Number(a.favorite) : Number(patch.favorite), text('author', 240), text('source', 1000), text('license', 1000), size.mode, size.width ?? null, size.height ?? null, size.unit ?? null, Number(size.lockAspectRatio), types.length === 1 ? types[0] : 'any', JSON.stringify(types), generator, patternScale, new Date().toISOString(), id)
}
export function putCategory(s: Storage, body: Partial<LibraryCategory>) {
  const tree = categories(s), old = tree.find(c => c.id === body.id)
  if (body.id === 'uncategorized') throw Error('Uncategorized is a permanent system category.')
  if (body.id && !old) throw Error('Category no longer exists.')
  const c = { ...old, id: old?.id || randomUUID(), name: libraryText(body.name ?? old?.name, 80, true), parentId: body.parentId === undefined ? old?.parentId || null : body.parentId, sortOrder: body.sortOrder ?? old?.sortOrder ?? 0, createdAt: old?.createdAt || new Date().toISOString(), modifiedAt: new Date().toISOString() }
  if (!Number.isSafeInteger(c.sortOrder) || c.sortOrder < 0) throw Error('Invalid category order.')
  validateCategoryTree([...tree.filter(d => d.id !== c.id), c])
  s.db.prepare(`INSERT INTO categories(id,name,normalizedName,parentId,sortOrder,createdAt,modifiedAt) VALUES(@id,@name,@normalizedName,@parentId,@sortOrder,@createdAt,@modifiedAt) ON CONFLICT(id) DO UPDATE SET name=excluded.name,normalizedName=excluded.normalizedName,parentId=excluded.parentId,sortOrder=excluded.sortOrder,modifiedAt=excluded.modifiedAt`).run({ ...c, normalizedName: `${c.parentId || ''}/${normalizeLibraryText(c.name)}` })
  return c
}
export function deleteCategory(s: Storage, id: string) {
  const tree = categories(s), c = tree.find(c => c.id === id)
  if (!c || id === 'uncategorized') throw Error('Choose a removable category.')
  validateCategoryTree(tree.filter(d => d.id !== id).map(d => d.parentId === id ? { ...d, parentId: c.parentId } : d))
  s.db.prepare('UPDATE categories SET name=?,normalizedName=? WHERE id=?').run(`Removing ${id}`,`removing/${id}`,id)
  for (const child of tree.filter(d => d.parentId === id)) putCategory(s, { ...child, parentId: c.parentId })
  s.db.prepare('UPDATE assets SET categoryId=? WHERE categoryId=?').run(c.parentId || 'uncategorized', id)
  s.db.prepare('DELETE FROM categories WHERE id=?').run(id)
}
export interface AssetUsage {id:string;name:string;kind:'map'|'wallSet'|'prefab';ownerId:string}
export function usage(s: Storage, ids: string[]):AssetUsage[] {
 const wanted=new Set(ids),result:AssetUsage[]=[]
 for(const r of s.db.prepare('SELECT DISTINCT a.assetId id,p.id ownerId,p.name FROM project_assets a JOIN projects p ON p.id=a.projectId').all() as {id:string;ownerId:string;name:string}[])if(wanted.has(r.id))result.push({...r,kind:'map'})
 for(const r of s.db.prepare('SELECT assetId id,assetId ownerId,title name FROM wall_sets').all() as {id:string;ownerId:string;name:string}[])if(wanted.has(r.id))result.push({...r,kind:'wallSet',name:`Wall set: ${r.name}`})
 for(const r of s.db.prepare("SELECT json_extract(d.value,'$.id') id,a.id ownerId,a.name,a.deletedAt FROM assets a,json_each(a.prefab,'$.document.assets') d WHERE a.prefab IS NOT NULL").all() as {id:string;ownerId:string;name:string;deletedAt:string|null}[])if(wanted.has(r.id))result.push({id:r.id,ownerId:r.ownerId,kind:'prefab',name:`${r.deletedAt?'Retained prefab':'Prefab'}: ${r.name}`})
 return result
}
export interface RemovalPreview {revision:number;assets:{id:string;name:string}[];usage:AssetUsage[]}
export function removalPreview(s:Storage,input:unknown):RemovalPreview {
 if(!Array.isArray(input)||!input.length||input.length>10000||input.some(id=>typeof id!=='string'))throw Error('Select 1–10,000 assets.')
 const ids=[...new Set(input)] as string[]; if(ids.some(id=>!!s.asset(id).family || !!s.asset(id).familyMember))throw Error('Family components are retained for stable map references and cannot be removed individually.');const assets=ids.map(id=>{const a=s.asset(id) as LibraryAsset;if(a.deletedAt)throw Error('Selection changed. Refresh the library.');return {id,name:a.name}})
 return {revision:libraryRevision(s),assets,usage:usage(s,ids)}
}
function persistentUsageError(s:Storage,ids:string[]){
 const used=usage(s,ids)
 if(used.length){const count=new Set(used.map(u=>u.id)).size,names=[...new Set(used.map(u=>u.name))];throw new StorageError('ASSET_IN_USE',`${count} selected asset(s) are used by saved maps or definitions: ${names.slice(0,8).join(', ')}${names.length>8?' …':''}. Nothing removed.`,409)}
}

type Row = Record<string, string | number | null>
const tables = ['categories', 'assets', 'library_collections', 'library_members'] as const
type Snapshot = Record<typeof tables[number], Row[]>
const snapshot = (s: Storage): Snapshot => Object.fromEntries(tables.map(t => [t, s.db.prepare(`SELECT ${t==='assets'?metadataColumns(s):'*'} FROM ${t}`).all()])) as Snapshot
const histories = new WeakMap<Storage, Map<string, { revision: number; before: Snapshot; after: Snapshot }>>()
export function undoRemovalIds(s: Storage, token: string) {
 const h=histories.get(s)?.get(token)
 if(!h)throw Error('This library history entry is no longer current. Refresh and review changes.')
 return h.after.assets.filter(a=>a.deletedAt===null&&!h.before.assets.some(b=>b.id===a.id&&b.deletedAt===null)).map(a=>String(a.id))
}
export function libraryCommand(s: Storage, body: { revision: number; op: string; ids?: string[]; patch?: Record<string, unknown>; category?: Partial<LibraryCategory>; id?: string; name?: string; description?: string; tags?: string[]; collectionId?: string; token?: string }) {
  try { return s.db.transaction(() => {
    checkRevision(s, body.revision)
    const before = snapshot(s), ids = [...new Set(body.ids || [])]
    if (ids.length > 10000) throw Error('Select at most 10,000 items.')
    for (const id of ids) s.asset(id)
    if (body.op === 'metadata') { if (ids.length !== 1) throw Error('Select one asset.'); patchAsset(s, ids[0], body.patch || {}) }
    else if (body.op === 'category') putCategory(s, body.category || {})
    else if (body.op === 'delete-category') deleteCategory(s, body.id || '')
    else if (body.op === 'collection') { if(body.id&&!s.db.prepare('SELECT 1 FROM library_collections WHERE id=?').get(body.id))throw Error('Collection no longer exists.');s.db.prepare('INSERT INTO library_collections VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description').run(body.id||randomUUID(), libraryText(body.name, 120, true), libraryText(body.description || '', 4000)) }
    else if(body.op==='delete-collection')s.db.prepare('DELETE FROM library_collections WHERE id=?').run(body.id||'')
    else if (body.op === 'undo') {
      const h = histories.get(s)?.get(body.token || '')
      if (!h) throw Error('This library history entry is no longer current. Refresh and review changes.')
      for (const t of tables) {
        const key=(r:Row)=>t==='library_members'?`${r.collectionId}/${r.assetId}`:r.id
        const prior=new Map(h.before[t].map(r=>[key(r),JSON.stringify(r)])), expected=new Map(h.after[t].map(r=>[key(r),JSON.stringify(r)])), current=new Map(before[t].map(r=>[key(r),JSON.stringify(r)]))
        for(const id of new Set([...prior.keys(),...expected.keys()]))if(prior.get(id)!==expected.get(id)&&current.get(id)!==expected.get(id))throw Error('A newer library change conflicts with this undo. No data was overwritten.')
      }
      persistentUsageError(s,undoRemovalIds(s,body.token || ''))
      removeRecentAssetChoices(s,new Set(undoRemovalIds(s,body.token || '')))
      s.db.pragma('defer_foreign_keys = ON')
      for (const t of [...tables].reverse()) {
        const key = (r: Row) => t === 'library_members' ? `${r.collectionId}/${r.assetId}` : r.id
        const old = new Map(h.before[t].map(r => [key(r), r]))
        for (const row of h.after[t]) if (!old.has(key(row))) s.db.prepare(`DELETE FROM ${t} WHERE ${t === 'library_members' ? 'collectionId=? AND assetId=?' : 'id=?'}`).run(...(t === 'library_members' ? [row.collectionId, row.assetId] : [row.id]))
      }
      s.db.pragma('defer_foreign_keys = ON')
      for (const t of tables) {
        const key = (r: Row) => t === 'library_members' ? `${r.collectionId}/${r.assetId}` : r.id
        const next = new Map(h.after[t].map(r => [key(r), JSON.stringify(r)]))
        for (const r of h.before[t]) if (next.get(key(r)) !== JSON.stringify(r)) {
          const cols = Object.keys(r), conflict = t === 'library_members' ? 'collectionId,assetId' : 'id'
          s.db.prepare(`INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(${conflict}) DO UPDATE SET ${cols.map(c => `${c}=excluded.${c}`).join(',')}`).run(...cols.map(c => r[c]))
        }
      }
    } else if (['move', 'favorite', 'tags-add', 'tags-remove', 'collection-add', 'collection-remove', 'copy-role', 'delete'].includes(body.op)) {
      if(body.op==='delete')persistentUsageError(s,ids)
      for (const id of ids) {
        const a = s.asset(id) as LibraryAsset
        if (body.op === 'move' || body.op === 'favorite') patchAsset(s, id, body.patch || {})
        if (body.op.startsWith('tags-')) { const tags = normalizeTags(body.tags || []), prior = JSON.parse(a.tags) as string[]; patchAsset(s, id, { tags: body.op === 'tags-add' ? normalizeTags([...new Map([...prior,...tags].map(t=>[normalizeLibraryText(t),t])).values()]) : prior.filter(t => !tags.some(v => normalizeLibraryText(v) === normalizeLibraryText(t))) }) }
        if (body.op.startsWith('collection-')) { if (!s.db.prepare('SELECT 1 FROM library_collections WHERE id=?').get(body.collectionId || '')) throw Error('Unknown collection.'); s.db.prepare(body.op === 'collection-add' ? 'INSERT OR IGNORE INTO library_members VALUES(?,?)' : 'DELETE FROM library_members WHERE collectionId=? AND assetId=?').run(body.collectionId, id) }
        if(body.op==='delete'){resetRemovedAssetMetadata(s,id);s.db.prepare('UPDATE assets SET deletedAt=?,modifiedAt=? WHERE id=?').run(new Date().toISOString(),new Date().toISOString(),id)}
        if (body.op === 'copy-role') {
          if (s.db.prepare('SELECT 1 FROM wall_sets WHERE assetId=?').get(id)) throw Error('Use the specialized wall-set pack; its atlas cannot be copied as a loose asset.')
          if(a.type==='prefab')throw Error('Flattened prefabs already expose their shared stamp; editable prefabs cannot become a fill pattern.')
          const type = a.type === 'stamp' ? 'fill-pattern' : 'stamp'
          if (!s.db.prepare('SELECT 1 FROM assets WHERE type=? AND sha256=?').get(type, a.sha256)) {
            const row = { ...a, patternScale:null, generator:null, prefab: null, id: randomUUID(), type, sizingMode: 'native', defaultWidth: null, defaultHeight: null, sizingUnit: null, aspectRatioLocked: 1, sizingScope: 'any', applicableMapTypes: '[]' }, cols = Object.keys(row)
            s.db.prepare(`INSERT INTO assets(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).run(...cols.map(c => (row as unknown as Row)[c]))
          }
        }
      }
    } else throw Error('Unknown library action.')
    if(body.op==='delete')removeRecentAssetChoices(s,new Set(ids))
    const after = snapshot(s), revision = libraryRevision(s), token = randomUUID()
    let history = histories.get(s); if (!history) { history = new Map(); histories.set(s, history) }
    const compactBefore={} as Snapshot,compactAfter={} as Snapshot
    for(const t of tables){const key=(r:Row)=>t==='library_members'?`${r.collectionId}/${r.assetId}`:r.id, a=new Map(before[t].map(r=>[key(r),JSON.stringify(r)])),b=new Map(after[t].map(r=>[key(r),JSON.stringify(r)]));compactBefore[t]=before[t].filter(r=>a.get(key(r))!==b.get(key(r)));compactAfter[t]=after[t].filter(r=>a.get(key(r))!==b.get(key(r)))}
    history.set(token, { revision, before:compactBefore, after:compactAfter }); while (history.size > 10) history.delete(history.keys().next().value!)
    return { revision, token }
  })() } catch (e) { if (e instanceof StorageError) throw e; throw new StorageError('INVALID_LIBRARY_CHANGE', (e as Error).message) }
}

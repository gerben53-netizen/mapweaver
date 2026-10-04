import { categoryResolution,ensureStampTaxonomy } from './stampGovernance'
import { normalizeStampTags } from '../src/domain/stampTaxonomy'
import { reviveRemovedAsset } from './removedAssets'
import { validatePrefab, remapPrefabAssets } from '../src/domain/prefabs'
import * as yauzl from 'yauzl'
import { zipSync, strToU8 } from 'fflate'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { Storage, StorageError, hash, managedPath, validateImage } from './storage'
import { categories, checkRevision, libraryRevision, patchAsset, publicAsset, putCategory } from './library'
import type { LibraryAsset } from './library'
import { categoryPath, libraryText, normalizeLibraryText, validateDefaultSize } from '../src/domain/library'
import { entryTitle, parseAssetManifest, safeAssetPath } from '../src/domain/assetManifest'
import type { AssetEntry, AssetManifest } from '../src/domain/assetManifest'
const MAX_BYTES = 128 * 1024 * 1024
export async function unpackAssets(bytes: Buffer) {
  if (bytes.length > MAX_BYTES) throw Error('Pack exceeds 128 MiB.')
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => yauzl.fromBuffer(bytes, { lazyEntries: true, strictFileNames: true, validateEntrySizes: true }, (e, z) => e ? reject(e) : resolve(z)))
  const files = new Map<string, Buffer>(), folded = new Set<string>(); let total = 0, count = 0
  try { await new Promise<void>((resolve, reject) => {
    zip.on('error', reject); zip.on('end', resolve)
    zip.on('entry', (entry: yauzl.Entry) => {
      try {
        if (++count > 2002 || (entry.externalFileAttributes >>> 16 & 0xf000) === 0xa000 || entry.generalPurposeBitFlag & 1 || ![0, 8].includes(entry.compressionMethod)) throw Error('Unsafe ZIP entry.')
        if (entry.fileName.endsWith('/')) { safeAssetPath(entry.fileName.slice(0, -1)); zip.readEntry(); return }
        const name = safeAssetPath(entry.fileName), key = name.normalize('NFKC').toLowerCase()
        if (folded.has(key)) throw Error('Windows-normalized ZIP paths collide.'); folded.add(key)
        total += entry.uncompressedSize
        if (total > MAX_BYTES || entry.uncompressedSize > 20 * 1024 * 1024 || entry.uncompressedSize / Math.max(1, entry.compressedSize) > 200) throw Error('ZIP expansion limit exceeded.')
        zip.openReadStream(entry, (e, stream) => {
          if (e) { reject(e); return }
          const chunks: Buffer[] = []; let size = 0
          stream.on('error', reject); stream.on('data', (chunk: Buffer) => { size += chunk.length; if (size > entry.uncompressedSize) { stream.destroy(); reject(Error('ZIP size mismatch.')) } else chunks.push(chunk) })
          stream.on('end', () => { files.set(name, Buffer.concat(chunks)); zip.readEntry() })
        })
      } catch (e) { reject(e) }
    }); zip.readEntry()
  }); return files } finally { zip.close() }
}
interface PreparedEntry { entry: AssetEntry; bytes: Buffer; thumbnail: Buffer; width: number; height: number; mimeType: string; digest: string; existing?: string }
interface Prepared { revision: number; manifest: AssetManifest; entries: PreparedEntry[]; warnings: string[]; errors: string[]; expires: number }
const previews = new WeakMap<Storage, Map<string, Prepared>>()
export async function previewPack(s: Storage, bytes: Buffer, type = 'stamp', preference?: string) {
  const prepared: Prepared = { revision: libraryRevision(s), manifest: { schemaVersion: 1, assets: [] }, entries: [], warnings: [], errors: [], expires: Date.now() + 15 * 60_000 }
  try {
    const files = await unpackAssets(bytes), main = files.get('mapweaver-assets.json')
    if (main) { const parsed = parseAssetManifest(JSON.parse(main.toString('utf8'))); prepared.manifest = parsed.manifest; prepared.warnings.push(...parsed.warnings) }
    for (const [name, file] of files) if (name.endsWith('.mapweaver.json')) {
      const parsed = parseAssetManifest(JSON.parse(file.toString('utf8')))
      if (parsed.manifest.assets.length !== 1) throw Error('A sidecar must contain exactly one asset.')
      const a = parsed.manifest.assets[0], expected = name.replace(/\.mapweaver\.json$/, '')
      if (a.file.replace(/\.[^.]+$/, '') !== expected) throw Error('Sidecar basename and exact asset path do not match.')
      const prior = prepared.manifest.assets.find(e => e.file === a.file && e.type === a.type)
      if (prior && JSON.stringify(prior) !== JSON.stringify(a)) { if(!['sidecar','collection'].includes(preference||''))throw Error('Sidecar conflicts with collection manifest. Choose which metadata to use and preview again.'); if(preference==='sidecar')prepared.manifest.assets[prepared.manifest.assets.indexOf(prior)]=a;prepared.warnings.push(`${a.file}: conflicting metadata resolved explicitly using ${preference}.`) }
      if (!prior) prepared.manifest.assets.push(a)
      prepared.warnings.push(...parsed.warnings)
    }
    if (!main) for (const name of files.keys()) if (/\.(png|jpe?g|webp)$/i.test(name) && !prepared.manifest.assets.some(a => a.file === name)) prepared.manifest.assets.push({ file: name, type: type === 'fillPattern' ? 'fillPattern' : 'stamp' })
    if (!prepared.manifest.assets.length) throw Error('No supported assets found; category-only packs cannot create taxonomy nodes.')
    if (prepared.manifest.assets.length > 1000) throw Error('At most 1,000 assets per import.')
    for (const entry of prepared.manifest.assets) {
      try {
        libraryText(entryTitle(entry),120,true)
        if(entry.type==='stamp'){if(prepared.manifest.categories?.length&&!prepared.warnings.includes('INFO: stamp category declarations never create taxonomy nodes.'))prepared.warnings.push('INFO: stamp category declarations never create taxonomy nodes.');const resolved=categoryResolution(entry);const beforeTags=entry.tags||[];entry.tags=normalizeStampTags([...beforeTags,...resolved.tags]);if(JSON.stringify(beforeTags)!==JSON.stringify(entry.tags))prepared.warnings.push(`INFO: ${entry.file}: tags normalized to ${entry.tags.join(', ')}.`);if(entry.id){const rows=s.db.prepare('SELECT * FROM pack_asset_revisions WHERE packId=? AND assetId=? ORDER BY revision DESC').all(prepared.manifest.pack!.id,entry.id) as {revision:number;sha256:string;type:string}[];const pack=prepared.manifest.pack!;if(rows[0]&&rows[0].type!==entry.type)throw Error('Asset ID cannot change semantic type.');const exact=rows.find(r=>r.revision===pack.revision);if(exact&&(exact.sha256!==(entry.sha256||hash(files.get(entry.file)||Buffer.alloc(0)))||exact.type!==entry.type))throw Error('Conflicting immutable asset ID/revision.');if(rows[0]&&pack.revision<rows[0].revision&&!exact)throw Error('Stale pack revision.')}}
        const image = files.get(entry.file); if (!image) throw Error(`Missing exact path: ${entry.file}`)
        const mimeType = image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : image[0] === 255 && image[1] === 216 ? 'image/jpeg' : image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : ''
        const validated = await validateImage(new File([new Uint8Array(image)], entry.file.split('/').at(-1)!, { type: mimeType })), digest = hash(image)
        if (entry.sha256 && entry.sha256 !== digest) throw Error('SHA-256 does not match image.')
        if (entry.defaultSize) validateDefaultSize(entry.defaultSize, entry.prefab ? entry.prefab.bounds.width/entry.prefab.bounds.height : validated.width / validated.height)
        const old = entry.type==='prefab'? undefined : s.db.prepare('SELECT id FROM assets WHERE deletedAt IS NULL AND type=? AND sha256=?').get(entry.type === 'stamp' ? 'stamp' : 'fill-pattern', digest) as { id: string } | undefined
        if ((s.db.prepare('SELECT name FROM assets WHERE deletedAt IS NULL AND name=? AND sha256!=?').get(entryTitle(entry),digest))) prepared.warnings.push(`${entry.file}: this title is already used by a different image; edit the manifest title if it would be ambiguous.`)
        prepared.entries.push({ entry, bytes: image, thumbnail: Buffer.from(await validated.thumbnail.arrayBuffer()), width: validated.width, height: validated.height, mimeType, digest, existing: old?.id })
      } catch (e) { prepared.errors.push(`${entry.file}: ${(e as Error).message}`) }
    }
    for(const p of prepared.entries) if(p.entry.prefab) for(const dep of p.entry.prefab.document.assets) {
      const found=prepared.entries.find(e=>e.entry.type===dep.kind&&e.digest===dep.hash&&e.width===dep.width&&e.height===dep.height&&e.mimeType===dep.mimeType)
      if(!found)prepared.errors.push(`Missing prefab dependency ${dep.fileName} (${dep.id}). Include its image entry; recursive prefab dependencies are not supported.`)
    }
  } catch (e) { prepared.errors.push((e as Error).message) }
  let map = previews.get(s); if (!map) { map = new Map(); previews.set(s, map) }; map.clear()
  const token = randomUUID(); map.set(token, prepared);setTimeout(()=>map!.delete(token),15*60_000).unref()
  const categoryMappings=prepared.entries.filter(p=>p.entry.type==='stamp'&&(p.entry.categoryId||p.entry.categoryPath?.length)).map(p=>categoryResolution(p.entry)); return { categoryMappings, token, revision: prepared.revision, warnings: prepared.warnings, errors: prepared.errors, collection: prepared.manifest.collection, collections:prepared.manifest.collections, categories: prepared.manifest.categories, entries: prepared.entries.map(p => ({ ...p.entry, title: entryTitle(p.entry), width: p.width, height: p.height, existing: p.existing ? publicAsset(s.asset(p.existing) as LibraryAsset) : null })) }
}
export function recoverLibraryImports(s: Storage) {
  for (const name of readdirSync(path.join(s.root, 'logs'))) if (/^library-import-[a-f0-9-]+\.json$/.test(name)) {
    const journal = path.join(s.root, 'logs', name), paths = JSON.parse(readFileSync(journal, 'utf8')) as string[]
    for (const relative of paths) { const p = managedPath(s.root, relative); if (!s.db.prepare('SELECT 1 FROM assets WHERE originalPath=? OR previewPath=?').get(relative, relative) && existsSync(p)) unlinkSync(p) }
    unlinkSync(journal)
  }
}
export function commitPack(s: Storage, body: { token: string; revision: number; destination?: string; prefix?: string[]; createCategories?: boolean; useExistingCategories?: boolean; categoryMappings?:Record<string,string>; collectionId?: string; duplicate?: 'keep' | 'fill' | 'overwrite' }, dryRun = false) {
  const p = previews.get(s)?.get(body.token)
  if (!p || p.expires < Date.now()) throw new StorageError('PREVIEW_EXPIRED', 'Import preview expired. Preview the files again.')
  checkRevision(s, p.revision); checkRevision(s, body.revision)
  if (p.errors.length) throw new StorageError('INVALID_PACK', 'Resolve all preview errors before importing.')
  if (!['keep', 'fill', 'overwrite'].includes(body.duplicate || '')) throw Error('Choose a duplicate policy.')
  const owned: string[] = [], journal = path.join(s.root, 'logs', `library-import-${randomUUID()}.json`)
  const record = () => { if(!dryRun)writeFileSync(journal, JSON.stringify(owned), { flush: true }) }
  let review: {count:number;revision:number;entries:(ReturnType<typeof publicAsset>&{categoryPath:string[]})[];categories:string[][]}|undefined
  record()
  try {
    const result = s.db.transaction(() => {
      const destination = body.destination || 'uncategorized'; if (!s.db.prepare('SELECT 1 FROM categories WHERE id=?').get(destination)) throw Error('Unknown import destination.')
      const previousCategories=new Set(categories(s).map(c=>c.id));const created = new Set<string>(); const canonical=ensureStampTaxonomy(s,p.entries.filter(e=>e.entry.type==='stamp').map(e=>categoryResolution(e.entry,body.categoryMappings).categoryId).filter((id):id is string=>!!id));for(const id of canonical.values())if(!previousCategories.has(id))created.add(id);const summaries={imported:0,updated:0,skipped:0,mappings:[] as {source:string;categoryId:string|null;label:string|null}[],warnings:[...p.warnings]}
      const categoryFor = (names?: string[], order?: number) => {
        if (names === undefined) return destination
        const chain = [...(body.prefix || []), ...names]; if (chain.length > 8) throw Error('Import category path exceeds eight levels.')
        let parentId: string | null = null
        for (const name of chain) {
          const old = categories(s).find(c => c.id !== 'uncategorized' && c.parentId === parentId && normalizeLibraryText(c.name) === normalizeLibraryText(name))
          if (old && !created.has(old.id) && !body.useExistingCategories) throw Error('A category path already exists. Explicitly allow existing path mapping or choose a new prefix.')
          if (!old && !body.createCategories) throw Error('Explicit permission to create the previewed categories is required.')
          parentId = old?.id || putCategory(s, { name, parentId, ...(order !== undefined && name === chain.at(-1) ? { sortOrder: order } : {}) }).id
          if(!old)created.add(parentId)
        }
        return parentId || 'uncategorized'
      }
      if(!p.entries.some(e=>e.entry.type==='stamp'))for (const c of p.manifest.categories || []) categoryFor(c.path, c.sortOrder)
      const ids = new Map<string, string>()
      for (const prepared of p.entries) {
        const { entry, digest } = prepared;const resolved=categoryResolution(entry,body.categoryMappings);if(entry.type==='stamp'&&(entry.categoryId||entry.categoryPath?.length)&&!resolved.categoryId)throw Error('Unresolved category: '+resolved.source);const categoryId=entry.type==='stamp'?(resolved.categoryId?canonical.get(resolved.categoryId)!:destination):entry.categoryPath===undefined?destination:categoryFor(entry.categoryPath);if(entry.type==='stamp')summaries.mappings.push(resolved)
        const binding=entry.id?s.db.prepare('SELECT libraryAssetId FROM pack_asset_revisions WHERE packId=? AND assetId=? AND revision=?').get(p.manifest.pack!.id,entry.id,p.manifest.pack!.revision) as {libraryAssetId:string}|undefined:undefined;let id = binding?.libraryAssetId || prepared.existing || (entry.type==='prefab' ? undefined : s.db.prepare('SELECT id FROM assets WHERE type=? AND sha256=?').get(entry.type==='stamp'?'stamp':'fill-pattern',digest) as {id:string}|undefined)?.id
        const removed=id?(s.asset(id) as LibraryAsset).deletedAt:null
        const existed=!!id&&!removed
        if(id&&removed)reviveRemovedAsset(s,id,entryTitle(entry),entry.originalName||entry.file.split('/').at(-1)!,categoryId)
        if(id&&existed){summaries.skipped++;if(body.duplicate!=='keep')summaries.updated++}else summaries.imported++;
        if (!id) {
          const ext = prepared.mimeType === 'image/png' ? 'png' : prepared.mimeType === 'image/jpeg' ? 'jpg' : 'webp', originalPath = `assets/originals/${digest}.${ext}`, previewPath = `assets/previews/${digest}.png`
          for (const [relative, bytes] of [[originalPath, prepared.bytes], [previewPath, prepared.thumbnail]] as const) {
            if (!existsSync(managedPath(s.root, relative))) { owned.push(relative); record() }
            if(!dryRun)s.atomic(relative, bytes)
          }
          id = randomUUID(); const now = new Date().toISOString()
          s.db.prepare('INSERT INTO assets(id,type,name,originalName,mimeType,width,height,size,sha256,originalPath,previewPath,categoryId,createdAt,modifiedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, entry.type === 'prefab' ? 'prefab' : entry.type === 'stamp' ? 'stamp' : 'fill-pattern', entryTitle(entry), entry.originalName || entry.file.split('/').at(-1), prepared.mimeType, prepared.width, prepared.height, prepared.bytes.length, digest, originalPath, previewPath, categoryId, now, now)
        }
        const currentQuality=id?(s.asset(id) as LibraryAsset).quality:null;if(body.duplicate!=='keep'&&currentQuality&&entry.quality&&!['KEEP','FIX'].includes(JSON.parse(currentQuality).classification)&&['KEEP','FIX'].includes(entry.quality.classification))throw Error('Inactive/REPLACE asset cannot be reactivated by import.');
        if(entry.id)s.db.prepare('INSERT OR IGNORE INTO pack_asset_revisions VALUES(?,?,?,?,?,?)').run(p.manifest.pack!.id,entry.id,p.manifest.pack!.revision,id,digest,entry.type);
        if (!existed || body.duplicate !== 'keep') {
          const metadata: Record<string, unknown> = { ...entry }; delete metadata.file; delete metadata.type; delete metadata.sha256; delete metadata.categoryPath;delete metadata.id;delete metadata.categoryId
          if (entry.categoryId !== undefined || entry.categoryPath !== undefined || !existed) metadata.categoryId = categoryId
          if (!existed) metadata.title = entryTitle(entry)
          if (existed && body.duplicate === 'fill') {
            const current = publicAsset(s.asset(id) as LibraryAsset)
            for (const k of Object.keys(metadata)) { const v = k === 'title' ? current.name : (current as unknown as Record<string, unknown>)[k]; if (k === 'categoryId' ? v !== 'uncategorized' : k === 'defaultSize' ? current.defaultSize.mode !== 'native' : Array.isArray(v) ? v.length > 0 : !!v) delete metadata[k] }
          }
          if (entry.prefab) s.db.prepare('UPDATE assets SET prefab=? WHERE id=?').run(JSON.stringify(entry.prefab),id)
          if (entry.type !== 'stamp' && entry.type !== 'prefab') delete metadata.defaultSize
          patchAsset(s, id, metadata)
        }
        ids.set(`${entry.file}/${entry.type}`, id)
      }
      for(const item of p.entries) if(item.entry.prefab) {
        const mapping=new Map(item.entry.prefab.document.assets.map(dep=>{
          const source=p.entries.find(e=>e.entry.type===dep.kind&&e.digest===dep.hash)
          if(!source)throw Error(`Missing dependency: ${dep.fileName}`)
          return [dep.id,ids.get(`${source.entry.file}/${source.entry.type}`)!]
        }))
        const prefab=remapPrefabAssets(item.entry.prefab,mapping)
        s.db.prepare('UPDATE assets SET prefab=? WHERE id=?').run(JSON.stringify(prefab),ids.get(`${item.entry.file}/prefab`))
      }
      const collections = [...(p.manifest.collections || []), ...(p.manifest.collection ? [{ title: p.manifest.collection.title, description: p.manifest.collection.description || '', members: p.manifest.assets.map(a => ({ file: a.file, type: a.type })) }] : [])]
      for (const c of collections) { const existing=(s.db.prepare('SELECT * FROM library_collections ORDER BY id').all() as {id:string;name:string;description:string}[]).find(old=>normalizeLibraryText(old.name)===normalizeLibraryText(c.title)&&old.description===c.description);const id=existing?.id||randomUUID();if(!existing)s.db.prepare('INSERT INTO library_collections VALUES(?,?,?)').run(id,c.title,c.description); for (const m of c.members) s.db.prepare('INSERT OR IGNORE INTO library_members VALUES(?,?)').run(id, ids.get(`${m.file}/${m.type}`)) }
      if(body.collectionId){if(!s.db.prepare('SELECT 1 FROM library_collections WHERE id=?').get(body.collectionId))throw Error('Unknown destination collection.');for(const id of ids.values())s.db.prepare('INSERT OR IGNORE INTO library_members VALUES(?,?)').run(body.collectionId,id)}
      if(!dryRun)s.failWrite?.()
      const tree=categories(s),result={summary:summaries,count:ids.size,revision:libraryRevision(s),entries:[...new Set(ids.values())].map(id=>{const a=publicAsset(s.asset(id) as LibraryAsset);return {...a,categoryPath:categoryPath(tree,a.categoryId).map(c=>c.name)}}),categories:tree.filter(c=>created.has(c.id)).map(c=>categoryPath(tree,c.id).map(n=>n.name))}
      if(dryRun){review={...result,revision:p.revision};throw Error('ROLLBACK_REVIEW')}
      return result
    })()
    unlinkSync(journal); previews.get(s)?.delete(body.token); return result
  } catch (e) { if(review)return review; if(!dryRun)recoverLibraryImports(s); if (e instanceof StorageError) throw e; throw new StorageError('IMPORT_FAILED', (e as Error).message) }
}
export function exportLibrary(s: Storage, ids: string[], category?: string, metadataOnly = false, collectionId?: string) {
  if (ids.length > 1000) throw new StorageError('PACK_LIMIT','Export at most 1,000 assets per pack; use smaller selections or a full backup.')
  const closure=new Set(ids);for(const id of ids){const a=s.asset(id);if(a.prefab)for(const dep of validatePrefab(JSON.parse(a.prefab)).document.assets)closure.add(dep.id)};ids=[...closure];if(ids.length>1000)throw Error('Prefab dependency closure exceeds 1,000 pack entries.')
  const tree = categories(s), files: Record<string, Uint8Array> = {}, manifest: AssetManifest = { schemaVersion: 1, assets: [], categories: [], collections: [] }, selected = new Set(ids)
  for (const id of selected) {
    if (!ids.some(key=>!!s.asset(key).prefab) && s.db.prepare('SELECT 1 FROM wall_sets WHERE assetId=?').get(id)) throw new StorageError('WALL_SET_PACK_REQUIRED','This selection includes a wall set. Use its original specialized wall-set ZIP or a full backup; a loose atlas cannot preserve its contract.')
    const a = s.asset(id) as LibraryAsset; if(a.type==='background')throw new StorageError('UNSUPPORTED_ROLE','Backgrounds must be transferred with their project.'); const p = publicAsset(a), file = `images/${a.type==='prefab'?a.id+'-':''}${a.sha256}.${a.mimeType === 'image/png' ? 'png' : a.mimeType === 'image/jpeg' ? 'jpg' : 'webp'}`
    if (!metadataOnly) files[file] = s.bytes(a)
    if(a.generator)manifest.schemaVersion=3;else if(a.prefab&&manifest.schemaVersion!==3)manifest.schemaVersion=2
    manifest.assets.push({ file, ...(p.quality?{quality:p.quality}:{}), ...(p.patternScale?{patternScale:p.patternScale}:{}), ...(p.generator?{generator:p.generator}:{}), ...(a.prefab?{prefab:validatePrefab(JSON.parse(a.prefab))}:{}), type: a.type==='prefab'?'prefab':a.type === 'stamp' ? 'stamp' : 'fillPattern', title: a.name, originalName: a.originalName, description: a.description, categoryPath: categoryPath(tree, a.categoryId).map(c => c.name), tags: p.tags, defaultSize: p.defaultSize, applicableMapTypes: p.applicableMapTypes, favorite: p.favorite, author: a.author, source: a.source, license: a.license, sha256: a.sha256 })
  }
  for (const c of tree.filter(c => c.id !== 'uncategorized')) if (category ? categoryPath(tree, c.id).some(p => p.id === category) : true) manifest.categories!.push({ path: categoryPath(tree, c.id).map(c => c.name), sortOrder: c.sortOrder })
  const entries = new Map(ids.map((id, i) => [id, manifest.assets[i]]))
  for (const c of s.db.prepare('SELECT * FROM library_collections').all() as { id: string; name: string; description: string }[]) {
    const members = (s.db.prepare('SELECT assetId FROM library_members WHERE collectionId=?').all(c.id) as { assetId: string }[]).filter(m => selected.has(m.assetId)).map(m => ({ file: entries.get(m.assetId)!.file, type: entries.get(m.assetId)!.type }))
    if (members.length || c.id === collectionId) manifest.collections!.push({ title: c.name, description: c.description, members })
  }
  files['mapweaver-assets.json'] = strToU8(JSON.stringify(manifest, null, 2))
  if (Object.values(files).reduce((n, a) => n + a.length, 0) > MAX_BYTES) throw new StorageError('PACK_LIMIT','Export exceeds 128 MiB. Select fewer assets.')
  return metadataOnly ? Buffer.from(files['mapweaver-assets.json']) : Buffer.from(zipSync(files, { level: 0 }))
}

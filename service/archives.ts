import { validateGeneratorMetadata } from '../src/domain/generatorAssets'
import { validateHierarchy } from '../src/campaigns/model'
import type { CampaignNode } from '../src/campaigns/model'
import { validatePrefab } from '../src/domain/prefabs'
import { validateCategoryTree, mapTypes, libraryText } from '../src/domain/library'
import type { LibraryCategory } from '../src/domain/library'
import type { LibraryAsset } from './library'
import { publicAsset } from './library'
import { validateWallSet } from '../src/domain/wallSets'
import type { WallSetDefinition } from '../src/domain/wallSets'
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, statfsSync, openSync, fsyncSync, closeSync, renameSync } from 'node:fs'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { Transform, Readable } from 'node:stream'
import * as yauzl from 'yauzl'
import * as yazl from 'yazl'
import Database from 'better-sqlite3'
import { Storage, StorageError, SCHEMA_VERSION, managedPath, validateImage, label } from './storage'
import type { AssetRow } from './storage'
import { parseProject } from '../src/projects/format'

export const MAX_BACKUP_BYTES = Number(process.env.MAPWEAVER_BACKUP_MAX_BYTES || 256 * 1024 ** 3)
if (!Number.isSafeInteger(MAX_BACKUP_BYTES) || MAX_BACKUP_BYTES < 1024 ** 3) throw new Error('Invalid backup limit.')
const MAX_ENTRIES = 100_001, MAX_MANIFEST = 32 * 1024 ** 2
export interface Progress { phase: string; bytes: number; files: number; totalBytes: number; totalFiles: number }
export interface Manifest { formatVersion: number; schemaVersion: number; createdAt: string; files: Record<string, { size: number; sha256: string }>; appVersion?: string; generation?: string; sourceBytes?: number; archiveBytes?: string; projects?: number; assets?: number; compression?: string; complete?: boolean }
export function space(folder: string, bytes: number) {
  const s = statfsSync(folder, { bigint: true })
  if (s.bavail * s.bsize < BigInt(Math.ceil(bytes)) + 64n * 1024n ** 2n) throw new StorageError('NO_SPACE', 'Not enough free disk space. Existing data was kept.')
  // Windows FAT-family maximum single-file size. NTFS/exFAT are supported for large backups.
  if ([0x4d44, 0x4006].includes(Number(s.type)) && bytes >= 4 * 1024 ** 3) throw new StorageError('FILESYSTEM_LIMIT', 'Use NTFS or exFAT for this large backup.')
}
export function syncFile(file: string) { const fd = openSync(file, 'r+'); try { fsyncSync(fd) } finally { closeSync(fd) } }
export function allowed(name: string) { return name === 'mapweaver.sqlite3' || /^assets\/(originals|previews)\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(name) }
export async function digest(file: string, signal?: AbortSignal, progress?: (n: number) => void) {
  const h = createHash('sha256'); let size = 0
  for await (const chunk of createReadStream(file, { highWaterMark: 256 * 1024, signal })) { size += chunk.length; h.update(chunk); progress?.(chunk.length) }
  return { size, sha256: h.digest('hex') }
}
function openZip(file: string): Promise<yauzl.ZipFile> { return new Promise((resolve, reject) => yauzl.open(file, { lazyEntries: true, autoClose: false, strictFileNames: true, validateEntrySizes: true }, (e, zip) => e ? reject(e) : resolve(zip))) }
function entryStream(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> { return new Promise((resolve, reject) => zip.openReadStream(entry, (e, stream) => e ? reject(e) : resolve(stream))) }
async function entries(zip: yauzl.ZipFile) {
  const result = new Map<string, yauzl.Entry>(); let total = 0
  await new Promise<void>((resolve, reject) => {
    zip.once('error', reject); zip.once('end', resolve)
    zip.on('entry', (entry: yauzl.Entry) => {
      try {
        const name = entry.fileName
        if (result.size >= MAX_ENTRIES || result.has(name) || (name !== 'manifest.json' && !allowed(name)) || name.length > 160 || (entry.generalPurposeBitFlag & 1) || ![0, 8].includes(entry.compressionMethod) || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) throw new Error('Unsafe archive entry.')
        total += entry.uncompressedSize
        if (!Number.isSafeInteger(total) || total > MAX_BACKUP_BYTES || entry.uncompressedSize / Math.max(1, entry.compressedSize) > 200 || (name === 'manifest.json' && entry.uncompressedSize > MAX_MANIFEST)) throw new Error('Archive safety limit exceeded.')
        result.set(name, entry); zip.readEntry()
      } catch (e) { reject(e) }
    }); zip.readEntry()
  })
  return result
}
export async function inspectArchive(file: string) {
  if (statSync(file).size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds configured safety limit.')
  const zip = await openZip(file)
  try {
    const list = await entries(zip), entry = list.get('manifest.json')
    if (!entry) throw new Error('Missing manifest.')
    const chunks: Buffer[] = []; let size = 0
    for await (const chunk of await entryStream(zip, entry)) { size += chunk.length; if (size > MAX_MANIFEST) throw new Error('Manifest too large.'); chunks.push(chunk) }
    const m = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Manifest
    if (![1, 2].includes(m.formatVersion) || !Number.isInteger(m.schemaVersion) || m.schemaVersion < 1 || m.schemaVersion > SCHEMA_VERSION || !Number.isFinite(Date.parse(m.createdAt)) || !m.files || typeof m.files !== 'object' || Array.isArray(m.files) || (m.formatVersion === 2 && (m.complete !== true || m.compression !== 'store' || Number(m.archiveBytes) !== statSync(file).size))) throw new Error('Unsupported or incomplete backup manifest.')
    if (m.formatVersion===2 && (typeof m.appVersion!=='string'||m.appVersion.length>80||typeof m.generation!=='string'||!/^[a-f0-9-]{36}$/.test(m.generation)||!Number.isSafeInteger(m.projects)||m.projects!<0||!Number.isSafeInteger(m.assets)||m.assets!<0)) throw new Error('Invalid backup metadata.')
    let total = 0
    for (const [name, meta] of Object.entries(m.files)) {
      if (!allowed(name) || !meta || !Number.isSafeInteger(meta.size) || meta.size < 0 || !/^[a-f0-9]{64}$/.test(meta.sha256) || list.get(name)?.uncompressedSize !== meta.size) throw new Error('Manifest does not match archive entries.')
      total += meta.size
    }
    if (!m.files['mapweaver.sqlite3'] || Object.keys(m.files).length !== list.size - 1 || total > MAX_BACKUP_BYTES || (m.formatVersion === 2 && m.sourceBytes !== total)) throw new Error('Incomplete backup.')
    return { zip, list, manifest: m, total }
  } catch (e) { zip.close(); throw e }
}
/** Validates headers/manifest before creating any extracted files. */
export async function extractArchive(file: string, target: string, signal: AbortSignal, report: (p: Progress) => void) {
  const checked = await inspectArchive(file)
  try {
    space(path.dirname(target), checked.total + 64 * 1024 ** 2)
    await mkdir(target, { recursive: false })
    let bytes = 0, files = 0
    for (const [name, meta] of Object.entries(checked.manifest.files)) {
      signal.throwIfAborted()
      const dest = path.join(target, name), h = createHash('sha256'); let count = 0
      await mkdir(path.dirname(dest), { recursive: true })
      const meter = new Transform({ transform(chunk, _encoding, next) {
        count += chunk.length; bytes += chunk.length
        if (count > meta.size) return next(new Error('Expanded entry exceeds declared size.'))
        h.update(chunk); report({ phase: 'Validating backup', bytes, files, totalBytes: checked.total, totalFiles: checked.list.size - 1 }); next(null, chunk)
      } })
      space(target, meta.size)
      await pipeline(await entryStream(checked.zip, checked.list.get(name)!), meter, createWriteStream(dest, { flags: 'wx' }), { signal })
      if (count !== meta.size || h.digest('hex') !== meta.sha256) throw new Error('Backup checksum mismatch.')
      syncFile(dest); files++
    }
    const dataset = await validateDataset(target, signal)
    if ((checked.manifest.formatVersion===2&&(dataset.assets!==checked.manifest.assets||dataset.projects!==checked.manifest.projects)) || dataset.version !== checked.manifest.schemaVersion || dataset.paths.length !== Object.keys(checked.manifest.files).length || dataset.paths.some(name => !checked.manifest.files[name])) throw new Error('Backup database and manifest disagree.')
    return checked.manifest
  } finally { checked.zip.close() }
}
export async function validateDataset(root: string, signal?: AbortSignal) {
  const file = path.join(root, 'mapweaver.sqlite3')
  const db = new Database(file, { readonly: true, fileMustExist: true })
  try {
    db.pragma('trusted_schema = OFF'); db.pragma('query_only = ON')
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='view' OR sql LIKE '%VIRTUAL TABLE%'").get()) throw new Error('Unsupported database schema objects.')
    const triggers = new Map<string,string>()
    for(const table of ['assets','categories','library_collections','library_members'])for(const event of ['INSERT','UPDATE','DELETE'])triggers.set(`library_${table}_${event}`,`CREATE TRIGGER library_${table}_${event} AFTER ${event} ON ${table} BEGIN UPDATE settings SET value=CAST(value AS INTEGER)+1 WHERE key='libraryRevision'; END`)
    for(const t of db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all() as {name:string;sql:string}[])if(triggers.get(t.name)!==t.sql)throw Error('Unsupported database trigger.')
    const version = (db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number }).v
    if (!Number.isInteger(version) || version < 1 || version > SCHEMA_VERSION) throw new Error('Unsupported database schema version.')
    if (db.pragma('integrity_check', { simple: true }) !== 'ok' || (db.pragma('foreign_key_check') as unknown[]).length) throw new Error('Database integrity check failed.')
    if ((db.prepare('SELECT COUNT(*) AS n FROM assets').get() as {n:number}).n > 50000 || db.prepare('SELECT 1 FROM projects WHERE length(document)>4194304 LIMIT 1').get()) throw new Error('Database content limit exceeded.')
    if(version>=7){
      for(const c of db.prepare('SELECT id,name,revision FROM campaigns').all() as {id:string;name:string;revision:number}[]){
        label(c.name);if(!Number.isSafeInteger(c.revision)||c.revision<1)throw Error('Invalid campaign revision.')
        const nodes=db.prepare('SELECT * FROM campaign_nodes WHERE campaignId=?').all(c.id) as CampaignNode[]
        validateHierarchy(nodes)
      }
      if(db.prepare('SELECT 1 FROM projects p LEFT JOIN campaign_nodes n ON n.mapId=p.id WHERE n.id IS NULL LIMIT 1').get())throw Error('Map has no campaign reference.')
    }
    const assets = db.prepare('SELECT * FROM assets').all() as AssetRow[]
    const byId = new Map(assets.map(a => [a.id, a]))
    if(version>=6)for(const row of assets){
      if(row.generator){if(row.type!=='stamp')throw Error('Generator metadata requires a stamp.');validateGeneratorMetadata(JSON.parse(row.generator))}
      if(row.type==='prefab'&&!row.prefab)throw Error('Missing prefab definition.')
      if(row.prefab){if(row.type!=='prefab')throw Error('Unexpected prefab definition.');const p=validatePrefab(JSON.parse(row.prefab));for(const dep of p.document.assets){const a=byId.get(dep.id);if(!a||a.type==="prefab"||a.sha256!==dep.hash||a.width!==dep.width||a.height!==dep.height||a.type!==(dep.kind==='fillPattern'?'fill-pattern':'stamp'))throw Error('Invalid prefab dependency.') }}
    }
    const verified = new Set<string>()
    for (const a of assets) {
      signal?.throwIfAborted()
      label(a.name);label(a.originalName,255);const tags=JSON.parse(a.tags);if(!Array.isArray(tags)||tags.length>30)throw new Error('Invalid tags.');tags.forEach(t=>label(t,80))
      if (!['stamp', 'fill-pattern', 'background', ...(version>=6?['prefab']:[])].includes(a.type) || !['image/png', 'image/jpeg', 'image/webp'].includes(a.mimeType) || !/^[a-f0-9]{64}$/.test(a.sha256) || a.size > 20 * 1024 ** 2 || a.size < 1) throw new Error('Invalid asset metadata.')
      if (version>=2 && (!['native','grid','world'].includes(a.sizingMode) || !['battlemap','regional-map','world-map','any'].includes(a.sizingScope) || ![null,'cells','ft','m'].includes(a.sizingUnit) || ![0,1].includes(Number(a.aspectRatioLocked)) || [a.defaultWidth,a.defaultHeight].some(n=>n!==null&&(!Number.isFinite(n)||n<=0)))) throw new Error('Invalid sizing metadata.')
      const original = managedPath(root, a.originalPath), preview = managedPath(root, a.previewPath)
      if (!a.originalPath.startsWith(`assets/originals/${a.sha256}.`) || a.previewPath !== `assets/previews/${a.sha256}.png`) throw new Error('Invalid asset reference.')
      const sum = await digest(original, signal)
      if (sum.sha256 !== a.sha256 || sum.size !== a.size) throw new Error('Missing or damaged asset.')
      if (!verified.has(original)) {
        const decoded = await validateImage(new File([new Uint8Array(await readFile(original))], 'image', { type: a.mimeType }))
        if (decoded.width !== a.width || decoded.height !== a.height) throw new Error('Invalid image dimensions.')
        if (statSync(preview).size > 20*1024**2) throw new Error('Preview exceeds image limit.')
        await validateImage(new File([new Uint8Array(await readFile(preview))], 'preview', { type: 'image/png' }))
        verified.add(original)
      }
    }
    // Backups preserve previously reserved sizing verbatim. New edits/imports enforce aspect and practical limits.
    if(version>=5){
      validateCategoryTree(db.prepare('SELECT * FROM categories').all() as LibraryCategory[])
      for(const raw of assets){const a=raw as LibraryAsset,p=publicAsset(a);mapTypes(p.applicableMapTypes);libraryText(a.description,4000);libraryText(a.author,240);libraryText(a.source,1000);libraryText(a.license,1000);if(![0,1].includes(a.favorite))throw Error('Invalid favorite flag.')}
    }
    if(version>=4){
      if((db.prepare('SELECT COUNT(*) AS n FROM wall_sets').get() as {n:number}).n>1000)throw new Error('Wall set registration limit exceeded.')
      for(const row of db.prepare('SELECT * FROM wall_sets').iterate() as Iterable<{id:string;version:string;revision:string;definition:string;assetId:string}>){
        const d=validateWallSet(JSON.parse(row.definition),true) as WallSetDefinition,a=byId.get(row.assetId)
        if(d.id!==row.id||d.version!==row.version||d.revision!==row.revision||!a||a.type!=='fill-pattern'||a.width!==d.atlasWidth||a.height!==d.atlasHeight)throw new Error('Invalid wall set registration.')
      }
    }
    for (const row of db.prepare('SELECT id,name,revision,document FROM projects').iterate() as Iterable<{ id: string; name:string; revision:number; document: string }>) {
      signal?.throwIfAborted()
      if (Buffer.byteLength(row.document) > 4 * 1024 ** 2) throw new Error('Project too large.')
      const d = parseProject(JSON.parse(row.document))
      if (d.id !== row.id || d.name!==row.name || !Number.isSafeInteger(row.revision) || row.revision<1) throw new Error('Invalid project identity.')
      const refs = db.prepare('SELECT assetId FROM project_assets WHERE projectId=?').all(row.id) as { assetId: string }[]
      if (refs.length !== d.assets.length) throw new Error('Invalid project relations.')
      for (const m of d.assets) { const a = byId.get(m.id); if (!a || a.sha256 !== m.hash || a.width !== m.width || a.height !== m.height || a.mimeType !== m.mimeType || !refs.some(r => r.assetId === a.id)) throw new Error('Invalid project asset reference.') }
    }
    return { version, paths: [...new Set(['mapweaver.sqlite3',...assets.flatMap(a=>[a.originalPath,a.previewPath])])], assets: assets.length, projects: (db.prepare('SELECT COUNT(*) AS n FROM projects').get() as { n: number }).n }
  } finally { db.close() }
}
export async function createBackup(store: Storage, work: string, generation: string, signal: AbortSignal, report: (p: Progress) => void) {
  mkdirSync(work, { recursive: false }); space(work, statSync(path.join(store.root, 'mapweaver.sqlite3')).size * 2)
  const snapshot = path.join(work, 'mapweaver.sqlite3')
  await store.db.backup(snapshot, { progress: () => { signal.throwIfAborted(); return 128 } })
  const db = new Database(snapshot, { readonly: true })
  let assets: AssetRow[], projects: number
  try { assets = db.prepare('SELECT * FROM assets').all() as AssetRow[]; projects = (db.prepare('SELECT COUNT(*) AS n FROM projects').get() as { n: number }).n } finally { db.close() }
  const sources = new Map<string, string>([['mapweaver.sqlite3', snapshot]])
  for (const a of assets) { sources.set(a.originalPath, managedPath(store.root, a.originalPath)); sources.set(a.previewPath, managedPath(store.root, a.previewPath)) }
  const total = [...sources.values()].reduce((n, f) => n + statSync(f).size, 0)
  if (total > MAX_BACKUP_BYTES || sources.size >= MAX_ENTRIES) throw new Error('Dataset exceeds configured backup safety limits.')
  space(work, total * 2 + MAX_MANIFEST)
  let bytes = 0, files = 0
  const manifest: Manifest = { formatVersion: 2, schemaVersion: SCHEMA_VERSION, appVersion: '1.0.0', createdAt: new Date().toISOString(), generation, sourceBytes: total, archiveBytes: '00000000000000000000', assets: assets.length, projects, compression: 'store', complete: true, files: {} }
  for (const [name, file] of sources) {
    manifest.files[name] = await digest(file, signal, n => { bytes += n; report({ phase: 'Hashing snapshot', bytes, files, totalBytes: total, totalFiles: sources.size }) }); files++
  }
  // STORE + forced ZIP64: output size is known before writing. Fixed-width size field avoids circular sizing.
  const zip = new yazl.ZipFile(), temporary = path.join(work, 'backup.zip.tmp'), destination = path.join(work, 'backup.zip')
  const manifestBuffer = Buffer.from(JSON.stringify(manifest))
  let beginManifest: ((error: Error | null, stream: Readable) => void) | undefined
  zip.addReadStreamLazy('manifest.json', { compress: false, size: manifestBuffer.length }, callback => { beginManifest = callback })
  for (const [name, file] of sources) zip.addReadStreamLazy(name, { compress: false, size: statSync(file).size }, callback => callback(null, createReadStream(file, {signal, highWaterMark:256*1024})))
  let written = 0
  const meter = new Transform({ transform(chunk, _encoding, done) { try { written += chunk.length; if (written % (16 * 1024 ** 2) < chunk.length) space(work, 16 * 1024 ** 2); report({ phase: 'Writing backup', bytes: written, files: sources.size, totalBytes: total, totalFiles: sources.size }); done(null, chunk) } catch(e) {done(e as Error)} } })
  zip.on('error', e => (zip.outputStream as Readable).destroy(e))
  const copying = pipeline(zip.outputStream, meter, createWriteStream(temporary, { flags: 'wx' }), { signal })
  ;(zip.end as unknown as (options: { forceZip64Format: boolean }, callback: (size: number) => void) => void).call(zip, { forceZip64Format: true }, (size: number) => { if (size < 0) (zip.outputStream as Readable).destroy(new Error('Cannot determine archive size.')); else { manifest.archiveBytes = String(size).padStart(20, '0'); beginManifest!(null, Readable.from([Buffer.from(JSON.stringify(manifest))])) } })
  await copying; syncFile(temporary)
  // Verify by a complete streamed extraction and isolated database/image validation before publishing.
  await extractArchive(temporary, path.join(work, 'verification'), signal, report)
  renameSync(temporary, destination)
  if (!existsSync(destination)) throw new Error('Backup was not committed.')
  return { file: destination, manifest }
}

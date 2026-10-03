import { campfireContentSignature, nextCampfireRevision } from '../src/campfire/authoring'
import { texturePaintAssetIds, remapTexturePaint } from '../src/domain/terrainPaint'
import { reviveRemovedAsset } from './removedAssets'
import { migrateCampaigns } from './campaignSchema'
import { attachMap } from './campaigns'
import type { MapLocation } from './campaigns'
import { remapScatter } from '../src/domain/scatter'
import { objectAssetIds } from '../src/domain/areas'
import Database from 'better-sqlite3'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, realpathSync, lstatSync, existsSync, readFileSync, writeFileSync, openSync, fsyncSync, closeSync, renameSync, unlinkSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { parseProject, extension } from '../src/projects/format'
import { decodeProject, encodeProject } from '../src/projects/codec'
import { encodedDimensions } from '../src/imports/readImage'
import { validateFile, validateDimensions, MAX_IMAGE_PIXELS } from '../src/imports/limits'
import type { AssetSizing } from '../src/domain/assetSizing'
import type { PreparedProject } from '../src/projects/types'

export const SCHEMA_VERSION = 10
export class StorageError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message) }
}
export const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
export function label(value: unknown, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new StorageError('INVALID_INPUT', 'Invalid name.')
  return value.trim()
}
export function safeId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new StorageError('INVALID_ID', 'Invalid identifier.')
  return value
}
export function dataDirectory(override = process.env.MAPWEAVER_DATA_DIR) {
  const target = override || (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Mapweaver') : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'Mapweaver') : path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'Mapweaver'))
  if (!path.isAbsolute(target) || path.parse(target).root === path.resolve(target) || target.includes('\0')) throw new StorageError('INVALID_DIRECTORY', 'Use an absolute application data directory, not a filesystem root.')
  const resolved = path.resolve(target)
  // Reject junctions/symlinks before creating files, including existing ancestors.
  for (let current = resolved; current !== path.dirname(current); current = path.dirname(current)) if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new StorageError('UNSAFE_DIRECTORY', 'Data directory must not traverse symbolic links.')
  mkdirSync(resolved, { recursive: true })
  return realpathSync(resolved)
}
export function managedPath(root: string, relative: string) {
  if (!/^(assets\/(originals|previews)\/[a-f0-9]{64}\.(png|jpg|webp)|backups\/[a-zA-Z0-9-]+\.sqlite3)$/.test(relative)) throw new StorageError('UNSAFE_PATH', 'Invalid managed asset path.')
  const result = path.resolve(root, relative)
  if (!result.startsWith(root + path.sep)) throw new StorageError('UNSAFE_PATH', 'Invalid managed asset path.')
  for (let p = result; p !== root; p = path.dirname(p)) if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw new StorageError('UNSAFE_PATH', 'Managed files must not be symbolic links.')
  return result
}
export async function validateImage(file: File) {
  validateFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer()), size = encodedDimensions(bytes, file.type)
  validateDimensions(size.width, size.height)
  const decoder = sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning' })
  const metadata = await decoder.metadata()
  if (metadata.pages && metadata.pages !== 1) throw new StorageError('INVALID_IMAGE', 'Animated or multi-page images are not supported.')
  // Match browser createImageBitmap's default EXIF orientation, while retaining original bytes.
  const decoded = await decoder.autoOrient().raw().toBuffer({ resolveWithObject: true })
  validateDimensions(decoded.info.width, decoded.info.height)
  const swap = metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8
  if (decoded.info.width !== (swap ? size.height : size.width) || decoded.info.height !== (swap ? size.width : size.height)) throw new StorageError('INVALID_IMAGE', 'Image dimensions do not match.')
  const thumb = await sharp(decoded.data, { raw: decoded.info }).resize(192, 192, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  return { blob: file as Blob, width:decoded.info.width, height:decoded.info.height, mimeType: file.type, thumbnail: new Blob([new Uint8Array(thumb)], { type: 'image/png' }) }
}
export interface AssetRow extends Omit<AssetSizing, 'applicableMapTypes'> { quality?: string | null; id: string; patternScale?:number|null; generator?: string | null; prefab?: string | null; type: 'stamp' | 'fill-pattern' | 'background' | 'prefab'; name: string; originalName: string; mimeType: string; width: number; height: number; size: number; sha256: string; originalPath: string; previewPath: string; categoryId: string; tags: string; createdAt: string; modifiedAt: string }
export const assetFromRow = <T extends AssetRow>(row: T): T => ({ ...row, aspectRatioLocked: Boolean(row.aspectRatioLocked) })
export interface ProjectRow { id: string; name: string; document: string; revision: number; createdAt: string; modifiedAt: string; openedAt: string | null; deletedAt: string | null }
export class Storage {
  readonly root: string
  readonly db: Database.Database
  constructor(directory?: string, readonly failWrite?: () => void) {
    this.root = dataDirectory(directory)
    for (const folder of ['assets', 'assets/originals', 'assets/previews', 'backups', 'logs']) {
      const p = path.join(this.root, folder)
      if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw new StorageError('UNSAFE_PATH', 'Managed folders must not be symbolic links.')
      mkdirSync(p, { recursive: true })
    }
    const dbPath = path.join(this.root, 'mapweaver.sqlite3')
    if (existsSync(dbPath) && lstatSync(dbPath).isSymbolicLink()) throw new StorageError('UNSAFE_PATH', 'Database must not be a symbolic link.')
    this.db = new Database(dbPath, { timeout: 3000 })
    try { this.migrate() } catch (e) { this.db.close(); throw e }
  }
  migrate() {
    this.db.pragma('foreign_keys = ON')
    const has = this.db.prepare("SELECT name FROM sqlite_master WHERE name='schema_migrations'").get()
    if (has && (this.db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as { version: number }).version > SCHEMA_VERSION) throw new StorageError('FUTURE_SCHEMA', 'Database needs a newer Mapweaver version.')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = FULL')
    if (has && !this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=5').get()) {
      // A consistent, standalone snapshot before altering metadata. Original blobs are immutable.
      this.db.prepare('VACUUM INTO ?').run(managedPath(this.root, `backups/pre-library-${randomUUID()}.sqlite3`))
    }
    this.db.transaction(() => {
      this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, name TEXT NOT NULL, appliedAt TEXT NOT NULL)`)
      if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=1').get()) {
        this.db.exec(`
          CREATE TABLE categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,normalizedName TEXT UNIQUE NOT NULL,createdAt TEXT NOT NULL);
          CREATE TABLE assets(id TEXT PRIMARY KEY,type TEXT NOT NULL CHECK(type IN ('stamp','fill-pattern','background')),name TEXT NOT NULL,originalName TEXT NOT NULL,mimeType TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,size INTEGER NOT NULL,sha256 TEXT NOT NULL,originalPath TEXT NOT NULL,previewPath TEXT NOT NULL,categoryId TEXT NOT NULL REFERENCES categories(id),tags TEXT NOT NULL DEFAULT '[]',createdAt TEXT NOT NULL,modifiedAt TEXT NOT NULL,UNIQUE(type,sha256));
          CREATE INDEX assets_category ON assets(categoryId,type); CREATE INDEX assets_hash ON assets(sha256);
          CREATE TABLE projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,formatVersion INTEGER NOT NULL,document TEXT NOT NULL,revision INTEGER NOT NULL,createdAt TEXT NOT NULL,modifiedAt TEXT NOT NULL,openedAt TEXT,preview TEXT);
          CREATE INDEX projects_modified ON projects(modifiedAt);
          CREATE TABLE project_assets(projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,role TEXT NOT NULL,PRIMARY KEY(projectId,assetId,role));
          CREATE INDEX project_assets_asset ON project_assets(assetId);
          CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
          CREATE TABLE migration_items(key TEXT PRIMARY KEY,digest TEXT NOT NULL,targetId TEXT NOT NULL,kind TEXT NOT NULL);
        `)
        this.db.prepare('INSERT INTO categories VALUES(?,?,?,?)').run('uncategorized', 'Uncategorized', 'uncategorized', new Date().toISOString())
        this.db.prepare('INSERT INTO schema_migrations VALUES(1,?,?)').run('Primary local storage', new Date().toISOString())
      }
      if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get()) {
        this.db.exec(`
          ALTER TABLE assets ADD COLUMN sizingMode TEXT NOT NULL DEFAULT 'native' CHECK(sizingMode IN ('native','grid','world'));
          ALTER TABLE assets ADD COLUMN defaultWidth REAL CHECK(defaultWidth IS NULL OR (typeof(defaultWidth) IN ('integer','real') AND defaultWidth > 0 AND defaultWidth <= 1.7976931348623157e308));
          ALTER TABLE assets ADD COLUMN defaultHeight REAL CHECK(defaultHeight IS NULL OR (typeof(defaultHeight) IN ('integer','real') AND defaultHeight > 0 AND defaultHeight <= 1.7976931348623157e308));
          ALTER TABLE assets ADD COLUMN sizingUnit TEXT CHECK(sizingUnit IS NULL OR sizingUnit IN ('cells','ft','m'));
          ALTER TABLE assets ADD COLUMN aspectRatioLocked INTEGER NOT NULL DEFAULT 1 CHECK(aspectRatioLocked IN (0,1));
          ALTER TABLE assets ADD COLUMN sizingScope TEXT NOT NULL DEFAULT 'any' CHECK(sizingScope IN ('battlemap','regional-map','world-map','any'));
        `)
        this.db.prepare('INSERT INTO schema_migrations VALUES(2,?,?)').run('Reserved asset sizing metadata', new Date().toISOString())
      }
      if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=3').get()) {
        this.db.exec('ALTER TABLE projects ADD COLUMN deletedAt TEXT; CREATE INDEX projects_deleted ON projects(deletedAt);')
        this.db.prepare('INSERT INTO schema_migrations VALUES(3,?,?)').run('Project trash', new Date().toISOString())
      }
      if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=4').get()) {
        this.db.exec('CREATE TABLE wall_sets(id TEXT NOT NULL,version TEXT NOT NULL,title TEXT NOT NULL,revision TEXT NOT NULL,definition TEXT NOT NULL,assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,PRIMARY KEY(id,version));')
        this.db.prepare('INSERT INTO schema_migrations VALUES(4,?,?)').run('Immutable wall material registrations', new Date().toISOString())
      }
      if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=5').get()) {
        this.db.exec(`
          ALTER TABLE categories ADD COLUMN parentId TEXT REFERENCES categories(id);
          ALTER TABLE categories ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE categories ADD COLUMN modifiedAt TEXT NOT NULL DEFAULT '';
          UPDATE categories SET modifiedAt=createdAt;
          CREATE INDEX categories_parent ON categories(parentId,sortOrder);
          ALTER TABLE assets ADD COLUMN description TEXT NOT NULL DEFAULT '';
          ALTER TABLE assets ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE assets ADD COLUMN author TEXT NOT NULL DEFAULT '';
          ALTER TABLE assets ADD COLUMN source TEXT NOT NULL DEFAULT '';
          ALTER TABLE assets ADD COLUMN license TEXT NOT NULL DEFAULT '';
          ALTER TABLE assets ADD COLUMN applicableMapTypes TEXT NOT NULL DEFAULT '[]';
          ALTER TABLE assets ADD COLUMN deletedAt TEXT;
          CREATE INDEX assets_active ON assets(deletedAt,type,categoryId);
          CREATE TABLE library_collections(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL);
          CREATE TABLE library_members(collectionId TEXT NOT NULL REFERENCES library_collections(id) ON DELETE CASCADE,assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,PRIMARY KEY(collectionId,assetId));
          INSERT INTO settings VALUES('libraryRevision','0');
          UPDATE assets SET applicableMapTypes=json_array(sizingScope) WHERE sizingScope!='any';
        `)
        for (const table of ['assets', 'categories', 'library_collections', 'library_members']) for (const event of ['INSERT', 'UPDATE', 'DELETE']) this.db.exec(`CREATE TRIGGER library_${table}_${event} AFTER ${event} ON ${table} BEGIN UPDATE settings SET value=CAST(value AS INTEGER)+1 WHERE key='libraryRevision'; END;`)
        this.db.prepare('INSERT INTO schema_migrations VALUES(5,?,?)').run('Hierarchical asset library', new Date().toISOString())
      }
    })()
    if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=6').get()) {
      if(has)this.db.prepare('VACUUM INTO ?').run(managedPath(this.root, `backups/pre-prefabs-${randomUUID()}.sqlite3`))
      // SQLite's documented create/copy/drop/rename migration keeps all referencing table names intact.
      this.db.pragma('foreign_keys = OFF')
      try { this.db.transaction(() => {
        const schema = (this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='assets'").get() as {sql:string}).sql
        const extras = this.db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='assets' AND type IN ('index','trigger') AND sql IS NOT NULL").all() as {sql:string}[]
        this.db.exec(schema.replace(/^CREATE TABLE ["`]?assets["`]?/i, 'CREATE TABLE assets_next').replace("'fill-pattern','background'", "'fill-pattern','background','prefab'").replace(',UNIQUE(type,sha256)', ''))
        this.db.exec('INSERT INTO assets_next SELECT * FROM assets; DROP TABLE assets; ALTER TABLE assets_next RENAME TO assets; ALTER TABLE assets ADD COLUMN prefab TEXT;')
        for (const extra of extras) this.db.exec(extra.sql)
        this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS assets_role_hash ON assets(type,sha256) WHERE type!='prefab'")
        if ((this.db.pragma('foreign_key_check') as unknown[]).length) throw Error('Prefab migration reference validation failed.')
        this.db.prepare('INSERT INTO schema_migrations VALUES(6,?,?)').run('Reusable library compositions', new Date().toISOString())
      })() } finally { this.db.pragma('foreign_keys = ON') }
    }
    if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=7').get()) {
      if(has)this.db.prepare('VACUUM INTO ?').run(managedPath(this.root, `backups/pre-campaigns-${randomUUID()}.sqlite3`))
      migrateCampaigns(this.db)
    }
    if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=8').get()) {
      if(has)this.db.prepare('VACUUM INTO ?').run(managedPath(this.root, `backups/pre-generator-assets-${randomUUID()}.sqlite3`))
      this.db.transaction(()=>{
        this.db.exec(`ALTER TABLE assets ADD COLUMN generator TEXT CHECK(generator IS NULL OR (type='stamp' AND json_valid(generator)));
          CREATE INDEX assets_generator_type ON assets(json_extract(generator,'$.semanticType')) WHERE generator IS NOT NULL AND deletedAt IS NULL AND type='stamp';`)
        this.db.prepare('INSERT INTO schema_migrations VALUES(8,?,?)').run('Semantic generator asset metadata',new Date().toISOString())
      })()
    }

    if(!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=9').get()){
      if(has)this.db.prepare('VACUUM INTO ?').run(managedPath(this.root,`backups/pre-pattern-scale-${randomUUID()}.sqlite3`))
      this.db.transaction(()=>{this.db.exec("ALTER TABLE assets ADD COLUMN patternScale REAL CHECK(patternScale IS NULL OR (type='fill-pattern' AND patternScale>=0.01 AND patternScale<=100));");this.db.prepare('INSERT INTO schema_migrations VALUES(9,?,?)').run('Recommended fill pattern scale',new Date().toISOString())})()
    }

    if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=10').get()) {
      if (has) this.db.prepare('VACUUM INTO ?').run(managedPath(this.root, `backups/pre-asset-quality-${randomUUID()}.sqlite3`))
      this.db.transaction(() => {
        this.db.exec("ALTER TABLE assets ADD COLUMN quality TEXT CHECK(quality IS NULL OR (json_valid(quality) AND json_extract(quality,'$.classification') IN ('KEEP','FIX','REPLACE','REJECT','DUPLICATE')));")
        this.db.prepare('INSERT INTO schema_migrations VALUES(10,?,?)').run('Non-destructive asset quality audit',new Date().toISOString())
      })()
    }

  }

  asset(id: string) {
    const row = this.db.prepare('SELECT * FROM assets WHERE id=?').get(safeId(id)) as AssetRow | undefined
    if (!row) throw new StorageError('NOT_FOUND', 'Asset not found.', 404)
    return assetFromRow(row)
  }
  bytes(asset: AssetRow, preview = false) {
    try {
      const bytes = readFileSync(managedPath(this.root, preview ? asset.previewPath : asset.originalPath))
      if (!preview && hash(bytes) !== asset.sha256) throw new Error('checksum')
      return bytes
    } catch { throw new StorageError('ASSET_UNREADABLE', 'A stored image is missing or damaged. Restore it from a verified backup.', 409) }
  }
  atomic(relative: string, bytes: Uint8Array) {
    const target = managedPath(this.root, relative)
    if (existsSync(target)) { if (hash(readFileSync(target)) !== hash(bytes)) throw new StorageError('ASSET_CORRUPT', 'Existing image data failed verification.', 409); return }
    const temporary = `${target}.${randomUUID()}.tmp`
    try {
      const fd = openSync(temporary, 'wx')
      try { writeFileSync(fd, bytes); fsyncSync(fd); this.failWrite?.() } finally { closeSync(fd) }
      renameSync(temporary, target)
    } finally { if (existsSync(temporary)) unlinkSync(temporary) }
  }
  async importAsset(file: File, type: string, name: string, categoryId = 'uncategorized') {
    if (!['stamp', 'fill-pattern', 'background'].includes(type)) throw new StorageError('INVALID_TYPE', 'Choose a valid asset type.')
    label(name); label(file.name, 255)
    if (/[\\/]/.test(file.name) || /^[a-z]:/i.test(file.name)) throw new StorageError('UNSAFE_NAME', 'Original filename must not contain a path.')
    if (!this.db.prepare('SELECT 1 FROM categories WHERE id=?').get(safeId(categoryId))) throw new StorageError('INVALID_CATEGORY', 'Category not found.')
    const image = await validateImage(file), bytes = new Uint8Array(await file.arrayBuffer()), digest = hash(bytes)
    const old = this.db.prepare('SELECT * FROM assets WHERE type=? AND sha256=?').get(type, digest) as AssetRow | undefined
    if(old){this.bytes(old);const removed=(old as AssetRow & {deletedAt?:string|null}).deletedAt;if(removed)this.db.transaction(()=>reviveRemovedAsset(this,old.id,label(name),file.name,categoryId))();return {asset:this.asset(old.id),added:!!removed}}
    const originalPath = `assets/originals/${digest}.${extension(file.type)}`, previewPath = `assets/previews/${digest}.png`
    this.atomic(originalPath, bytes); this.atomic(previewPath, new Uint8Array(await image.thumbnail.arrayBuffer()))
    const date = new Date().toISOString()
    const asset = { id: randomUUID(), type, name: label(name), originalName: file.name, mimeType: file.type, width: image.width, height: image.height, size: bytes.length, sha256: digest, originalPath, previewPath, categoryId, tags: '[]', createdAt: date, modifiedAt: date }
    // Files committed before metadata; a crash can leave an orphan, never a row pointing at an unfinished write.
    this.db.transaction(() => this.db.prepare('INSERT INTO assets(id,type,name,originalName,mimeType,width,height,size,sha256,originalPath,previewPath,categoryId,tags,createdAt,modifiedAt) VALUES(@id,@type,@name,@originalName,@mimeType,@width,@height,@size,@sha256,@originalPath,@previewPath,@categoryId,@tags,@createdAt,@modifiedAt)').run(asset))()
    return { asset: this.asset(asset.id), added: true }
  }
  project(id: string) {
    const row = this.db.prepare('SELECT * FROM projects WHERE id=?').get(safeId(id)) as ProjectRow | undefined
    if (!row) throw new StorageError('NOT_FOUND', 'Project not found.', 404)
    return { ...row, document: parseProject(JSON.parse(row.document)) }
  }
  validateDocument(value: unknown) {
    if (Buffer.byteLength(JSON.stringify(value)) > 4 * 1024 * 1024) throw new StorageError('TOO_LARGE', 'Project metadata exceeds 4 MiB.')
    const document = parseProject(value)
    for (const manifest of document.assets) {
      const a = this.asset(manifest.id)
      if (a.sha256 !== manifest.hash || a.mimeType !== manifest.mimeType || a.width !== manifest.width || a.height !== manifest.height || ((texturePaintAssetIds(document.map.texturePaint).includes(a.id)||document.objects.some(o => objectAssetIds(o).includes(a.id))) && a.type !== (manifest.kind === 'fillPattern' ? 'fill-pattern' : 'stamp'))) throw new StorageError('INVALID_REFERENCE', 'Project asset metadata does not match stored data.')
      this.bytes(a)
    }
    return document
  }
  writeProject(value: unknown, revision?: number, location?: MapLocation) {
    const d = this.validateDocument(value)
    return this.db.transaction(() => {
      const old = this.db.prepare('SELECT revision,createdAt FROM projects WHERE id=?').get(d.id) as { revision: number; createdAt: string } | undefined
      if (old && this.db.prepare('SELECT 1 FROM projects WHERE id=? AND deletedAt IS NOT NULL').get(d.id)) throw new StorageError('PROJECT_TRASHED', 'Restore this project from Trash before editing.', 409)
      if (old ? revision !== old.revision : revision !== undefined) throw new StorageError('REVISION_CONFLICT', 'Project changed in another tab or browser. Reload it or save a separate copy.', 409)
      const previous=old?this.project(d.id).document:null
      const changed=!!previous&&campfireContentSignature(previous,previous.name)!==campfireContentSignature(d,d.name)
      d.map.campfireRevision=previous?Math.max(previous.map.campfireRevision??1,d.map.campfireRevision??1,nextCampfireRevision(previous.map.campfireRevision??1,changed)):1
      d.createdAt = old?.createdAt || d.createdAt; d.modifiedAt = new Date(Math.max(Date.now(), Date.parse(d.createdAt))).toISOString()
      const next = (old?.revision || 0) + 1
      this.db.prepare(`INSERT INTO projects(id,name,formatVersion,document,revision,createdAt,modifiedAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,formatVersion=excluded.formatVersion,document=excluded.document,revision=excluded.revision,modifiedAt=excluded.modifiedAt`).run(d.id, d.name, d.formatVersion, JSON.stringify(d), next, d.createdAt, d.modifiedAt)
      this.db.prepare('DELETE FROM project_assets WHERE projectId=?').run(d.id)
      for (const a of d.assets) this.db.prepare('INSERT INTO project_assets VALUES(?,?,?)').run(d.id, a.id, d.map.background?.id === a.id ? 'background' : a.kind)
      attachMap(this,d.id,d.name,d.map.mapType||'battlemap',location)
      return this.project(d.id)
    })()
  }
  async prepared(id: string): Promise<PreparedProject> {
    const document = this.project(id).document
    const assets = new Map(document.assets.map(manifest => [manifest.id, { manifest, blob: new Blob([new Uint8Array(this.bytes(this.asset(manifest.id)))], { type: manifest.mimeType }) }]))
    return { document, assets }
  }
  async exportProject(id: string) { return encodeProject(await this.prepared(id)) }
  async importProject(bytes: Uint8Array, key?: string, location?: MapLocation) {
    const prepared = await decodeProject(bytes, validateImage), d = prepared.document, mapping = new Map<string, string>()
    const digest = hash(Buffer.from(JSON.stringify(d)))
    if (key) {
      label(key, 240)
      const existing = this.db.prepare('SELECT * FROM migration_items WHERE key=?').get(key) as { digest: string; targetId: string } | undefined
      if (existing) { if (existing.digest !== digest) throw new StorageError('MIGRATION_CHANGED', 'Migration source changed. Start a new migration for this version.', 409); return this.project(existing.targetId) }
    }
    for (const [id, source] of prepared.assets) {
      const m = source.manifest
      const type = (texturePaintAssetIds(d.map.texturePaint).includes(id)||d.objects.some(o => objectAssetIds(o).includes(id))) ? (m.kind === 'fillPattern' ? 'fill-pattern' : 'stamp') : 'background'
      const imported = await this.importAsset(new File([source.blob], m.fileName.replace(/[\\/]/g, '-'), { type: m.mimeType }), type, m.fileName.slice(0,120))
      mapping.set(id, imported.asset.id)
    }
    d.assets.forEach(a => { a.id = mapping.get(a.id)!; a.path = `assets/${a.hash}.${extension(a.mimeType)}` })
    // Same type/hash aliases collapse safely; all object references are rewritten together.
    d.assets = [...new Map(d.assets.map(a => [a.id, a])).values()]
    d.objects=d.objects.map(o=>o.kind==='scatter'?remapScatter(o,mapping):o)
    d.objects.forEach(o => { if(o.kind==='legend')o.entries.forEach(e=>{if(e.assetId)e.assetId=mapping.get(e.assetId)!}); if(o.kind === 'path') { if(o.stroke.kind === 'texture') o.stroke.assetId = mapping.get(o.stroke.assetId)! } else if(o.kind === 'area') { if(o.fill.kind === 'pattern') o.fill.assetId = mapping.get(o.fill.assetId)! } else if(o.assetId) o.assetId = mapping.get(o.assetId)! })
    if(d.map.texturePaint)d.map.texturePaint=remapTexturePaint(d.map.texturePaint,mapping)
    if (d.map.background) d.map.background.id = mapping.get(d.map.background.id)!
    if (!key || !/^[0-9a-f-]{36}$/i.test(d.id) || this.db.prepare('SELECT 1 FROM projects WHERE id=?').get(d.id)) d.id = randomUUID()
    return this.db.transaction(() => {
      const result = this.writeProject(d,undefined,location)
      if (key) this.db.prepare('INSERT INTO migration_items VALUES(?,?,?,?)').run(key,digest,d.id,'project')
      return result
    })()
  }
  integrity() {
    const assets = this.db.prepare('SELECT * FROM assets').all() as AssetRow[]
    const expected = new Set(assets.flatMap(a => [a.originalPath,a.previewPath]))
    const missing: string[] = [], damaged: string[] = [], orphaned: string[] = [], temporary: string[] = []
    for (const a of assets) {
      if (!existsSync(managedPath(this.root,a.originalPath))) missing.push(a.id)
      else { try { this.bytes(a) } catch { damaged.push(a.id) } }
      if (!existsSync(managedPath(this.root,a.previewPath))) missing.push(`${a.id}:preview`)
    }
    for (const folder of ['originals','previews']) for (const name of readdirSync(path.join(this.root,'assets',folder))) {
      const relative = `assets/${folder}/${name}`
      if (name.endsWith('.tmp')) temporary.push(relative)
      else if (!expected.has(relative)) orphaned.push(relative)
    }
    return { missing, damaged, orphaned, temporary }
  }
  usedBytes() { return (this.db.prepare('SELECT COALESCE(SUM(size),0) AS size FROM (SELECT MAX(size) AS size FROM assets GROUP BY sha256)').get() as {size:number}).size + statSync(path.join(this.root,'mapweaver.sqlite3')).size }
  close() { this.db.close() }
}

// Read-only inventory. Never instantiates Storage or writes to the source dataset.
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
const [database, root, output] = process.argv.slice(2)
if (!database || !root || !output) throw Error('Usage: node scripts/audit-asset-library.mjs <snapshot.sqlite3> <original-data-root> <output>')
mkdirSync(path.join(output, 'contact-sheets'), { recursive: true })
const db = new Database(database, { readonly: true })
db.pragma('query_only = ON')
const categories = db.prepare('SELECT * FROM categories').all()
const collections = db.prepare('SELECT * FROM library_collections').all()
const memberships = db.prepare('SELECT * FROM library_members').all()
const references = db.prepare('SELECT p.id projectId,p.name,a.assetId,a.role FROM project_assets a JOIN projects p ON p.id=a.projectId').all()
const assets = db.prepare('SELECT * FROM assets ORDER BY categoryId,name,id').all()
const categoryPath = id => { const names = [], seen = new Set(); while (id && id !== 'uncategorized') { if (seen.has(id)) return ['INVALID CYCLE']; seen.add(id); const c = categories.find(c => c.id === id); if (!c) return ['MISSING CATEGORY']; names.unshift(c.name); id = c.parentId } return names }
const groups = key => { const m = new Map(); for (const a of assets) { const v = key(a); if (!v) continue; m.set(v, [...(m.get(v) || []), a.id]) } return [...m].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids })) }
const thumbs = []
for (const [index, a] of assets.entries()) {
  a.auditIndex = index + 1
  a.categoryPath = categoryPath(a.categoryId)
  a.tags = JSON.parse(a.tags)
  a.applicableMapTypes = JSON.parse(a.applicableMapTypes)
  a.collections = memberships.filter(m => m.assetId === a.id).map(m => collections.find(c => c.id === m.collectionId)).filter(Boolean)
  a.references = references.filter(r => r.assetId === a.id)
  a.active = !a.deletedAt
  a.issues = []
  a.semanticClass = null
  a.softShadowDefault = null
  if (a.sizingMode === 'native') a.issues.push('physical-size-missing')
  a.issues.push('semantic-class-missing', 'soft-shadow-default-missing')
  try {
    const file = path.resolve(root, a.originalPath)
    if (!file.startsWith(path.resolve(root) + path.sep)) throw Error('Unsafe original path')
    const bytes = readFileSync(file), sha = createHash('sha256').update(bytes).digest('hex')
    a.actualSha256 = sha
    if (sha !== a.sha256) a.issues.push('hash-mismatch')
    const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
    a.hasAlpha = !!meta.hasAlpha
    if (meta.width !== a.width || meta.height !== a.height) a.issues.push('dimensions-mismatch')
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0, partial = 0
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (!alpha) transparent++
      else { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); if (alpha < 255) partial++ }
    }
    a.alpha = { bounds: right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 }, transparentFraction: transparent / (info.width * info.height), partialFraction: partial / (info.width * info.height), paddingFraction: right < 0 ? 1 : 1 - (right - left + 1) * (bottom - top + 1) / (info.width * info.height) }
    if (right < 0) a.issues.push('empty-alpha')
    if (a.type === 'stamp' && !transparent) a.issues.push('opaque-stamp')
    if (a.alpha.paddingFraction > .35) a.issues.push('excessive-padding')
    if (Math.min(info.width, info.height) < 32) a.issues.push('low-resolution-review')
    const thumb = await sharp(bytes).resize(156, 132, { fit: 'inside' }).png().toBuffer()
    thumbs.push(thumb)
    const mini = await sharp(bytes).resize(8, 8, { fit: 'fill' }).flatten({ background: '#888888' }).greyscale().raw().toBuffer()
    const mean = [...mini].reduce((n, v) => n + v, 0) / mini.length
    a.similarityHash = [...mini].map(v => v > mean ? '1' : '0').join('')
  } catch (error) { a.issues.push('missing-or-corrupt-image'); a.imageError = error.message; thumbs.push(null) }
  if ((index + 1) % 50 === 0) console.log(`Inspected ${index + 1}/${assets.length}`)
}
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
for (let start = 0; start < assets.length; start += 40) {
  const slice = assets.slice(start, start + 40), width = 1000, height = Math.ceil(slice.length / 5) * 190
  const composites = []
  for (const [i, a] of slice.entries()) {
    const x = i % 5 * 200, y = Math.floor(i / 5) * 190
    const svg = `<svg width="200" height="190"><rect width="200" height="190" fill="${i % 2 ? '#d1cbc1' : '#292d30'}"/><text x="8" y="150" fill="${i % 2 ? '#111' : '#fff'}" font-size="12">${a.auditIndex} · ${escape(a.type)}</text><text x="8" y="166" fill="${i % 2 ? '#111' : '#fff'}" font-size="10">${escape(a.name.slice(0, 29))}</text><text x="8" y="181" fill="${i % 2 ? '#111' : '#fff'}" font-size="10">${a.width}×${a.height} · ${a.active ? 'actief' : 'inactief'}</text></svg>`
    composites.push({ input: Buffer.from(svg), left: x, top: y })
    const thumb = thumbs[start + i]
    if (thumb) composites.push({ input: thumb, left: x + 20, top: y + 4 })
  }
  await sharp({ create: { width, height, channels: 4, background: '#222222' } }).composite(composites).png().toFile(path.join(output, 'contact-sheets', `inventory-${String(start / 40 + 1).padStart(2, '0')}.png`))
}
const report = { libraryRevision:Number(db.prepare("SELECT value FROM settings WHERE key='libraryRevision'").get().value), generatedAt: new Date().toISOString(), sourceRoot: root, sourceSnapshot: database, assets, categories, collections, exactDuplicateGroups: groups(a => a.actualSha256), filenameDuplicateGroups: groups(a => a.originalName.toLowerCase()), likelyDuplicateGroups: groups(a => a.similarityHash), totals: { assets: assets.length, active: assets.filter(a => a.active).length, referenced: assets.filter(a => a.references.length).length, projects: db.prepare('SELECT COUNT(*) count FROM projects').get().count } }
writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n')
db.close()
console.log(JSON.stringify(report.totals))

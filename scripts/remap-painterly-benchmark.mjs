// Reproducible, asset-only benchmark. Never writes the source archive.
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import { createServer } from 'vite'

const input = 'deliverables.local/Velanth/Velanth.mapweaver'
const output = 'deliverables.local/Velanth-AssetQuality'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const bytes = await fs.readFile(input), originalHash = hash(bytes)
const archive = unzipSync(bytes), original = JSON.parse(strFromU8(archive['project.json']))
const old = JSON.parse(await fs.readFile('public/world-assets/mapweaver-assets.json', 'utf8'))
const pack = JSON.parse(await fs.readFile('public/world-assets-painterly/mapweaver-assets.json', 'utf8'))
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { compatibleThemeAsset } = await server.ssrLoadModule('/src/domain/applyWorldTheme.ts')
  const { worldTheme } = await server.ssrLoadModule('/src/domain/worldThemes.ts')
  const oldByHash = new Map()
  for (const asset of old.assets) oldByHash.set(hash(await fs.readFile('public/world-assets/' + asset.file)), asset)
  const oldById = new Map(original.assets.map(a => [a.id, oldByHash.get(a.hash)]))
  const candidates = pack.assets.filter(a => a.generator).map(a => ({ ...a, id: 'painterly-' + a.sha256, name: a.title, width: 512, height: 384 }))
  const used = new Map(), mapping = []
  const document = structuredClone(original)
  document.id = 'velanth-asset-quality-v1'
  document.name = 'Velanth-AssetQuality'
  document.objects = original.objects.map(object => {
    if (object.kind !== 'stamp') return object
    const source = oldById.get(object.assetId)
    if (!source?.generator) throw Error('Unknown benchmark source: ' + object.assetId)
    // Keep explicit eruption state and illustrated feature identity. Other
    // choices use the existing weighted, ID-seeded semantic selector unchanged.
    const subset = source.title === 'Active volcano' ? candidates.filter(a => a.file.endsWith('/volcano-active-01.png'))
      : source.title === 'Rough cliff' ? candidates.filter(a => a.file.endsWith('/cliff-01.png'))
      : candidates
    const pick = compatibleThemeAsset(source, subset, worldTheme('world.painterlyFantasy'), original.map.mapType, object.id)
    const reversed = compatibleThemeAsset(source, [...subset].reverse(), worldTheme('world.painterlyFantasy'), original.map.mapType, object.id)
    if (!pick || pick.id !== reversed?.id) throw Error('Missing or unstable semantic match: ' + source.title)
    mapping.push({ objectId: object.id, from: source.title, to: pick.title, fromAsset: object.assetId, toAsset: pick.id, sourceGenerator: source.generator, targetGenerator: pick.generator })
    used.set(pick.id, pick)
    return { ...object, assetId: pick.id }
  })
  for (let i = 0; i < original.objects.length; i++) {
    const a = original.objects[i], b = document.objects[i]
    if (!isDeepStrictEqual(a, b.kind === 'stamp' ? { ...b, assetId: a.assetId } : b)) throw Error('Unexpected object edit: ' + a.id)
  }
  for (const key of ['map', 'layers', 'layerTree', 'objectGroups']) if (!isDeepStrictEqual(original[key], document[key])) throw Error('Unexpected edit: ' + key)
  // Keep unrelated resources, but omit superseded stamp images from the copy.
  const oldStampIds = new Set(original.objects.filter(o => o.kind === 'stamp').map(o => o.assetId))
  document.assets = original.assets.filter(a => !oldStampIds.has(a.id))
  const files = { ...archive }
  for (const a of original.assets.filter(a => oldStampIds.has(a.id))) delete files[a.path]
  for (const asset of used.values()) {
    const data = await fs.readFile('public/world-assets-painterly/' + asset.file)
    if (hash(data) !== asset.sha256) throw Error('Source integrity failure: ' + asset.file)
    const path = 'assets/' + asset.sha256 + '.png'
    files[path] = data
    document.assets.push({ id: asset.id, kind: 'stamp', fileName: asset.title, mimeType: 'image/png', width: 512, height: 384, hash: asset.sha256, path })
  }
  files['project.json'] = strToU8(JSON.stringify(document))
  // A stored preview would still show the old images; regenerate it in the app.
  delete files['preview.png']
  await fs.mkdir(output, { recursive: true })
  await fs.writeFile(output + '/Velanth-AssetQuality.mapweaver', zipSync(files, { level: 6 }))
  await fs.writeFile(output + '/asset-remap.json', JSON.stringify({ originalHash, source: input, objectCount: document.objects.length, replaced: mapping.length, sourceImages: used.size, dimensions: [512, 384], mapping }, null, 2))
  if (hash(await fs.readFile(input)) !== originalHash) throw Error('Original changed')
  console.log(JSON.stringify({ output, originalHash, objects: document.objects.length, replaced: mapping.length, images: used.size }))
} finally { await server.close() }

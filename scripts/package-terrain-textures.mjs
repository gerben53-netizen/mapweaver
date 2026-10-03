import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createServer } from 'vite'
import { zipSync, strToU8 } from 'fflate'

const root = 'public/terrain-textures-painterly', sources = process.argv[2] || '.qa.local/premium-terrain'
const input = JSON.parse(await fs.readFile(sources + '/sources.json', 'utf8'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
await fs.mkdir(root + '/materials', { recursive: true }); await fs.mkdir(sources + '/originals', { recursive: true })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { PREMIUM_TERRAIN, TERRAIN_FAMILIES } = await server.ssrLoadModule('/src/domain/premiumTerrain.ts')
  const previous = JSON.parse(await fs.readFile(root + '/provenance.json', 'utf8').catch(() => '[]'))
  const provenance = [], files = {}, assets = []
  for (const t of PREMIUM_TERRAIN) {
    const key = t.id.replace('painterly.v1.', ''), source = input.find(s => s.id === key)
    const file = 'materials/' + key + '.png', existing = previous.find(p => p.id === t.id)
    let image
    if (existing) {
      image = await fs.readFile(root + '/' + file)
      if (hash(image) !== existing.sha256) throw Error('Immutable texture changed: ' + key)
      provenance.push(existing)
    } else {
      if (!source) throw Error('Missing generated texture: ' + key)
      const original = await fs.readFile(source.source)
      await fs.writeFile(sources + '/originals/' + key + '.png', original)
      // Technical resolution optimization, retaining independently generated artwork.
      image = await sharp(original).resize(512, 512, { fit: 'fill' }).toColourspace('srgb').removeAlpha().png({ compressionLevel: 9 }).toBuffer()
      await fs.writeFile(root + '/' + file, image)
      provenance.push({ id: t.id, method: 'Built-in image_gen', prompt: source.prompt, originalSha256: hash(original), sha256: hash(image), processing: 'Resize to 512x512, sRGB opaque PNG. Runtime overlap-add makes a 384px periodic sample.' })
    }
    files[file] = image
    assets.push({ file, type: 'fillPattern', title: t.title, description: t.notes + ' Ordinary Area fill copy. Terrain Brush uses the bundled immutable preset with this name.', categoryPath: t.categoryPath, tags: t.tags, applicableMapTypes: t.mapTypes, author: 'Mapweaver generated material collection', source: 'Generated using the built-in OpenAI image tool; prompt and hashes in provenance.json.', license: 'Generated for the Mapweaver project. See LICENSE.txt.', sha256: hash(image) })
  }
  const catalog = { version: 1, textures: PREMIUM_TERRAIN }
  const manifest = { schemaVersion: 1, assets, categories: TERRAIN_FAMILIES.map((family, sortOrder) => ({ path: ['Painterly Terrain', family], sortOrder })), collections: TERRAIN_FAMILIES.map(family => ({ title: 'Painterly Terrain — ' + family, description: 'Painterly atlas ground materials: ' + family, members: assets.filter(a => a.categoryPath[1] === family).map(a => ({ file: a.file, type: a.type })) })) }
  const readme = '# Painterly Terrain v1\n\n' + PREMIUM_TERRAIN.length + ' distinct generated materials in ' + TERRAIN_FAMILIES.length + ' families. Built into Terrain Brush with named presets, search, category filtering and scale preview. No import is needed for brush use. Optional mapweaver-terrain-painterly-fills.zip imports copies as ordinary Area fill patterns; importing does not register new brush IDs.\n\n512x512 sRGB opaque PNG sources; shared renderer overlap-adds edges to a 384px periodic material, anchored in map coordinates. Painterly Fantasy is the supported theme family. Existing procedural paint is unchanged. IDs and pixels are immutable; revise the version for art replacements. Full prompts and SHA-256 are recorded in provenance.json.\n'
  const license = 'These images were generated for the Mapweaver project using the built-in OpenAI image tool. No third-party source images were supplied. This notice records provenance, not a guarantee of copyright exclusivity or clearance. Retain this notice and provenance when redistributing the collection.\n'
  for (const [name, content] of Object.entries({ 'terrain-library.json': JSON.stringify(catalog,null,2), 'mapweaver-assets.json': JSON.stringify(manifest,null,2), 'provenance.json': JSON.stringify(provenance,null,2), 'README.md': readme, 'LICENSE.txt': license })) {
    files[name] = strToU8(content); await fs.writeFile(path.join(root,name),content,'utf8')
  }
  await fs.writeFile(root + '/mapweaver-terrain-painterly-fills.zip',zipSync(files,{level:0}))
  console.log(JSON.stringify({textures:assets.length,families:TERRAIN_FAMILIES.length,pngBytes:Object.entries(files).filter(([n])=>n.endsWith('.png')).reduce((s,[,b])=>s+b.length,0)}))
} finally { await server.close() }

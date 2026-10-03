// Package reviewed imagegen outputs; no image generation or network calls here.
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { zipSync, strToU8 } from 'fflate'

const root = 'public/world-assets-painterly'
const sources = JSON.parse(await fs.readFile(root + '/provenance.json', 'utf8'))
const manifest = { schemaVersion: 3, assets: [], collections: [] }
const files = {}, catalog = []
function metadata(id) {
  let family = 'Mountains', type = 'mountain', roles = ['ridge'], biomes = ['temperate', 'alpine'], width = 700000, weight = 8
  if (id.startsWith('peak-')) { roles = ['peak', 'isolatedFeature', 'landmark']; width = 550000; weight = 2 }
  if (id.startsWith('connector-')) { roles = ['ridge']; width = 900000; weight = 5 }
  if (id.startsWith('foothill-')) { type = 'hill'; roles = ['foothill', 'ridge']; width = 650000 }
  if (id.startsWith('snow-')) { family = 'Snow & Alpine'; type = id.includes('foothill') ? 'hill' : 'snowMountain'; roles = id.includes('peak') ? ['peak', 'landmark'] : id.includes('foothill') ? ['foothill', 'ridge'] : ['ridge', 'peak']; biomes = ['alpine', 'snow', 'tundra']; weight = id.includes('peak') ? 2 : 8 }
  if (id.startsWith('broadleaf-') || id.startsWith('conifer-')) {
    const conifer = id.startsWith('conifer-'); family = conifer ? 'Conifer Forest' : 'Broadleaf Forest'; type = 'forestCluster'; biomes = conifer ? ['conifer', 'alpine', 'snow'] : ['temperate', 'deciduous']; roles = id.includes('edge') ? ['forestEdge'] : id.includes('sparse') ? ['sparseVegetation', 'forestEdge'] : ['forestInterior', 'forestCluster']; width = id.includes('sparse') ? 550000 : 700000
  }
  if (id === 'conifer-sparse-01') { type = 'tree'; roles = ['forestEdge', 'sparseVegetation', 'isolatedFeature']; width = 350000 }
  if (id === 'broadleaf-tree-01') { type = 'tree'; roles = ['forestEdge', 'sparseVegetation', 'isolatedFeature']; width = 350000 }
  if (id.startsWith('landmark-grove')) { family = 'Broadleaf Forest'; type = 'tree'; roles = ['landmark', 'isolatedFeature', 'sparseVegetation', 'forestEdge']; biomes = ['temperate', 'deciduous']; width = 350000; weight = 1 }
  if (id.startsWith('swamp-') || id.startsWith('marsh-')) { family = 'Swamp'; type = id.startsWith('marsh-') ? 'marshCluster' : 'swampVegetation'; roles = id.includes('edge') || id.includes('dead') || id.startsWith('marsh-') ? ['swampEdge', 'sparseVegetation'] : ['swampInterior', 'landmark']; biomes = ['swamp', 'wetland']; width = 500000 }
  if (id.startsWith('hill-')) { family = 'Hills & Rocks'; type = 'hill'; roles = ['foothill', 'ridge']; biomes = id.includes('arid') ? ['arid', 'desert'] : id.includes('rocky') ? ['alpine', 'temperate', 'generic'] : ['temperate', 'deciduous']; width = 650000 }
  if (id.startsWith('rock-') || id.startsWith('cliff-')) { family = 'Hills & Rocks'; type = id === 'rock-01' ? 'rock' : 'rockCluster'; roles = id.startsWith('cliff') ? ['ridge', 'landmark', 'rockScatter'] : ['rockScatter', 'foothill', 'isolatedFeature']; biomes = ['generic', 'alpine', 'arid']; width = type === 'rock' ? 280000 : 450000 }
  if (id.startsWith('volcan')) { family = 'Volcanic'; type = id.startsWith('volcano-') ? 'volcano' : id.includes('rocks') ? 'rockCluster' : 'mountain'; roles = type === 'volcano' ? ['landmark', 'isolatedFeature'] : type === 'mountain' ? ['ridge', 'peak'] : ['rockScatter', 'foothill']; biomes = ['volcanic']; weight = id.includes('active') ? 1 : 5; width = type === 'rockCluster' ? 450000 : 650000 }
  if (id.startsWith('landmark-tower')) return { family: 'Landmarks', width: 300000 }
  return { family, width, generator: { version: 1, semanticType: type, roles, biomes, themes: ['painterlyFantasy'], weight, scale: { min: .88, max: 1.15 }, rotation: { allowed: false, min: 0, max: 0 }, spacing: 1 } }
}
await fs.mkdir(root + '/assets', { recursive: true })
for (const [i, source] of sources.assets.entries()) {
  const input = path.join('.qa.local/world-asset-quality/sources', source.id + '.png')
  const bytes = await sharp(input).resize(512, 384, { fit: 'contain', background: '#00000000' }).png().toBuffer()
  const { family, width, generator } = metadata(source.id), file = 'assets/' + source.id + '.png'
  const title = 'Painterly ' + source.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  await fs.writeFile(root + '/' + file, bytes); files[file] = bytes
  manifest.assets.push({ file, type: 'stamp', title, description: 'Painted atlas miniature; northwest light, cool southeast shadow, transparent edges. ' + family + '.', categoryPath: ['World Map', 'Painterly World', family], tags: ['world-map', 'painterly', 'northwest-light', family.toLowerCase(), source.id], defaultSize: { mode: 'world', width, unit: 'm', lockAspectRatio: true }, applicableMapTypes: ['world-map', 'regional-map'], author: 'Mapweaver — AI-assisted artwork', source: 'OpenAI built-in imagegen; prompt and original hash in provenance.json.', license: 'See LICENSE.txt — generated asset usage note', sha256: createHash('sha256').update(bytes).digest('hex'), ...(generator ? { generator } : {}) })
  catalog.push({ input: await sharp(bytes).resize(240, 180).toBuffer(), left: (i % 4) * 260 + 10, top: Math.floor(i / 4) * 220 })
  const label = Buffer.from(`<svg width="250" height="30"><text x="125" y="20" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#27372e">${source.id}</text></svg>`)
  catalog.push({ input: label, left: (i % 4) * 260 + 5, top: Math.floor(i / 4) * 220 + 180 })
}
for (const title of [...new Set(manifest.assets.map(a => a.categoryPath.at(-1)))]) manifest.collections.push({ title: 'Painterly World — ' + title, description: 'Coherent northwest-lit fantasy atlas family', members: manifest.assets.filter(a => a.categoryPath.at(-1) === title).map(a => ({ file: a.file, type: a.type })) })
files['mapweaver-assets.json'] = strToU8(JSON.stringify(manifest, null, 2))
files['LICENSE.txt'] = new Uint8Array(await fs.readFile(root + '/LICENSE.txt'))
files['README.md'] = new Uint8Array(await fs.readFile(root + '/README.md'))
files['provenance.json'] = strToU8(JSON.stringify(sources, null, 2))
await fs.writeFile(root + '/mapweaver-assets.json', files['mapweaver-assets.json'])
await fs.writeFile(root + '/mapweaver-world-painterly.zip', zipSync(files, { level: 6 }))
await sharp({ create: { width: 1040, height: Math.ceil(sources.assets.length / 4) * 220, channels: 4, background: '#d4d6bf' } }).composite(catalog).png().toFile(root + '/catalog.png')
console.log(`Packaged ${manifest.assets.length} images in ${manifest.collections.length} collections.`)

// Apply the explicit hierarchy supplement after rebuilding the original artwork.
await import('./package-world-hierarchy.mjs')

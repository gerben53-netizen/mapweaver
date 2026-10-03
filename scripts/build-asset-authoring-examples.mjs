import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { zipSync, strToU8 } from 'fflate'

const repository = fileURLToPath(new URL('../', import.meta.url))
const root = path.join(repository, 'docs', 'asset-authoring')
const load = relative => readFile(path.join(repository, relative))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const json = value => JSON.stringify(value, null, 2) + '\n'
const cc0 = 'Original Mapweaver instructional artwork and Mapweaver Engraved artwork: CC0 1.0. No third-party source images. These terms do not apply to your replacement images.\n'

// Small diagnostic repeat tiles, not production texture artwork. Periodic samples join at edges.
async function tile(base) {
  const size = 128, data = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const variation = 4 * Math.cos(x * Math.PI / 16) * Math.cos(y * Math.PI / 16)
    for (let c = 0; c < 3; c++) data[(y * size + x) * 3 + c] = Math.round(base[c] + variation)
  }
  return sharp(data, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer()
}
async function pack(name, manifest, files, description, license = cc0, template = true) {
  for (const entry of manifest.assets) entry.sha256 = hash(files[entry.file])
  const contents = {
    ...files,
    'mapweaver-assets.json': strToU8(json(manifest)),
    'README.md': strToU8(`# ${name}\n\n${description}\n\nREQUIRED: keep the manifest at the ZIP root. OPTIONAL: omit sha256 after replacing images, or update it. RECOMMENDED: replace example metadata with your own accurate metadata.\n`),
    'LICENSE.txt': strToU8(license),
  }
  if (template) for (const [file, bytes] of Object.entries(contents)) {
    const target = path.join(root, 'templates', name, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }
  await mkdir(path.join(root, 'examples'), { recursive: true })
  await writeFile(path.join(root, 'examples', name + '.zip'), zipSync(contents, { level: 0 }))
}
const desk = await load('public/asset-templates/06_manuscriptlessenaar.png')
await pack('minimal-stamp-pack', {
  schemaVersion: 1,
  collection: { title: 'Example study', description: 'One instructional desk' },
  categories: [{ path: ['Examples', 'Furniture'], sortOrder: 0 }],
  assets: [{ file: 'images/desk.png', type: 'stamp', title: 'Example desk',
    description: 'Original instructional desk image; a 5 ft wide placement example.',
    categoryPath: ['Examples', 'Furniture'], tags: ['desk', 'study'],
    defaultSize: { mode: 'world', width: 5, unit: 'ft', lockAspectRatio: true },
    applicableMapTypes: ['battlemap'], author: 'Mapweaver example artwork',
    source: 'Original desk from the bundled public/asset-templates example.', license: 'CC0-1.0' }],
}, { 'images/desk.png': desk }, 'One transparent stamp, category and collection. At 50 px per 5 ft cell, the full image is 50 px wide. Copy this folder and ZIP its contents.')
for (const [name, color, terrain] of [
  ['minimal-fill-pattern-pack', [151, 140, 120], false],
  ['minimal-terrain-texture-pack', [125, 145, 99], true],
]) {
  await pack(name, { schemaVersion: 1, assets: [{
    file: 'images/tile.png', type: 'fillPattern', title: terrain ? 'Example grassland surface' : 'Example neutral repeat tile',
    description: 'Small periodic diagnostic tile for learning import and repeat scale; not production terrain artwork.',
    categoryPath: ['Examples', terrain ? 'Terrain surfaces' : 'Fill patterns'], tags: terrain ? ['grassland', 'area-fill'] : ['repeat', 'neutral'],
    applicableMapTypes: terrain ? ['regional-map', 'world-map'] : [],
    author: 'Mapweaver example artwork', source: 'Original deterministic periodic color tile.', license: 'CC0-1.0',
  }] }, { 'images/tile.png': await tile(color) }, terrain
    ? 'AREA FILL ONLY: the current Terrain Brush cannot import image textures or presets. This is an ordinary fillPattern for a World/Regional Area, not a brush extension. See terrain-textures.md in the authoring kit.'
    : 'One repeat-safe diagnostic tile for an Area. Inspect at scale 0.5, 1 and 2. There are no package-level repeat-scale defaults.')
}
const engraved = JSON.parse(await load('public/world-assets/mapweaver-assets.json'))
const world = engraved.assets.filter(a => ['assets/temperate-mountain.png', 'assets/temperate-forest.png'].includes(a.file))
await pack('generator-ready-world-pack', {
  schemaVersion: 3, assets: world,
  categories: world.map((a, i) => ({ path: a.categoryPath, sortOrder: i })),
  collections: [{ title: 'Example generator terrain', description: 'Two original Engraved symbols', members: world.map(a => ({ file: a.file, type: a.type })) }],
}, Object.fromEntries(await Promise.all(world.map(async a => [a.file, await load('public/world-assets/' + a.file)]))),
'Two real CC0 Engraved symbols: mountain and forest. Their existing generator metadata, world sizes and applicability are retained. Generic Fantasy family; this does not supply every biome or semantic type.')

const painterly = JSON.parse(await load('public/world-assets-painterly/mapweaver-assets.json'))
const example = painterly.assets[0]
await pack('painterly-real-example', { schemaVersion: 3, assets: [example] },
  { [example.file]: await load('public/world-assets-painterly/' + example.file) },
  'One actual shipped Painterly World entry with unchanged artwork and supported metadata. Original usage notice is retained; arbitrary extras are not preserved by library re-export.',
  (await load('public/world-assets-painterly/LICENSE.txt')).toString('utf8'), false)
await copyFile(path.join(repository, 'public/world-assets-painterly/provenance.json'), path.join(root, 'examples', 'painterly-provenance.json'))
console.log('Wrote four complete templates and five example ZIPs. Run the runtime authoring tests before distribution.')

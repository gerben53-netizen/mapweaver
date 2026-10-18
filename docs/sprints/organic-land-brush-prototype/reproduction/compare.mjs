import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const root = new URL('../', import.meta.url)
const keys = ['round', 'organic-soft', 'organic-rugged', 'organic-fine', 'combined']
const metrics = JSON.parse(await fs.readFile(new URL('performance-results.json', root)))
const crop = { left: 550, top: 800, width: 400, height: 430 }
const panels = []
for (const [index, key] of keys.entries()) {
  const png = await fs.readFile(new URL(`comparison/${key}.png`, root))
  const validation = JSON.parse(await fs.readFile(new URL(`projects/${key}-validation.json`, root)))
  const sha256 = createHash('sha256').update(png).digest('hex')
  if (!validation.pngExact || !validation.objectsExact || sha256 !== validation.png) throw Error(`Native parity failure: ${key}`)
  const detail = await sharp(png).extract(crop).png().toBuffer()
  await fs.writeFile(new URL(`comparison/${key}-detail.png`, root), detail)
  panels.push({ input: detail, left: index * 400, top: 40 })
  const heading = Buffer.from(`<svg width="400" height="40"><rect width="400" height="40" fill="#20292b"/><text x="12" y="27" font-size="20" fill="white">${key}</text></svg>`)
  panels.push({ input: heading, left: index * 400, top: 0 })
  Object.assign(metrics.records.find(r => r.variant === key), { native: validation, uiDownloadSha256: sha256, uiDownloadExact: true, drawingLatencyMs: null, drawingLatencyNote: 'No instrumented pointer-to-pixel latency measurement; real worker gesture verified separately. Geometry timings exclude pointer delivery.' })
}
await sharp({ create: { width: 2000, height: 470, channels: 4, background: '#20292b' } }).composite(panels).png().toFile(new URL('comparison/contact-sheet.png', root).pathname.replace(/^\/([A-Z]:)/, '$1'))
metrics.status = 'Five native UI downloads verified against archive and isolated database renders'
metrics.detailCrop = crop
await fs.writeFile(new URL('performance-results.json', root), JSON.stringify(metrics, null, 2) + '\n')
console.log('5 native UI downloads equal function/archive/database PNGs; contact sheet is crop-only, native scale.')

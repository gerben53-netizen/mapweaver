import fs from 'node:fs/promises'
import sharp from 'sharp'
const root = 'deliverables.local/Velanth-GeographyFinish'
const crops = {
  ridge: { left: 680, top: 560, width: 620, height: 440 },
  drainage: { left: 1140, top: 825, width: 650, height: 360 },
  biome: { left: 1420, top: 540, width: 460, height: 390 },
  coast: { left: 225, top: 815, width: 650, height: 530 },
}

for (const [name, crop] of Object.entries(crops)) {
  const parts = []
  for (const [i, version] of ['baseline', 'after'].entries()) {
    const file = root + '/' + name + '-' + version + '.png'
    await sharp(root + '/' + version + '-1x.png').extract(crop).png().toFile(file)
    parts.push({ input: file, left: i * crop.width, top: 32 })
    parts.push({ input: Buffer.from(`<svg width="${crop.width}" height="32"><text x="16" y="22" font-family="sans-serif" font-size="17" fill="#f1eddd">${version === 'baseline' ? 'Before' : 'After'} — ${name}</text></svg>`), left: i * crop.width, top: 0 })
  }
  await sharp({ create: { width: crop.width * 2, height: crop.height + 32, channels: 4, background: '#253b42' } }).composite(parts).png().toFile(root + '/' + name + '-comparison.png')
}
await fs.writeFile(root + '/crop-coordinates.json', JSON.stringify({ source: '1x, 2400 x 1600; no crop rescaling', crops }, null, 2))

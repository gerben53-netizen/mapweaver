import { premiumTerrain } from '../domain/premiumTerrain'
import type { TerrainPaint } from '../domain/terrainPaint'

const ready = new Map<string, HTMLCanvasElement>()
const pending = new Map<string, Promise<HTMLCanvasElement>>()
export const paintTextureIds = (paint?: TerrainPaint) => [...new Set(Object.values(paint?.materials || {}).flatMap(m => m.textureId ? [m.textureId] : []))]
export const premiumTexturesReady = (ids: string[]) => ids.every(id => ready.has(id))
export const premiumTextureImage = (id: string) => ready.get(id)

/** Overlap-add the outer quarter with its opposite edge; no mirrored geological forms.
 * A 512px source becomes a 384px periodic material. Shared by preview/editor/export. */
export function repeatSafeTexture(image: HTMLImageElement) {
  const size = 512, overlap = 128, period = size - overlap
  const source = document.createElement('canvas'); source.width = source.height = size
  const context = source.getContext('2d', { willReadFrequently: true })!
  context.drawImage(image, 0, 0, size, size)
  const input = context.getImageData(0, 0, size, size).data
  const result = document.createElement('canvas'); result.width = result.height = period
  const output = result.getContext('2d')!, pixels = output.createImageData(period, period)
  const weight = (p: number) => p < overlap ? .5 - .5 * Math.cos(Math.PI * p / overlap) : 1
  for (let y = 0; y < period; y++) for (let x = 0; x < period; x++) {
    const wx = weight(x), wy = weight(y), target = (y * period + x) * 4
    for (let c = 0; c < 3; c++) {
      let value = input[(y * size + x) * 4 + c] * wx * wy
      if (x < overlap) value += input[(y * size + x + period) * 4 + c] * (1 - wx) * wy
      if (y < overlap) value += input[((y + period) * size + x) * 4 + c] * wx * (1 - wy)
      if (x < overlap && y < overlap) value += input[((y + period) * size + x + period) * 4 + c] * (1 - wx) * (1 - wy)
      pixels.data[target + c] = value
    }
    pixels.data[target + 3] = 255
  }
  output.putImageData(pixels, 0, 0); source.width = source.height = 0
  return result
}
export function loadPremiumTexture(id: string): Promise<HTMLCanvasElement> {
  const old = ready.get(id)
  if (old) return Promise.resolve(old)
  const inFlight = pending.get(id)
  if (inFlight) return inFlight
  const entry = premiumTerrain(id)
  if (!entry) return Promise.reject(Error('Unknown premium terrain texture.'))
  const promise = (async () => {
    const image = new Image(); image.src = entry.file
    try { await image.decode() } catch { throw Error(`Terrain texture unavailable: ${entry.title}. Check the local installation and retry.`) }
    if (image.naturalWidth !== 512 || image.naturalHeight !== 512) throw Error(`Invalid terrain texture dimensions: ${entry.title}.`)
    const canvas = repeatSafeTexture(image)
    ready.set(id, canvas)
    return canvas
  })().finally(() => pending.delete(id))
  pending.set(id, promise)
  return promise
}
export async function loadPaintTextures(paint?: TerrainPaint) { await Promise.all(paintTextureIds(paint).map(loadPremiumTexture)) }
export function premiumTextureStats() { return { count: ready.size, rgbaBytes: ready.size * 384 * 384 * 4 } }

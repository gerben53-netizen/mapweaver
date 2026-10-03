// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_BYTES, MAX_IMAGE_EDGE, MAX_IMAGE_PIXELS, validateBatch, validateDimensions, validateFile } from './limits'
import { contentHash, encodedDimensions, readImage } from './readImage'

function png(width = 320, height = 200) {
  const bytes = new Uint8Array(32)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  bytes.set([73, 72, 68, 82], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width); view.setUint32(20, height)
  return bytes
}
afterEach(() => vi.unstubAllGlobals())
describe('image validation', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s', (type) => expect(() => validateFile({ type, size: 100 })).not.toThrow())
  it.each(['image/svg+xml', 'image/gif', 'text/plain', ''])('rejects %s', (type) => expect(() => validateFile({ type, size: 100 })).toThrow(/PNG/))
  it('checks byte, batch, edge and total pixel limits', () => {
    expect(() => validateFile({ type: 'image/png', size: 0 })).toThrow(/empty/)
    expect(() => validateFile({ type: 'image/png', size: MAX_FILE_BYTES })).not.toThrow()
    expect(() => validateFile({ type: 'image/png', size: MAX_FILE_BYTES + 1 })).toThrow(/20 MiB/)
    expect(() => validateBatch(50)).not.toThrow()
    expect(() => validateBatch(51)).toThrow(/50/)
    expect(() => validateDimensions(MAX_IMAGE_EDGE, 1)).not.toThrow()
    expect(() => validateDimensions(MAX_IMAGE_EDGE + 1, 1)).toThrow()
    expect(() => validateDimensions(6000, MAX_IMAGE_PIXELS / 6000)).not.toThrow()
    expect(() => validateDimensions(6000, 4001)).toThrow()
    expect(() => validateDimensions(0, 4)).toThrow()
    expect(() => validateDimensions(NaN, 4)).toThrow()
  })
  it('recognizes PNG, JPEG and WebP dimensions and rejects a disguised type', () => {
    expect(encodedDimensions(png(), 'image/png')).toEqual({ width: 320, height: 200 })
    const jpeg = new Uint8Array([255,216,255,192,0,8,8,0,100,1,44,0])
    expect(encodedDimensions(jpeg, 'image/jpeg')).toEqual({ width: 300, height: 100 })
    const webp = new Uint8Array(30)
    webp.set(new TextEncoder().encode('RIFF'), 0); webp.set(new TextEncoder().encode('WEBPVP8X'), 8)
    webp[24] = 99; webp[27] = 49
    expect(encodedDimensions(webp, 'image/webp')).toEqual({ width: 100, height: 50 })
    expect(() => encodedDimensions(png(), 'image/jpeg')).toThrow(/damaged/)
    expect(() => encodedDimensions(new Uint8Array([137]), 'image/png')).toThrow()
  })
  it('uses decoded natural dimensions and releases the decoded bitmap', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 320, height: 200, close }))
    vi.stubGlobal('OffscreenCanvas', class { width = 192; height = 120; getContext() { return { drawImage: vi.fn() } } convertToBlob() { return Promise.resolve(new Blob(['thumbnail'], { type: 'image/png' })) } })
    const file = new File([png()], 'map.png', { type: 'image/png' })
    const image = await readImage(file)
    expect(image).toMatchObject({ width: 320, height: 200, mimeType: 'image/png', blob: file })
    expect(image.thumbnail?.size).toBeGreaterThan(0)
    expect(close).toHaveBeenCalledOnce()
  })
  it('rejects oversized headers before decoding and handles decoder failure', async () => {
    const decode = vi.fn().mockRejectedValue(new Error('decode failed'))
    vi.stubGlobal('createImageBitmap', decode)
    await expect(readImage(new File([png(9000, 100)], 'huge.png', { type: 'image/png' }))).rejects.toThrow(/8,192/)
    expect(decode).not.toHaveBeenCalled()
    await expect(readImage(new File([png()], 'broken.png', { type: 'image/png' }))).rejects.toThrow(/decoded/)
  })
  it('closes a decoded bitmap whose actual dimensions exceed the limit', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 10000, height: 10000, close }))
    await expect(readImage(new File([png()], 'invalid.png', { type: 'image/png' }))).rejects.toThrow(/8,192/)
    expect(close).toHaveBeenCalledOnce()
  })
  it('hashes exact content independently of names', async () => {
    const a = new File(['same'], 'one.png'), b = new File(['same'], 'two.png')
    expect(await contentHash(a)).toBe(await contentHash(b))
    expect(await contentHash(a)).not.toBe(await contentHash(new Blob(['different'])))
  })
})

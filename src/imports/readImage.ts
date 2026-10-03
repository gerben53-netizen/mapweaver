import { validateDimensions, validateFile } from './limits'

/** Inspect encoded dimensions before allocating decoded pixels. Full decoding remains mandatory. */
export function encodedDimensions(bytes: Uint8Array, mime: string) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const text = (start: number, count: number) => String.fromCharCode(...bytes.subarray(start, start + count))
  try {
    if (mime === 'image/png' && bytes[0] === 137 && text(1, 7) === 'PNG\r\n\x1a\n' && text(12, 4) === 'IHDR') {
      return { width: data.getUint32(16), height: data.getUint32(20) }
    }
    if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
      let offset = 2
      while (offset + 4 <= bytes.length) {
        if (bytes[offset++] !== 255) break
        while (bytes[offset] === 255) offset++
        const marker = bytes[offset++]
        if (marker === 217 || marker === 218) break
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue
        const length = data.getUint16(offset)
        if (length < 2 || offset + length > bytes.length) break
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
          return { height: data.getUint16(offset + 3), width: data.getUint16(offset + 5) }
        }
        offset += length
      }
    }
    if (mime === 'image/webp' && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
      const chunk = text(12, 4)
      if (chunk === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
      if (chunk === 'VP8L' && bytes[20] === 47) {
        const bits = data.getUint32(21, true)
        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
      }
      if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return { width: data.getUint16(26, true) & 0x3fff, height: data.getUint16(28, true) & 0x3fff }
    }
  } catch { /* Truncated headers are rejected below. */ }
  throw new Error('The file is damaged or its content does not match its image type.')
}

export interface ValidatedImage { blob: Blob; width: number; height: number; mimeType: string; thumbnail?: Blob }
export async function readImage(file: File): Promise<ValidatedImage> {
  validateFile(file)
  let bytes: Uint8Array
  try { bytes = new Uint8Array(await file.arrayBuffer()) } catch { throw new Error('The image file could not be read.') }
  const encoded = encodedDimensions(bytes, file.type)
  validateDimensions(encoded.width, encoded.height)
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error('The image could not be decoded. It may be damaged.') }
  try {
    validateDimensions(bitmap.width, bitmap.height)
    const scale = Math.min(1, 192 / Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('The browser could not prepare this image.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const thumbnail = await canvas.convertToBlob({ type: 'image/png' })
    return { blob: file, width: bitmap.width, height: bitmap.height, mimeType: file.type, thumbnail }
  } finally { bitmap.close() }
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'QuotaExceededError') return 'Local storage is full. This image was not saved.'
  return error instanceof Error ? error.message : 'The image could not be imported.'
}
export async function contentHash(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}



import { exportDimensions } from '../export/scene'
import { transformComposition } from '../domain/prefabs'
import type { Bounds } from '../domain/prefabs'
import type { ProjectFile } from '../projects/types'

export function alphaBounds(data: Uint8ClampedArray, width: number, height: number, padding = 2) {
  let left = width, top = height, right = -1, bottom = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3]) {
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
  }
  if (right < 0) throw Error('The composition renders completely transparent. Include visible content before saving.')
  return { x: Math.max(0, left - padding), y: Math.max(0, top - padding), width: Math.min(width, right + 1 + padding) - Math.max(0, left - padding), height: Math.min(height, bottom + 1 + padding) - Math.max(0, top - padding), touchesEdge: left === 0 || top === 0 || right === width - 1 || bottom === height - 1 }
}
/** Render with the existing export painter, then measure actual alpha rather than inventing effect geometry. */
export async function renderPrefab(document: ProjectFile, bounds: Bounds, scale: 1 | 2, grid: boolean, signal?: AbortSignal) {
  const { exportPng } = await import('../export/render')
  let padding = 32
  for (let attempt = 0; attempt < 7; attempt++, padding *= 2) {
    signal?.throwIfAborted()
    const map = { ...document.map, background: null, width: Math.ceil(bounds.width + padding * 2), height: Math.ceil(bounds.height + padding * 2) }
    exportDimensions(map, scale)
    map.grid = { ...map.grid, offsetX: map.grid.offsetX - bounds.x + padding, offsetY: map.grid.offsetY - bounds.y + padding }
    const objects = transformComposition(document.objects, { x: bounds.x, y: bounds.y }, { x: padding, y: padding })
    const blob = await exportPng({ ...document, objects, map }, { scale, transparent: true, includeGrid: grid })
    const image = await createImageBitmap(blob), canvas = window.document.createElement('canvas')
    try {
      signal?.throwIfAborted()
      canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(image, 0, 0)
      const crop = alphaBounds(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, 2 * scale)
      if (crop.touchesEdge && !grid) continue
      const output = window.document.createElement('canvas')
      try {
        output.width = crop.width; output.height = crop.height
        output.getContext('2d')!.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
        const png = await new Promise<Blob>((resolve, reject) => output.toBlob(b => b ? resolve(b) : reject(Error('Unable to encode prefab PNG.')), 'image/png'))
        signal?.throwIfAborted()
        return { blob: png, visibleBounds: { x: bounds.x - padding + crop.x / scale, y: bounds.y - padding + crop.y / scale, width: crop.width / scale, height: crop.height / scale } }
      } finally { output.width = 0; output.height = 0 }
    } finally { image.close(); canvas.width = 0; canvas.height = 0 }
  }
  throw Error('Visible artwork exceeds the bounded render margin. Simplify the source before flattening.')
}

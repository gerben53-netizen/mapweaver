import { afterEach, expect, it, vi } from 'vitest'
import { composeGeneratedContactShadow, GENERATED_CONTACT_SHADOW } from './generatedContactShadow'

afterEach(() => vi.restoreAllMocks())

it.each([0.5, 1, 2])('composes one isotropic silhouette at raster ratio %s', ratio => {
  const drawImage = vi.fn()
  const context = { drawImage, shadowColor: '', shadowBlur: 0, shadowOffsetX: 9, shadowOffsetY: 9 }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  const artwork = document.createElement('canvas')
  artwork.width = 240 * ratio
  artwork.height = 100 * ratio
  const result = composeGeneratedContactShadow(artwork, ratio)
  expect(result.width).toBe(artwork.width)
  expect(result.height).toBe(artwork.height)
  expect(drawImage).toHaveBeenCalledExactlyOnceWith(artwork, 0, 0)
  expect(context.shadowBlur / ratio).toBe(2)
  expect(context.shadowColor).toBe(GENERATED_CONTACT_SHADOW.color)
  expect([context.shadowOffsetX, context.shadowOffsetY]).toEqual([0, 0])
  expect(GENERATED_CONTACT_SHADOW.padding).toBeGreaterThanOrEqual(3 * GENERATED_CONTACT_SHADOW.blur)
})

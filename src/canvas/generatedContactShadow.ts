/** World/map pixels: the cached raster scales this equally in editor and export.
 * Applied once to the composed, opening-clipped alpha, never per component.
 * This is contact grounding only, not directional lighting or ambient occlusion.
 */
export const GENERATED_CONTACT_SHADOW = Object.freeze({ blur: 2, padding: 6, color: 'rgba(20, 23, 20, 0.16)' })

export function composeGeneratedContactShadow(artwork: HTMLCanvasElement, ratio: number, clip?: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = artwork.width
  canvas.height = artwork.height
  const context = canvas.getContext('2d')!
  // Reapply genuine opening exclusions after blur, including very narrow cuts.
  clip?.(context)
  context.shadowColor = GENERATED_CONTACT_SHADOW.color
  context.shadowBlur = GENERATED_CONTACT_SHADOW.blur * ratio
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.drawImage(artwork, 0, 0)
  return canvas
}

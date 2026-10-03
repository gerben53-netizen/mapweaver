import { softShadowStyle, defaultStampEffects, type MapEffects } from '../domain/mapEffects'
import type { StampObject } from '../domain/models'

type Image = CanvasImageSource & { width: number; height: number }
type Cached = { image: Image; key: string; canvas: HTMLCanvasElement; pad: number }
const cache: Cached[] = []
const MAX_CACHE_PIXELS = 16_000_000
// World maps commonly contain 400+ small stamps. The former 128-entry limit
// evicted their shadows every frame even while well below the pixel budget.
const MAX_CACHE_ENTRIES = 512
export function stampEffectPadding(o: StampObject, map?:MapEffects) {
  const s = o.effects?.shadow, g = o.effects?.glow, soft=softShadowStyle(o,map)
  return Math.ceil(Math.max(soft.enabled?3*soft.blur+soft.spread:0, s?.enabled ? 3 * s.blur + Math.max(Math.abs(s.x), Math.abs(s.y)) : 0, g?.enabled ? g.radius * 3 : 0)) + 2
}
export function paintStampEffects(c: CanvasRenderingContext2D, o: StampObject, image: Image, map?:MapEffects) {
  const soft=softShadowStyle(o,map)
  if (!soft.enabled && !o.effects?.shadow.enabled && !o.effects?.glow.enabled) return
  const key = JSON.stringify([o.width, o.height, o.effects,soft]), pad = stampEffectPadding(o,map)
  let item = cache.find(v => v.image === image && v.key === key)
  if (!item) {
    const width = o.width + pad * 2, height = o.height + pad * 2, ratio = Math.min(2, 2048 / Math.max(width, height))
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio)
    const ctx = canvas.getContext('2d')!, s = (o.effects??defaultStampEffects()).shadow, g = (o.effects??defaultStampEffects()).glow
    // Draw the source beyond the tile and offset its shadow back into it. Only the
    // alpha silhouette is cached: the original source pixels are drawn once by Konva.
    const sourceX = canvas.width + o.width * ratio + 32
    const shadow = (color: string, opacity: number, blur: number, x: number, y: number) => {
      ctx.save(); ctx.globalAlpha = opacity; ctx.shadowColor = color; ctx.shadowBlur = blur * ratio
      ctx.shadowOffsetX = (pad + x) * ratio - sourceX; ctx.shadowOffsetY = y * ratio
      ctx.drawImage(image, sourceX, pad * ratio, o.width * ratio, o.height * ratio); ctx.restore()
    }
    if(soft.enabled){
      const passes=8,opacity=1-(1-soft.opacity)**(1/passes)
      for(let i=0;i<passes;i++){const a=i*Math.PI*2/passes;shadow('#171713',opacity,soft.blur,Math.cos(a)*soft.spread,Math.sin(a)*soft.spread)}
    }
    if (g.enabled && g.radius > 0) {
      // Bounded ring samples add spread; native blur supplies local softness.
      const passes = 8, opacity = 1 - (1 - g.opacity) ** (1 / passes)
      for (let i = 0; i < passes; i++) { const a = i * Math.PI * 2 / passes; shadow(g.color, opacity, g.radius * g.softness, Math.cos(a) * g.radius * (1 - g.softness), Math.sin(a) * g.radius * (1 - g.softness)) }
    }
    if (s.enabled) shadow(s.color, s.opacity, s.blur, s.x, s.y)
    item = { image, key, canvas, pad }; cache.push(item)
    while (cache.length > 1 && (cache.length > MAX_CACHE_ENTRIES || cache.reduce((n, v) => n + v.canvas.width * v.canvas.height, 0) > MAX_CACHE_PIXELS)) { const old = cache.shift()!; old.canvas.width = old.canvas.height = 0 }
  }
  c.save(); c.globalAlpha *= o.opacity
  c.translate(o.scaleX < 0 ? o.width : 0, o.scaleY < 0 ? o.height : 0); c.scale(o.scaleX, o.scaleY)
  c.drawImage(item.canvas, -pad, -pad, o.width + pad * 2, o.height + pad * 2); c.restore()
}

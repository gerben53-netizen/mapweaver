import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultStampEffects } from '../domain/mapEffects'
import type { StampObject } from '../domain/models'

const context = () => ({ save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), globalAlpha: 1 }) as unknown as CanvasRenderingContext2D
let tiles: HTMLCanvasElement[]
beforeEach(() => {
  vi.resetModules(); tiles = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    tiles.push(this)
    return context()
  } as unknown as typeof HTMLCanvasElement.prototype.getContext)
})
afterEach(() => vi.restoreAllMocks())
function stamp(i: number): StampObject {
  const effects = defaultStampEffects(); effects.shadow.enabled = true
  return { kind: 'stamp', id: 's' + i, assetId: 'a', x: 0, y: 0, width: 40 + i / 1000, height: 30, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, effects }
}
it('retains a realistic 421-small-stamp working set across viewport redraws', async () => {
  const { paintStampEffects } = await import('./drawStampEffects'), image = document.createElement('img'), ctx = context()
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < 421; i++) paintStampEffects(ctx, stamp(i), image)
  expect(tiles).toHaveLength(421)
  expect(tiles.every(c => c.width > 0)).toBe(true)
  expect(ctx.drawImage).toHaveBeenCalledTimes(421 * 3)
})
it('still releases backing canvases when the pixel or entry budget is exceeded', async () => {
  const { paintStampEffects } = await import('./drawStampEffects'), image = document.createElement('img'), ctx = context()
  for (let i = 0; i < 530; i++) paintStampEffects(ctx, stamp(i), image)
  expect(tiles.filter(c => c.width > 0).length).toBeLessThanOrEqual(512)
  for (let i = 0; i < 8; i++) paintStampEffects(ctx, { ...stamp(i), width: 1600 + i, height: 1600 }, image)
  expect(tiles.reduce((sum, c) => sum + c.width * c.height, 0)).toBeLessThanOrEqual(16_000_000)
  expect(tiles.some(c => c.width === 0 && c.height === 0)).toBe(true)
})
it('rebuilds shadows for changed size, style or image and reuses unchanged styles', async () => {
  const { paintStampEffects } = await import('./drawStampEffects'), image = document.createElement('img'), ctx = context(), s = stamp(0)
  paintStampEffects(ctx, s, image)
  paintStampEffects(ctx, { ...s, x: 200, y: 300 }, image)
  expect(tiles).toHaveLength(1)
  paintStampEffects(ctx, { ...s, width: 80 }, image)
  paintStampEffects(ctx, { ...s, effects: { ...s.effects!, shadow: { ...s.effects!.shadow, blur: 12 } } }, image)
  paintStampEffects(ctx, s, document.createElement('img'))
  expect(tiles).toHaveLength(4)
})

it('caches contact silhouettes across transforms and opacity; rebuilds for size, intensity and image',async()=>{
 const {paintStampEffects}=await import('./drawStampEffects'),{defaultMapEffects}=await import('../domain/mapEffects'),image=document.createElement('img'),ctx=context(),o={...stamp(0),effects:undefined},map={...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:.25}}
 paintStampEffects(ctx,o,image);expect(tiles).toHaveLength(0)
 paintStampEffects(ctx,o,image,map)
 paintStampEffects(ctx,{...o,rotation:130,scaleX:-1,scaleY:-1,x:700,opacity:.5},image,map)
 expect(tiles).toHaveLength(1);expect(ctx.scale).toHaveBeenLastCalledWith(-1,-1)
 paintStampEffects(ctx,{...o,width:100},image,map)
 paintStampEffects(ctx,o,image,{...map,stampSoftShadow:{enabled:true,intensity:.5}})
 paintStampEffects(ctx,o,document.createElement('img'),map);expect(tiles).toHaveLength(4)
 const off={...o,effects:{...defaultStampEffects(),softShadow:'off' as const}}
 const calls=vi.mocked(ctx.drawImage).mock.calls.length;paintStampEffects(ctx,off,image,map);expect(ctx.drawImage).toHaveBeenCalledTimes(calls)
})

import { FRAME_PRESETS, frameBounds } from '../domain/mapEffects'
import type { MapDocument, MapObject } from '../domain/models'
import { seededRandom } from '../domain/seededRandom'
import { areaPath } from './drawArea'

const fogCache = new Map<string, HTMLCanvasElement>()
export function paintFog(c: CanvasRenderingContext2D, map: MapDocument, objects: MapObject[]) {
  const f = map.effects?.fog
  if (!f?.enabled || !f.opacity || !f.density) return
  const mask = f.areaId ? objects.find(o => o.id === f.areaId && o.kind === 'area') : undefined
  // Missing or hidden mask is empty, never silently becomes global fog.
  if (f.areaId && (!mask || mask.kind !== 'area')) return
  const key = JSON.stringify([map.width, map.height, f.scale, f.softness, f.density, f.color])
  let canvas = fogCache.get(key)
  if (!canvas) {
    canvas = document.createElement('canvas')
    const resolution = Math.min(1, 1024 / Math.max(map.width, map.height))
    canvas.width = Math.max(1, Math.ceil(map.width * resolution)); canvas.height = Math.max(1, Math.ceil(map.height * resolution))
    const ctx = canvas.getContext('2d')!, w = canvas.width, h = canvas.height
    // Non-tiling deterministic cloud field, independent of viewport and export ratio.
    const count = 140, radius = Math.min(w, h) * f.scale
    for (let i = 0; i < count; i++) {
      const x = seededRandom(3817, i, 0) * w, y = seededRandom(3817, i, 1) * h, r = radius * (.45 + seededRandom(3817, i, 2))
      const gradient = ctx.createRadialGradient(x, y, r * (1 - f.softness) * .65, x, y, r)
      gradient.addColorStop(0, f.color); gradient.addColorStop(1, f.color + '00')
      ctx.fillStyle = gradient; ctx.globalAlpha = f.density * .18
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    fogCache.set(key, canvas)
    if (fogCache.size > 4) { const first = fogCache.keys().next().value!; const old = fogCache.get(first)!; old.width = old.height = 0; fogCache.delete(first) }
  }
  c.save()
  if (mask?.kind === 'area') { c.translate(mask.x, mask.y); areaPath(c, mask); c.clip('evenodd'); c.translate(-mask.x, -mask.y) }
  c.globalAlpha *= f.opacity; c.drawImage(canvas, 0, 0, map.width, map.height); c.restore()
}
export function paintVignette(c: CanvasRenderingContext2D, map: MapDocument) {
  const v = map.effects?.vignette
  if (!v?.enabled || !v.amount) return
  c.save(); c.translate(map.width / 2, map.height / 2); c.scale(map.width / 2, map.height / 2)
  const start = v.radius * .98, end = Math.max(start + .01, start + (1.42 - start) * Math.max(.02, v.softness))
  const g = c.createRadialGradient(0, 0, start, 0, 0, end)
  g.addColorStop(0, v.color + '00'); g.addColorStop(1, v.color)
  c.globalAlpha *= v.amount; c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore()
}
export function paintFrame(c: CanvasRenderingContext2D, map: MapDocument) {
  const f = map.effects?.frame
  if (!f?.enabled || !f.opacity) return
  const b = frameBounds(map.width, map.height, f), style = FRAME_PRESETS[f.preset as keyof typeof FRAME_PRESETS], r = b.ornament
  c.save(); c.globalAlpha *= f.opacity; c.strokeStyle = c.fillStyle = f.color; c.lineWidth = b.stroke; c.lineJoin = 'round'; c.lineCap = 'round'
  c.strokeRect(b.x, b.y, b.width, b.height)
  if (style.motif !== 'minimal') {
    c.lineWidth = b.stroke * .45; c.strokeRect(b.x + r * .28, b.y + r * .28, b.width - r * .56, b.height - r * .56)
    if (style.motif === 'parchment') { c.globalAlpha *= .18; c.lineWidth = r * .22; c.strokeRect(b.x + r * .14, b.y + r * .14, b.width - r * .28, b.height - r * .28); c.globalAlpha /= .18 }
    for (const [x, y, sx, sy] of [[b.x, b.y, 1, 1], [b.x + b.width, b.y, -1, 1], [b.x + b.width, b.y + b.height, -1, -1], [b.x, b.y + b.height, 1, -1]]) {
      c.save(); c.translate(x, y); c.scale(sx, sy); c.lineWidth = b.stroke
      if (style.motif === 'elven') {
        c.beginPath(); c.moveTo(0, r * 2); c.bezierCurveTo(r * .3, r * .1, r * .1, r * .3, r * 2, 0); c.stroke()
        for (const a of [.7, 1.1, 1.5]) { c.beginPath(); c.ellipse(r * a * .55, r * a * .55, r * .32, r * .1, -Math.PI / 4, 0, Math.PI * 2); c.stroke() }
      } else if (style.motif === 'ornate') {
        c.beginPath(); c.moveTo(0, r * 2); c.bezierCurveTo(r * 1.8, r * 1.6, -r * .1, r * .1, r * 2, 0); c.stroke()
        c.beginPath(); c.arc(r * .8, r * .8, r * .24, 0, Math.PI * 2); c.stroke()
        c.beginPath(); c.moveTo(r * .4, r * .4); c.lineTo(r * 1.25, r * 1.25); c.stroke()
      } else if (style.motif === 'dark') {
        c.beginPath(); c.moveTo(0, r * 1.6); c.lineTo(r * .45, r * .45); c.lineTo(r * 1.6, 0); c.lineTo(r * .9, r * .9); c.closePath(); c.fill()
        c.beginPath(); c.moveTo(r * .9, r * 1.8); c.lineTo(r * 1.8, r * .9); c.stroke()
      } else { c.strokeRect(r * .4, r * .4, r * .45, r * .45); c.beginPath(); c.moveTo(0, r * 1.5); c.lineTo(r * 1.5, 0); c.stroke() }
      c.restore()
    }
    if (['ornate', 'elven', 'dark'].includes(style.motif)) {
      for (const [x, y, a] of [[map.width / 2, b.y, 0], [map.width / 2, b.y + b.height, Math.PI], [b.x, map.height / 2, -Math.PI / 2], [b.x + b.width, map.height / 2, Math.PI / 2]]) {
        c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(-r * .3, r * .1, 0, r * .65); c.quadraticCurveTo(r * .3, r * .1, r, 0); c.stroke(); c.restore()
      }
    }
  }
  c.restore()
}

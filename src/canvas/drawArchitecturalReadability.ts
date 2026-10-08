import type { MapDocument, MapObject, OpeningObject, PathObject } from '../domain/models'
import type { ArlMode } from '../store/arlStore'
import { generatedSurface, generatedSurfaceKey, paintGeneratedWall } from './drawGeneratedWall'
import { arlWall, arlProfile, arlDistance, arlEnds, beyondArlEnd } from './architecturalReadability'
import type { ArlBatch } from './architecturalReadability'
import { areaPath } from './drawArea'
import { openingCutout } from '../domain/openings'
import { wallRibbon } from '../domain/wallGeometry'
import { wallPaintPath } from '../domain/wallAlignment'
import { useAssetContext } from '../projects/assets'

const MAX_PIXELS = 4_194_304, CACHE_PIXELS = 16_777_216
interface Surface { canvas: HTMLCanvasElement; x: number; y: number; width: number; height: number }
const cache = new Map<string, Surface>()
const fallbacks = new Set<string>()
let pixels = 0, generation = -1
export const arlStats = { builds: 0, hits: 0, lastBuildMs: 0, fallbacks: 0 }
export function clearArlCache() { cache.clear(); fallbacks.clear(); pixels = 0 }
export function arlCacheStats() { return { entries: cache.size, pixels } }
const openingsFor = (objects: MapObject[], wall: PathObject) => objects.filter((o): o is OpeningObject => (o.kind === 'door' || o.kind === 'window') && o.wallId === wall.id)
const nativeOccluder = (o: MapObject): o is PathObject => o.kind === 'path' && o.pathKind === 'wall' && !arlWall(o)
export function arlKey(batch: ArlBatch, map: MapDocument, objects: MapObject[], mode: ArlMode) {
  return JSON.stringify([mode, map.width, map.height, batch.walls.map(w => w.id),
    batch.floors.map(f => [f.id, f.geometry]),
    objects.filter((o):o is PathObject => o.kind === 'path' && o.pathKind === 'wall').map(w => [w.id, w.x, w.y, w.rotation, w.opacity, w.cap, w.join, generatedSurfaceKey(w, openingsFor(objects, w))])])
}
function scratch(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  return { canvas, context }
}
function ring(c: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
  if (!points.length) return
  c.moveTo(points[0].x, points[0].y); for (const p of points.slice(1)) c.lineTo(p.x, p.y); c.closePath()
}
function baseline(c: CanvasRenderingContext2D, batch: ArlBatch, objects: MapObject[]) {
  for (const w of batch.walls) { c.save(); c.translate(w.x, w.y); paintGeneratedWall(c, w, openingsFor(objects, w)); c.restore() }
}
function fallback(c: CanvasRenderingContext2D, batch: ArlBatch, objects: MapObject[], key: string) {
  if (fallbacks.size >= 32) fallbacks.delete(fallbacks.values().next().value!)
  fallbacks.add(key); arlStats.fallbacks++; baseline(c, batch, objects)
}
/** One shared editor/export composite at the batch's original z position.
 * Owner labels come from native opening-clipped artwork, never PNG colors.
 * Surrounding wall coverage prevents effects inside another wall; a nearest-owner
 * field assigns each floor pixel once even across separate scene batches.
 */
export function paintArlBatch(c: CanvasRenderingContext2D, batch: ArlBatch, map: MapDocument, objects: MapObject[], mode: ArlMode) {
  if (mode === 'OFF') { baseline(c, batch, objects); return }
  const currentGeneration = useAssetContext.getState().generation
  if (generation !== currentGeneration) { clearArlCache(); generation = currentGeneration }
  const key = arlKey(batch, map, objects, mode), existing = cache.get(key)
  if (existing) { cache.delete(key); cache.set(key, existing); arlStats.hits++; c.drawImage(existing.canvas, existing.x, existing.y, existing.width, existing.height); return }
  if (fallbacks.has(key)) { baseline(c, batch, objects); return }
  const start = performance.now(), ownIds = new Set(batch.walls.map(w => w.id))
  const walls = objects.filter(arlWall), surfaces: NonNullable<ReturnType<typeof generatedSurface>>[] = []
  if (walls.length > 256) { fallback(c, batch, objects, key); return }
  // Images load atomically in the React node / export preparation; never cache incomplete content.
  let sourcePixels = 0
  for (const wall of walls) {
    const surface = generatedSurface(wall, openingsFor(objects, wall), false, true)
    if (!surface) return
    sourcePixels += surface.canvas.width * surface.canvas.height
    if (sourcePixels > CACHE_PIXELS) { surfaces.length = 0; fallback(c, batch, objects, key); return }
    surfaces.push(surface)
  }
  const own = surfaces.filter((_, i) => ownIds.has(walls[i].id))
  const x = Math.max(0, Math.floor(Math.min(...own.map(s => s.x)))), y = Math.max(0, Math.floor(Math.min(...own.map(s => s.y))))
  const right = Math.min(map.width, Math.ceil(Math.max(...own.map(s => s.x + s.width)))), bottom = Math.min(map.height, Math.ceil(Math.max(...own.map(s => s.y + s.height))))
  const width = right - x, height = bottom - y
  if (width <= 0 || height <= 0) return
  const ratio = Math.min(2, 4096 / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)))
  if (ratio < .5) { fallback(c, batch, objects, key); return }
  const rw = Math.max(1, Math.floor(width * ratio)), rh = Math.max(1, Math.floor(height * ratio)), count = rw * rh
  const coverage = new Uint16Array(count), floorSeeds = new Uint16Array(count)
  const art = scratch(rw, rh), floor = scratch(rw, rh)
  art.context.scale(ratio, ratio); art.context.translate(-x, -y)
  floor.context.scale(ratio, ratio); floor.context.translate(-x, -y)
  floor.context.fillStyle = '#fff'
  for (const f of batch.floors) { floor.context.save(); floor.context.translate(f.x, f.y); areaPath(floor.context, f); floor.context.fill(); floor.context.restore() }
  // Genuine cuts stay clear after distance-field expansion, independent of door state.
  floor.context.globalCompositeOperation = 'destination-out'
  for (const w of walls) for (const o of openingsFor(objects, w)) { floor.context.beginPath(); ring(floor.context, openingCutout(o, w, w.strokeWidth * 4)); floor.context.fill() }
  // Unsupported wall strategies retain native appearance and act as conservative occluders.
  for (const o of objects.filter(nativeOccluder)) {
    if (o.rotation) { fallback(c, batch, objects, key); return }
    const ribbon = wallRibbon(wallPaintPath(o)); floor.context.beginPath()
    for (const p of ribbon.polygons) ring(floor.context, p)
    for (const a of ribbon.circles) { floor.context.moveTo(a.point.x + a.radius, a.point.y); floor.context.arc(a.point.x, a.point.y, a.radius, 0, Math.PI * 2) }
    floor.context.fill()
  }
  const floorBytes = floor.context.getImageData(0, 0, rw, rh).data
  for (let wi = 0; wi < walls.length; wi++) {
    const s = surfaces[wi]!, left = Math.max(0, Math.floor((s.x - x) * ratio)), top = Math.max(0, Math.floor((s.y - y) * ratio))
    const r = Math.min(rw, Math.ceil((s.x + s.width - x) * ratio)), b = Math.min(rh, Math.ceil((s.y + s.height - y) * ratio))
    if (left >= r || top >= b) continue
    // Native pixels are immutable. Sample their alpha once per build, including source foliage.
    const data = s.canvas.getContext('2d')!.getImageData(0, 0, s.canvas.width, s.canvas.height).data
    for (let py = top; py < b; py++) for (let px = left; px < r; px++) {
      const sx = Math.floor((x + (px + .5) / ratio - s.x) / s.width * s.canvas.width), sy = Math.floor((y + (py + .5) / ratio - s.y) / s.height * s.canvas.height)
      if (sx >= 0 && sy >= 0 && sx < s.canvas.width && sy < s.canvas.height && data[(sy * s.canvas.width + sx) * 4 + 3] >= 32) coverage[py * rw + px] = wi + 1
    }
    if (ownIds.has(walls[wi].id)) art.context.drawImage(s.canvas, s.x, s.y, s.width, s.height)
  }
  for (let i = 0; i < count; i++) if (!coverage[i] && floorBytes[i * 4 + 3] >= 128) floorSeeds[i] = 1
  const outside = arlDistance(coverage, rw, rh, 4 * ratio + 1), inside = mode === 'C' ? arlDistance(floorSeeds, rw, rh, 2 * ratio + 1) : null
  const fx = scratch(rw, rh), edge = mode === 'C' ? scratch(rw, rh) : null, sd = fx.context.createImageData(rw, rh), ed = edge?.context.createImageData(rw, rh)
  const ends = walls.map(arlEnds), profiles = walls.map(arlProfile)
  for (let i = 0; i < count; i++) {
    const owner = (coverage[i] || outside.owner[i]) - 1
    if (owner < 0 || !ownIds.has(walls[owner].id)) continue
    const p = profiles[owner], offset = i * 4
    if (!coverage[i] && floorSeeds[i] && outside.distance[i] < p.shadowWidth * ratio) {
      const point = { x: x + (i % rw + .5) / ratio, y: y + (Math.floor(i / rw) + .5) / ratio }
      if (!beyondArlEnd(point, ends[owner], walls[owner].strokeWidth)) {
        sd.data[offset] = sd.data[offset + 1] = sd.data[offset + 2] = 20
        sd.data[offset + 3] = Math.round(255 * p.shadowOpacity * Math.max(0, 1 - outside.distance[i] / (p.shadowWidth * ratio)) ** 2)
      }
    } else if (coverage[i] && ed && inside && p.edgeWidth) {
      const d = inside.distance[i] / ratio, alpha = d <= p.edgeWidth ? p.edgeOpacity : p.massOpacity * Math.max(0, 1 - d / p.massWidth)
      ed.data[offset] = ed.data[offset + 1] = ed.data[offset + 2] = 20; ed.data[offset + 3] = Math.round(alpha * 255)
    }
  }
  fx.context.putImageData(sd, 0, 0); fx.context.drawImage(art.canvas, 0, 0)
  if (edge && ed) { edge.context.putImageData(ed, 0, 0); edge.context.globalCompositeOperation = 'destination-in'; edge.context.drawImage(art.canvas, 0, 0); fx.context.drawImage(edge.canvas, 0, 0) }
  const result = { canvas: fx.canvas, x, y, width: rw / ratio, height: rh / ratio }, size = rw * rh
  while (cache.size && (cache.size >= 32 || pixels + size > CACHE_PIXELS)) { const [old, value] = cache.entries().next().value!; pixels -= value.canvas.width * value.canvas.height; cache.delete(old) }
  cache.set(key, result); pixels += size; arlStats.builds++; arlStats.lastBuildMs = performance.now() - start
  c.drawImage(result.canvas, result.x, result.y, result.width, result.height)
}

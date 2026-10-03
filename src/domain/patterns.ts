import { inGeometryRange } from './documentLimits'
import type { GridSettings, PatternFillObject, MapObject } from './models'
import type { Point, Size } from '../canvas/viewport'
import type { NodeTransform, ObjectTransform } from './transforms'
import { normalizeRotation, MIN_OBJECT_SIZE } from './transforms'
import { snapPoint } from './mapSettings'
export const MIN_PATTERN_SIZE = MIN_OBJECT_SIZE
export const MIN_PATTERN_SCALE = 0.01
export const MAX_PATTERN_SCALE = 100
export type PatternSettings = Pick<PatternFillObject, 'mode' | 'patternScale' | 'patternRotation' | 'patternOffsetX' | 'patternOffsetY' | 'opacity'>
export const DEFAULT_PATTERN: PatternSettings = { mode: 'repeat', patternScale: 1, patternRotation: 0, patternOffsetX: 0, patternOffsetY: 0, opacity: 1 }
export interface PatternRect extends Point, Size {}
export function normalizePattern(settings: PatternSettings): PatternSettings {
  if (settings.mode !== 'repeat' && settings.mode !== 'stretch') throw new Error('Choose Repeat or Stretch.')
  if (!Number.isFinite(settings.patternScale) || settings.patternScale < MIN_PATTERN_SCALE || settings.patternScale > MAX_PATTERN_SCALE) throw new Error(`Pattern scale must be ${MIN_PATTERN_SCALE}–${MAX_PATTERN_SCALE}.`)
  if (![settings.patternRotation, settings.patternOffsetX, settings.patternOffsetY, settings.opacity].every(Number.isFinite)) throw new Error('Pattern values must be finite numbers.')
  if (![settings.patternOffsetX, settings.patternOffsetY].every(inGeometryRange)) throw new Error('Pattern offsets must stay within ±1,000,000,000.')
  if (settings.opacity < 0 || settings.opacity > 1) throw new Error('Opacity must be 0–100%.')
  return { mode: settings.mode, patternScale: settings.patternScale, patternRotation: normalizeRotation(settings.patternRotation), patternOffsetX: settings.patternOffsetX, patternOffsetY: settings.patternOffsetY, opacity: settings.opacity }
}
export function patternRect(start: Point, end: Point, map: Size, grid: GridSettings, bypass: boolean): PatternRect | null {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite) || start.x < 0 || start.y < 0 || start.x > map.width || start.y > map.height) return null
  const a = snapPoint(start, grid, bypass), b = snapPoint(end, grid, bypass)
  const x = Math.max(0, Math.min(a.x, b.x)), y = Math.max(0, Math.min(a.y, b.y))
  const width = Math.min(map.width, Math.max(a.x, b.x)) - x, height = Math.min(map.height, Math.max(a.y, b.y)) - y
  return width >= MIN_PATTERN_SIZE && height >= MIN_PATTERN_SIZE ? { x, y, width, height } : null
}
export function createPattern(assetId: string, rect: PatternRect): PatternFillObject {
  return { kind: 'patternFill', id: crypto.randomUUID(), assetId, ...rect, ...DEFAULT_PATTERN, rotation: 0, scaleX: 1, scaleY: 1 }
}
export function patternNodeTransform(node: NodeTransform): ObjectTransform {
  if (!Object.values(node).every(Number.isFinite) || node.scaleX <= 0 || node.scaleY <= 0) throw new Error('Invalid pattern bounds.')
  const width = Math.max(MIN_PATTERN_SIZE, node.width * node.scaleX), height = Math.max(MIN_PATTERN_SIZE, node.height * node.scaleY)
  return { x: node.x - width / 2, y: node.y - height / 2, width, height, rotation: 0, scaleX: 1, scaleY: 1 }
}
export function objectCapabilities(object?: MapObject) {
  return { rotate: (['place','label','legend','compass'].includes(object?.kind||'') || object?.kind === 'scatter' || object?.kind === 'stamp' || object?.kind === 'path'), flip: (['place','label','legend','compass'].includes(object?.kind||'') || object?.kind === 'scatter' || object?.kind === 'stamp' || object?.kind === 'path'), keepRatio: object?.kind !== 'patternFill' }
}
// One Rect with a native CanvasPattern, never a list of tile nodes. Stretch keeps repeat values intact.
export function patternPaintProps(object: PatternFillObject, image: Size) {
  const repeat = object.mode === 'repeat'
  return {
    width: object.width, height: object.height, opacity: object.opacity,
    fillPatternRepeat: repeat ? 'repeat' : 'no-repeat',
    fillPatternScaleX: repeat ? object.patternScale : object.width / image.width,
    fillPatternScaleY: repeat ? object.patternScale : object.height / image.height,
    fillPatternRotation: object.patternRotation,
    fillPatternX: repeat ? object.patternOffsetX : object.width / 2,
    fillPatternY: repeat ? object.patternOffsetY : object.height / 2,
    fillPatternOffsetX: repeat ? 0 : image.width / 2,
    fillPatternOffsetY: repeat ? 0 : image.height / 2,
  }
}

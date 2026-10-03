import { inGeometryRange } from './documentLimits'
import type { PlacedObject } from './models'

export type ObjectTransform = Pick<PlacedObject, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'scaleX' | 'scaleY'>
// Minimum rendered dimensions in map units, independent of viewport zoom.
export const MIN_OBJECT_SIZE = 8
export const ROTATION_STEP = 15
export const ROTATION_SNAPS = Array.from({ length: 360 / ROTATION_STEP }, (_, index) => index * ROTATION_STEP)
export function normalizeRotation(angle: number): number {
  if (!Number.isFinite(angle)) throw new Error('Rotation must be a finite number.')
  return ((angle % 360) + 360) % 360
}
export function snapRotation(angle: number, shift: boolean): number {
  return normalizeRotation(shift ? Math.round(angle / ROTATION_STEP) * ROTATION_STEP : angle)
}
export function proportionalSize(width: number, height: number, factor: number) {
  if (![width, height, factor].every(Number.isFinite) || width <= 0 || height <= 0 || factor <= 0) throw new Error('Scale must be positive and finite.')
  const bounded = Math.max(factor, MIN_OBJECT_SIZE / width, MIN_OBJECT_SIZE / height)
  return { width: width * bounded, height: height * bounded }
}
export function objectNodeProps(object: ObjectTransform) {
  return { x: object.x + object.width / 2, y: object.y + object.height / 2, width: object.width, height: object.height, offsetX: object.width / 2, offsetY: object.height / 2, rotation: object.rotation, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 }
}
export interface NodeTransform { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }
export function normalizeNodeTransform(original: ObjectTransform, node: NodeTransform, kind: 'move' | 'rotate' | 'resize' = 'resize'): ObjectTransform {
  if (!Object.values(node).every(Number.isFinite) || node.scaleX <= 0 || node.scaleY <= 0) throw new Error('Invalid object transform.')
  // Transformer is proportional; choose one common factor to avoid accumulating ratio drift.
  const size = kind === 'resize' ? proportionalSize(original.width, original.height, node.width * node.scaleX / original.width) : { width: original.width, height: original.height }
  return { ...size, x: node.x - size.width / 2, y: node.y - size.height / 2, rotation: normalizeRotation(node.rotation), scaleX: original.scaleX, scaleY: original.scaleY }
}
export function flipTransform(object: ObjectTransform, axis: 'horizontal' | 'vertical'): ObjectTransform {
  return { ...object, scaleX: axis === 'horizontal' ? -object.scaleX : object.scaleX, scaleY: axis === 'vertical' ? -object.scaleY : object.scaleY }
}
export function validTransform(value: ObjectTransform): boolean {
  return [value.x, value.y, value.width, value.height].every(inGeometryRange) && [value.rotation, value.scaleX, value.scaleY].every(Number.isFinite)
    && value.width > 0 && value.height > 0 && Math.abs(value.scaleX) === 1 && Math.abs(value.scaleY) === 1
}
export function parseNumericProperty(text: string): number | null {
  if (!text.trim()) return null
  const value = Number(text)
  return inGeometryRange(value) ? value : null
}



/** Konva boxes use absolute canvas pixels; convert the map-unit minimum with zoom. */
export function boundTransformBox<T extends { width: number; height: number }>(previous: T, next: T, zoom: number, rotating: boolean): T {
  if (!Number.isFinite(next.width + next.height) || next.width <= 0 || next.height <= 0) return previous
  if (rotating) return next
  return next.width < MIN_OBJECT_SIZE * zoom || next.height < MIN_OBJECT_SIZE * zoom ? previous : next
}


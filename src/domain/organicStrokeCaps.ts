import type { Point } from '../canvas/viewport'

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/** Arc-distance influence, shared by neighbouring samples at either end. */
export function organicCapScales(points: Point[], diameter: number): number[] {
  const distances = [0]
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  }
  const length = distances.at(-1) ?? 0
  if (!length) return points.map(() => 1)
  const strength = smooth(length / (diameter * .12))
  return distances.map(d => 1 - .55 * strength * (1 - smooth(Math.min(d, length - d) / (diameter * .6))))
}

/** Positive affine contraction: retains closed topology and transverse width. */
export function shapeOrganicCap(ring: Point[], center: Point, angle: number, scale: number): Point[] {
  if (scale === 1) return ring
  const x = Math.cos(angle), y = Math.sin(angle)
  return ring.map(p => {
    const longitudinal = ((p.x - center.x) * x + (p.y - center.y) * y) * (scale - 1)
    return { x: p.x + longitudinal * x, y: p.y + longitudinal * y }
  })
}

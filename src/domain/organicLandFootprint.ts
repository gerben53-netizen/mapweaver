import type { Point } from '../canvas/viewport'
import { seededRandom } from './seededRandom'

export type OrganicLandShape = 'organicSoft' | 'organicRugged' | 'organicFine'
export function isOrganicLandShape(shape: string): shape is OrganicLandShape {
  return shape === 'organicSoft' || shape === 'organicRugged' || shape === 'organicFine'
}

/**
 * Broad asymmetry, layered rocky shoulders, or local fine deviations.
 * Mid-frequency shoulders interrupt circular terminal caps. Fine deliberately
 * keeps these bands visible at small diameters rather than adding tiny noise
 * that the existing contour simplifier would discard.
 */
const profiles = {
  organicSoft: { bands: [[1, .10], [2, .24], [3, .16], [5, .035]], drift: .32 },
  organicRugged: { bands: [[1, .08], [2, .17], [3, .15], [5, .095], [8, .045], [13, .018]], drift: .48 },
  organicFine: { bands: [[2, .055], [3, .10], [5, .075], [8, .035]], drift: .25 },
} as const

/** Session seed sequence; geometry, rather than the recipe, is persisted. */
export function nextOrganicLandSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0
}

/**
 * Positive, periodic radial envelope, implicitly closed by the existing polygon engine.
 * World-aligned phases drift smoothly with position, never with dab index, time or
 * pointer-event count. Changing stroke direction cannot rotate adjacent dabs abruptly.
 */
export function organicLandFootprint(
  p: Point, shape: OrganicLandShape, size: number, irregularity: number, softness: number, seed: number,
): Point[] {
  const profile = profiles[shape], count = 72
  const rotation = seededRandom(seed, 0, 7) * Math.PI * 2
  const radii = Array.from({ length: count }, (_, i) => {
    const t = i * Math.PI * 2 / count
    const wave = profile.bands.reduce((sum, [frequency, amplitude], band) => {
      const phase = seededRandom(seed, band, 11) * Math.PI * 2
      const drift = (p.x * Math.cos(phase) + p.y * Math.sin(phase)) / size * profile.drift
      return sum + amplitude * Math.cos(frequency * (t - rotation) + phase + drift)
    }, 0)
    return 1 + wave * irregularity
  })
  const radius = size / 2 * (1 - softness * .5), maximum = Math.max(...radii)
  return radii.map((r, i) => {
    const t = i * Math.PI * 2 / count, d = radius * r / maximum
    return { x: p.x + Math.cos(t) * d, y: p.y + Math.sin(t) * d }
  })
}

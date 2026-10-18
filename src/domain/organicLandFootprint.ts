import type { Point } from '../canvas/viewport'
import { seededRandom } from './seededRandom'

export type OrganicLandShape = 'organicSoft' | 'organicRugged' | 'organicFine'
export function isOrganicLandShape(shape: string): shape is OrganicLandShape {
  return shape === 'organicSoft' || shape === 'organicRugged' || shape === 'organicFine'
}

/** Broad asymmetry, layered rocky shoulders, or restrained fine deviations. */
const profiles = {
  organicSoft: { bands: [[2, .13], [3, .09], [5, .018]], drift: .32 },
  organicRugged: { bands: [[2, .09], [3, .08], [5, .055], [8, .032], [13, .018]], drift: .48 },
  organicFine: { bands: [[2, .025], [5, .025], [9, .012]], drift: .25 },
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

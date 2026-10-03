import type { MapDocument } from './models'
import { isLandMap } from './geography'

export type PhysicalUnit = 'km' | 'mi' | 'm' | 'ft'
export const unitMeters = (unit: PhysicalUnit) => ({ km: 1000, mi: 1609.344, m: 1, ft: .3048 })[unit]
/** Logical geometry only: no viewport, DPR or export multiplier. Never invent a scale. */
export function metersPerPixel(map: Pick<MapDocument, 'width'> & Partial<MapDocument>): number | null {
  const scale = isLandMap(map)
    ? (map.geography ? map.geography.widthKm * 1000 / map.width : NaN)
    : map.grid?.physicalScale ? map.grid.physicalScale.distancePerCell * unitMeters(map.grid.physicalScale.unit) / map.grid.cellSize : NaN
  return Number.isFinite(scale) && scale > 0 ? scale : null
}
export function worldDimension(pixels: number, map: MapDocument) {
  const scale = metersPerPixel(map)
  if (scale === null || !Number.isFinite(pixels)) return null
  const unit = isLandMap(map) ? map.geography!.unit : map.grid.physicalScale!.unit
  return { value: pixels * scale / unitMeters(unit), unit }
}
export const formatSize = (value: number) => value !== 0 && Math.abs(value) < .01 ? Number(value.toPrecision(3)).toString() : Number(value.toFixed(2)).toString()

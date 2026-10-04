import { createArea, validateArea } from './areas'
import type { AreaObject, MapDocument, MapObject } from './models'
import { validateMapContract } from '../campfire/generated/index'
import type { MapCeilingRegionV3 } from '../campfire/generated/index'
export const isCeiling = (object: MapObject): object is AreaObject =>
  object.kind === 'area' && object.ceiling === true

export function createCeiling(points: { x: number; y: number }[], name = 'Ceiling'): AreaObject {
  const area = createArea({ polygons: [{ outer: points, holes: [] }] }, { kind: 'none' })
  return { ...area, ceiling: true, name, strokeWidth: 0 }
}

export function ceilingRegions(objects: MapObject[]): MapCeilingRegionV3[] {
  return objects.filter(isCeiling).map(validateArea).map(object => ({
    id: object.id,
    points: object.geometry.polygons[0].outer.map(point => ({ ...point })),
  })).sort((a, b) => a.id.localeCompare(b.id, 'en'))
}

/** Authoring delegates ceiling coverage semantics to the canonical validator, never a local schema fork. */
export function validateCeilings(objects: MapObject[], map: Pick<MapDocument, 'width' | 'height'>) {
  if (!objects.some(isCeiling)) return
  const checked = validateMapContract({
    format: 'CAMPFIRE_MAPWEAVER', version: 3, mapId: 'validation', revision: 1, name: 'Ceilings',
    dimensions: { pixelWidth: map.width, pixelHeight: map.height },
    grid: { type: 'NONE', sizePx: 50, feetPerCell: 5 },
    image: { path: 'map.png', mimeType: 'image/png' },
    walls: [], doors: [], ceilingRegions: ceilingRegions(objects),
  })
  if (!checked.valid) throw Error('Invalid ceiling: ' + checked.errors.join('; '))
}

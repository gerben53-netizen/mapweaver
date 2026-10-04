import { chooseVariant } from './stampFamilies'
import { assetAvailableForPlacement } from './assetQuality'
import { defaultStampEffects } from './mapEffects'
import { isLandMap } from './geography'
import { metersPerPixel, unitMeters } from './mapScale'
import type { MapDocument } from './models'
import type { PlacedObject, StampAsset } from './models'
import { screenToMap } from '../canvas/viewport'
import type { Point, Size, Viewport } from '../canvas/viewport'

export const MAX_STAMP_MAP_FRACTION = 0.25
export const STAMP_DRAG_TYPE = 'application/x-mapweaver-stamp'
export function dropPoint(client: Point, origin: Point, viewport: Viewport, map: Size): Point | null {
  const point = screenToMap({ x: client.x - origin.x, y: client.y - origin.y }, viewport)
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.y >= 0 && point.x <= map.width && point.y <= map.height ? point : null
}
export function resolvePlacementSize(asset: Pick<StampAsset, 'naturalWidth' | 'naturalHeight' | 'sizing'>, map: Size & Partial<MapDocument>): Size & { reason?: string } {
  const sizing=asset.sizing
  let reason: string | undefined
  if (sizing && sizing.sizingMode !== 'native') {
    const type = map.mapType || 'battlemap', types = sizing.applicableMapTypes ?? (sizing.sizingScope === 'any' ? [] : [sizing.sizingScope])
    let px = 0
    if (sizing.sizingMode==='world'&&!['ft','m'].includes(sizing.sizingUnit||''))reason='Default size has no physical unit; using native size.'
    else if (types.length && !types.includes(type)) reason = 'Default size does not apply to this map type; using native size.'
    else if (sizing.sizingMode === 'grid') { if (!isLandMap(map) && map.grid?.cellSize) px = map.grid.cellSize; else reason = 'This map has no battlemap grid; using native size.' }
    else {
      const scale = metersPerPixel(map)
      if (scale !== null) px = unitMeters(sizing.sizingUnit as 'ft' | 'm') / scale
      else reason = 'Set a physical map scale first; using native size.'
    }
    if (px && (sizing.defaultWidth || sizing.defaultHeight)) {
      const ratio = asset.naturalWidth / asset.naturalHeight, width = (sizing.defaultWidth || sizing.defaultHeight! * ratio) * px
      const height = sizing.aspectRatioLocked || !sizing.defaultHeight ? width / ratio : sizing.defaultHeight * px
      if (![width,height].every(n => Number.isFinite(n) && n > 0 && n <= 1e9)) throw Error('Asset default size exceeds map coordinate limits.')
      return { width, height }
    }
  }
  const scale = Math.min(1, map.width * MAX_STAMP_MAP_FRACTION / asset.naturalWidth, map.height * MAX_STAMP_MAP_FRACTION / asset.naturalHeight)
  return { width: asset.naturalWidth * scale, height: asset.naturalHeight * scale, ...(reason ? { reason } : {}) }
}
export function placementSize(asset: Pick<StampAsset, 'naturalWidth' | 'naturalHeight' | 'sizing'>, map: Size & Partial<MapDocument>): Size { const { width, height } = resolvePlacementSize(asset, map); return { width, height } }
export function createPlacedObject(asset: StampAsset, center: Point, map: Size): PlacedObject {
  if (!assetAvailableForPlacement(asset.quality)) throw Error('Asset is unavailable for new placement.')
  const size = placementSize(asset, map)
  const variant = asset.family ? chooseVariant(asset.family) : null
  return { ...(asset.quality?.softShadowDefault===false?{effects:{...defaultStampEffects(),softShadow:'off' as const}}:{}), kind: 'stamp', id: crypto.randomUUID(), assetId: variant?.assetId || asset.id, ...(variant && asset.family ? { family: { family: asset.family, variantId: variant.id } } : {}), x: center.x - size.width / 2, y: center.y - size.height / 2, ...size, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
}


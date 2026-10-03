import type { StampAsset } from './models'
import type { MapType } from './geography'
export function stampMapCompatible(asset: StampAsset, type: MapType = 'battlemap') {
  const types = asset.sizing?.applicableMapTypes
  return !types?.length || types.includes(type)
}

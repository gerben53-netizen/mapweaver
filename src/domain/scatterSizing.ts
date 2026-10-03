import type { TypedAsset, MapDocument } from './models'
import type { ScatterSource } from './scatter'
import { placementSize } from './placement'
export function scatterSource(asset:TypedAsset,map:MapDocument,weight=1):ScatterSource {
  const size=placementSize(asset,map)
  return {assetId:asset.id,weight,...size}
}

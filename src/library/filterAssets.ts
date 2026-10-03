import type { StampAsset } from '../domain/models'
export function filterAssets(assets: StampAsset[], query: string, categoryId: string): StampAsset[] {
  const term = query.trim().toLocaleLowerCase('en-US')
  return assets.filter((asset) => (!categoryId || asset.categoryId === categoryId) && asset.name.toLocaleLowerCase('en-US').includes(term))
}

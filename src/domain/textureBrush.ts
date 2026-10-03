import type { MapDocument, StampAsset, MapObject, AreaObject } from './models'
import { assetAppliesToMap } from './mapCapabilities'
import { worldDimension } from './mapScale'
export function textureBrushUnits(map:MapDocument){const physical=worldDimension(1,map);return physical??{value:1/map.grid.cellSize,unit:'cells'}}
export function textureBrushMaterial(asset:StampAsset){
  if(asset.kind!=='fillPattern'||!assetAppliesToMap(asset.sizing?.applicableMapTypes,'battlemap'))throw Error('Choose a Battlemap-compatible fill pattern.')
  const scale=asset.patternScale
  return {assetId:asset.id,textureId:undefined,textureScale:typeof scale==='number'&&Number.isFinite(scale)&&scale>=.01&&scale<=100?scale:1}
}
export const textureFloors=(objects:MapObject[]):AreaObject[]=>objects.filter((o):o is AreaObject=>o.kind==='area'&&o.fill.kind!=='none')

/** Passive image effects may finish while a newer material choice is already ready. */
export function mergeTextureImages<T>(previous:ReadonlyMap<string,T>,loaded:readonly (readonly [string,T])[],required:readonly string[]){const images=new Map([...previous,...loaded]);return new Map([...new Set(required)].flatMap(id=>images.has(id)?[[id,images.get(id)!] as const]:[]))}

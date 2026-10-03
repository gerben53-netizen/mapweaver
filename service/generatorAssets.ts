import { ACTIVE_ASSET_SQL } from '../src/domain/assetQuality'
import { findGeneratorAssets, validateGeneratorQuery, SEMANTIC_TYPES } from '../src/domain/generatorAssets'
import { publicAsset, libraryRevision } from './library'
import type { LibraryAsset } from './library'
import type { Storage } from './storage'
export function queryGeneratorAssets(s:Storage,input:unknown) {
  const q=validateGeneratorQuery(input)
  const rows=s.db.prepare(`SELECT * FROM assets WHERE generator IS NOT NULL AND deletedAt IS NULL AND ${ACTIVE_ASSET_SQL} AND type='stamp' AND json_extract(generator,'$.semanticType')=? ORDER BY id LIMIT 10001`).all(q.semanticType) as LibraryAsset[]
  if(rows.length>10000)throw Error('Generator queries support at most 10,000 assets per semantic type. Narrow the library before generating.')
  const assets=rows.map(row=>{const a=publicAsset(row);return {id:a.id,type:a.type,name:a.name,width:a.width,height:a.height,generator:a.generator,defaultSize:a.defaultSize,applicableMapTypes:a.applicableMapTypes}})
  return {revision:libraryRevision(s),...findGeneratorAssets(assets,q)}
}
export function generatorAssetReadiness(s:Storage) {
  return {revision:libraryRevision(s),families:SEMANTIC_TYPES.map(semanticType=>({semanticType,count:queryGeneratorAssets(s,{semanticType,mapType:'world-map'}).candidates.length}))}
}

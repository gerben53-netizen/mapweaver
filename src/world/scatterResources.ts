import { api } from '../storage/api'
import { libraryRepository } from '../storage/libraryRepository'
import { SEMANTIC_TYPES } from '../domain/generatorAssets'
import type { WorldScatterAsset } from './scatterModel'
import { WORLD_SCATTER_LIMITS } from './scatterModel'
import type { WorldResult } from './model'
import { PROJECT_LIMITS } from '../projects/limits'
/** Read-only snapshot; never installs assets into the current project during preview. */
export async function loadWorldScatterAssets(mapType:import('../domain/geography').MapType='world-map'):Promise<WorldScatterAsset[]> {
 const pages=await Promise.all(SEMANTIC_TYPES.map(semanticType=>api<{revision:number;candidates:WorldScatterAsset[]}>('/library/generator-query','POST',{semanticType,mapType})))
 if(new Set(pages.map(p=>p.revision)).size!==1)throw Error('Asset library changed while preparing generation. Retry preview.')
 const assets=pages.flatMap(p=>p.candidates)
 if(assets.length>WORLD_SCATTER_LIMITS.assets)throw Error('World generation supports at most 10,000 semantic assets.')
 return assets
}
export async function prepareWorldResources(result:WorldResult,current:()=>boolean=()=>true):Promise<WorldResult> {
 const ids=[...new Set(result.objects.flatMap(o=>o.kind==='stamp'?[o.assetId]:[]))]
 if(ids.length>WORLD_SCATTER_LIMITS.sources)throw Error('Too many world generator image sources.')
 let pixels=0,bytes=0
 const assets:NonNullable<WorldResult['assets']>=[]
 // Sequential loads bound transient memory and stop before decoding oversized libraries.
 for(const id of ids){if(!current())throw Error('Preview cancelled.');const a=await libraryRepository.getAsset(id);if(!a||a.kind!=='stamp')throw Error('A generated stamp is no longer available. Retry preview.');pixels+=a.naturalWidth*a.naturalHeight;if(pixels>PROJECT_LIMITS.pixels)throw Error('Generated sources exceed the project image budget.');const blob=await libraryRepository.getBlob(id);bytes+=blob.size;if(bytes>PROJECT_LIMITS.unpacked-PROJECT_LIMITS.json)throw Error('Generated sources exceed the project file budget.');assets.push({blob,manifest:{id,kind:'stamp',fileName:a.name,mimeType:a.mimeType,width:a.naturalWidth,height:a.naturalHeight,hash:a.contentHash,path:`assets/${id}.${a.mimeType==='image/png'?'png':a.mimeType==='image/jpeg'?'jpg':'webp'}`}})}
 return {...result,assets}
}

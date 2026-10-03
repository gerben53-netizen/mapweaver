import { parseAssetManifest } from '../domain/assetManifest'
import type { IllustratedCandidate } from '../domain/illustratedMarkers'
import { adoptLibraryAsset, projectAssets, useAssetContext } from '../projects/assets'
import { api, uploadAsset } from '../storage/api'
import { libraryRepository } from '../storage/libraryRepository'
import { toAsset } from '../storage/remoteLibrary'
import { acquireAssetImage } from '../images/imageCache'

let catalog:Promise<IllustratedCandidate[]>|undefined
export function loadBundledMarkers() {
 return catalog??=fetch('/settlement-assets-painterly/catalog.json').then(async r=>{
  if(!r.ok)throw Error('Bundled illustrations are unavailable.')
  const raw=await r.json() as {manifest:unknown;dimensions:Record<string,{width:number;height:number}>},parsed=parseAssetManifest(raw.manifest)
  return parsed.manifest.assets.map(a=>{
   const d=raw.dimensions[a.file]
   if(!d||!Number.isSafeInteger(d.width)||!Number.isSafeInteger(d.height)||d.width<1||d.height<1||d.width*d.height>4e6||!a.sha256||a.type!=='stamp')throw Error('Invalid bundled illustration catalog.')
   return {id:'settlement-'+a.sha256.slice(0,48),name:a.title??a.file,tags:a.tags??[],applicableMapTypes:a.applicableMapTypes??[],width:d.width,height:d.height,source:'bundled' as const,defaultSize:a.defaultSize,file:a.file,sha256:a.sha256}
  })
 }).catch(e=>{catalog=undefined;throw e})
}
export async function prepareMarkerAsset(candidate:IllustratedCandidate) {
 const generation=useAssetContext.getState().generation
 let asset
 if(candidate.source==='project')asset=projectAssets().find(a=>a.id===candidate.id)
 else if(candidate.source==='library')asset=await libraryRepository.getAsset(candidate.id)
 else {
  const trusted=(await loadBundledMarkers()).find(a=>a.id===candidate.id)
  if(!trusted)throw Error('Choose an available bundled illustration.')
  const response=await fetch('/settlement-assets-painterly/'+trusted.file)
  if(!response.ok)throw Error('Illustration file is unavailable.')
  const bytes=await response.arrayBuffer()
  if(bytes.byteLength>8*1024*1024)throw Error('Illustration is too large.')
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('')
  if(digest!==trusted.sha256)throw Error('Illustration checksum differs from its catalog.')
  const uploaded=await uploadAsset(new Blob([bytes],{type:'image/png'}),'stamp',trusted.name,trusted.file!.split('/').at(-1)!)
  if(uploaded.added){const {revision}=await api<{revision:number}>('/library?limit=1');await api('/library/command','POST',{op:'metadata',revision,ids:[uploaded.asset.id],patch:{tags:trusted.tags,applicableMapTypes:trusted.applicableMapTypes,defaultSize:trusted.defaultSize}})}
  asset=toAsset(uploaded.asset)
 }
 if(generation!==useAssetContext.getState().generation)throw Error('Project changed. Choose the illustration again.')
 if(!asset||asset.kind!=='stamp')throw Error('Choose an available stamp illustration.')
 if(candidate.source!=='project')asset=await adoptLibraryAsset(asset)
 const lease=acquireAssetImage(asset.id,'stamp')
 try{await lease.promise;if(generation!==useAssetContext.getState().generation)throw Error('Project changed. Choose the illustration again.');return {id:asset.id,aspect:asset.naturalWidth/asset.naturalHeight}}
 finally{lease.release()}
}

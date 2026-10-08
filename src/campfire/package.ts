import { effectiveRendering } from '../domain/rendering'
import type { ArlMode } from '../store/arlStore'
import { assertCurrent, type RenderRequest } from '../export/renderCache'
import { zipSync,strToU8 } from 'fflate'
import type { CampfireMapContract } from './generated/index'
import { validateMapContract } from './generated/index'
import { serializeCampfire,CampfireExportError } from './serialize'
import type { ProjectSnapshot } from '../store/history'
export async function packageCampfire(payload:CampfireMapContract,image:Blob):Promise<Blob>{
 const checked=validateMapContract(payload);if(!checked.valid)throw new CampfireExportError(checked.errors)
 if(payload.image.path!=='map.png'||payload.image.mimeType!=='image/png')throw Error('This package requires the serializer’s local map.png reference.')
 const bytes=new Uint8Array(await image.arrayBuffer())
 // Inspect the encoded header before creating a complete, atomic download.
 const {encodedDimensions}=await import('../imports/readImage');const dimensions=encodedDimensions(bytes,'image/png')
 if(dimensions.width!==payload.dimensions.pixelWidth||dimensions.height!==payload.dimensions.pixelHeight)throw Error('Campfire image dimensions differ from the contract.')
 const mtime=new Date('2000-01-01T00:00:00Z')
 return new Blob([new Uint8Array(zipSync({'map.json':[strToU8(JSON.stringify(payload,null,2)+'\n'),{mtime}],'map.png':[bytes,{level:0,mtime}]},{level:6}))],{type:'application/zip'})
}
export async function prepareCampfire(project:ProjectSnapshot,info:{id:string;name:string},version:1|2|3=3,arlMode?:ArlMode,request:RenderRequest={}){
 assertCurrent(request)
 const captured=structuredClone(project),payload=serializeCampfire(captured,info,version)
 // Runtime/default illumination is semantic only. Door artwork uses the runtime's initial closed pose.
 captured.objects=captured.objects.map(o=>o.kind==='door'?{...o,status:'closed'}:o)
 const {exportPng}=await import('../export/render')
 const image=await exportPng(captured,{scale:1,includeGrid:false,transparent:false,includeScaleBar:false,arlMode:arlMode??effectiveRendering(captured.map).arl},undefined,{...request,mapId:info.id})
 assertCurrent(request)
 return {payload,image}
}

export async function exportCampfire(project:ProjectSnapshot,info:{id:string;name:string},arlMode?:ArlMode,request:RenderRequest={}){const {payload,image}=await prepareCampfire(project,info,3,arlMode,request);const output=await packageCampfire(payload,image);assertCurrent(request);return output}

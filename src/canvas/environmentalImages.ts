import { ENVIRONMENTAL_PRODUCTION } from '../domain/environmentalProduction'
import type { EnvironmentalDetail } from '../domain/environmentalDetail'
const images=new Map<string,HTMLCanvasElement>(),pending=new Map<string,Promise<void>>()
export const environmentalImage=(id:string)=>images.get(id)
export function loadEnvironmentalImages(data?:EnvironmentalDetail){
  const ids=new Set(data?.strokes.filter(s=>s.revision==='production-1'&&s.brush.action==='paint').map(s=>s.brush.presetId))
  return Promise.all(ENVIRONMENTAL_PRODUCTION.components.filter(c=>ids.has(c.familyId)).map(c=>{
    let job=pending.get(c.id);if(!job){job=(async()=>{const response=await fetch(`/environmental-detail/production-1/${c.filename}`);if(!response.ok)throw Error(`Environmental artwork unavailable: ${c.id}`);const bytes=await response.arrayBuffer();if(bytes.byteLength!==c.byteLength)throw Error('Environmental artwork byte length mismatch.');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==c.sha256)throw Error('Environmental artwork integrity check failed.');const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));try{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth!==c.pixelWidth||image.naturalHeight!==c.pixelHeight)throw Error('Environmental artwork dimensions mismatch.');const source=document.createElement('canvas');source.width=c.pixelWidth;source.height=c.pixelHeight;const context=source.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0);context.putImageData(context.getImageData(0,0,source.width,source.height),0,0);images.set(c.id,source)}finally{URL.revokeObjectURL(url)}})().catch(error=>{pending.delete(c.id);throw error});pending.set(c.id,job)}return job
  }))
}

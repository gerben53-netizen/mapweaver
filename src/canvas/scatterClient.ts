import type { ScatterObject } from '../domain/scatter'
export function generateScatterAsync(object:ScatterObject,signal?:AbortSignal):Promise<ScatterObject>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('Scatter cancelled.'));return}
    const worker=new Worker(new URL('./scatter.worker.ts',import.meta.url),{type:'module'})
    const done=()=>{clearTimeout(timer);worker.terminate();signal?.removeEventListener('abort',cancel)}
    const cancel=()=>{done();reject(new Error('Scatter cancelled.'))}
    const timer=setTimeout(()=>{done();reject(new Error('Scatter generation timed out. Reduce density or split the region.'))},5000)
    signal?.addEventListener('abort',cancel,{once:true})
    worker.onmessage=event=>{done();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.object)}
    worker.onerror=()=>{done();reject(new Error('Scatter worker failed. Your map is unchanged.'))}
    worker.postMessage(object)
  })
}

import { LAND_BRUSH_LIMITS, type LandBrushInput, type LandBrushResult } from '../domain/landBrush'
export function calculateLandStroke(input:LandBrushInput,signal:AbortSignal):Promise<LandBrushResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./landBrush.worker.ts',import.meta.url),{type:'module'})
  const stop=()=>{clearTimeout(timer);worker.terminate();signal.removeEventListener('abort',cancel)}
  const fail=(error:Error)=>{stop();reject(error)}
  const cancel=()=>fail(new DOMException('Land stroke cancelled.','AbortError'))
  const timer=setTimeout(()=>fail(Error('Land calculation timed out. Use a shorter stroke.')),LAND_BRUSH_LIMITS.timeout)
  worker.onmessage=(event:MessageEvent<{result?:LandBrushResult;error?:string}>)=>{stop();if(event.data.result)resolve(event.data.result);else reject(Error(event.data.error||'Invalid land result.'))}
  worker.onerror=()=>fail(Error('Unable to calculate this land stroke.'))
  signal.addEventListener('abort',cancel,{once:true});if(signal.aborted){cancel();return}worker.postMessage(input)
 })
}

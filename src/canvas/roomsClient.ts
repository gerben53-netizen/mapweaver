import type { MapObject } from '../domain/models'
import type { RoomDetection } from '../domain/rooms'
import { ROOM_LIMITS } from '../domain/rooms'
export function detectRoomsInWorker(objects:MapObject[],signal:AbortSignal):Promise<RoomDetection>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./rooms.worker.ts',import.meta.url),{type:'module'})
    const done=()=>{clearTimeout(timer);worker.terminate();signal.removeEventListener('abort',abort)}
    const abort=()=>{done();reject(new Error('Room detection cancelled.'))}
    const timer=setTimeout(()=>{done();reject(new Error('Room detection exceeded 1.5 seconds. Simplify walls or hide unrelated layers.'))},ROOM_LIMITS.timeoutMs)
    worker.onmessage=e=>{done();if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.result)}
    worker.onerror=()=>{done();reject(new Error('Room detection failed. The map was not changed.'))}
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return}worker.postMessage(objects)
  })
}

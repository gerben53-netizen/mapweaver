import { afterEach, expect, it, vi } from 'vitest'
import { calculateLandStroke } from './landBrushClient'
import { defaultLandBrush, LAND_BRUSH_LIMITS } from '../domain/landBrush'
const input={lands:[],editable:[],map:{width:800,height:600},brush:defaultLandBrush,points:[{x:100,y:100}],seed:1,newId:'land'}
class WorkerStub {
 static last:WorkerStub
 terminate=vi.fn();postMessage=vi.fn();onmessage:((e:MessageEvent)=>void)|null=null;onerror:(()=>void)|null=null
 constructor(){WorkerStub.last=this}
}
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
it('returns calculated contours and always terminates the worker',async()=>{
 vi.stubGlobal('Worker',WorkerStub);const promise=calculateLandStroke(input,new AbortController().signal),result={added:[],replacements:[],removed:[]}
 WorkerStub.last.onmessage!(new MessageEvent('message',{data:{result}}));expect(await promise).toEqual(result);expect(WorkerStub.last.terminate).toHaveBeenCalledOnce()
})
it('cancels without publishing partial contours',async()=>{
 vi.stubGlobal('Worker',WorkerStub);const c=new AbortController(),promise=calculateLandStroke(input,c.signal);c.abort();await expect(promise).rejects.toMatchObject({name:'AbortError'});expect(WorkerStub.last.terminate).toHaveBeenCalledOnce()
})
it('bounds calculation time and surfaces topology failures',async()=>{
 vi.useFakeTimers();vi.stubGlobal('Worker',WorkerStub)
 const promise=calculateLandStroke(input,new AbortController().signal),check=expect(promise).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(LAND_BRUSH_LIMITS.timeout);await check;expect(WorkerStub.last.terminate).toHaveBeenCalledOnce()
 const failed=calculateLandStroke(input,new AbortController().signal);WorkerStub.last.onmessage!(new MessageEvent('message',{data:{error:'Invalid coast'}}));await expect(failed).rejects.toThrow('Invalid coast')
})

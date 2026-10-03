import { afterEach,expect,it,vi } from 'vitest'
import { generateScatterAsync } from './scatterClient'
import { createScatter } from '../domain/scatter'
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
it('terminates generation on cancellation or deadline without committing anything',async()=>{
  vi.useFakeTimers();const terminate=vi.fn();vi.stubGlobal('Worker',class{terminate=terminate;postMessage=vi.fn()})
  const input=createScatter([{assetId:'a',weight:1,width:10,height:10}]),result=expect(generateScatterAsync(input)).rejects.toThrow(/timed out/);await vi.advanceTimersByTimeAsync(5000);await result
  const c=new AbortController(),cancelled=expect(generateScatterAsync(input,c.signal)).rejects.toThrow(/cancelled/);c.abort();await cancelled;expect(terminate).toHaveBeenCalledTimes(2);expect(input.instances).toEqual([])
})

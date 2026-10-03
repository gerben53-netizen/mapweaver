import { afterEach, expect, it, vi } from 'vitest'
import { combineInWorker } from './areaBooleanClient'
import { AREA_LIMITS, rectangleGeometry } from '../domain/areas'
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it('terminates an unresponsive clipping worker at the deadline and retains the input', async () => {
  vi.useFakeTimers()
  const terminate=vi.fn(),postMessage=vi.fn()
  vi.stubGlobal('Worker',class {terminate=terminate;postMessage=postMessage})
  const inputs=[rectangleGeometry({x:0,y:0,width:100,height:100}),rectangleGeometry({x:50,y:50,width:100,height:100})],before=structuredClone(inputs)
  const result=expect(combineInWorker('union',inputs)).rejects.toThrow('time limit')
  await vi.advanceTimersByTimeAsync(AREA_LIMITS.timeoutMs);await result
  expect(terminate).toHaveBeenCalledOnce();expect(inputs).toEqual(before)
})

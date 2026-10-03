import { afterEach, expect, it, vi } from 'vitest'
import { detectRoomsInWorker } from './roomsClient'
import { ROOM_LIMITS } from '../domain/rooms'
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
it('terminates detection on deadline and explicit cancellation without modifying inputs',async()=>{
  vi.useFakeTimers();const terminate=vi.fn();vi.stubGlobal('Worker',class{terminate=terminate;postMessage=vi.fn()})
  const result=expect(detectRoomsInWorker([],new AbortController().signal)).rejects.toThrow(/1.5 seconds/);await vi.advanceTimersByTimeAsync(ROOM_LIMITS.timeoutMs);await result;expect(terminate).toHaveBeenCalledOnce()
  const abort=new AbortController(),cancelled=expect(detectRoomsInWorker([],abort.signal)).rejects.toThrow(/cancelled/);abort.abort();await cancelled;expect(terminate).toHaveBeenCalledTimes(2)
})

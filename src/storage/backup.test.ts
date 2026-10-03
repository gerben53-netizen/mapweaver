// @vitest-environment node
import { afterEach,expect,it,vi } from 'vitest'
import { backUpAllData } from './api'
afterEach(()=>vi.unstubAllGlobals())
it('asks for a destination before requesting the snapshot and closes a successful write',async()=>{
  const order:string[]=[],write=vi.fn(async()=>{order.push('write')}),close=vi.fn(async()=>{order.push('close')})
  vi.stubGlobal('window',{showSaveFilePicker:async()=>{order.push('choose');return{createWritable:async()=>({write,close,abort:vi.fn()})}}})
  vi.stubGlobal('fetch',async(url:string)=>{if(url.endsWith('/health'))return Response.json({generation:'test'});if(url.endsWith('/backups')){order.push('snapshot');return Response.json({id:'test',state:'complete'})}if(!url.endsWith('/download'))return Response.json({id:'test',state:'complete'});return new Response(new Blob(['verified backup']))})
  await backUpAllData();expect(order).toEqual(['choose','snapshot','write','close']);expect(write).toHaveBeenCalledTimes(1)
})
it('does not request a snapshot when choosing the destination is cancelled',async()=>{
  vi.stubGlobal('window',{showSaveFilePicker:async()=>{throw new DOMException('Cancelled','AbortError')}});const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
  await expect(backUpAllData()).rejects.toThrow('Cancelled');expect(fetch).not.toHaveBeenCalled()
})
it('aborts a failed destination write and never reports completion',async()=>{
  const abort=vi.fn(async()=>{}),close=vi.fn()
  vi.stubGlobal('window',{showSaveFilePicker:async()=>({createWritable:async()=>({write:async()=>{throw new Error('Disk full')},close,abort})})})
  vi.stubGlobal('fetch',async(url:string)=>url.endsWith('/download')?new Response(new Blob(['backup'])):Response.json({id:'test',state:'complete',generation:'test'}))
  await expect(backUpAllData()).rejects.toThrow('Disk full');expect(abort).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled()
})

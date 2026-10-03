import { afterEach, expect, it, vi } from 'vitest'
import { acquireImage } from './imageCache'
afterEach(() => vi.unstubAllGlobals())
function setup() {
  const create = vi.fn(() => 'blob:test')
  const revoke = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
  vi.stubGlobal('Image', class { src = ''; decode() { return Promise.resolve() } })
  return { create, revoke }
}
it('shares a decoded image and revokes its URL only after the final release', async () => {
  const { create, revoke } = setup()
  const load = vi.fn(async () => new Blob(['image']))
  const a = acquireImage('shared', load), b = acquireImage('shared', load)
  expect(await a.promise).toBe(await b.promise)
  expect(load).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledOnce()
  a.release(); expect(revoke).not.toHaveBeenCalled()
  b.release(); b.release(); expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:test')
})
it('cleans up a URL even when released before the blob finishes loading', async () => {
  const { revoke } = setup()
  let resolve!: (blob: Blob) => void
  const lease = acquireImage('pending', () => new Promise<Blob>((done) => { resolve = done }))
  lease.release(); resolve(new Blob(['image']))
  await lease.promise
  expect(revoke).toHaveBeenCalledOnce()
})
it('reports decoding failure and frees the failed image URL', async () => {
  const { revoke } = setup()
  vi.stubGlobal('Image', class { src = ''; decode() { return Promise.reject(new Error('broken')) } })
  const lease = acquireImage('broken', async () => new Blob(['bad']))
  await expect(lease.promise).rejects.toThrow(/unreadable/)
  expect(revoke).toHaveBeenCalledOnce()
  lease.release(); expect(revoke).toHaveBeenCalledOnce()
})


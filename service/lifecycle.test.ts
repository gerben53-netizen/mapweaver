import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Lifecycle } from './lifecycle'
import { createApp } from './app'
import { lifecycleLog } from './lifecycleLog'

const directories: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
afterEach(async () => { for (const { app } of apps.splice(0)) await app.close(); for (const root of directories.splice(0)) { if (!root.startsWith(path.join(os.tmpdir(), 'mapweaver-lifecycle-'))) throw new Error('Unsafe cleanup'); rmSync(root, { recursive: true, force: true }) } })
async function setup() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'mapweaver-lifecycle-')); directories.push(directory)
  const service = await createApp({ directory, instanceId: randomUUID(), controlToken: 'test-only', shutdown: () => {} }); apps.push(service)
  const h = (await service.app.inject({ url: '/api/v1/health', headers: { host: '127.0.0.1:47831' } })).json()
  const headers = { host: '127.0.0.1:47831', 'x-mapweaver': '1', 'x-mapweaver-generation': h.generation, 'x-mapweaver-instance': h.instanceId, 'x-mapweaver-control': 'test-only' }
  return { ...service, headers, directory }
}
describe('shutdown barrier', () => {
  it('waits for writes, work and explicit browser flush before closing', () => {
    const lifecycle = new Lifecycle(), id = randomUUID(); lifecycle.register(id); lifecycle.request()
    lifecycle.advance([], 1); expect(lifecycle.phase).toBe('stopping-requested')
    lifecycle.advance([{ kind: 'restore', cancellable: false }], 0); expect(lifecycle.phase).toBe('stopping-requested')
    lifecycle.advance([], 0); expect(lifecycle.phase).toBe('flushing'); expect(lifecycle.canFlush(id)).toBe(true)
    lifecycle.advance([], 0); expect(lifecycle.phase).toBe('flushing')
    lifecycle.ack(id, lifecycle.ticket); expect(lifecycle.canFlush(id)).toBe(false)
    lifecycle.advance([], 0); expect(lifecycle.phase).toBe('closing')
  })
  it('never expires an unresponsive tab or kills a writer on timeout', () => {
    let time = 0; const lifecycle = new Lifecycle(() => time); lifecycle.register(randomUUID()); lifecycle.request(); time = 120001
    lifecycle.advance([], 0); expect(lifecycle.phase).toBe('error'); expect(lifecycle.clients.size).toBe(1)
    lifecycle.cancel(); expect(lifecycle.phase).toBe('running')
  })
  it('rejects old acknowledgement tickets and new clients during shutdown', () => {
    const lifecycle = new Lifecycle(), id = randomUUID(); lifecycle.register(id); lifecycle.request(); const old = lifecycle.ticket
    lifecycle.cancel(); lifecycle.request(); lifecycle.advance([], 0)
    expect(() => lifecycle.ack(id, old)).toThrow(); expect(() => lifecycle.register(randomUUID())).toThrow()
  })
  it('keeps the decision dialog authoritative even when work finishes while it is open', () => {
    const lifecycle = new Lifecycle(); lifecycle.request(); lifecycle.hold = true
    lifecycle.advance([], 0); expect(lifecycle.phase).toBe('stopping-requested')
    lifecycle.cancel(); expect(lifecycle.phase).toBe('running'); expect(lifecycle.hold).toBe(false)
    lifecycle.request(); lifecycle.advance([], 0); lifecycle.advance([], 0); expect(lifecycle.phase).toBe('closing')
  })
  it('protects control from foreign origins, unknown sessions, tokens and old instances', async () => {
    const { app, headers } = await setup()
    const control = (extra: Record<string, string>) => app.inject({ method: 'POST', url: '/api/v1/lifecycle/control', headers: { ...headers, ...extra }, payload: { action: 'stop' } })
    expect((await control({ origin: 'https://evil.example' })).statusCode).toBe(403)
    expect((await control({ 'x-mapweaver-control': 'wrong' })).statusCode).toBe(403)
    expect((await control({ 'x-mapweaver-instance': 'previous' })).statusCode).toBe(409)
    expect((await app.inject({ method: 'POST', url: '/api/v1/stop', headers })).statusCode).toBe(403)
  })
  it('blocks new work, keeps flush writes available only to unacknowledged sessions', async () => {
    const { app, headers, lifecycle } = await setup(), id = randomUUID()
    await app.inject({ method: 'POST', url: '/api/v1/lifecycle/client', headers, payload: { id } })
    await app.inject({ method: 'POST', url: '/api/v1/stop', headers: { ...headers, 'x-mapweaver-client': id } })
    expect((await app.inject({ method: 'POST', url: '/api/v1/backups', headers })).statusCode).toBe(409)
    lifecycle.advance([], 0)
    const flush = () => app.inject({ method: 'PUT', url: '/api/v1/projects/missing', headers: { ...headers, 'x-mapweaver-client': id }, payload: { revision: 1, document: {} } })
    expect((await flush()).json().code).not.toBe('STOPPING')
    lifecycle.ack(id, lifecycle.ticket)
    expect((await flush()).json().code).toBe('STOPPING')
  })
  it('does not allow cancellation of an atomic restore', async () => {
    const { jobs } = await setup(); const job = jobs.create('restore'); job.progress.phase = 'Replacing dataset — do not close Mapweaver'
    expect(() => jobs.cancel(job.id)).toThrow('Wait for completion'); expect(job.controller.signal.aborted).toBe(false)
    job.state = 'complete'
  })
  it('browser Stop remains available during maintenance and query strings cannot bypass the drain gate', async () => {
    const { app, headers, jobs } = await setup(), id = randomUUID()
    await app.inject({ method: 'POST', url: '/api/v1/lifecycle/client', headers, payload: { id } })
    jobs.maintenance = true
    const response = await app.inject({ method: 'POST', url: '/api/v1/stop', headers: { ...headers, 'x-mapweaver-client': id }, payload: {} })
    expect(response.statusCode).toBe(200)
    expect((await app.inject({ url: '/api/v1/projects/missing/export?extra=1', headers })).json().code).toBe('STOPPING')
    jobs.maintenance = false
  })
  it('safely cancels staged restore and an abortable backup', async () => {
    const { jobs } = await setup(); const first = jobs.create('restore'); first.state = 'ready'; jobs.cancel(first.id); expect(first.state).toBe('cancelled')
    const backup = jobs.create('backup'); jobs.cancel(backup.id); expect(backup.controller.signal.aborted).toBe(true); backup.state = 'cancelled'
  })
  it('includes only allowlisted lifecycle events in diagnostic logs', async () => {
    const { directory } = await setup(), log = lifecycleLog(directory)
    log.event('stop-requested'); log.event('C:\\private\\project-name')
    expect(log.read().some(v => v.event === 'stop-requested')).toBe(true)
    expect(JSON.stringify(log.read())).not.toContain('private')
  })
  it('requires timeout and explicit consent to release browser waits, never bypasses active work', async () => {
    const { app, headers, lifecycle, jobs } = await setup(), id = randomUUID()
    lifecycle.register(id)
    const release = (confirmed: boolean) => app.inject({ method: 'POST', url: '/api/v1/lifecycle/control', headers, payload: { action: 'release-tabs', confirmed } })
    expect((await release(true)).statusCode).toBe(409)
    lifecycle.phase = 'error'
    expect((await release(false)).statusCode).toBe(409)
    const job = jobs.create('backup')
    expect((await release(true)).statusCode).toBe(409); expect(lifecycle.clients.has(id)).toBe(true)
    job.state = 'complete'
    expect((await release(true)).statusCode).toBe(200); expect(lifecycle.clients.size).toBe(0)
  })
})

import { randomUUID } from 'node:crypto'
import { StorageError } from './storage'

export type Phase = 'running' | 'stopping-requested' | 'flushing' | 'closing' | 'error'
export interface Work { kind: string; cancellable: boolean }
/** No client expires during a stop: a suspended dirty tab must never be assumed saved. */
export class Lifecycle {
  phase: Phase = 'running'
  hold = false
  ticket = ''
  deadline = 0
  clients = new Map<string, string>()
  busyClients = new Set<string>()
  constructor(readonly now = Date.now) {}
  register(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new StorageError('INVALID_CLIENT', 'Invalid browser session.')
    if (!this.clients.has(id)) {
      if (this.phase !== 'running') throw new StorageError('STOPPING', 'Mapweaver is stopping.', 409)
      if (this.clients.size >= 128) throw new StorageError('CLIENT_LIMIT', 'Close unused Mapweaver tabs.', 409)
      this.clients.set(id, '')
    }
  }
  request() {
    if (this.phase === 'running' || this.phase === 'error') {
      this.phase = 'stopping-requested'; this.ticket = randomUUID(); this.deadline = this.now() + 120_000
    }
  }
  cancel() { if (this.phase !== 'closing') { this.phase = 'running'; this.ticket = ''; this.hold = false } }
  ack(id: string, ticket: string) {
    if (this.phase !== 'flushing' || ticket !== this.ticket || !this.clients.has(id)) throw new StorageError('STALE_STOP', 'Shutdown session changed.', 409)
    this.clients.set(id, ticket)
  }
  advance(work: Work[], requests: number) {
    if (this.phase === 'running' || this.phase === 'closing' || this.phase === 'error') return
    if (this.now() > this.deadline) { this.phase = 'error'; this.hold = false; return }
    if (this.hold || work.length || requests) return
    if (this.phase === 'stopping-requested') this.phase = 'flushing'
    else if ([...this.clients.values()].every(t => t === this.ticket)) this.phase = 'closing'
  }
  canFlush(id: string) { return this.phase === 'flushing' && this.clients.has(id) && this.clients.get(id) !== this.ticket }
  view(work: Work[] = []) { return { phase: this.phase, hold: this.hold, ticket: this.ticket, clients: this.clients.size, waiting: [...this.clients.values()].filter(t => t !== this.ticket).length, work } }
}

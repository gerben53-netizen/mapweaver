import { effectiveRendering } from '../domain/rendering'
import type { ProjectSnapshot } from '../store/history'
import type { ExportOptions } from './scene'

export interface RenderRequest {
  mapId?: string
  /** Checked before work, at cooperative checkpoints and before publication. */
  isCurrent?: () => boolean
  onProgress?: (message: string) => void
}
export class StaleRenderError extends Error {
  constructor() { super('De kaart of assets zijn gewijzigd. Maak opnieuw een voorbeeld of export.'); this.name = 'StaleRenderError' }
}
export function assertCurrent(request: RenderRequest) { if (request.isCurrent && !request.isCurrent()) throw new StaleRenderError() }
export function renderKey(project: ProjectSnapshot, options: ExportOptions, generation: number, mapId = '') {
  // Complete canonical snapshot deliberately favors safe invalidation over
  // clever partial keys. Camera, selection and tools are not in this snapshot.
  return JSON.stringify([mapId, generation, project, [options.arlMode ?? effectiveRendering(project.map).arl, options.scale, options.includeGrid, options.transparent, !!options.includeScaleBar]])
}
/** Encoded outputs only: no retained decoded full-map canvases. Serial work
 * bounds transient memory; shared wall/tile caches remain independently bounded. */
export class RenderCache {
  private outputs = new Map<string, Blob>()
  private bytes = 0
  private epoch = 0
  private queue: Promise<unknown> = Promise.resolve()
  readonly metrics = { hits: 0, misses: 0, stale: 0 }
  constructor(private readonly budget = 32 * 1024 * 1024, private readonly entries = 4) {}
  clear() { this.epoch++; this.outputs.clear(); this.bytes = 0 }
  stats() { return { ...this.metrics, entries: this.outputs.size, bytes: this.bytes } }
  async get(key: string, request: RenderRequest, produce: (check: () => void) => Promise<Blob>): Promise<Blob> {
    const epoch = this.epoch
    const check = () => { if (epoch !== this.epoch) throw new StaleRenderError(); assertCurrent(request) }
    const run = async () => {
      check()
      const old = this.outputs.get(key)
      if (old) { this.metrics.hits++; this.outputs.delete(key); this.outputs.set(key, old); return old }
      this.metrics.misses++
      request.onProgress?.('Hoogwaardig voorbeeld wordt opgebouwd…')
      const result = await produce(check)
      check()
      const retainedBytes = result.size + key.length * 2
      if (retainedBytes <= this.budget) {
        while (this.outputs.size && (this.outputs.size >= this.entries || this.bytes + retainedBytes > this.budget)) {
          const [id, value] = this.outputs.entries().next().value!; this.outputs.delete(id); this.bytes -= value.size + id.length * 2
        }
        this.outputs.set(key, result); this.bytes += retainedBytes
      }
      return result
    }
    const task = this.queue.then(run, run)
    this.queue = task.catch(() => {})
    try { return await task } catch (error) { if (error instanceof StaleRenderError) this.metrics.stale++; throw error }
  }
}
export const highQualityCache = new RenderCache()

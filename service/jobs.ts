import { lifecycleLog } from './lifecycleLog'
import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import type { Readable } from 'node:stream'
import type { FastifyInstance } from 'fastify'
import { zipSync, strToU8 } from 'fflate'
import os from 'node:os'
import path from 'node:path'
import { createBackup, extractArchive, MAX_BACKUP_BYTES, space, validateDataset } from './archives'
import type { Manifest, Progress } from './archives'
import { Storage, StorageError, SCHEMA_VERSION } from './storage'
import { diskUsage, generation, operationRoot, replaceDataset } from './safety'
interface Job { id: string; kind: 'backup' | 'restore'; state: 'running' | 'ready' | 'complete' | 'cancelled' | 'error'; progress: Progress; error?: string; filename?: string; manifest?: Manifest; file?: string; controller: AbortController }
export class Jobs {
  jobs = new Map<string, Job>()
  maintenance = false
  constructor(readonly getStore: () => Storage, readonly setStore: (store: Storage) => void, readonly serialize: <T>(action: () => Promise<T>) => Promise<T>) {}
  view(job: Job) { return {id:job.id,kind:job.kind,state:job.state,progress:job.progress,error:job.error,filename:job.filename,manifest:job.manifest} }
  job(id: string) { const job = this.jobs.get(id); if (!job) throw new StorageError('NOT_FOUND', 'Operation not found.', 404); return job }
  create(kind: Job['kind']) {
    if (this.maintenance || [...this.jobs.values()].some(j => j.state === 'running' || j.state === 'ready')) throw new StorageError('MAINTENANCE', 'Finish or cancel the current storage operation first.', 409)
    if (this.jobs.size >= 100) throw new StorageError('JOB_LIMIT', 'Restart Mapweaver to clear finished operations.')
    const job: Job = { id: randomUUID(), kind, state: 'running', controller: new AbortController(), progress: { phase: 'Starting', bytes: 0, files: 0, totalBytes: 0, totalFiles: 0 } }; this.jobs.set(job.id, job); return job
  }
  owned(job: Job, suffix: string) { return path.join(operationRoot(this.getStore().root), job.id + suffix) }
  cleanup(job: Job) {
    for (const suffix of ['-stage', '-work', '-upload']) {
      const target = this.owned(job, suffix), root = operationRoot(this.getStore().root)
      if (path.dirname(target) !== root || !path.basename(target).startsWith(job.id + '-')) throw new Error('Unsafe cleanup.')
      if (existsSync(target)) rmSync(target, { recursive: true, force: true })
    }
  }
  async execute(job: Job, operation: () => Promise<void>) {
    try { await operation() } catch (e) { job.state = job.controller.signal.aborted ? 'cancelled' : 'error'; job.error = job.controller.signal.aborted ? 'Operation cancelled; active data was kept.' : e instanceof StorageError ? e.message : 'Storage operation failed validation or could not finish. Active data and recovery points were kept.'; try { this.cleanup(job) } catch { job.error += ' Temporary files remain for manual inspection.' } }
    finally { this.maintenance = false }
  }
  backup() {
    const job = this.create('backup'); this.maintenance = true
    void this.execute(job, () => this.serialize(async () => {
      const result = await createBackup(this.getStore(), this.owned(job, '-work'), generation(this.getStore()), job.controller.signal, p => { job.progress = p })
      job.file = result.file; job.manifest = result.manifest; job.state = 'complete'; job.progress={...job.progress,phase:'Backup verified',bytes:job.progress.totalBytes,files:job.progress.totalFiles}
      this.getStore().db.prepare("INSERT INTO settings VALUES('lastBackup',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(result.manifest.createdAt)
    })); return this.view(job)
  }
  async upload(stream: Readable, filename: string) {
    const job = this.create('restore'); try { filename=decodeURIComponent(filename) } catch { filename='Mapweaver-backup.zip' }
    job.filename = path.basename(filename.replace(/\\/g, '/')).slice(0, 160)
    const folder = this.owned(job, '-upload'); mkdirSync(folder); const file = path.join(folder, 'input.zip'); let bytes = 0
    try {
      space(folder, 64 * 1024 ** 2)
      await pipeline(stream, new Transform({ transform(chunk, _encoding, done) { bytes += chunk.length; if (bytes > MAX_BACKUP_BYTES) return done(new Error('Upload safety limit.')); if (bytes % (16 * 1024 ** 2) < chunk.length) { try { space(folder, 16 * 1024 ** 2) } catch (e) { return done(e as Error) } } done(null, chunk) } }), createWriteStream(file, { flags: 'wx' }), { signal: job.controller.signal })
    } catch { job.state = 'error'; this.cleanup(job); throw new StorageError('UPLOAD_FAILED', 'Backup upload failed. Active data was kept.') }
    void this.execute(job, async () => { job.manifest = await extractArchive(file, this.owned(job, '-stage'), job.controller.signal, p => { job.progress = p }); job.state = 'ready' })
    return this.view(job)
  }
  commit(id: string) {
    const job = this.job(id)
    if (job.kind !== 'restore' || job.state !== 'ready') throw new StorageError('NOT_READY', 'Validate a backup before restoring.')
    this.maintenance = true; job.state = 'running'; job.progress.phase = 'Replacing dataset — do not close Mapweaver'
    void this.execute(job, () => this.serialize(async () => { await replaceDataset(this.getStore().root, job.id, this.getStore(), this.setStore); job.state = 'complete'; job.progress={...job.progress,phase:'Restore complete',bytes:job.progress.totalBytes,files:job.progress.totalFiles}; try { this.cleanup(job) } catch { job.error='Restore complete; temporary upload files need manual cleanup.' } }))
    return this.view(job)
  }
  cancel(id: string) {
    const job = this.job(id)
    if (job.progress.phase.startsWith('Replacing')) throw new StorageError('COMMITTING', 'Replacement has started. Wait for completion or rollback.', 409)
    job.controller.abort()
    if (job.state === 'ready' || job.state === 'complete') { job.state = 'cancelled'; this.cleanup(job) }
    return this.view(job)
  }
}
export function registerJobs(app: FastifyInstance, jobs: Jobs) {
  app.addContentTypeParser('application/x-mapweaver-backup', (_request, payload, done) => done(null, payload))
  app.post('/api/v1/backups', () => jobs.backup())
  app.get('/api/v1/operations/:id', request => jobs.view(jobs.job((request.params as { id: string }).id)))
  app.post('/api/v1/operations/:id/cancel', request => jobs.cancel((request.params as { id: string }).id))
  app.get('/api/v1/operations/:id/download', (request, reply) => { const job = jobs.job((request.params as { id: string }).id); if (job.kind !== 'backup' || job.state !== 'complete' || !job.file) throw new StorageError('NOT_READY', 'Backup is not ready.'); return reply.type('application/zip').header('Content-Disposition', 'attachment; filename="Mapweaver-backup.zip"').send(createReadStream(job.file)) })
  app.post('/api/v1/restores', { bodyLimit: MAX_BACKUP_BYTES }, request => jobs.upload(request.body as Readable, (request.headers['x-filename'] as string) || 'Mapweaver-backup.zip'))
  app.post('/api/v1/restores/:id/commit', request => { if ((request.body as { replace?: boolean })?.replace !== true) throw new StorageError('CONFIRM_REQUIRED', 'Confirm replacement of all local data.'); return jobs.commit((request.params as { id: string }).id) })
  app.post('/api/v1/storage/integrity', () => jobs.serialize(async () => {
    const store = jobs.getStore(), legacy = store.integrity(); let healthy = true
    try { await validateDataset(store.root) } catch { healthy = false }
    const unfinished = readdirSync(operationRoot(store.root)).filter(n => /-(stage|rejected|upload)$|journal/.test(n) || (n.endsWith('-work')&&!existsSync(path.join(operationRoot(store.root),n,'backup.zip'))))
    return { status: !healthy ? 'restore required' : unfinished.length ? 'manual action required' : legacy.orphaned.length || legacy.temporary.length ? 'warning' : 'healthy', ...legacy, unfinished }
  }))
  app.post('/api/v1/diagnostics', (_request, reply) => jobs.serialize(async () => {
    const store = jobs.getStore(); let integrity = 'healthy'
    try { await validateDataset(store.root) } catch { integrity = 'restore required' }
    const data = { appVersion: '1.0.0', schemaVersion: SCHEMA_VERSION, os: { platform: os.platform(), release: os.release(), arch: os.arch() }, runtime: process.version, health: 'running', integrity, projects: (store.db.prepare('SELECT COUNT(*) AS n FROM projects').get() as { n: number }).n, assets: (store.db.prepare('SELECT COUNT(*) AS n FROM assets').get() as { n: number }).n, bytes: diskUsage(store.root), config: { loopbackOnly: true, backupLimit: MAX_BACKUP_BYTES }, logs: lifecycleLog(store.root).read() }
    return reply.type('application/zip').send(Buffer.from(zipSync({ 'diagnostics.json': strToU8(JSON.stringify(data, null, 2)) })))
  }))
}

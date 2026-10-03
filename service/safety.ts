import { createServer } from 'node:net'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, readdirSync, lstatSync } from 'node:fs'
import path from 'node:path'
import { Storage, StorageError } from './storage'
import { syncFile, validateDataset } from './archives'

// Kernel-owned loopback lease survives directory renames and is released on process death.
// A rare hash collision safely refuses startup rather than admitting two writers.
export async function lease(root: string) {
  const key = process.platform === 'win32' ? root.toLowerCase() : root
  const port = 49152 + createHash('sha256').update(key).digest().readUInt16LE(0) % 16384
  const server = createServer(socket => socket.destroy())
  await new Promise<void>((resolve, reject) => { server.once('error', () => reject(new StorageError('DATA_IN_USE', 'Data directory is already in use, or its safety port is occupied.'))); server.listen({ host: '127.0.0.1', port, exclusive: true }, resolve) })
  return () => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()))
}
export function operationRoot(root: string) {
  const folder = root + '.operations'
  if (existsSync(folder) && lstatSync(folder).isSymbolicLink()) throw new Error('Unsafe operations directory.')
  mkdirSync(folder, { recursive: true }); return folder
}
interface Journal { id: string; phase: 'prepared' | 'installed' | 'committed' }
function locations(root: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid recovery journal.')
  const folder = operationRoot(root)
  return { journal: path.join(folder, 'restore-journal.json'), stage: path.join(folder, id + '-stage'), old: path.join(folder, id + '-rollback'), rejected: path.join(folder, id + '-rejected') }
}
function journal(root: string, value: Journal) {
  const p = locations(root, value.id).journal, tmp = p + '.tmp'
  writeFileSync(tmp, JSON.stringify(value)); syncFile(tmp); renameSync(tmp, p)
}
/** On a crash before commit, restore the original directory before opening SQLite. */
export function recoverInterrupted(root: string) {
  const file = path.join(operationRoot(root), 'restore-journal.json')
  if (!existsSync(file)) return
  const j = JSON.parse(readFileSync(file, 'utf8')) as Journal, p = locations(root, j.id)
  if (!['prepared', 'installed', 'committed'].includes(j.phase)) throw new Error('Invalid recovery journal.')
  if (j.phase !== 'committed' && existsSync(p.old)) {
    if (existsSync(root)) renameSync(root, p.rejected)
    renameSync(p.old, root)
  }
  if (!existsSync(path.join(root,'mapweaver.sqlite3'))) throw new Error('Recovery needs manual attention. Retained datasets were not removed.')
  unlinkSync(file)
}
export async function replaceDataset(root: string, id: string, current: Storage, set: (store: Storage) => void, fault: (step: string) => void = () => {}) {
  const p = locations(root, id)
  await validateDataset(p.stage)
  const staged = new Storage(p.stage)
  try { staged.db.prepare("INSERT INTO settings VALUES('datasetGeneration',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(randomUUID()); staged.db.pragma('wal_checkpoint(TRUNCATE)') } finally { staged.close() }
  fault('before-close')
  current.db.pragma('wal_checkpoint(TRUNCATE)'); current.close()
  let next: Storage | undefined
  try {
    journal(root, { id, phase: 'prepared' }); fault('before-swap')
    renameSync(root, p.old); fault('after-old-moved')
    renameSync(p.stage, root); journal(root, { id, phase: 'installed' }); fault('after-swap')
    next = new Storage(root); await validateDataset(root); fault('after-open')
    journal(root, { id, phase: 'committed' }); set(next)
    try { unlinkSync(p.journal) } catch { /* Committed journal is safe to clear on next startup. */ }
  } catch (error) {
    next?.close()
    recoverInterrupted(root)
    set(new Storage(root))
    throw error
  }
  // Rollback datasets are retained indefinitely; no automatic deletion/rotation.
}
export function generation(store: Storage) {
  const prior = store.db.prepare("SELECT value FROM settings WHERE key='datasetGeneration'").get() as { value: string } | undefined
  if (prior) return prior.value
  const id = randomUUID(); store.db.prepare("INSERT INTO settings VALUES('datasetGeneration',?)").run(id); return id
}
export function diskUsage(root: string) {
  const size = (folder: string): number => {
    if (!existsSync(folder)) return 0
    const s = lstatSync(folder); if (s.isSymbolicLink()) return 0
    return s.isDirectory() ? readdirSync(folder).reduce((n, name) => n + size(path.join(folder, name)), 0) : s.size
  }
  return { database: ['mapweaver.sqlite3', 'mapweaver.sqlite3-wal', 'mapweaver.sqlite3-shm'].reduce((n, name) => n + size(path.join(root, name)), 0), originals: size(path.join(root, 'assets/originals')), previews: size(path.join(root, 'assets/previews')), backups: size(path.join(root, 'backups')) + size(root + '.operations'), logs: size(path.join(root, 'logs')) }
}

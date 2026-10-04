import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app'
import { dataDirectory, StorageError } from './storage'
import { lease, recoverInterrupted } from './safety'
const port = Number(process.env.MAPWEAVER_PORT || 47831)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid MAPWEAVER_PORT.')
let release: (() => Promise<void>) | undefined
try {
  const root = dataDirectory()
  release = await lease(root)
  recoverInterrupted(root)
  const { app, requestStop } = await createApp({ directory: root, port, instanceId: randomUUID(), supervisorId: process.env.MAPWEAVER_SUPERVISOR_ID, controlToken: process.env.MAPWEAVER_CONTROL_TOKEN, developmentOrigin: process.env.MAPWEAVER_DEV_ORIGIN, frontend: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist'), shutdown: () => { void stop() } })
  let stopping = false
  async function stop() { if (stopping) return; stopping = true; await app.close(); await release?.(); process.exit(0) }
  await app.listen({ host: '127.0.0.1', port })
  console.log(`Mapweaver: http://127.0.0.1:${port}`)
  for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { requestStop() })
} catch (error) { await release?.(); if (error instanceof StorageError) console.error(error.code); else if (['EADDRINUSE','EACCES','EPERM'].includes(String((error as { code?: string }).code))) console.error((error as { code: string }).code); console.error(error instanceof Error ? error.message : error); console.error('Mapweaver could not start. Check the data directory, running instances, database version, permissions and configured port.'); process.exitCode = 1 }

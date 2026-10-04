import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

// One environment value is passed unchanged to both listener and proxy.
export function configuration(env = process.env, args = process.argv.slice(2)) {
  const portArg = args.indexOf('--port')
  const servicePort = Number(env.MAPWEAVER_PORT || 47831)
  const clientPort = Number(portArg >= 0 ? args[portArg + 1] : env.MAPWEAVER_DEV_PORT || 5173)
  for (const port of [servicePort, clientPort]) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid development port.')
  }
  if (servicePort === clientPort) throw new Error('Frontend and backend require different ports.')
  return { servicePort, clientPort, directory: path.resolve(env.MAPWEAVER_DATA_DIR || '.development.local') }
}

export async function health(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`, { signal: AbortSignal.timeout(500) })
    return response.ok ? await response.json() : null
  } catch { return null }
}

export async function supervise({ port, env, command = [process.execPath, 'dist-service/main.js'], frontend, signal, timeout = 30000 }) {
  const child = spawn(command[0], command.slice(1), { env, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true })
  let closed = false
  const ended = new Promise(resolve => {
    child.once('error', error => resolve(new Error(`Backend could not start: ${error.message}`)))
    child.once('exit', (code, exitSignal) => { closed = true; resolve(new Error(`Backend exited (code ${code}, signal ${exitSignal || 'none'}).`)) })
  })
  const aborted = new Promise(resolve => {
    if (signal.aborted) resolve(null)
    else signal.addEventListener('abort', () => resolve(null), { once: true })
  })
  let server
  try {
    const deadline = Date.now() + timeout
    while (true) {
      const result = await Promise.race([ended, aborted, health(port)])
      if (result instanceof Error) throw result
      if (signal.aborted) return
      // PID ensures an unrelated service cannot satisfy this child's readiness.
      if (result?.application === 'Mapweaver' && result.pid === child.pid) break
      if (Date.now() >= deadline) throw new Error(`Backend health timed out on 127.0.0.1:${port}. See service stderr above.`)
      const wait = await Promise.race([ended, aborted, delay(100)])
      if (wait instanceof Error) throw wait
      if (signal.aborted) return
    }
    server = await frontend()
    const result = await Promise.race([ended, aborted])
    if (result instanceof Error) throw result
  } finally {
    await server?.close()
    if (!closed) {
      child.kill('SIGTERM')
      await Promise.race([ended, delay(5000)])
      if (!closed) { child.kill('SIGKILL'); await ended }
    }
  }
}

async function main() {
  const config = configuration()
  const existing = await health(config.servicePort)
  if (existing) throw new Error(`Port ${config.servicePort} already serves ${existing.application || 'another application'}${existing.pid ? ` (PID ${existing.pid})` : ''}. Reuse the running session or choose MAPWEAVER_PORT and MAPWEAVER_DEV_PORT; no duplicate backend started.`)
  const env = { ...process.env, MAPWEAVER_PORT: String(config.servicePort), MAPWEAVER_DATA_DIR: config.directory, MAPWEAVER_DEV_ORIGIN: `http://127.0.0.1:${config.clientPort}` }
  const controller = new AbortController()
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort())
  const build = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build:service'], { env, stdio: 'inherit', windowsHide: true })
  controller.signal.addEventListener('abort', () => build.kill('SIGTERM'), { once: true })
  const code = await new Promise((resolve, reject) => { build.once('error', reject); build.once('exit', resolve) })
  if (code !== 0) throw new Error(`Service build failed (code ${code}); frontend was not started.`)
  if (controller.signal.aborted) return
  await supervise({ port: config.servicePort, env, signal: controller.signal, frontend: async () => {
    const server = await createServer({ server: { host: '127.0.0.1', port: config.clientPort, strictPort: true, proxy: { '/api/v1': { target: `http://127.0.0.1:${config.servicePort}`, changeOrigin: true } } } })
    try { await server.listen(); server.printUrls(); return server } catch (error) { await server.close(); throw error }
  } })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Mapweaver dev failed: ${error.message}`); process.exitCode = 1 })
}

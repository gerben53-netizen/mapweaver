import { appendFileSync, existsSync, lstatSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
export const lifecycleEvents = ['supervisor-started', 'existing-instance', 'service-started', 'service-healthy', 'browser-opened', 'browser-failed', 'stop-requested', 'restart-requested', 'active-work', 'drain-complete', 'database-closed', 'service-stopped', 'unexpected-exit', 'shutdown-timeout', 'keep-running', 'browser-waits-released'] as const
export function lifecycleLog(root: string) {
  const file = path.join(root, 'logs', 'lifecycle.jsonl')
  const safe = () => !lstatSync(path.dirname(file)).isSymbolicLink() && (!existsSync(file) || !lstatSync(file).isSymbolicLink())
  return {
    event(event: string) {
      const code = /^unexpected-exit:(-?\d{1,10})$/.exec(event)
      const exitCode = code ? Number(code[1]) : undefined
      if (code) event = 'unexpected-exit'
      if (!(lifecycleEvents as readonly string[]).includes(event)) return
      try { if (!safe()) return; if (existsSync(file) && statSync(file).size > 64 * 1024) writeFileSync(file, ''); appendFileSync(file, JSON.stringify({ time: new Date().toISOString(), event, exitCode }) + '\n') } catch { /* Diagnostics must not break storage. */ }
    },
    read() {
      try { if (!safe() || statSync(file).size > 128 * 1024) return []; return readFileSync(file, 'utf8').trim().split('\n').flatMap(line => { try { const v = JSON.parse(line); return /^\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(v.time) && (lifecycleEvents as readonly string[]).includes(v.event) ? [{ time: v.time, event: v.event, ...(Number.isSafeInteger(v.exitCode) ? { exitCode: v.exitCode } : {}) }] : [] } catch { return [] } }) } catch { return [] }
    },
  }
}

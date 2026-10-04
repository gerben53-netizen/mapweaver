import path from 'node:path'
import os from 'node:os'
import { existsSync, readFileSync, realpathSync } from 'node:fs'

export function primaryDirectory(env = process.env) {
  return path.resolve(process.platform === 'win32'
    ? path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Mapweaver')
    : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'Mapweaver')
      : path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'Mapweaver'))
}

export function sameDirectory(a, b) {
  const canonical = p => {
    const resolved = existsSync(p) ? realpathSync(p) : path.resolve(p)
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  return canonical(a) === canonical(b)
}

export function runtimeConfiguration(env = process.env, configFile = path.resolve('.runtime.local/primary.json')) {
  const local = existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : {}
  const primary = local.directory || primaryDirectory(env)
  if (!path.isAbsolute(primary)) throw Error('Primary Development requires an absolute persistent directory.')
  const profile = env.MAPWEAVER_RUNTIME_PROFILE || 'primary'
  if (!['primary', 'qa', 'test', 'release'].includes(profile)) throw Error('Unknown runtime profile.')
  if (['qa', 'test'].includes(profile)) {
    if (!env.MAPWEAVER_DATA_DIR || !path.isAbsolute(env.MAPWEAVER_DATA_DIR)) throw Error('QA/Test requires an explicit absolute isolated data directory.')
    if ([primary, primaryDirectory(env)].some(root => {
      const target = path.resolve(env.MAPWEAVER_DATA_DIR)
      const overlap = (a, b) => sameDirectory(a, b) || (!path.relative(a, b).startsWith('..') && !path.isAbsolute(path.relative(a, b)))
      return overlap(root, target) || overlap(target, root)
    })) throw Error('QA/Test cannot open Primary Development.')
  } else if (profile === 'primary' && env.MAPWEAVER_DATA_DIR && !sameDirectory(env.MAPWEAVER_DATA_DIR, primary)) {
    throw Error('Primary Development cannot be redirected. Use an explicit QA/Test profile for isolated work.')
  }
  return { profile, directory: profile === 'primary' ? primary : env.MAPWEAVER_DATA_DIR || primaryDirectory(env),
    dataProfile: profile === 'primary' ? 'Primary Development' : profile === 'qa' ? 'QA' : profile === 'test' ? 'Test' : 'Release',
    servicePort: Number(env.MAPWEAVER_PORT || local.servicePort || 49181),
    clientPort: Number(env.MAPWEAVER_DEV_PORT || local.clientPort || 49182) }
}

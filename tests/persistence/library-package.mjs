import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'

const name = 'Mapweaver-Sprint23'
const pkg = path.resolve('distribution.local', name)
const root = path.resolve('.sprint23.local', 'package-' + Date.now())
const base = 'http://127.0.0.1:48006'
const token = crypto.randomUUID()
await fs.mkdir(root, { recursive: true })
const poll = async fn => {
  for (let i = 0; i < 300; i++) {
    if (await fn()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw Error('Packaged service timeout')
}
const lines = (await fs.readFile(`distribution.local/${name}-SHA256SUMS.txt`, 'utf8')).trim().split('\n')
for (const line of lines) {
  const [hash, file] = line.split('  ')
  assert.equal(createHash('sha256').update(await fs.readFile(path.resolve('distribution.local', file))).digest('hex'), hash)
}
assert.equal((await fs.readFile(path.join(pkg, 'Mapweaver.exe'))).subarray(0, 2).toString(), 'MZ')
let child, health
const headers = () => ({ 'Content-Type': 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': health.instanceId, 'X-Mapweaver-Generation': health.generation, 'X-Mapweaver-Control': token })
const api = async (url, options = {}) => {
  const response = await fetch(base + '/api/v1' + url, { ...options, headers: { ...headers(), ...options.headers } })
  assert(response.ok, await response.clone().text())
  return response.json()
}
const start = async () => {
  child = spawn(path.join(pkg, 'runtime/node.exe'), [path.join(pkg, 'dist-service/main.js')], {
    cwd: pkg, windowsHide: true, stdio: 'pipe',
    env: { ...process.env, MAPWEAVER_PORT: '48006', MAPWEAVER_DATA_DIR: path.join(root, 'data'), MAPWEAVER_CONTROL_TOKEN: token },
  })
  child.stdout.resume()
  child.stderr.on('data', bytes => process.stderr.write(bytes))
  await poll(async () => {
    try { health = await fetch(base + '/api/v1/health').then(r => r.json()); return health.pid === child.pid }
    catch { return false }
  })
}
const stop = async () => {
  if (child?.exitCode === null && child.signalCode === null) {
    await api('/lifecycle/control', { method: 'POST', body: '{"action":"stop"}' })
    await poll(() => child.exitCode !== null || child.signalCode !== null)
  }
}
try {
  await start()
  assert.equal((await api('/storage')).location, path.join(root, 'data'))
  assert((await fetch(base).then(r => r.text())).includes('Mapweaver'))
  assert((await fetch(base + '/asset-templates/mapweaver-assets.schema.json')).ok)
  const template = await fetch(base + '/asset-templates/eryndor-example.zip')
  assert(template.ok)
  const preview = await api('/library/preview', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: await template.arrayBuffer() })
  assert.deepEqual(preview.errors, [])
  const options = { token: preview.token, revision: preview.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true }
  await api('/library/review', { method: 'POST', body: JSON.stringify(options) })
  assert.equal((await api('/library')).total, 0)
  await api('/library/commit', { method: 'POST', body: JSON.stringify(options) })
  const before = await api('/library')
  assert.equal(before.total, 1)
  assert.equal(before.assets[0].defaultSize.width, 2)
  assert.equal(before.assets[0].defaultSize.height, 1)
  assert(before.categories.some(category => category.name === 'Lege kamer'))
  await stop()
  await start()
  const after = await api('/library')
  assert.deepEqual(after.assets, before.assets)
  assert.deepEqual(after.categories, before.categories)
  await stop()
  const report = { verifiedFiles: lines.length, packagedRuntime: true, productionClient: true, templateImport: true, previewDoesNotWrite: true, metadataAndTreePreservedAfterRestart: true, gracefulStopRestart: true, nativeLauncherGUI: 'Not exercised; executable presence and packaged service tested separately.' }
  await fs.writeFile(path.join(root, 'results.json'), JSON.stringify(report, null, 2))
  console.log('PASS ' + root + '; ' + lines.length + ' checksums verified')
} finally {
  try { await stop() } finally {
    if (child?.exitCode === null && child.signalCode === null) child.kill()
  }
}

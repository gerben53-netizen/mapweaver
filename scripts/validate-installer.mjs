// Installs a separate test AppId. Never writes to or stops the personal dataset.
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { build } from 'vite'
import Database from 'better-sqlite3'
import { chromium, expect } from '@playwright/test'
import sharp from 'sharp'
const { version } = JSON.parse(await fs.readFile('package.json'))
const root = path.resolve('.installer.local', 'validation-' + Date.now()), appDir = path.join(root, 'app'), data = path.join(root, 'data')
const packageDir = path.resolve('distribution.local', 'Mapweaver-Installer-' + version)
const port = 48173, base = 'http://127.0.0.1:' + port, env = { ...process.env, MAPWEAVER_PORT: String(port), MAPWEAVER_DATA_DIR: data }
await fs.mkdir(root, { recursive: true })
async function health(url = base) { try { return await fetch(url + '/api/v1/health', { signal: AbortSignal.timeout(1500) }).then(r => r.json()) } catch { return null } }
assert.equal(await health(), null, 'Test port is occupied; do not start a competing instance')
const priorInstance = await health('http://127.0.0.1:47831')
await fs.writeFile(path.join(root, 'prior-instance.json'), JSON.stringify({ running: !!priorInstance, pid: priorInstance?.pid, modified: false }))
const compiler = process.env.INNO_SETUP_ISCC || '.installer.local/tools/inno/ISCC.exe'
if(process.env.MAPWEAVER_SMOKE_SETUP)await fs.copyFile(process.env.MAPWEAVER_SMOKE_SETUP,path.join(root,'SmokeSetup.exe'))
else execFileSync(path.resolve(compiler), ['/Q', '/DAppVersion=' + version, '/DPackageDir=' + packageDir, '/DInstallerAppId=MapweaverInstallerSmoke', '/O' + root, '/FSmokeSetup', path.resolve('launcher/installer.iss')], { windowsHide: true, stdio: 'inherit' })
const setup = path.join(root, 'SmokeSetup.exe'), exe = () => path.join(appDir, 'Mapweaver.exe')
const events = [], record = message => { events.push(message); console.log('PASS ' + message) }
async function run(file, args) { return new Promise((resolve, reject) => { const p = spawn(file, args, { env, windowsHide: true, stdio: 'ignore' }); p.on('error', reject); p.on('exit', code => code === 0 ? resolve() : reject(Error(path.basename(file) + ' exit ' + code))) }) }
const install = () => run(setup, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/DIR=' + appDir, '/GROUP=Mapweaver Installer Smoke', '/TASKS=', '/LOG=' + path.join(root, 'install-' + Date.now() + '.log')])
let owner, h, browser
async function poll(fn, label) { for (let i = 0; i < 400; i++) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)) } throw Error('Timeout: ' + label) }
async function start() { assert.equal(await health(), null); owner = spawn(exe(), ['--test', '--no-browser'], { cwd: appDir, env, windowsHide: true, stdio: 'ignore' }); owner.on('error', e => console.error(e)); await poll(async () => { h = await health(); return !!h?.supervisorId }, 'native startup'); assert.equal(h.version, version) }
async function stop() { await run(exe(), ['--test', '--stop', '--wait']); await browser?.close(); browser = null; await poll(() => owner.exitCode !== null || owner.signalCode !== null, 'native stop'); await poll(async () => !await health(), 'service stop') }
const headers = () => ({ 'content-type': 'application/json', 'x-mapweaver': '1', 'x-mapweaver-instance': h.instanceId, 'x-mapweaver-generation': h.generation })
async function api(route, method = 'GET', body, contentType) { const r = await fetch(base + '/api/v1' + route, { method, headers: { ...headers(), ...(contentType ? { 'content-type': contentType } : {}) }, body: body instanceof Buffer ? body : body ? JSON.stringify(body) : ['POST','PUT'].includes(method) ? '{}' : undefined }); assert(r.ok, route + ': ' + await r.clone().text()); return r.json() }
let mapId, customId, preserved
try {
  await install(); await start()
  assert.equal((await api('/storage')).schemaVersion, 10)
  const library = await api('/library?limit=200'); assert.equal(library.total, 77)
  record('Fresh isolated Windows install, native launcher, schema 10 and 77 standard stamps')
  const entry = path.join(root, 'fixture.ts')
  await fs.writeFile(entry, "export {newMapSnapshot} from '../../src/projects/newMap';export {createWall,SIMPLE_WALL} from '../../src/domain/walls';export {generatedWallStyle} from '../../src/domain/generatedWalls';export {defaultMapEffects} from '../../src/domain/mapEffects'")
  await build({ configFile: false, logLevel: 'error', build: { ssr: entry, outDir: path.join(root, 'fixture'), rolldownOptions: { output: { entryFileNames: 'index.mjs' } } } })
  const f = await import(pathToFileURL(path.join(root, 'fixture/index.mjs')).href), snapshot = f.newMapSnapshot(800, 600, '#ffffff', 'battlemap')
  snapshot.map.effects = { ...f.defaultMapEffects(), stampSoftShadow: { enabled: true, intensity: .6 } }
  const standard = library.assets[0], stamp = { kind: 'stamp', id: 'standard-stamp', name: 'Standard stamp', assetId: standard.id, x: 200, y: 220, width: 140, height: 140, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
  const nodes = [{ id: 'a', x: 100, y: 120, mode: 'corner' }, { id: 'b', x: 620, y: 120, mode: 'corner' }]
  const wall = f.createWall(nodes, false, f.SIMPLE_WALL), rootWall = f.createWall(nodes.map(n => ({ ...n, y: 420 })), false, f.generatedWallStyle(f.SIMPLE_WALL, snapshot.map))
  snapshot.objects = [stamp, wall, rootWall]; snapshot.layers[0].objectIds = snapshot.objects.map(o => o.id)
  const now = new Date().toISOString(), doc = { ...snapshot, formatVersion: 12, id: crypto.randomUUID(), name: 'Installer smoke map', createdAt: now, modifiedAt: now, assets: [{ id: standard.id, kind: 'stamp', fileName: standard.originalName, mimeType: standard.mimeType, width: standard.width, height: standard.height, hash: standard.sha256, path: 'assets/' + standard.sha256 + '.png' }] }
  const map = await api('/projects', 'POST', doc); mapId = map.id; await api('/projects/' + mapId + '/opened', 'POST')
  const image = await sharp({create:{width:64,height:64,channels:4,background:'#407f8d'}}).png().toBuffer()
  customId = (await api('/assets?type=stamp&name=Personal%20asset&filename=personal.png', 'POST', image, 'image/png')).asset.id
  browser = await chromium.launch({ channel: 'chrome', headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await page.goto(base)
  await expect(page.getByRole('button', { name: 'Fit to map', exact: true })).toBeVisible(); await expect(page.locator('canvas').first()).toBeVisible()
  await page.screenshot({ path: path.join(root, 'installed-editor.png') })
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Export PNG', exact: true }), download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download PNG', exact: true }).click(); await (await download).saveAs(path.join(root, 'export.png'))
  const exported = await fs.readFile(path.join(root, 'export.png')); assert.equal(exported.subarray(1, 4).toString(), 'PNG'); assert(exported.length > 10000)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  preserved = (await api('/projects/' + mapId)).document
  record('Installed editor renders a standard stamp, soft shadow, simple wall, production Living Root and exports PNG')
  await stop()
  // Simulate the immediately preceding supported schema, preserving real rows/files.
  const db = new Database(path.join(data, 'mapweaver.sqlite3')); db.exec('ALTER TABLE assets DROP COLUMN quality;DELETE FROM schema_migrations WHERE version=10'); db.close()
  if(process.env.MAPWEAVER_PREVIOUS_PACKAGE){
    await fs.copyFile(path.resolve(process.env.MAPWEAVER_PREVIOUS_PACKAGE,'dist-service/main.js'),path.join(appDir,'dist-service/main.js'))
    await start();assert.equal((await api('/storage')).schemaVersion,9)
    // Upgrade while the prior owned service is running: the installer must stop it safely.
    await install();await poll(()=>owner.exitCode!==null||owner.signalCode!==null,'installer safely stopped prior build')
  }else await install()
  await start()
  assert.equal((await api('/storage')).schemaVersion, 10); assert.deepEqual((await api('/projects/' + mapId)).document, preserved)
  assert((await api('/library?limit=200')).assets.some(a => a.id === customId)); record('Upgrade reinstalls binaries, migrates schema 9 to 10 and preserves map/imported asset IDs')
  await stop(); await run(path.join(appDir, 'unins000.exe'), ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'])
  await assert.rejects(fs.access(exe())); await fs.access(path.join(data, 'mapweaver.sqlite3')); record('Uninstall removes the application and preserves its separate data directory')
  await install(); await start(); assert.deepEqual((await api('/projects/' + mapId)).document, preserved); assert((await api('/library?limit=200')).assets.some(a => a.id === customId)); record('Reinstall safely reuses preserved schema 10 data')
  await stop(); await run(path.join(appDir, 'unins000.exe'), ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'])
  await fs.writeFile(path.join(root, 'results.json'), JSON.stringify({ version, root, events, mapId, customId, primaryInstanceUnmodified: true }, null, 2)); console.log('Evidence: ' + root)
} catch (e) { await fs.writeFile(path.join(root, 'failure.txt'), String(e.stack || e)); throw e }
finally { if (owner && owner.exitCode === null && owner.signalCode === null) await stop().catch(e => console.error('Owned test instance requires attention:', e.message)); else await browser?.close() }

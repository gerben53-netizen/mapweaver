import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import sharp from 'sharp'
const root = path.resolve('.qa.local/premium-terrain/validation'), out = path.resolve('deliverables.local/Velanth-BrushTextureQuality')
const web = 'http://127.0.0.1:5192', base = 'http://127.0.0.1:48044', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48044', MAPWEAVER_DATA_DIR: root + '/data', MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48044' } })
const pause = ms => new Promise(r => setTimeout(r, ms))
let h, browser
const api = async (u, method = 'GET', body) => {
  const r = await fetch(base + '/api/v1' + u, { method, headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/zip' : 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': h.instanceId, 'X-Mapweaver-Generation': h.generation, 'X-Mapweaver-Control': token }, ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) })
  if (!r.ok) throw Error(await r.text()); return r.json()
}
try {
  for (let i = 0; i < 100; i++) { try { h = await fetch(base + '/api/v1/health').then(r => r.json()); if (h.pid === service.pid && (await fetch(web)).ok) break } catch { /* Service may still be starting. */ } await pause(300) }
  if (h?.pid !== service.pid) throw Error('Isolated service did not start')
  const errors = [], metrics = { viewport: [1600, 1100], renderer: 'headless Chrome, local Vite app', softwareCanvas: !!process.env.SOFTWARE_CANVAS, cases: [] }
  browser = await chromium.launch({ channel: 'chrome', headless: true, ...(process.env.SOFTWARE_CANVAS ? { args: ['--disable-accelerated-2d-canvas'] } : {}) })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(web)
  const setup = page.getByRole('dialog', { name: 'Create your first campaign' })
  await page.waitForTimeout(1000)
  if (await setup.isVisible()) {
    page.once('dialog', d => d.accept('Premium terrain validation'))
    await page.getByRole('button', { name: 'New campaign', exact: true }).click()
    await page.getByRole('button', { name: '+ Map', exact: true }).waitFor()
  }
  for (const [label, file] of [['baseline', out + '/Velanth-BrushTextureQuality-before.mapweaver'], ['after', out + '/Velanth-BrushTextureQuality.mapweaver']]) {
    if (process.env.ONLY_AFTER && label === 'baseline') continue
    const openStart = performance.now()
    const row = await api('/projects/import', 'POST', await fs.readFile(file))
    console.log('Imported', label)
    await page.evaluate(async id => { await (await import('/src/projects/localSession.ts')).loadLocalProject(id, () => true) }, row.id)
    await page.getByRole('region', { name: 'Map canvas' }).waitFor()
    await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
    await page.evaluate(async () => { await document.fonts.ready; const {currentSnapshot}=await import('/src/projects/session.ts'); await (await import('/src/canvas/premiumTerrainTextures.ts')).loadPaintTextures(currentSnapshot().map.terrainPaint); await new Promise(r => setTimeout(r, 2000)) })
    const openMs=performance.now()-openStart
    const before = await page.evaluate(async () => (await import('/src/projects/session.ts')).currentSnapshot())
    const pan = await page.evaluate(async profileOnly => {
      const { useEditorStore } = await import('/src/store/editorStore.ts'), v = useEditorStore.getState().viewport, times = []
      const create = document.createElement.bind(document); let canvases = 0
      document.createElement = (...args) => { if (args[0] === 'canvas') canvases++; return create(...args) }
      for (let i = 0; i < (profileOnly ? 9 : 45); i++) { const start = performance.now(); useEditorStore.setState({ viewport: { ...v, pan: { x: v.pan.x + Math.sin(i) * 20, y: v.pan.y } } }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); if (i >= 5) times.push(performance.now() - start) }
      document.createElement = create
      useEditorStore.setState({ viewport: v }); times.sort((a, b) => a - b)
      return { medianMs: times[Math.floor(times.length / 2)], p95Ms: times[Math.min(times.length-1,Math.floor(times.length*.95))], samples: times.length, allocatedCanvases: canvases, method: 'two animation frames per viewport update; 5 warmup then measured' }
    }, !!process.env.PROFILE_ONLY)
    console.log('Pan measured', label, pan)
    await page.screenshot({ path: out + '/' + label + '-editor.png' })
    const exports = await page.evaluate(async () => {
      const { currentSnapshot } = await import('/src/projects/session.ts'), { exportPng } = await import('/src/export/render.ts'), s = currentSnapshot(), result = []
      for (const scale of [1, 2]) {
        const start = performance.now(), blob = await exportPng(s, { scale, transparent: false, includeGrid: false }), ms = performance.now() - start
        const data = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob) })
        const stage = window.Konva.stages[0], node = stage.findOne('.map-art').clone(), water = stage.findOne('.water-surface').clone()
        node.add(water); water.moveToBottom()
        const editor = node.toCanvas({ x: 0, y: 0, width: s.map.width, height: s.map.height, pixelRatio: scale }).toDataURL(); node.destroy()
        result.push({ scale, ms, data, editor })
      }
      return result
    })
    const exportMetrics = []
    for (const e of exports) {
      const png = Buffer.from(e.data.split(',')[1], 'base64'), editor = Buffer.from(e.editor.split(',')[1], 'base64')
      await fs.writeFile(out + '/' + label + '-' + e.scale + 'x.png', png)
      const a = await sharp(png).ensureAlpha().raw().toBuffer(), b = await sharp(editor).ensureAlpha().raw().toBuffer()
      let different = 0, max = 0, total = 0, large = 0
      for (let i = 0; i < a.length; i += 4) { let changed = false; for (let j=0;j<4;j++){const d=Math.abs(a[i+j]-b[i+j]);max=Math.max(max,d);total+=d;if(d>3)large++;if(d)changed=true} if(changed)different++ }
      exportMetrics.push({ scale: e.scale, ms: e.ms, differentPixels: different, maxChannelDelta: max, meanChannelDelta: total/a.length, channelsOver3: large })
      if (different) await fs.writeFile(out + '/' + label + '-' + e.scale + 'x-editor.png', editor)
      if (total/a.length >= .05 || large/a.length >= .0001) { console.log('Editor/export mismatch: ' + JSON.stringify(exportMetrics.at(-1))) }
    }
    await page.evaluate(async () => { await (await import('/src/projects/localSession.ts')).saveLocalProject() })
    const status = await page.evaluate(async () => { const s = (await import('/src/projects/session.ts')).useProjectSession.getState(); return { status: s.saveStatus, error: s.error } })
    if (!['clean', 'saved'].includes(status.status)) throw Error('Save failed: ' + JSON.stringify(status))
    const saved = (await api('/projects/' + row.id)).document
    for (const key of Object.keys(before)) if (!isDeepStrictEqual(before[key], saved[key])) throw Error('Stored data mismatch: ' + key)
    const reloadStart=performance.now()
    await page.reload(); await page.getByRole('region', { name: 'Map canvas' }).waitFor()
    // Explicitly reopen this map after startup, as in Projects. The shell can
    // exist while startup is still deciding which campaign/map to display.
    await page.waitForTimeout(1500)
    const reloaded = await page.evaluate(async id => {
      await (await import('/src/projects/localSession.ts')).loadLocalProject(id, () => true)
      return (await import('/src/projects/session.ts')).currentSnapshot()
    }, row.id)
    if (!isDeepStrictEqual(before, reloaded)) { await fs.writeFile(root + '/reload-diff.json', JSON.stringify({ before, reloaded })); throw Error('Reload changed snapshot: ' + label) }
    metrics.cases.push({ label, openMs, reloadMs:performance.now()-reloadStart, objects: before.objects.length, stamps: before.objects.filter(o => o.kind === 'stamp').length, pan, exports: exportMetrics, saveReload: 'identical snapshot' })
    await fs.writeFile(out + (process.env.SOFTWARE_CANVAS ? '/validation-software.json' : '/validation.json'), JSON.stringify({ ...metrics, errors }, null, 2))
    console.log(label, JSON.stringify(metrics.cases.at(-1)))
  }
  if (metrics.cases.some(c => c.exports?.some(e => e.meanChannelDelta >= .05 || e.channelsOver3 / (2400 * 1600 * e.scale * e.scale * 4) >= .0001))) throw Error('Pixel parity tolerance exceeded; see validation.json. Persistence checks completed.')
  if (errors.length) throw Error('Browser errors: ' + errors.join('; '))
} finally {
  if (h?.pid === service.pid) await api('/lifecycle/control', 'POST', { action: 'stop' }).catch(() => {})
  await browser?.close(); vite.kill(); service.kill()
}

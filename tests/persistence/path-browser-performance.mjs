import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root = path.resolve('.sprint15.local', 'performance-' + Date.now()),
  data = path.join(root, 'data'),
  base = 'http://127.0.0.1:47952'
await fs.mkdir(root, { recursive: true })
let service
const start = async () => {
  service = spawn(process.execPath, ['dist-service/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, MAPWEAVER_PORT: '47952', MAPWEAVER_DATA_DIR: data },
    windowsHide: true,
    stdio: 'pipe',
  })
  let logs = ''
  service.stderr.on('data', (b) => (logs += b))
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(base + '/api/v1/health')
      if (r.ok) {
        const storage = await fetch(base + '/api/v1/storage').then((r) =>
          r.json(),
        )
        assert.equal(path.resolve(storage.location), data)
        return
      }
    } catch {
      /* Own service is still starting. */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw Error('Service did not start: ' + logs)
}
const stop = async () => {
  if (!service || service.exitCode !== null) return
  const exit = new Promise((r) => service.once('exit', r))
  service.kill()
  await exit
}
let browser, context, page, id
const errors = []
const api = async (p) =>
  fetch(base + '/api/v1' + p).then(async (r) => {
    if (!r.ok) throw Error(await r.text())
    return r.json()
  })
const poll = async (fn, predicate, label) => {
  for (let i = 0; i < 100; i++) {
    const v = await fn()
    if (predicate(v)) return v
    await new Promise((r) => setTimeout(r, 100))
  }
  throw Error(label)
}
const model = async () => (await api('/projects/' + id)).document
try {
  const vite = await createServer({ server: { middlewareMode: true } })
  let objects
  try {
    const m = await vite.ssrLoadModule('/src/domain/paths.ts')
    objects = Array.from({ length: 100 }, (_, j) =>
      m.createPath(
        Array.from({ length: 20 }, (_, i) => ({
          id: String(i),
          x: 1800 + i * 30 + ((j % 10) - 5) * 350,
          y:
            2000 +
            (Math.floor(j / 10) - 5) * 350 +
            Math.sin((i * Math.PI) / 3) * 20,
          mode: 'smooth',
          in: { x: -10, y: 0 },
          out: { x: 10, y: 0 },
        })),
      ),
    )
  } finally {
    await vite.close()
  }
  await start()
  const gen = (await api('/health')).generation,
    now = new Date().toISOString()
  const document = {
    formatVersion: 4,
    id: 'performance',
    name: 'Path performance',
    createdAt: now,
    modifiedAt: now,
    map: {
      width: 4000,
      height: 4000,
      backgroundColor: '#d7d7cf',
      background: null,
    },
    objects,
    layers: [
      {
        id: 'objects',
        name: 'Objects',
        visible: true,
        locked: false,
        objectIds: objects.map((o) => o.id),
      },
    ],
    assets: [],
  }
  const response = await fetch(base + '/api/v1/projects', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Mapweaver': '1',
      'X-Mapweaver-Generation': gen,
    },
    body: JSON.stringify(document),
  })
  assert(response.ok, await response.text())
  id = (await api('/projects'))[0].id
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  await context.route('**/*', (r) => {
    const u = new URL(r.request().url())
    return /^https?:$/.test(u.protocol) && u.hostname !== '127.0.0.1'
      ? r.abort()
      : r.continue()
  })
  page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base)
  await page
    .getByRole('button', { name: 'Open Path performance', exact: true })
    .click()
  const results = []
  for (const zoom of [0.25, 1, 4]) {
    await page.getByRole('button', { name: 'Fit to map' }).click()
    const b = await page
        .getByRole('region', { name: 'Map canvas', exact: true })
        .boundingBox(),
      center = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    let current = Math.min((b.width - 96) / 4000, (b.height - 96) / 4000)
    await page.mouse.move(center.x, center.y)
    while (Math.abs(Math.log(zoom / current)) > 0.001) {
      const delta = Math.max(
        -240,
        Math.min(240, -Math.log(zoom / current) / 0.002),
      )
      await page.mouse.wheel(0, delta)
      current *= Math.exp(-delta * 0.002)
      await new Promise((r) => setTimeout(r, 30))
    }
    assert.equal(
      await page.getByLabel('Zoom level').textContent(),
      Math.round(zoom * 100) + '%',
    )
    const target = objects[55],
      node = target.nodes[6],
      x = center.x + (node.x - 2000) * zoom,
      y = center.y + (node.y - 2000) * zoom
    const begin = performance.now()
    await page.mouse.click(x, y)
    await page.getByRole('button', { name: 'Edit path', exact: true }).waitFor()
    const selectMs = performance.now() - begin
    const before = await model(),
      dragStart = performance.now()
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 20, y + 10, { steps: 10 })
    await page.mouse.up()
    const gestureMs = performance.now() - dragStart
    await poll(
      model,
      (d) => JSON.stringify(d.objects) !== JSON.stringify(before.objects),
      'drag',
    )
    results.push({
      zoom,
      selectIncludingAutomationMs: selectMs,
      tenMoveEventsIncludingAutomationMs: gestureMs,
    })
    await page.getByRole('button', { name: /^Undo:/ }).click()
    await poll(
      model,
      (d) => JSON.stringify(d.objects) === JSON.stringify(before.objects),
      'undo',
    )
  }
  assert.deepEqual(errors, [])
  await fs.writeFile(
    path.join(root, 'browser-performance.json'),
    JSON.stringify(
      {
        browser: browser.version(),
        paths: 100,
        nodesPerPath: 20,
        results,
        errors,
      },
      null,
      2,
    ),
  )
  console.log('PASS ' + root, results)
} finally {
  await context?.close()
  await browser?.close()
  await stop()
}

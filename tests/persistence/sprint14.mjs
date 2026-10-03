import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root = path.resolve('.sprint14.local', String(Date.now())),
  data = path.join(root, 'data'),
  base = 'http://127.0.0.1:47941'
await fs.mkdir(root, { recursive: true })
let service
const start = async () => {
  service = spawn(process.execPath, ['dist-service/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, MAPWEAVER_PORT: '47941', MAPWEAVER_DATA_DIR: data },
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
const count = async (n) =>
  poll(model, (d) => d.objects.length === n, `Expected ${n} objects`)
const shape = async (value) => {
  await page.getByRole('button', { name: 'Area', exact: true }).click()
  await page.getByLabel('Area shape', { exact: true }).selectOption(value)
  await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
}
const point = async (x, y) => {
  const b = await page
      .getByRole('region', { name: 'Map canvas', exact: true })
      .boundingBox(),
    z = Math.min((b.width - 96) / 1000, (b.height - 96) / 650)
  return {
    x: b.x + (b.width - 1000 * z) / 2 + x * z,
    y: b.y + (b.height - 650 * z) / 2 + y * z,
  }
}
const click = async (x, y) => {
  const p = await point(x, y)
  await page.mouse.click(p.x, p.y)
}
const drag = async (x, y, xx, yy) => {
  const a = await point(x, y),
    b = await point(xx, yy)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 12 })
  await page.mouse.up()
}
const select = async (x, y) => {
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
  await click(x, y)
}
try {
  await start()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true,
  })
  await context.route('**/*', (r) => {
    const u = new URL(r.request().url())
    return /^https?:$/.test(u.protocol) && u.hostname !== '127.0.0.1'
      ? r.abort()
      : r.continue()
  })
  page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  await page.goto(base)
  await page
    .getByRole('dialog', { name: 'Projects', exact: true })
    .getByRole('button', { name: 'New project', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'New project' })
  await dialog.getByLabel('Name', { exact: true }).fill('Area acceptance')
  await dialog.getByLabel('Width', { exact: true }).fill('1000')
  await dialog.getByLabel('Height', { exact: true }).fill('650')
  await dialog.getByRole('button', { name: 'Create project' }).click()
  id = (
    await poll(
      () => api('/projects'),
      (p) => p.length === 1,
      'new project',
    )
  )[0].id
  if (
    (await page
      .getByRole('button', { name: 'Show grid', exact: true })
      .getAttribute('aria-pressed')) === 'true'
  )
    await page.getByRole('button', { name: 'Show grid', exact: true }).click()
  await shape('rectangle')
  await drag(70, 70, 280, 210)
  await count(1)
  await shape('ellipse')
  await page.getByLabel('Stroke', { exact: true }).check()
  await page.getByLabel('Area color').fill('#c8a770')
  await drag(360, 70, 570, 230)
  await count(2)
  await shape('polygon')
  await page.getByLabel('Area color').fill('#8ca883')
  for (const p of [
    [650, 70],
    [840, 90],
    [910, 180],
    [780, 250],
    [630, 190],
  ])
    await click(...p)
  await page.keyboard.press('Backspace')
  await click(620, 180)
  await page.keyboard.press('Enter')
  await count(3)
  await shape('freehand')
  const pts = Array.from({ length: 90 }, (_, i) => [
    180 + 100 * Math.cos((i * 2 * Math.PI) / 90),
    370 + 70 * Math.sin((i * 2 * Math.PI) / 90),
  ])
  let p = await point(...pts[0])
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  for (const q of pts.slice(1)) {
    p = await point(...q)
    await page.mouse.move(p.x, p.y)
  }
  await page.mouse.up()
  await count(4)
  // Cancel a polygon without any document/history change.
  await shape('polygon')
  const beforeCancel = await model()
  await click(350, 300)
  await click(430, 300)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+s')
  await new Promise((r) => setTimeout(r, 900))
  assert.deepEqual((await model()).objects, beforeCancel.objects)
  // Pattern picker shortcut shares the last-used non-rectangular shape.
  await page.getByRole('tab', { name: 'Asset library', exact: true }).click()
  await page.getByRole('tab', { name: 'Fill patterns', exact: true }).click()
  await page
    .getByLabel('Import library assets')
    .setInputFiles('.audit.local/fixtures/fill.png')
  await poll(
    () => api('/assets?type=fill-pattern'),
    (a) => a.length === 1,
    'pattern import',
  )
  await page.getByRole('tab', { name: 'Map editor', exact: true }).click()
  await page.getByRole('button', { name: 'Pattern fill', exact: true }).click()
  await page
    .getByRole('button', { name: 'Choose fill', exact: true })
    .last()
    .dblclick()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(await page.getByLabel('Area shape').inputValue(), 'polygon')
  await page.getByRole('button', { name: 'Fit to map' }).click()
  for (const q of [
    [350, 290],
    [540, 290],
    [575, 430],
    [400, 470],
    [330, 400],
  ])
    await click(...q)
  await page.keyboard.press('Enter')
  await count(5)
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  await page.screenshot({ path: path.join(root, '01-shapes-and-fills.png') })
  // Point session: add, move, delete, cancel then commit; one completed session.
  await select(160, 120)
  await page.getByRole('button', { name: 'Edit points', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  const beforeEdit = await model()
  p = await point(170, 70)
  await page.mouse.dblclick(p.x, p.y)
  await drag(170, 70, 170, 100)
  await page.screenshot({ path: path.join(root, '02-point-editing.png') })
  await page.keyboard.press('Delete')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+s')
  await new Promise((r) => setTimeout(r, 900))
  assert.deepEqual((await model()).objects, beforeEdit.objects)
  await page.getByRole('button', { name: 'Edit points', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  await drag(70, 70, 90, 80)
  await page.keyboard.press('Enter')
  await poll(
    model,
    (d) => JSON.stringify(d.objects) !== JSON.stringify(beforeEdit.objects),
    'point edit',
  )
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(
    model,
    (d) => JSON.stringify(d.objects) === JSON.stringify(beforeEdit.objects),
    'point undo',
  )
  await page.getByRole('button', { name: /^Redo:/ }).click()
  await new Promise((r) => setTimeout(r, 900))
  // Two nested solids subtract into a hole, with explicit primary selection.
  await shape('rectangle')
  await page.getByLabel('Area fill', { exact: true }).selectOption('solid')
  await drag(680, 330, 920, 570)
  await count(6)
  await shape('ellipse')
  await drag(740, 390, 860, 510)
  await count(7)
  await select(700, 350)
  await page.keyboard.down('Shift')
  await click(800, 445)
  await page.keyboard.up('Shift')
  await page.getByRole('button', { name: 'Subtract', exact: true }).click()
  await count(6)
  let d = await model()
  assert.equal(d.objects.at(-1).geometry.polygons[0].holes.length, 1)
  await page.screenshot({ path: path.join(root, '03-boolean-hole.png') })
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await count(7)
  await page.getByRole('button', { name: /^Redo:/ }).click()
  await count(6)
  // Union of overlapping areas.
  await shape('rectangle')
  await drag(60, 520, 180, 600)
  await count(7)
  await shape('rectangle')
  await drag(120, 520, 240, 600)
  await count(8)
  await select(80, 550)
  await page.keyboard.down('Shift')
  await click(210, 550)
  await page.keyboard.up('Shift')
  await page.getByRole('button', { name: 'Union', exact: true }).click()
  await count(7)
  // Grid snapping and Alt bypass, then undo the temporary samples.
  await page.getByRole('button', { name: 'Snap to grid', exact: true }).click()
  await shape('rectangle')
  await drag(310, 530, 440, 610)
  d = await count(8)
  assert.equal(d.objects.at(-1).x % 50, 0)
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await count(7)
  await shape('rectangle')
  await page.keyboard.down('Alt')
  await drag(313, 533, 443, 613)
  await page.keyboard.up('Alt')
  d = await count(8)
  assert.notEqual(d.objects.at(-1).x % 50, 0)
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await count(7)
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  // Whole-object movement and proportional corner scaling preserve map geometry.
  await page.getByRole('button', { name: 'Snap to grid', exact: true }).click()
  const transformBefore = await model()
  await select(150, 150)
  await drag(150, 150, 170, 170)
  let changed = await poll(model, d => d.objects[0].x !== transformBefore.objects[0].x, 'area move')
  assert(Math.abs(changed.objects[0].geometry.polygons[0].outer[0].x - transformBefore.objects[0].geometry.polygons[0].outer[0].x - 20) < 2)
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(model, d => JSON.stringify(d.objects) === JSON.stringify(transformBefore.objects), 'move undo')
  await select(150, 150)
  await drag(280, 210, 322, 238)
  changed = await poll(model, d => d.objects[0].width > transformBefore.objects[0].width + 10, 'area scale')
  assert(Math.abs(changed.objects[0].width / changed.objects[0].height - transformBefore.objects[0].width / transformBefore.objects[0].height) < .01)
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(model, d => JSON.stringify(d.objects) === JSON.stringify(transformBefore.objects), 'scale undo')
  // Mid-gesture zoom changes viewport only; the stored start point stays put.
  await shape('rectangle')
  let startPoint = await point(310, 530), endPoint = await point(440, 610)
  await page.mouse.move(startPoint.x, startPoint.y); await page.mouse.down()
  await page.mouse.move(endPoint.x, endPoint.y); await page.mouse.wheel(0, -50)
  await new Promise(r => setTimeout(r,100)); await page.mouse.up()
  changed = await count(8)
  assert(Math.abs(changed.objects.at(-1).x - 310) < 2)
  await page.getByRole('button', { name: /^Undo:/ }).click(); await count(7)
  // Both pan methods cancel a drawing without adding accidental areas.
  await shape('rectangle')
  startPoint = await point(310, 530); endPoint = await point(400, 580)
  await page.mouse.move(startPoint.x, startPoint.y); await page.mouse.down({button:'middle'}); await page.mouse.move(endPoint.x, endPoint.y); await page.mouse.up({button:'middle'})
  await page.getByRole('button', { name: 'Fit to map' }).click()
  await page.mouse.move(startPoint.x, startPoint.y); await page.mouse.down(); await page.mouse.move(endPoint.x, endPoint.y); await page.keyboard.down('Space'); await page.mouse.move(endPoint.x+20,endPoint.y+10); await page.keyboard.up('Space'); await page.mouse.up()
  assert.equal((await model()).objects.length,7)
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click()
  await (await dl).saveAs(path.join(root, 'areas.png'))
  await page
    .getByRole('dialog', { name: 'Export PNG', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  const final = await model()
  assert.equal(final.formatVersion, 3)
  assert(final.objects.every((o) => o.kind === 'area'))
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= 1280),
  )
  assert.deepEqual(errors, [])
  await context.close()
  await stop()
  await start()
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  page = await context.newPage()
  await page.goto(base)
  await page
    .getByRole('button', { name: 'Open Area acceptance', exact: true })
    .click()
  assert.deepEqual((await model()).objects, final.objects)
  await page.screenshot({ path: path.join(root, '04-reopened.png') })
  await fs.writeFile(
    path.join(root, 'acceptance.json'),
    JSON.stringify(
      {
        browser: browser.version(),
        projectId: id,
        objects: final.objects.length,
        checks:
          'four shapes, pattern shortcut, point edit/cancel, holes, union, undo/redo, snapping/Alt, PNG, service restart',
        errors,
      },
      null,
      2,
    ),
  )
  console.log('PASS ' + root)
} catch (e) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(root, 'failure.png') })
      .catch(() => {})
  console.error('Evidence ' + root)
  throw e
} finally {
  await context?.close()
  await browser?.close()
  await stop()
}

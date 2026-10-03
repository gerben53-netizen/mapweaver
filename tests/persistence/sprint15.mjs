import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root = path.resolve('.sprint15.local', String(Date.now())),
  data = path.join(root, 'data'),
  base = 'http://127.0.0.1:47951'
await fs.mkdir(root, { recursive: true })
let service
const start = async () => {
  service = spawn(process.execPath, ['dist-service/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, MAPWEAVER_PORT: '47951', MAPWEAVER_DATA_DIR: data },
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
  await page
    .getByRole('button', { name: 'Select', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
  await click(x, y)
}
const tool = async (mode = 'straight') => {
  await page.getByRole('button', { name: 'Path', exact: true }).click()
  await page.getByLabel('Path mode').selectOption(mode)
  await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
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
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.error(m.text())
  })
  page.on('pageerror', (e) => {
    errors.push(e.message)
    console.error('PAGE ERROR', e.stack)
  })
  page.on('dialog', (d) => d.accept())
  await page.goto(base)
  await page
    .getByRole('dialog', { name: 'Projects', exact: true })
    .getByRole('button', { name: 'New project', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'New project' })
  await dialog.getByLabel('Name', { exact: true }).fill('Path acceptance')
  await dialog.getByLabel('Width', { exact: true }).fill('1000')
  await dialog.getByLabel('Height', { exact: true }).fill('650')
  await dialog.getByRole('button', { name: 'Create project' }).click()
  id = (
    await poll(
      () => api('/projects'),
      (p) => p.length === 1,
      'project',
    )
  )[0].id
  for (const name of ['Show grid', 'Snap to grid'])
    if (
      (await page
        .getByRole('button', { name, exact: true })
        .getAttribute('aria-pressed')) === 'true'
    )
      await page.getByRole('button', { name, exact: true }).click()
  await tool()
  await click(80, 120)
  await click(280, 120)
  await click(330, 170)
  await page.keyboard.press('Backspace')
  await click(310, 180)
  await page.keyboard.press('Enter')
  let d = await count(1)
  assert.equal(d.objects[0].nodes.length, 3)
  assert.equal(d.objects[0].closed, false)
  await tool()
  for (const q of [
    [400, 80],
    [590, 80],
    [590, 230],
    [400, 80],
  ])
    await click(...q)
  d = await count(2)
  assert.equal(d.objects[1].closed, true)
  await tool('curved')
  await drag(80, 370, 150, 260)
  await drag(290, 370, 350, 460)
  await click(420, 350)
  await page.keyboard.press('Enter')
  d = await count(3)
  assert.equal(d.objects[2].nodes[0].mode, 'smooth')
  assert.equal(d.objects[2].nodes[2].mode, 'corner')
  await page.getByRole('button', { name: 'Edit path', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
  await page.screenshot({ path: path.join(root, '01-curve-handles.png') })
  const beforeEdit = await model()
  await drag(150, 260, 180, 250)
  await click(80, 370)
  await page.getByRole('button', { name: 'Make corner', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+s')
  await new Promise((r) => setTimeout(r, 900))
  assert.deepEqual((await model()).objects, beforeEdit.objects)
  await page.getByRole('button', { name: 'Edit path', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
  await drag(80, 370, 100, 380)
  await page.keyboard.press('Enter')
  await poll(model, (d) => d.objects[2].nodes[0].x > 90, 'edit commit')
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(
    model,
    (d) => JSON.stringify(d.objects) === JSON.stringify(beforeEdit.objects),
    'edit undo',
  )
  await page.getByRole('button', { name: /^Redo:/ }).click()
  await new Promise((r) => setTimeout(r, 900))
  // Insert/delete a straight segment point within an edit session.
  await select(180, 120)
  await page.getByRole('button', { name: 'Edit path', exact: true }).click()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  let pos = await point(180, 120)
  await page.mouse.dblclick(pos.x, pos.y)
  await click(180, 120)
  await page.keyboard.press('Delete')
  await page.keyboard.press('Enter')
  d = await model()
  assert.equal(d.objects[0].nodes.length, 3)
  // Dashed properties are applied atomically.
  await select(500, 80)
  await page.getByLabel('Stroke type').selectOption('dashed')
  await page.getByLabel('Stroke width', { exact: true }).fill('12')
  await page.getByLabel('Gap', { exact: true }).fill('20')
  await page.getByRole('button', { name: 'Apply path properties' }).click()
  await poll(model, (d) => d.objects[1].stroke.kind === 'dashed', 'dashed')
  // Import a real local texture through the library UI.
  await page.getByRole('tab', { name: 'Asset library', exact: true }).click()
  await page.getByRole('tab', { name: 'Fill patterns', exact: true }).click()
  await page
    .getByLabel('Import library assets')
    .setInputFiles('.audit.local/fixtures/fill.png')
  await poll(
    () => api('/assets?type=fill-pattern'),
    (a) => a.length === 1,
    'asset',
  )
  await page.getByRole('tab', { name: 'Map editor', exact: true }).click()
  await tool()
  await page.getByRole('button', { name: 'Texture', exact: true }).click()
  await page
    .getByRole('button', { name: 'Choose fill', exact: true })
    .last()
    .dblclick()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.getByLabel('Path width', { exact: true }).fill('30')
  await page.getByLabel('Path width', { exact: true }).blur()
  await page.getByRole('button', { name: 'Fit to map' }).click()
  await click(530, 400)
  await click(720, 320)
  await click(890, 430)
  await page.keyboard.press('Enter')
  d = await count(4)
  assert.equal(d.objects[3].stroke.kind, 'texture')
  await page.getByRole('button', { name: 'Fit to map' }).click()
  await page.screenshot({ path: path.join(root, '02-three-strokes.png') })
  // Grid/Alt/Shift and cancellation.
  await page.getByRole('button', { name: 'Snap to grid', exact: true }).click()
  await tool()
  await click(73, 533)
  await page.keyboard.down('Shift')
  await click(280, 548)
  await page.keyboard.up('Shift')
  await page.keyboard.press('Enter')
  d = await count(5)
  assert.equal(d.objects[4].nodes[0].x % 50, 0)
  assert.equal(d.objects[4].nodes[0].y, d.objects[4].nodes[1].y)
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await count(4)
  await tool()
  await page.keyboard.down('Alt')
  await click(73, 533)
  await click(280, 548)
  await page.keyboard.up('Alt')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+s')
  await new Promise((r) => setTimeout(r, 900))
  assert.equal((await model()).objects.length, 4)
  await page.getByRole('button', { name: 'Snap to grid', exact: true }).click()
  // Move, proportional resize, rotation and undo on a real canvas Transformer.
  await select(180, 120)
  let before = await model()
  await drag(180, 120, 200, 140)
  await poll(model, (d) => d.objects[0].x > before.objects[0].x + 10, 'move')
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(
    model,
    (d) => JSON.stringify(d.objects) === JSON.stringify(before.objects),
    'move undo',
  )
  await select(180, 120)
  let o = before.objects[0]
  await drag(
    o.x + o.width,
    o.y + o.height,
    o.x + o.width + 60,
    o.y + o.height + 20,
  )
  await poll(model, (d) => d.objects[0].width > o.width + 20, 'resize')
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(
    model,
    (d) => JSON.stringify(d.objects) === JSON.stringify(before.objects),
    'resize undo',
  )
  await select(180, 120)
  const center = await point(o.x + o.width / 2, o.y),
    rotation = { x: center.x, y: center.y - 32 }
  await page.mouse.move(rotation.x, rotation.y)
  await page.mouse.down()
  await page.mouse.move(rotation.x + 70, rotation.y + 30, { steps: 12 })
  await page.mouse.up()
  await poll(
    model,
    (d) => Math.abs(d.objects[0].nodes[0].y - o.nodes[0].y) > 5,
    'rotate',
  )
  await page.getByRole('button', { name: /^Undo:/ }).click()
  await poll(
    model,
    (d) => JSON.stringify(d.objects) === JSON.stringify(before.objects),
    'rotate undo',
  )
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click()
  await (await download).saveAs(path.join(root, 'paths.png'))
  await page
    .getByRole('dialog', { name: 'Export PNG', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  const final = await model()
  assert.equal(final.formatVersion, 4)
  assert.deepEqual(errors, [])
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= 1280),
  )
  await context.close()
  await stop()
  await start()
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  page = await context.newPage()
  await page.goto(base)
  await page
    .getByRole('button', { name: 'Open Path acceptance', exact: true })
    .click()
  assert.deepEqual((await model()).objects, final.objects)
  await page.locator('canvas').waitFor({state:'visible'})
  await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(root, '03-reopened.png') })
  await fs.writeFile(
    path.join(root, 'acceptance.json'),
    JSON.stringify(
      {
        browser: browser.version(),
        projectId: id,
        checks:
          'straight, closed, curved, handles, insert/delete, cancel, edit undo/redo, snapping/Shift/Alt, three styles, move/resize/rotate, PNG, restart, 1280x720',
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

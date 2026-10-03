import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:47942',
  server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      '47942',
      '--strictPort',
    ],
    { windowsHide: true, stdio: 'pipe' },
  )
let browser
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) break
    } catch {
      /* Own dev server is still starting. */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base + '/tests/persistence/area-render.html')
  await page.waitForFunction(() => window.areaRenderResult)
  const result = await page.evaluate(() => window.areaRenderResult)
  assert.deepEqual(errors, [])
  assert.equal(result.holeAlpha, 0)
  for (const r of result.results)
    assert(r.maxChannelDifference <= 1, JSON.stringify(r))
  await fs.mkdir('.sprint14.local', { recursive: true })
  await fs.writeFile(
    '.sprint14.local/render-comparison.json',
    JSON.stringify(result, null, 2),
  )
  console.log(result)
} finally {
  await browser?.close()
  if (server.exitCode === null) {
    const stopped = new Promise((r) => server.once('exit', r))
    server.kill()
    await stopped
  }
}

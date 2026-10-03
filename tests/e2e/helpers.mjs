import { expect } from '@playwright/test';
import fs from 'node:fs/promises';
export const fixtures = '.audit.local/fixtures';
export const snapshot = page => page.evaluate(async () => { const source = name => performance.getEntriesByType('resource').map(r => r.name).find(url => new URL(url).pathname === `/src/store/${name}.ts`); const { useProjectStore: p } = await import(source('projectStore')), { useEditorStore: e } = await import(source('editorStore')), { useHistoryStore: h } = await import(source('history')); return { map: p.getState().map, objects: p.getState().objects, layers: p.getState().layers, editor: e.getState(), history: h.getState() }; });
export const model = s => ({ map: s.map, objects: s.objects, layers: s.layers });
export async function point(page, x, y) { const s = await snapshot(page), b = await page.getByRole('region', { name: 'Map canvas', exact: true }).boundingBox(); return { x: b.x + s.editor.viewport.pan.x + x * s.editor.viewport.zoom, y: b.y + s.editor.viewport.pan.y + y * s.editor.viewport.zoom }; }
export async function clickMap(page, x, y) { const p = await point(page, x, y); await page.mouse.click(p.x, p.y); }
export async function dragMap(page, x, y, tx, ty) { const a = await point(page, x, y), b = await point(page, tx, ty); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up(); }
export async function capture(page, name) { await fs.mkdir('.audit.local/screenshots', { recursive: true }); await page.screenshot({ path: `.audit.local/screenshots/${name}.png` }); }
export async function download(page, button, path) { const event = page.waitForEvent('download', { timeout: 20000 }); await button.click(); const file = await event; await file.saveAs(path); expect(await file.failure()).toBeNull(); return path; }
export async function openFixture(page, name) { await page.getByLabel('Mapweaver project file').setInputFiles(`${fixtures}/${name}.mapweaver`); await expect.poll(async () => (await snapshot(page)).history.dirty).toBe(false); await expect(page.getByRole('status').filter({ hasText: 'Checking project' })).toHaveCount(0); }

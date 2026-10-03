import { test, expect } from '@playwright/test';
import { capture, snapshot, model, point, fixtures, download, clickMap, dragMap } from './helpers.mjs';
import fs from 'node:fs/promises';
test('synthetic 20/100/1000 object performance, viewport navigation, memory and responsive layouts', async ({ page, browserName }) => {
    await page.addInitScript(() => { const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL); window.auditURLs = new Set(); URL.createObjectURL = (blob) => { const url = create(blob); window.auditURLs.add(url); return url; }; URL.revokeObjectURL = (url) => { window.auditURLs.delete(url); revoke(url); }; });
    const results = [];
    const t = performance.now();
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Map canvas', exact: true })).toBeVisible();
    results.push({ initialMs: performance.now() - t });
    for (const count of [20, 100, 1000]) {
        const start = performance.now();
        await page.getByLabel('Mapweaver project file').setInputFiles(`${fixtures}/map-${count}.mapweaver`);
        await expect.poll(async () => (await snapshot(page)).objects.length).toBe(count);
        await expect(page.getByText(`Audit ${count}`, { exact: true })).toBeVisible();
        results.push({ count, openMs: performance.now() - start });
        const before = model(await snapshot(page)), p = await point(page, 800, 500), pan = performance.now();
        await page.mouse.move(p.x, p.y);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(p.x + 35, p.y + 25, { steps: 15 });
        await page.mouse.up({ button: 'middle' });
        await page.mouse.wheel(0, -100);
        expect(model(await snapshot(page))).toEqual(before);
        results.push({ count, panZoomMs: performance.now() - pan });
        await page.getByRole('button', { name: 'Fit to map' }).click();
        const selectStart = performance.now();
        await clickMap(page, 290, 60);
        results.push({ count, selectMs: performance.now() - selectStart });
        if ((await snapshot(page)).editor.selectedObjectIds.length) {
            const dragStart = performance.now();
            await dragMap(page, 290, 60, 305, 75);
            results.push({ count, dragMs: performance.now() - dragStart });
            if ((await snapshot(page)).history.undoCount)
                await page.getByRole('button', { name: /^Undo:/ }).click();
        }
        await page.getByRole('tab', { name: 'Layers', exact: true }).click();
        const layerStart = performance.now();
        await page.getByRole('button', { name: 'Hide Layer 1', exact: true }).click();
        await page.getByRole('button', { name: /^Undo:/ }).click();
        results.push({ count, layerUndoMs: performance.now() - layerStart });
        const h = performance.now();
        await page.getByRole('button', { name: 'Show grid', exact: true }).click();
        await page.getByRole('button', { name: /^Undo:/ }).click();
        expect(model(await snapshot(page))).toEqual(before);
        results.push({ count, changeUndoMs: performance.now() - h });
        const autoStart = performance.now();
        await expect(page.getByText('Unsaved changes � local copy saved', { exact: true }).or(page.getByText('Saved locally', { exact: true }))).toBeVisible({ timeout: 20000 });
        results.push({ count, autosaveWaitMs: performance.now() - autoStart });
        const save = performance.now();
        const path = await download(page, page.getByRole('button', { name: 'Download', exact: true }), `.audit.local/roundtrip-${count}.mapweaver`);
        results.push({ count, saveMs: performance.now() - save, bytes: (await fs.stat(path)).size });
        await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
        const exp = page.getByRole('dialog', { name: 'Export PNG' });
        for (const scale of [1, 2]) {
            await exp.getByRole('combobox', { name: 'Scale', exact: true }).selectOption(String(scale));
            const exportTime = performance.now();
            await download(page, exp.getByRole('button', { name: 'Download PNG', exact: true }), `.audit.local/perf-${count}-${scale}.png`);
            results.push({ count, scale, exportMs: performance.now() - exportTime });
        }
        await exp.getByRole('button', { name: 'Close', exact: true }).click();
        results.push({ count, urls: await page.evaluate(() => window.auditURLs.size), heap: await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null) });
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.getByRole('button', { name: 'Fit to map' }).click();
    await capture(page, '13-heavy-1920');
    await page.setViewportSize({ width: 1280, height: 720 });
    await capture(page, '14-heavy-1280');
    await page.setViewportSize({ width: 640, height: 360 });
    await page.getByRole('button', { name: 'Fit to map' }).click();
    await page.getByRole('button', { name: 'Export PNG', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Export PNG', exact: true })).toBeInViewport();
    await capture(page, '15-200-percent');
    results.push({ zoom200: { cssWidth: 640, documentWidth: await page.evaluate(() => document.documentElement.scrollWidth) } });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByLabel('Mapweaver project file').setInputFiles(`${fixtures}/empty.mapweaver`);
    await expect.poll(async () => (await snapshot(page)).objects.length).toBe(0);
    await page.waitForTimeout(31000);
    results.push({ afterEmptyURLs: await page.evaluate(() => window.auditURLs.size), heap: await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null) });
    await fs.writeFile(`.audit.local/performance-${browserName}.json`, JSON.stringify(results, null, 2));
    expect(await page.evaluate(() => window.auditURLs.size)).toBe(0);
});

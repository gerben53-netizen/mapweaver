import { test, expect } from '@playwright/test';
import { snapshot, model, fixtures, download, capture } from './helpers.mjs';
test('real raster imports, background undo and partial import failure', async ({ page }) => {
    const external = [];
    page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1')
        external.push(r.url()); });
    await page.goto('/');
    const initial = model(await snapshot(page));
    await page.getByRole('tab', { name: 'Map', exact: true }).click();
    await page.getByLabel('Background image file').setInputFiles(`${fixtures}/background.png`);
    await expect.poll(async () => (await snapshot(page)).map.background?.name).toBe('background.png');
    await capture(page, '19-background');
    await page.getByRole('button', { name: /^Undo:/ }).click();
    expect(model(await snapshot(page))).toEqual(initial);
    await page.getByRole('button', { name: /^Redo:/ }).click();
    expect((await snapshot(page)).map.background).not.toBeNull();
    await page.getByRole('tab', { name: 'Asset library', exact: true }).click();
    const images = await page.evaluate(async () => { const c = new OffscreenCanvas(16, 16), ctx = c.getContext('2d'); ctx.fillStyle = '#ab5511'; ctx.fillRect(0, 0, 16, 16); return await Promise.all(['image/jpeg', 'image/webp'].map(async (type) => [type, Array.from(new Uint8Array(await (await c.convertToBlob({ type })).arrayBuffer()))])); });
    await page.getByLabel('Import library assets').setInputFiles([...images.map(([mimeType, bytes]) => ({ name: `raster.${mimeType.split('/')[1]}`, mimeType, buffer: Buffer.from(bytes) })), { name: 'active.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') }, { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }]);
    await expect(page.getByRole('button', { name: /raster.*16/ })).toHaveCount(2);
    await expect(page.getByText('2 imported, 2 skipped.', { exact: true })).toBeVisible();
    await capture(page, '20-import-errors');
    await page.getByRole('tab', { name: 'Map editor', exact: true }).click();
    await download(page, page.getByRole('button', { name: 'Download', exact: true }), '.audit.local/background.mapweaver');
    expect(external).toEqual([]);
});

import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
const out = '.audit.local/fixtures';
await mkdir(out, { recursive: true });
function crc(bytes) { let c = -1; for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++)
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
} return (c ^ -1) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), size = Buffer.alloc(4), sum = Buffer.alloc(4); size.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([name, data]))); return Buffer.concat([size, name, data, sum]); }
function png(w, h, pixel) { const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6; const rows = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
        rows.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4); return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]); }
const sources = { stamp: png(64, 64, (x, y) => x > 8 && x < 56 && y > 8 && y < 56 ? [204, 88, 55, 255] : [0, 0, 0, 0]), fill: png(32, 32, (x, y) => (x < 16) === (y < 16) ? [35, 131, 151, 255] : [66, 91, 118, 255]), background: png(1600, 1000, () => [210, 214, 218, 255]) };
for (const [id, bytes] of Object.entries(sources))
    await writeFile(`${out}/${id}.png`, bytes);
const manifests = Object.entries(sources).map(([id, bytes]) => ({ id, kind: id === 'fill' ? 'fillPattern' : 'stamp', fileName: `${id}.png`, mimeType: 'image/png', width: id === 'background' ? 1600 : id === 'fill' ? 32 : 64, height: id === 'background' ? 1000 : id === 'fill' ? 32 : 64, hash: createHash('sha256').update(bytes).digest('hex'), path: `assets/${id}.png` }));
const base = { formatVersion: 2, id: 'audit', name: 'Audit map', createdAt: '2026-09-23T00:00:00.000Z', modifiedAt: '2026-09-23T00:00:00.000Z', map: { width: 1600, height: 1000, backgroundColor: '#ffffff', background: null, grid: { visible: true, snapEnabled: false, cellSize: 70, offsetX: 15, offsetY: 10, color: '#58645c', opacity: .35, renderAboveObjects: false } }, objects: [], layers: [{ id: 'objects', name: 'Objects', visible: true, locked: false, objectIds: [] }], assets: [] };
async function save(name, document) { const used = new Set([...document.objects.map(o => o.assetId), ...(document.map.background ? ['background'] : [])]); document.assets = manifests.filter(a => used.has(a.id)); const entries = { 'project.json': strToU8(JSON.stringify(document)) }; for (const a of document.assets)
    entries[a.path] = sources[a.id]; await writeFile(`${out}/${name}.mapweaver`, zipSync(entries, { level: 0 })); }
await save('empty', structuredClone(base));
const bg = structuredClone(base);
bg.map.background = { id: 'background', name: 'background.png', width: 1600, height: 1000 };
await save('background', bg);
for (const [count, layerCount, patterns] of [[20, 2, 2], [100, 8, 5], [1000, 8, 20]]) {
    const d = structuredClone(bg);
    d.name = `Audit ${count}`;
    d.id = `audit-${count}`;
    d.layers = Array.from({ length: layerCount }, (_, i) => ({ id: `layer-${i}`, name: `Layer ${i + 1}`, visible: i !== layerCount - 1, locked: layerCount > 2 && i === layerCount - 2, objectIds: [] }));
    for (let i = 0; i < count; i++) {
        const pattern = i < patterns;
        const o = { id: `o-${i}`, assetId: pattern ? 'fill' : 'stamp', kind: pattern ? 'patternFill' : 'stamp', x: 40 + i % 25 * 58, y: 40 + Math.floor(i / 25) % 15 * 58, width: pattern ? 100 : 40, height: pattern ? 90 : 40, rotation: pattern ? 0 : i % 360, scaleX: !pattern && i % 2 ? -1 : 1, scaleY: 1, opacity: .8, ...(pattern ? { mode: i % 2 ? 'stretch' : 'repeat', patternScale: 1, patternRotation: i * 5, patternOffsetX: 7, patternOffsetY: 3 } : {}) };
        d.objects.push(o);
        d.layers[i % layerCount].objectIds.push(o.id);
    }
    await save(`map-${count}`, d);
}
await writeFile(`${out}/malicious.mapweaver`, zipSync({ '../project.json': strToU8('{}') }));
await writeFile(`${out}/corrupt.mapweaver`, new Uint8Array([1, 2, 3]));
console.log(`Generated synthetic fixtures in ${out}`);
for (let i = 0; i < 200; i++)
    await writeFile(`${out}/library-${String(i).padStart(3, '0')}.png`, png(16, 16, () => [i, 100, 200, 255]));
const manyLayers = structuredClone(base);
manyLayers.id = 'audit-layers';
manyLayers.name = 'Audit 256 layers';
manyLayers.layers = Array.from({ length: 256 }, (_, i) => ({ id: `l-${i}`, name: `Layer ${i + 1}`, visible: true, locked: false, objectIds: [] }));
await save('layers-256', manyLayers);

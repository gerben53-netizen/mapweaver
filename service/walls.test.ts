import { expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { Storage } from './storage'
import { createWall, SIMPLE_WALL } from '../src/domain/walls'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { createBackup, extractArchive, validateDataset } from './archives'
import { generation } from './safety'
it('persists canonical walls and typed references through SQLite reopen, portable transfer and verified full restore', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mapweaver-wall-')),
    source = new Storage(path.join(root, 'source'))
  let restored: Storage | undefined
  try {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 4, background: '#c0a080' },
    })
      .png()
      .toBuffer()
    const a = (
      await source.importAsset(
        new File([new Uint8Array(bytes)], 'pattern.png', { type: 'image/png' }),
        'fill-pattern',
        'Pattern',
      )
    ).asset
    const wall = createWall(
        [
          { id: 'a', x: 10, y: 100, mode: 'smooth', out: { x: 80, y: -90 } },
          { id: 'b', x: 250, y: 100, mode: 'smooth', in: { x: -80, y: 90 } },
        ],
        false,
        {...SIMPLE_WALL,strokeWidth:20,stroke:{ kind: 'texture', assetId: a.id, scale: 1, spacing: 20, offset: 4 }},
      ),
      now = new Date().toISOString()
    const d = {
      formatVersion: 6,
      objectGroups:[],layerTree:{roots:['objects'],groups:[]},
      id: crypto.randomUUID(),
      name: 'Walls',
      createdAt: now,
      modifiedAt: now,
      map: { width: 600, height: 400, ...defaultMapStyle(), background: null },
      objects: [wall],
      layers: [
        {
          id: 'objects',
          name: 'Objects',
          visible: true,
          locked: false,
          objectIds: [wall.id],
        },
      ],
      assets: [
        {
          id: a.id,
          kind: 'fillPattern',
          fileName: 'pattern.png',
          mimeType: a.mimeType,
          width: a.width,
          height: a.height,
          hash: a.sha256,
          path: `assets/${a.sha256}.png`,
        },
      ],
    }
    const row = source.writeProject(d)
    expect(row.formatVersion).toBe(10)
    expect(
      source.db
        .prepare('SELECT assetId FROM project_assets WHERE projectId=?')
        .get(row.id),
    ).toEqual({ assetId: a.id })
    const invalid = structuredClone(d)
    invalid.objects[0].nodes[0].x = Infinity
    expect(() => source.writeProject(invalid, row.revision)).toThrow()
    expect(source.project(row.id).revision).toBe(row.revision)
    const portable = await source.exportProject(row.id),
      imported = await source.importProject(portable)
    expect(imported.document.objects).toEqual(row.document.objects)
    const clean = new Storage(path.join(root, 'portable-destination'))
    try {
      const transfer = await clean.importProject(portable)
      expect(transfer.document.objects).toEqual(row.document.objects.map(object => object.kind === 'path' && object.stroke.kind === 'texture' ? { ...object, stroke: { ...object.stroke, assetId: transfer.document.assets[0].id } } : object))
      expect(clean.bytes(clean.asset(transfer.document.assets[0].id), false)).toEqual(bytes)
      expect(() => clean.writeProject({...transfer.document,objects:transfer.document.objects.map(o=>({...o,wall:{bad:true}}))},transfer.revision)).toThrow()
    } finally { clean.close() }
    const controller = new AbortController(),
      backup = await createBackup(
        source,
        path.join(root, 'backup'),
        generation(source),
        controller.signal,
        () => {},
      )
    await extractArchive(
      backup.file,
      path.join(root, 'restored'),
      controller.signal,
      () => {},
    )
    await expect(
      validateDataset(path.join(root, 'restored')),
    ).resolves.toMatchObject({ projects: 2, assets: 1 })
    restored = new Storage(path.join(root, 'restored'))
    expect(restored.project(row.id).document.objects).toEqual(
      row.document.objects,
    )
  } finally {
    source.close()
    restored?.close()
  }
})



